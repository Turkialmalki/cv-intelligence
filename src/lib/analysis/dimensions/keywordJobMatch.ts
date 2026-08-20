import { CATEGORY_WEIGHTS } from "../config";
import { computeJobMatch, inferKeywordReadiness } from "../jobMatch";
import type { Finding, JobMatch } from "../schema";
import {
  makeFinding,
  ScoreBudget,
  type DimensionResult,
  type ScoringContext,
} from "./shared";

const CATEGORY = "keyword_job_match" as const;

export interface KeywordDimensionResult extends DimensionResult {
  jobMatch: JobMatch | null;
}

/**
 * With a job description we score real overlap. Without one we score general
 * keyword readiness and say plainly that no target role was assumed.
 */
export function scoreKeywordJobMatch(
  ctx: ScoringContext,
): KeywordDimensionResult {
  const { doc, jobDescription, targetRole } = ctx;
  const budget = new ScoreBudget(CATEGORY_WEIGHTS[CATEGORY]);
  const findings: Finding[] = [];
  const max = CATEGORY_WEIGHTS[CATEGORY];

  /* ---------------------------------------------------------------- */
  /* No job description: cautious, non-committal assessment            */
  /* ---------------------------------------------------------------- */
  if (!jobDescription || jobDescription.trim().length < 60) {
    const { recognizedSkills, density } = inferKeywordReadiness(doc);

    if (recognizedSkills.length === 0) {
      const deduction = budget.deduct(max * 0.55);
      findings.push(
        makeFinding({
          id: "keywords.no_recognized_terms",
          category: CATEGORY,
          severity: "high",
          title: "No widely searched keywords were detected",
          description:
            "None of the tools, platforms, methodologies or standards that recruiters commonly search for appear in your CV. Your field's vocabulary may be niche — but it is worth verifying against live job ads.",
          evidence: null,
          deduction,
          recommendation:
            "Paste a real job description you are targeting and re-run this scan for a precise match report. In the meantime, adopt the exact terminology used in three ads for your target role.",
        }),
      );
    } else if (density < 1.2) {
      const deduction = budget.deduct(max * 0.3);
      findings.push(
        makeFinding({
          id: "keywords.thin_coverage",
          category: CATEGORY,
          severity: "medium",
          title: "Recognisable keywords are thinly spread",
          description: `${recognizedSkills.length} searchable terms were found across roughly ${doc.totalWords} words. Keyword-based shortlisting rewards terms that appear in context inside your experience, not only in a list.`,
          evidence: recognizedSkills.slice(0, 8).join(", "),
          deduction,
          recommendation:
            "Work your core tools and methods into your achievement bullets, so they appear where they can be verified rather than only in a skills list.",
        }),
      );
    }

    findings.push(
      makeFinding({
        id: "keywords.no_target_provided",
        category: CATEGORY,
        severity: "low",
        title: "No target role was provided",
        description:
          "This category was scored on general keyword readiness only. No assumption has been made about which role you are applying for.",
        evidence: null,
        // Without a target we cannot verify fit, so this category cannot be
        // awarded in full. The deduction is meaningful enough that supplying
        // a job description is genuinely worth the candidate's time.
        deduction: budget.deduct(max * 0.25),
        recommendation:
          "Add the job description of a role you actually want, and this section becomes a precise gap report: which required skills you match, and which you do not.",
      }),
    );

    const score = budget.score;
    return {
      score,
      jobMatch: null,
      findings,
      summary:
        "Scored on general keyword readiness — no target role was supplied.",
      summaryAr:
        "تم التقييم على جاهزية الكلمات المفتاحية بشكل عام دون افتراض وظيفة مستهدفة.",
    };
  }

  /* ---------------------------------------------------------------- */
  /* Job description supplied: real overlap                            */
  /* ---------------------------------------------------------------- */
  const jobMatch = computeJobMatch({ doc, jobDescription, targetRole });

  // Convert the 0-100 match into the dimension's point budget, then attribute
  // that gap across the findings that explain it, so the potential score can
  // credit the candidate for closing them.
  const earned = (jobMatch.score / 100) * max;
  const gap = Math.max(0, max - earned);

  const gapWeights = {
    missingSkills: jobMatch.missingSkills.length > 0 ? 0.45 : 0,
    experience: jobMatch.breakdown.experience < 45 ? 0.35 : 0,
    seniority: jobMatch.breakdown.seniority <= 40 ? 0.2 : 0,
  };
  const weightTotal =
    gapWeights.missingSkills + gapWeights.experience + gapWeights.seniority;
  /** Splits the gap proportionally; falls back to a single bucket. */
  const share = (weight: number): number =>
    weightTotal > 0 ? budget.deduct((weight / weightTotal) * gap) : 0;

  if (jobMatch.missingSkills.length > 0) {
    findings.push(
      makeFinding({
        id: "keywords.missing_required_skills",
        category: CATEGORY,
        severity:
          jobMatch.breakdown.skills < 40
            ? "critical"
            : jobMatch.breakdown.skills < 70
              ? "high"
              : "medium",
        title: `${jobMatch.missingSkills.length} skill(s) in the job description do not appear in your CV`,
        description: `The role asks for ${jobMatch.missingSkills
          .slice(0, 6)
          .join(", ")}${jobMatch.missingSkills.length > 6 ? " and others" : ""}, none of which were found in your CV. Screening filters are typically built directly from this list.`,
        evidence: jobMatch.missingSkills.slice(0, 10).join(", "),
        deduction: share(gapWeights.missingSkills),
        recommendation:
          "For each item you genuinely have experience with, add it where you used it — inside the relevant achievement bullet. Do not list a skill you cannot discuss in an interview.",
      }),
    );
  }

  if (jobMatch.breakdown.experience < 45) {
    findings.push(
      makeFinding({
        id: "keywords.terms_not_in_experience",
        category: CATEGORY,
        severity: "high",
        title: "The role's vocabulary is missing from your experience section",
        description: `Only ${jobMatch.breakdown.experience}% of the role's key terms appear inside your work history. Terms that show up only in a skills list carry far less weight than terms attached to something you delivered.`,
        evidence: jobMatch.missingKeywords.slice(0, 10).join(", "),
        deduction: share(gapWeights.experience),
        recommendation:
          "Rewrite two or three bullets in your most recent role using the role's own terminology for work you genuinely did.",
      }),
    );
  }

  if (jobMatch.breakdown.seniority <= 40) {
    findings.push(
      makeFinding({
        id: "keywords.seniority_mismatch",
        category: CATEGORY,
        severity: "medium",
        title: "Your seniority signals do not match the role's level",
        description:
          "The level implied by your job titles is a noticeable distance from the level this role describes. That gap is often the reason an otherwise relevant application is filtered out.",
        evidence: jobMatch.inferredTitle,
        deduction: share(gapWeights.seniority),
        recommendation:
          "Make the scope you have genuinely carried explicit — team size, budget owned, decisions you made. Never inflate a title.",
      }),
    );
  }

  // Any residual gap not explained by a specific finding (e.g. a broadly
  // partial match) is still applied so the category score stays honest.
  budget.deduct(budget.score - (max - gap));

  if (jobMatch.score >= 75) {
    findings.push(
      makeFinding({
        id: "keywords.strong_match",
        category: CATEGORY,
        severity: "positive",
        title: `Strong alignment with this role (${jobMatch.score}%)`,
        description: `You match ${jobMatch.matchedSkills.length} of the named skills and ${jobMatch.matchedKeywords.length} of the role's key terms.`,
        evidence: jobMatch.matchedSkills.slice(0, 8).join(", "),
        deduction: 0,
        recommendation:
          "Keep a tailored copy of this version of your CV for this role.",
        addressable: false,
      }),
    );
  }

  const score = budget.score;
  return {
    score,
    jobMatch,
    findings,
    summary: `${jobMatch.score}% alignment with the job description you provided.`,
    summaryAr: `نسبة التوافق مع الوصف الوظيفي المُدخل: ${jobMatch.score}%.`,
  };
}
