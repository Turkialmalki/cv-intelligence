import { CATEGORY_WEIGHTS } from "../config";
import { SCOPE_PLACEHOLDER } from "../rewrite";
import type { Finding } from "../schema";
import {
  countBusinessImpactSignals,
  countOwnershipSignals,
  detectSeniority,
  type SeniorityLevel,
} from "../signals";
import { truncate } from "../text";
import {
  makeFinding,
  ScoreBudget,
  type DimensionResult,
  type ScoringContext,
} from "./shared";

const CATEGORY = "professional_impact" as const;

const RANK: Record<SeniorityLevel, number> = {
  unknown: 0,
  entry: 1,
  senior: 2,
  leadership: 3,
  executive: 4,
};

/**
 * Whether the CV conveys scope and consequence — the difference between
 * "did the work" and "owned the outcome".
 */
export function scoreProfessionalImpact(ctx: ScoringContext): DimensionResult {
  const { doc } = ctx;
  const budget = new ScoreBudget(CATEGORY_WEIGHTS[CATEGORY]);
  const findings: Finding[] = [];

  const fullText = doc.text;
  const ownership = countOwnershipSignals(fullText);
  const businessImpact = countBusinessImpactSignals(fullText);

  if (ownership === 0) {
    const deduction = budget.deduct(1.5);
    const example =
      doc.experience[0]?.bullets[0] ??
      doc.bullets[0]?.text ??
      null;
    findings.push(
      makeFinding({
        id: "impact.no_ownership_signals",
        category: CATEGORY,
        severity: "medium",
        title: "Nothing in your CV shows what you owned",
        description:
          "No indication of scope — team size, budget, stakeholders, or end-to-end responsibility — could be found. Without it, a reader assumes you executed someone else's plan.",
        evidence: example ? truncate(example, 200) : null,
        deduction,
        recommendation:
          "State the scope you genuinely held: how many people you worked with or led, the size of what you managed, and who depended on your output.",
        exampleBefore: example,
        exampleAfter: example
          ? `${example.replace(/[.\s]+$/, "")} — ${
              doc.language === "ar" ? SCOPE_PLACEHOLDER.ar : SCOPE_PLACEHOLDER.en
            }`
          : null,
      }),
    );
  }

  if (businessImpact === 0) {
    const deduction = budget.deduct(1.5);
    findings.push(
      makeFinding({
        id: "impact.no_business_outcome",
        category: CATEGORY,
        severity: "medium",
        title: "Your work is not connected to a business outcome",
        description:
          "None of your bullets link what you did to something the business cares about — revenue, cost, efficiency, retention, quality or risk. Hiring managers fund roles that move those numbers.",
        evidence: null,
        deduction,
        recommendation:
          "For your three strongest bullets, add the consequence: what improved for the organisation because you did this?",
      }),
    );
  }

  // --- Progression -------------------------------------------------------
  const levels = doc.experience.map((e) => detectSeniority(e.headerLine));
  const known = levels.filter((l) => l !== "unknown");
  if (doc.experience.length >= 3 && known.length >= 2) {
    // Entries are reverse-chronological, so progression means rank decreases.
    const ranks = known.map((l) => RANK[l]);
    const progressed = ranks.some((r, i) => i > 0 && (ranks[i] ?? 0) < (ranks[i - 1] ?? 0));
    const flat = new Set(ranks).size === 1;
    if (flat && ranks.length >= 3) {
      const deduction = budget.deduct(0.75);
      findings.push(
        makeFinding({
          id: "impact.flat_trajectory",
          category: CATEGORY,
          severity: "low",
          title: "Your titles show no upward movement",
          description:
            "Across your roles the seniority level stays flat. This is common and often has good reasons — but if your responsibilities did grow, the CV is currently hiding it.",
          evidence: doc.experience
            .slice(0, 3)
            .map((e) => truncate(e.headerLine, 40))
            .join(" · "),
          deduction,
          recommendation:
            "Where a title stayed the same but scope grew, show the growth in the bullets: a larger team, a bigger budget, a wider remit.",
        }),
      );
    } else if (progressed) {
      findings.push(
        makeFinding({
          id: "impact.clear_progression",
          category: CATEGORY,
          severity: "positive",
          title: "Clear career progression",
          description:
            "Your titles show increasing seniority over time, which is one of the strongest signals a hiring manager reads.",
          evidence: null,
          deduction: 0,
          recommendation: "Keep making each step in the progression explicit.",
          addressable: false,
        }),
      );
    }
  }

  // --- Leadership evidence ----------------------------------------------
  const topLevel = levels.reduce<SeniorityLevel>(
    (best, l) => (RANK[l] > RANK[best] ? l : best),
    "unknown",
  );
  if (
    (topLevel === "leadership" || topLevel === "executive") &&
    ownership === 0
  ) {
    const deduction = budget.deduct(0.75);
    findings.push(
      makeFinding({
        id: "impact.leadership_unevidenced",
        category: CATEGORY,
        severity: "medium",
        title: "A leadership title with no leadership evidence",
        description:
          "Your titles indicate a leadership role, but nothing in the bullets shows a team, a budget or a decision you owned. That mismatch invites scepticism rather than confidence.",
        evidence: null,
        deduction,
        recommendation:
          "Name the size of the team you led and the scope of what you were accountable for. Concrete beats impressive.",
      }),
    );
  }

  if (budget.score >= CATEGORY_WEIGHTS[CATEGORY] - 0.5) {
    findings.push(
      makeFinding({
        id: "impact.strong",
        category: CATEGORY,
        severity: "positive",
        title: "Scope and business impact come through clearly",
        description:
          "Your CV shows what you owned and what changed for the organisation as a result.",
        evidence: null,
        deduction: 0,
        recommendation: "No change needed here.",
        addressable: false,
      }),
    );
  }

  const score = budget.score;
  return {
    score,
    findings,
    summary:
      score >= 4
        ? "Ownership and business impact are clearly conveyed."
        : score >= 2.5
          ? "Some scope is visible, but impact is under-stated."
          : "The CV does not convey ownership or consequence.",
    summaryAr:
      score >= 4
        ? "المسؤولية والأثر على العمل واضحان."
        : score >= 2.5
          ? "نطاق العمل ظاهر جزئيًا لكن الأثر غير مُبرز."
          : "السيرة لا تُظهر المسؤولية أو أثر العمل.",
  };
}
