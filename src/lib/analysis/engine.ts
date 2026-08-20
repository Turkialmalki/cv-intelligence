import {
  CATEGORY_LABELS,
  CATEGORY_WEIGHTS,
  ENGINE_VERSION,
  POTENTIAL_CEILING,
  POTENTIAL_DAMPING_CONSTANT,
  POTENTIAL_RECOVERY_RATE,
  THRESHOLDS,
  classificationLabel,
  classify,
} from "./config";
import { scoreAchievementStrength } from "./dimensions/achievementStrength";
import { scoreAtsParseability } from "./dimensions/atsParseability";
import { scoreContactInformation } from "./dimensions/contactInformation";
import { scoreExperienceQuality } from "./dimensions/experienceQuality";
import { scoreKeywordJobMatch } from "./dimensions/keywordJobMatch";
import { scoreProfessionalImpact } from "./dimensions/professionalImpact";
import { scoreRecruiterReadability } from "./dimensions/recruiterReadability";
import { pct, type ScoringContext } from "./dimensions/shared";
import { scoreSkillsQuality } from "./dimensions/skillsQuality";
import { scoreStructure } from "./dimensions/structure";
import { normalizeCV, type CVDocument } from "./normalize";
import { rewriteBullet, rewriteSummary } from "./rewrite";
import {
  analysisResultSchema,
  type AnalysisResult,
  type Category,
  type CategoryScore,
  type ComparisonLine,
  type DocumentCondition,
  type Finding,
  type PriorityAction,
} from "./schema";
import { hasMetric, startsWithWeakOpener } from "./signals";
import { slugId, truncate, wordCount } from "./text";

export interface AnalyzeOptions {
  /** Raw extracted CV text. */
  text: string;
  jobDescription?: string | null;
  targetRole?: string | null;
  /** Page count from the parser, when available. */
  parserPageCount?: number | null;
  /** Set when the parser already knows the document is unusable. */
  condition?: DocumentCondition;
}

/** Severity ordering used everywhere findings are sorted for display. */
const SEVERITY_RANK: Record<Finding["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  positive: 4,
};

/**
 * Decides whether the extracted text is usable at all. Called before scoring
 * so an image-only PDF produces an honest condition rather than a fake score.
 */
export function assessCondition(
  text: string,
  parserPageCount: number | null,
): DocumentCondition {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "image_based_document";

  // The per-page heuristic only makes sense for a genuinely multi-page file:
  // pages of layout with no extractable text means the content is imagery.
  // A single short page is simply a short CV, which is a different problem.
  if (parserPageCount && parserPageCount >= 2) {
    const perPage = trimmed.length / parserPageCount;
    if (perPage < THRESHOLDS.imageBasedCharsPerPage) {
      return "image_based_document";
    }
  }

  if (trimmed.length < 60) return "image_based_document";
  if (trimmed.length < THRESHOLDS.minExtractedChars) return "too_short";
  return "ok";
}

/* -------------------------------------------------------------------------- */
/* Potential score                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The realistic ceiling if the candidate acts on every fixable finding.
 *
 * Two deliberate conservatisms keep this honest:
 *   1. Only `POTENTIAL_RECOVERY_RATE` of each addressable deduction is
 *      credited back — a rewrite recovers most, not all, of a lost point.
 *   2. Diminishing returns on the size of the recoverable pool, so a CV with
 *      forty points of problems is not told it can reach the nineties.
 *
 * The result is a figure the candidate could actually hit, which is the whole
 * point of showing it.
 */
export function computePotentialScore(
  overall: number,
  findings: Finding[],
): number {
  const recoverable = findings
    .filter((f) => f.addressable && f.severity !== "positive")
    .reduce((sum, f) => sum + f.deduction, 0);

  if (recoverable <= 0) return overall;

  const damping = 1 / (1 + recoverable / POTENTIAL_DAMPING_CONSTANT);
  const gain = recoverable * POTENTIAL_RECOVERY_RATE * damping;

  return Math.min(
    POTENTIAL_CEILING,
    Math.max(overall, Math.round(overall + gain)),
  );
}

