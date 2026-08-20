import { CATEGORY_WEIGHTS } from "../config";
import { EXPECTED_SECTIONS, SECTION_HEADINGS } from "../lexicon";
import { sectionOrderPenalty } from "../normalize";
import type { Finding } from "../schema";
import {
  makeFinding,
  ScoreBudget,
  type DimensionResult,
  type ScoringContext,
} from "./shared";

const CATEGORY = "structure" as const;

const SECTION_LABELS: Record<string, { en: string; ar: string }> = {
  summary: { en: "Professional Summary", ar: "الملخص المهني" },
  experience: { en: "Experience", ar: "الخبرات العملية" },
  education: { en: "Education", ar: "التعليم" },
  skills: { en: "Skills", ar: "المهارات" },
  certifications: { en: "Certifications", ar: "الشهادات" },
  projects: { en: "Projects", ar: "المشاريع" },
  languages: { en: "Languages", ar: "اللغات" },
};

/**
 * Whether the CV contains the sections a recruiter looks for, in the order
 * they expect to find them.
 */
export function scoreStructure(ctx: ScoringContext): DimensionResult {
  const { doc } = ctx;
  const budget = new ScoreBudget(CATEGORY_WEIGHTS[CATEGORY]);
  const findings: Finding[] = [];

  for (const expected of EXPECTED_SECTIONS) {
    const section = doc.sectionMap.get(expected.type);
    const label = SECTION_LABELS[expected.type] ?? {
      en: expected.type,
      ar: expected.type,
    };

    if (!section) {
      const deduction = budget.deduct(expected.weight);
      findings.push(
        makeFinding({
          id: `structure.missing_${expected.type}`,
          category: CATEGORY,
          severity: expected.required
            ? "critical"
            : expected.weight >= 2
              ? "high"
              : "low",
          title: `Missing section: ${label.en}`,
          description: expected.required
            ? `No "${label.en}" section was found. This is one of the sections a parser maps into dedicated database fields, and its absence means that data simply is not captured.`
            : `No "${label.en}" section was found. It is optional, but it is a common place recruiters look for supporting evidence.`,
          evidence: null,
          deduction,
          recommendation: `Add a "${label.en}" heading on its own line, followed by your entries. Recognised alternatives include: ${SECTION_HEADINGS[expected.type]
            .slice(0, 3)
            .join(", ")}.`,
        }),
      );
      continue;
    }

    // A section that exists but is essentially empty is worse than useless.
    if (section.lines.length === 0) {
      const deduction = budget.deduct(expected.weight * 0.7);
      findings.push(
        makeFinding({
          id: `structure.empty_${expected.type}`,
          category: CATEGORY,
          severity: "high",
          title: `"${label.en}" section is empty`,
          description: `The "${label.en}" heading exists but no content follows it.`,
          evidence: section.heading,
          deduction,
          recommendation: `Fill in the "${label.en}" section or remove the heading entirely.`,
        }),
      );
    } else if (expected.type === "summary" && section.lines.length > 0) {
      const words = section.lines.reduce((s, l) => s + l.words, 0);
      if (words < 18) {
        const deduction = budget.deduct(0.75);
        findings.push(
          makeFinding({
            id: "structure.thin_summary",
            category: CATEGORY,
            severity: "medium",
            title: "Your summary is too thin to do any work",
            description: `Your summary is only about ${words} words. The top third of page one is the most-read area of any CV, and a one-line summary wastes it.`,
            evidence: section.text.slice(0, 200),
            deduction,
            recommendation:
              "Write 2–3 lines covering your current title, years of experience, your domain, and your single strongest result.",
          }),
        );
      } else if (words > 130) {
        const deduction = budget.deduct(0.5);
        findings.push(
          makeFinding({
            id: "structure.bloated_summary",
            category: CATEGORY,
            severity: "low",
            title: "Your summary runs long",
            description: `At roughly ${words} words your summary is closer to a cover letter. Recruiters give this block a few seconds at most.`,
            evidence: null,
            deduction,
            recommendation: "Tighten it to 3–4 lines of concrete positioning.",
          }),
        );
      }
    }
  }

  // Ordering: experience should precede education for anyone past graduation.
  const inversions = sectionOrderPenalty(doc.sections);
  if (inversions >= 2) {
    const deduction = budget.deduct(Math.min(1.5, inversions * 0.4));
    findings.push(
      makeFinding({
        id: "structure.unconventional_order",
        category: CATEGORY,
        severity: "medium",
        title: "Sections are in an unconventional order",
        description: `Your sections appear as: ${doc.sections.map((s) => s.heading).join(" → ")}. Recruiters scan in a fixed order and lose time when a CV departs from it.`,
        evidence: doc.sections.map((s) => s.heading).join(" → "),
        deduction,
        recommendation:
          "Use the conventional order: Summary → Experience → Education → Skills → Certifications. Put Education first only if you graduated within the last year.",
      }),
    );
  }

  const referencesSection = doc.sectionMap.get("references");
  if (referencesSection) {
    const deduction = budget.deduct(0.5);
    findings.push(
      makeFinding({
        id: "structure.references_section",
        category: CATEGORY,
        severity: "low",
        title: "A references section is taking up space",
        description:
          "References are requested at offer stage, not at screening. \"References available on request\" is assumed and adds nothing.",
        evidence: referencesSection.heading,
        deduction,
        recommendation:
          "Remove the references section and use the space for achievements instead.",
      }),
    );
  }

  if (budget.score >= CATEGORY_WEIGHTS[CATEGORY] - 1) {
    findings.push(
      makeFinding({
        id: "structure.complete",
        category: CATEGORY,
        severity: "positive",
        title: "Well-structured and conventionally ordered",
        description:
          "All the sections a recruiter expects are present and appear in a familiar order.",
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
      score >= 10
        ? "All expected sections are present and well ordered."
        : score >= 6.5
          ? "The core sections exist, but some expected ones are missing."
          : "The CV is missing sections recruiters and parsers rely on.",
    summaryAr:
      score >= 10
        ? "جميع الأقسام المتوقعة موجودة ومرتبة بشكل سليم."
        : score >= 6.5
          ? "الأقسام الأساسية موجودة، لكن تنقص بعض الأقسام المتوقعة."
          : "تنقص السيرة أقسامًا يعتمد عليها المسؤولون والأنظمة.",
  };
}
