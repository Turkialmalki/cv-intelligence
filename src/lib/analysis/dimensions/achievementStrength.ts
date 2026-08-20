import { CATEGORY_WEIGHTS, THRESHOLDS } from "../config";
import { rewriteBullet } from "../rewrite";
import type { Finding } from "../schema";
import {
  containsFiller,
  firstToken,
  hasMetric,
  startsWithGerund,
  startsWithStrongVerb,
  startsWithWeakOpener,
} from "../signals";
import { truncate } from "../text";
import {
  makeFinding,
  ScoreBudget,
  type DimensionResult,
  type ScoringContext,
} from "./shared";

const CATEGORY = "achievement_strength" as const;

/**
 * Every line of work description we can evaluate as an achievement claim,
 * in descending order of confidence:
 *   1. bullets attached to a parsed role,
 *   2. any line inside a recognised experience section,
 *   3. any bulleted line anywhere,
 *   4. any line long enough to be a statement rather than a heading.
 *
 * The fallbacks matter: a CV whose roles could not be parsed is exactly the
 * CV whose duty-listing bullets most need to be called out.
 */
function achievementLines(ctx: ScoringContext): string[] {
  const { doc } = ctx;

  const fromRoles = doc.experience.flatMap((e) => e.bullets);
  if (fromRoles.length > 0) return fromRoles;

  const experienceSection = doc.sectionMap.get("experience");
  if (experienceSection) {
    const sectionLines = experienceSection.lines
      .filter((l) => l.words >= 3)
      .map((l) => l.text);
    if (sectionLines.length > 0) return sectionLines;
  }

  const bullets = doc.bullets.map((b) => b.text);
  if (bullets.length > 0) return bullets;

  return doc.lines.filter((l) => l.words >= 4).map((l) => l.text);
}

/**
 * The difference between a CV that lists duties and one that proves impact.
 * This is where most CVs lose the most points — and where the payoff is
 * biggest, because the fix is entirely within the candidate's control.
 */