/* -------------------------------------------------------------------------- */
/* Priorities                                                                 */
/* -------------------------------------------------------------------------- */

function buildPriorities(findings: Finding[]): PriorityAction[] {
  return findings
    .filter((f) => f.addressable && f.severity !== "positive" && f.deduction > 0)
    .sort(
      (a, b) =>
        b.deduction - a.deduction ||
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
    )
    .slice(0, 3)
    .map((f, i) => ({
      id: f.id,
      rank: i + 1,
      title: f.title,
      titleAr: f.title,
      description: f.recommendation,
      descriptionAr: f.recommendation,
      estimatedGain:
        Math.round(f.deduction * POTENTIAL_RECOVERY_RATE * 10) / 10,
      category: f.category,
    }));
}

/* -------------------------------------------------------------------------- */
/* Before / after comparison                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Builds the before/after view strictly from real extracted content.
 * Nothing here is generated from nothing — every "before" is a verbatim line
 * from the candidate's CV, and every "after" is a transformation of it.
 */
function buildComparison(doc: CVDocument, limit = 8): ComparisonLine[] {
  const lines: ComparisonLine[] = [];

  const summarySection = doc.sectionMap.get("summary");
  if (summarySection && summarySection.text.trim()) {
    const original = summarySection.text.trim();
    const rewritten = rewriteSummary(original, doc.language);
    if (rewritten.changed) {
      lines.push({
        id: slugId("cmp.summary", original),
        section: "summary",
        original: truncate(original, 520),
        optimized: rewritten.text,
        issue: hasMetric(original) ? "low" : "medium",
        note: rewritten.notes[0] ?? null,
      });
    }
  }

  const bullets =
    doc.experience.flatMap((e) => e.bullets).length > 0
      ? doc.experience.flatMap((e) => e.bullets)
      : doc.bullets.map((b) => b.text);

  // Prioritise the bullets where the transformation is most instructive.
  const ranked = [...bullets]
    .filter((b) => wordCount(b) >= 4)
    .map((b) => ({
      text: b,
      weight:
        (startsWithWeakOpener(b) ? 2 : 0) +
        (hasMetric(b) ? 0 : 1) +
        (wordCount(b) > THRESHOLDS.bulletWords.max ? 1 : 0),
    }))
    .sort((a, b) => b.weight - a.weight);

  for (const candidate of ranked) {
    if (lines.length >= limit) break;
    const rewritten = rewriteBullet(candidate.text, doc.language);
    if (!rewritten.changed) continue;
    lines.push({
      id: slugId("cmp.bullet", candidate.text),
      section: "experience",
      original: candidate.text,
      optimized: rewritten.text,
      issue:
        candidate.weight >= 3
          ? "critical"
          : candidate.weight === 2
            ? "high"
            : candidate.weight === 1
              ? "medium"
              : "low",
      note: rewritten.notes[0] ?? null,
    });
  }

  return lines;
}

/* -------------------------------------------------------------------------- */
/* Summary copy                                                               */
/* -------------------------------------------------------------------------- */

