import { CATEGORY_WEIGHTS, THRESHOLDS } from "../config";
import type { Finding } from "../schema";
import { isGenericSkill, isTechnicalSkill } from "../signals";
import { normalizeForMatch } from "../text";
import {
  makeFinding,
  ScoreBudget,
  type DimensionResult,
  type ScoringContext,
} from "./shared";

const CATEGORY = "skills_quality" as const;

/**
 * Whether the skills section gives a parser something to match against and
 * gives a recruiter something specific enough to believe.
 */
export function scoreSkillsQuality(ctx: ScoringContext): DimensionResult {
  const { doc } = ctx;
  const budget = new ScoreBudget(CATEGORY_WEIGHTS[CATEGORY]);
  const findings: Finding[] = [];
  const skills = doc.skills;

  if (skills.length === 0) {
    const deduction = budget.deduct(7);
    findings.push(
      makeFinding({
        id: "skills.missing",
        category: CATEGORY,
        severity: "critical",
        title: "No skills could be extracted",
        description:
          "No skills list could be identified. Keyword search over the skills field is the most common way recruiters build a shortlist — an empty field means you are absent from those searches.",
        evidence: null,
        deduction,
        recommendation:
          "Add a \"Skills\" heading followed by 10–16 specific, comma-separated skills that genuinely appear in your work — tools, platforms, methods and domains.",
      }),
    );
    return {
      score: budget.score,
      findings,
      summary: "No skills section to evaluate.",
      summaryAr: "لا يوجد قسم مهارات يمكن تقييمه.",
    };
  }

  // --- Duplication -------------------------------------------------------
  const seen = new Map<string, number>();
  for (const skill of skills) {
    const key = normalizeForMatch(skill);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const duplicates = [...seen.entries()].filter(([, n]) => n > 1);
  const unique = seen.size;

  if (duplicates.length > 0) {
    const deduction = budget.deduct(Math.min(1.5, duplicates.length * 0.4));
    findings.push(
      makeFinding({
        id: "skills.duplicates",
        category: CATEGORY,
        severity: "low",
        title: "Duplicate skills listed",
        description: `${duplicates.length} skill(s) appear more than once. Repetition reads as padding and can trip keyword-stuffing filters.`,
        evidence: duplicates
          .slice(0, 4)
          .map(([k]) => k)
          .join(", "),
        deduction,
        recommendation: "Keep each skill exactly once, in its most standard form.",
      }),
    );
  }

  // --- Volume ------------------------------------------------------------
  if (unique < THRESHOLDS.skills.min) {
    const deduction = budget.deduct(3);
    findings.push(
      makeFinding({
        id: "skills.too_few",
        category: CATEGORY,
        severity: "high",
        title: "Your skills list is too short to match on",
        description: `Only ${unique} distinct skill(s) were found. Recruiters filter on skill keywords, and a short list simply fails more filters than it passes.`,
        evidence: skills.slice(0, 8).join(", "),
        deduction,
        recommendation:
          "Expand to 10–16 skills you can genuinely evidence: the tools you use daily, the methods you apply, and your domain areas.",
      }),
    );
  } else if (unique > THRESHOLDS.skills.max) {
    const deduction = budget.deduct(1.5);
    findings.push(
      makeFinding({
        id: "skills.too_many",
        category: CATEGORY,
        severity: "medium",
        title: "Your skills list is overloaded",
        description: `${unique} skills were listed. Past roughly 20, a list stops signalling expertise and starts signalling that nothing here is deep.`,
        evidence: null,
        deduction,
        recommendation:
          "Cut to the 12–16 skills most relevant to the roles you are targeting, and group them under 2–3 clear labels.",
      }),
    );
  }

  // --- Specificity -------------------------------------------------------
  const generic = skills.filter(isGenericSkill);
  const genericRatio = generic.length / Math.max(1, skills.length);
  if (genericRatio >= 0.4) {
    const deduction = budget.deduct(genericRatio >= 0.65 ? 3 : 2);
    findings.push(
      makeFinding({
        id: "skills.too_generic",
        category: CATEGORY,
        severity: genericRatio >= 0.65 ? "high" : "medium",
        title: "Your skills are mostly generic",
        description: `${generic.length} of ${skills.length} listed skills are soft or universal claims such as ${generic
          .slice(0, 3)
          .join(", ")}. These do not differentiate you — nearly every applicant lists them, and almost no recruiter searches for them.`,
        evidence: generic.slice(0, 6).join(", "),
        deduction,
        recommendation:
          "Replace generic entries with named tools, platforms, standards and methods you actually use. Prove soft skills through your achievement bullets instead of claiming them here.",
      }),
    );
  }

  const specific = skills.filter(isTechnicalSkill);
  if (specific.length === 0 && skills.length >= 4) {
    const deduction = budget.deduct(2);
    findings.push(
      makeFinding({
        id: "skills.no_recognized_keywords",
        category: CATEGORY,
        severity: "medium",
        title: "No widely recognised skill keywords detected",
        description:
          "None of your listed skills matched the named tools, platforms or methodologies that recruiters commonly search for. This may simply mean your field's terms are niche — but it is worth checking against real job ads.",
        evidence: skills.slice(0, 8).join(", "),
        deduction,
        recommendation:
          "Open three job ads for your target role and adopt the exact terminology they use for the tools and methods you already know.",
      }),
    );
  }

  // --- Organisation ------------------------------------------------------
  const skillsSection = doc.sectionMap.get("skills");
  const hasGrouping =
    skillsSection?.lines.some((l) => /[:：]/.test(l.text)) ?? false;
  if (!hasGrouping && unique >= 12) {
    const deduction = budget.deduct(1);
    findings.push(
      makeFinding({
        id: "skills.ungrouped",
        category: CATEGORY,
        severity: "low",
        title: "A long skills list with no grouping",
        description: `${unique} skills run together as one undifferentiated block, which is slow to scan.`,
        evidence: null,
        deduction,
        recommendation:
          "Group them under 2–4 labels, for example \"Technical:\", \"Analytics:\", \"Domain:\", each on its own line.",
      }),
    );
  }

  if (budget.score >= CATEGORY_WEIGHTS[CATEGORY] - 1) {
    findings.push(
      makeFinding({
        id: "skills.strong",
        category: CATEGORY,
        severity: "positive",
        title: "A specific, well-organised skills section",
        description: `${unique} distinct skills, of which ${specific.length} match widely searched keywords.`,
        evidence: null,
        deduction: 0,
        recommendation: "Refresh this list against each target role.",
        addressable: false,
      }),
    );
  }

  const score = budget.score;
  return {
    score,
    findings,
    summary:
      score >= 8
        ? "Specific, searchable and well-organised skills."
        : score >= 5
          ? "A usable skills list that needs sharper, more specific terms."
          : "The skills section will not survive keyword filtering.",
    summaryAr:
      score >= 8
        ? "المهارات محددة وقابلة للبحث ومنظمة."
        : score >= 5
          ? "قائمة مهارات مقبولة تحتاج مصطلحات أدق وأكثر تحديدًا."
          : "قسم المهارات لن يجتاز فلترة الكلمات المفتاحية.",
  };
}