export function scoreAchievementStrength(ctx: ScoringContext): DimensionResult {
  const { doc } = ctx;
  const budget = new ScoreBudget(CATEGORY_WEIGHTS[CATEGORY]);
  const findings: Finding[] = [];
  const lines = achievementLines(ctx);

  if (lines.length === 0) {
    const deduction = budget.deduct(CATEGORY_WEIGHTS[CATEGORY] * 0.8);
    findings.push(
      makeFinding({
        id: "achievement.no_content",
        category: CATEGORY,
        severity: "critical",
        title: "No achievement statements found",
        description:
          "No lines describing what you delivered could be identified. Without them there is nothing for a recruiter to evaluate you on beyond your job titles.",
        evidence: null,
        deduction,
        recommendation:
          "Under each role, write 3–5 bullets in the form: action verb → what you did → measurable result.",
      }),
    );
    return {
      score: budget.score,
      findings,
      summary: "No achievement statements to evaluate.",
      summaryAr: "لا توجد عبارات إنجاز يمكن تقييمها.",
    };
  }

  const quantified = lines.filter(hasMetric);
  const ratio = quantified.length / lines.length;
  const weakOpeners = lines.filter(startsWithWeakOpener);
  const strongOpeners = lines.filter(startsWithStrongVerb);

  // --- Measurable outcomes (the heaviest sub-weight) ---------------------
  if (ratio < THRESHOLDS.quantifiedBulletRatio.acceptable) {
    const example = lines.find((l) => !hasMetric(l) && l.length > 25) ?? lines[0]!;
    const rewritten = rewriteBullet(example, doc.language);
    const deduction = budget.deduct(quantified.length === 0 ? 6 : 4.5);
    findings.push(
      makeFinding({
        id: "achievement.no_measurable_results",
        category: CATEGORY,
        severity: "critical",
        title:
          quantified.length === 0
            ? "None of your bullets contain a measurable result"
            : "Almost none of your bullets contain a measurable result",
        description: `Only ${quantified.length} of ${lines.length} lines contain a number. Two candidates can describe the same job identically — the one who shows the size of the result gets the interview. Numbers are also the fastest thing a recruiter's eye lands on.`,
        evidence: truncate(example, 200),
        deduction,
        recommendation:
          "Add a real figure to your strongest 5–8 bullets: a percentage, an amount, a headcount, a time saved, or a volume. Use only numbers you can defend in an interview — never estimate upward.",
        exampleBefore: example,
        exampleAfter: rewritten.text,
      }),
    );
  } else if (ratio < THRESHOLDS.quantifiedBulletRatio.good) {
    const example = lines.find((l) => !hasMetric(l) && l.length > 25) ?? lines[0]!;
    const rewritten = rewriteBullet(example, doc.language);
    const deduction = budget.deduct(2.5);
    findings.push(
      makeFinding({
        id: "achievement.few_measurable_results",
        category: CATEGORY,
        severity: "high",
        title: "Most of your bullets have no number in them",
        description: `${quantified.length} of ${lines.length} lines (${Math.round(ratio * 100)}%) contain a measurable result. You are already doing this in places — the gap is consistency.`,
        evidence: truncate(example, 200),
        deduction,
        recommendation:
          "Aim for roughly half of your bullets to carry a figure. Apply it first to your most recent role, which gets read most closely.",
        exampleBefore: example,
        exampleAfter: rewritten.text,
      }),
    );
  }

  // --- Weak, duty-listing openers ---------------------------------------
  const weakRatio = weakOpeners.length / lines.length;
  if (weakRatio >= 0.3) {
    const example = weakOpeners[0]!;
    const rewritten = rewriteBullet(example, doc.language);
    const deduction = budget.deduct(weakRatio >= 0.55 ? 4 : 2.5);
    findings.push(
      makeFinding({
        id: "achievement.weak_openers",
        category: CATEGORY,
        severity: weakRatio >= 0.55 ? "critical" : "high",
        title: "Your bullets describe duties, not results",
        description: `${weakOpeners.length} of ${lines.length} lines open with phrasing like "responsible for", "worked on" or "assisted with". That phrasing describes what you were assigned, not what you achieved — it reads as a job description rather than a track record.`,
        evidence: truncate(example, 200),
        deduction,
        recommendation:
          "Open every bullet with a verb that names the action you took: Led, Built, Reduced, Launched, Negotiated, Automated.",
        exampleBefore: example,
        exampleAfter: rewritten.text,
      }),
    );
  }

  // --- Activity framing rather than achievement framing ------------------
  const gerundOpeners = lines.filter(startsWithGerund);
  const gerundRatio = gerundOpeners.length / lines.length;
  if (gerundRatio >= 0.3) {
    const example = gerundOpeners[0]!;
    const deduction = budget.deduct(gerundRatio >= 0.55 ? 3 : 2);
    findings.push(
      makeFinding({
        id: "achievement.gerund_openers",
        category: CATEGORY,
        severity: gerundRatio >= 0.55 ? "high" : "medium",
        title: "Your bullets describe ongoing activity, not finished results",
        description: `${gerundOpeners.length} of ${lines.length} lines open with an "-ing" verb such as "${firstToken(example)}". That framing describes what you spend time on; the past tense describes what you delivered. Recruiters are hiring for outcomes, and the grammar quietly signals which one you are offering.`,
        evidence: truncate(example, 200),
        deduction,
        recommendation:
          "Switch to the completed past tense: \"Led\" instead of \"Leading\", \"Delivered\" instead of \"Delivering\". Keep the present tense only for your current role's genuinely continuing duties.",
        exampleBefore: example,
        exampleAfter: rewriteBullet(example, doc.language).text,
      }),
    );
  }

  // --- Action-verb variety ----------------------------------------------
  const strongRatio = strongOpeners.length / lines.length;
  if (strongRatio < 0.35 && weakRatio < 0.3) {
    const deduction = budget.deduct(2);
    findings.push(
      makeFinding({
        id: "achievement.few_action_verbs",
        category: CATEGORY,
        severity: "medium",
        title: "Few bullets start with a strong action verb",
        description: `Only ${strongOpeners.length} of ${lines.length} lines begin with a recognised action verb. Bullets that start with nouns or filler lose the reader in the first two words.`,
        evidence: truncate(lines.find((l) => !startsWithStrongVerb(l)) ?? "", 200),
        deduction,
        recommendation:
          "Restructure each bullet so the first word is the verb — the action comes first, the context second.",
      }),
    );
  }

  // --- Filler / cliche ---------------------------------------------------
  const fillerLine = lines.find((l) => containsFiller(l) !== null);
  if (fillerLine) {
    const phrase = containsFiller(fillerLine);
    const deduction = budget.deduct(1.5);
    findings.push(
      makeFinding({
        id: "achievement.filler_language",
        category: CATEGORY,
        severity: "medium",
        title: "Generic self-description instead of evidence",
        description: `Phrases such as "${phrase}" appear in your CV. Every candidate claims these, none can be verified, and they consume space that evidence should occupy.`,
        evidence: truncate(fillerLine, 200),
        deduction,
        recommendation:
          "Replace each claim with the evidence behind it. Instead of \"team player\", show the cross-functional project you delivered and its outcome.",
        exampleBefore: fillerLine,
        exampleAfter: rewriteBullet(fillerLine, doc.language).text,
      }),
    );
  }

  // --- Volume ------------------------------------------------------------
  if (lines.length < 5 && doc.experience.length >= 1) {
    const deduction = budget.deduct(2);
    findings.push(
      makeFinding({
        id: "achievement.too_few_bullets",
        category: CATEGORY,
        severity: "high",
        title: "Too few achievement statements overall",
        description: `Only ${lines.length} description lines were found across your whole CV. That is not enough surface area to demonstrate a career.`,
        evidence: null,
        deduction,
        recommendation:
          "Target 3–5 bullets for each of your last two roles and 1–2 for older ones.",
      }),
    );
  }

  if (budget.score >= CATEGORY_WEIGHTS[CATEGORY] - 2) {
    findings.push(
      makeFinding({
        id: "achievement.strong",
        category: CATEGORY,
        severity: "positive",
        title: "Your achievements are specific and measurable",
        description: `${quantified.length} of ${lines.length} bullets carry a concrete result, and most open with a strong action verb.`,
        evidence: quantified[0] ? truncate(quantified[0], 200) : null,
        deduction: 0,
        recommendation: "Keep this pattern in every future role you add.",
        addressable: false,
      }),
    );
  }

  const score = budget.score;
  return {
    score,
    findings,
    summary:
      score >= 12
        ? "Results are specific, measurable and clearly owned."
        : score >= 7
          ? "Some evidence of impact, but inconsistently quantified."
          : "The CV lists duties rather than demonstrating results.",
    summaryAr:
      score >= 12
        ? "الإنجازات محددة وقابلة للقياس وواضحة النسبة إليك."
        : score >= 7
          ? "هناك مؤشرات أثر لكنها غير مدعومة بأرقام بشكل منتظم."
          : "السيرة تسرد المهام بدل أن تُثبت النتائج.",
  };
}