function buildSummaryCopy(
  doc: CVDocument,
  overall: number,
  potential: number,
  findings: Finding[],
) {
  const label = classificationLabel(classify(overall));
  const positives = findings.filter((f) => f.severity === "positive");
  const topIssue = findings.find(
    (f) => f.severity === "critical" || f.severity === "high",
  );

  const interpretation = topIssue
    ? `Your CV scores ${overall} out of 100. The biggest single thing holding it back is: ${topIssue.title.toLowerCase()}. Addressing your top three issues would put you at roughly ${potential}.`
    : `Your CV scores ${overall} out of 100 with no critical issues detected. The remaining gains are refinements rather than repairs.`;

  const interpretationAr = topIssue
    ? `سيرتك حصلت على ${overall} من 100. أكبر ما يعيقها حاليًا: ${topIssue.title}. معالجة أهم ثلاث نقاط ترفعك إلى ${potential} تقريبًا.`
    : `سيرتك حصلت على ${overall} من 100 دون ملاحظات حرجة. ما تبقّى تحسينات دقيقة وليست إصلاحات.`;

  return {
    headline: `${label.en} — ${overall}/100`,
    headlineAr: `${label.ar} — ${overall}/100`,
    interpretation,
    interpretationAr,
    strengths: positives.slice(0, 3).map((p) => p.title),
    strengthsAr: positives.slice(0, 3).map((p) => p.title),
    wordCount: doc.totalWords,
    bulletCount: doc.bullets.length,
    estimatedPages: doc.estimatedPages,
  };
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The complete deterministic analysis. Pure: the same input always yields the
 * same output. No randomness, no clock, no network, no model calls.
 */
export function analyzeCV(options: AnalyzeOptions): AnalysisResult {
  const { text, jobDescription = null, targetRole = null } = options;
  const parserPageCount = options.parserPageCount ?? null;
  const condition =
    options.condition ?? assessCondition(text, parserPageCount);

  const doc = normalizeCV(text, { parserPageCount });
  const ctx: ScoringContext = {
    doc,
    condition,
    jobDescription: jobDescription?.trim() ? jobDescription : null,
    targetRole: targetRole?.trim() ? targetRole : null,
  };

  const keyword = scoreKeywordJobMatch(ctx);

  const results: Array<{ category: Category; result: ReturnType<typeof scoreStructure> }> = [
    { category: "ats_parseability", result: scoreAtsParseability(ctx) },
    { category: "contact_information", result: scoreContactInformation(ctx) },
    { category: "structure", result: scoreStructure(ctx) },
    { category: "experience_quality", result: scoreExperienceQuality(ctx) },
    { category: "achievement_strength", result: scoreAchievementStrength(ctx) },
    { category: "skills_quality", result: scoreSkillsQuality(ctx) },
    {
      category: "recruiter_readability",
      result: scoreRecruiterReadability(ctx),
    },
    { category: "keyword_job_match", result: keyword },
    { category: "professional_impact", result: scoreProfessionalImpact(ctx) },
  ];

  const categories: CategoryScore[] = results.map(({ category, result }) => {
    const max = CATEGORY_WEIGHTS[category];
    const score = Math.max(0, Math.min(max, result.score));
    return {
      category,
      score: Math.round(score * 10) / 10,
      max,
      percentage: pct(score, max),
      label: CATEGORY_LABELS[category].en,
      labelAr: CATEGORY_LABELS[category].ar,
      summary: result.summary,
      summaryAr: result.summaryAr,
    };
  });

  const findings = results
    .flatMap(({ result }) => result.findings)
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        b.deduction - a.deduction ||
        a.id.localeCompare(b.id),
    );

  const overallScore = Math.max(
    0,
    Math.min(100, Math.round(categories.reduce((sum, c) => sum + c.score, 0))),
  );
  const potentialScore = computePotentialScore(overallScore, findings);

  const result: AnalysisResult = {
    overallScore,
    potentialScore,
    classification: classify(overallScore),
    language: doc.language,
    condition,
    categories,
    findings,
    priorities: buildPriorities(findings),
    candidate: {
      name: doc.contact.name,
      email: doc.contact.email,
      phone: doc.contact.phone,
      location: doc.contact.location,
      linkedin: doc.contact.linkedin,
      portfolio: doc.contact.portfolio,
      nameConfident: doc.contact.nameConfident,
    },
    sections: doc.sections.map((s) => ({
      type: s.type,
      heading: s.heading,
      present: true,
      lineCount: s.lines.length,
      order: s.order,
    })),
    jobMatch: keyword.jobMatch,
    comparison: buildComparison(doc),
    summary: buildSummaryCopy(doc, overallScore, potentialScore, findings),
    engineVersion: ENGINE_VERSION,
  };

  // Fail loudly in development if the engine ever produces a shape the rest
  // of the system cannot trust.
  return analysisResultSchema.parse(result);
}
