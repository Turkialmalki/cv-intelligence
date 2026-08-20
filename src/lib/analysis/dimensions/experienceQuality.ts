import { CATEGORY_WEIGHTS } from "../config";
import type { Finding } from "../schema";
import { detectSeniority } from "../signals";
import { truncate } from "../text";
import {
  makeFinding,
  ScoreBudget,
  type DimensionResult,
  type ScoringContext,
} from "./shared";

const CATEGORY = "experience_quality" as const;

/**
 * Whether the work history is legible as a career: clear roles, clear
 * employers, clear dates, and enough substance under each entry.
 */
export function scoreExperienceQuality(ctx: ScoringContext): DimensionResult {
  const { doc } = ctx;
  const budget = new ScoreBudget(CATEGORY_WEIGHTS[CATEGORY]);
  const findings: Finding[] = [];
  const entries = doc.experience;

  if (entries.length === 0) {
    const hasSection = doc.sectionMap.has("experience");
    const deduction = budget.deduct(hasSection ? 9 : 11);
    findings.push(
      makeFinding({
        id: hasSection ? "experience.unparseable" : "experience.no_history",
        category: CATEGORY,
        severity: "critical",
        title: hasSection
          ? "Your work history could not be read as separate roles"
          : "No work experience section was found",
        description: hasSection
          ? "An experience section exists, but no distinct role entries could be identified within it. Without a recognisable role/employer/date pattern, a parser cannot build your work history."
          : "No work experience could be identified in this document. For any non-entry-level role, this section carries most of the screening weight.",
        evidence: null,
        deduction,
        recommendation:
          "Format each role as three predictable parts: a line with your job title, a line with the employer and location, and a line with the dates — for example \"Marketing Manager\", \"Acme Group — Riyadh\", \"Mar 2021 – Present\".",
        addressable: hasSection,
      }),
    );
    return {
      score: budget.score,
      findings,
      summary: "No readable work history.",
      summaryAr: "لا توجد خبرات عملية قابلة للقراءة.",
    };
  }

  // --- Dates -------------------------------------------------------------
  const withDates = entries.filter((e) => e.dateRange !== null);
  const missingDates = entries.length - withDates.length;
  if (missingDates > 0) {
    const severity = missingDates >= entries.length / 2 ? "critical" : "high";
    const deduction = budget.deduct(Math.min(4, missingDates * 1.5));
    const example = entries.find((e) => e.dateRange === null);
    findings.push(
      makeFinding({
        id: "experience.missing_dates",
        category: CATEGORY,
        severity,
        title: `${missingDates} role${missingDates > 1 ? "s are" : " is"} missing dates`,
        description:
          "Roles without start and end dates cannot be placed on a timeline. Recruiters read undated roles as an attempt to hide a gap, and parsers often drop them entirely.",
        evidence: example ? truncate(example.headerLine, 160) : null,
        deduction,
        recommendation:
          "Give every role a month and year range in a consistent format, e.g. \"Jan 2022 – Mar 2024\" or \"Jan 2022 – Present\".",
      }),
    );
  }

  const incompleteRanges = withDates.filter(
    (e) => e.dateRange && (!e.dateRange.hasStart || !e.dateRange.hasEnd),
  );
  if (incompleteRanges.length > 0) {
    const deduction = budget.deduct(Math.min(2, incompleteRanges.length * 0.8));
    findings.push(
      makeFinding({
        id: "experience.partial_dates",
        category: CATEGORY,
        severity: "medium",
        title: "Some roles show only one date",
        description: `${incompleteRanges.length} role(s) show a single year rather than a start-to-end range, leaving the duration ambiguous.`,
        evidence: incompleteRanges[0]?.dateRange?.raw ?? null,
        deduction,
        recommendation:
          "Always show both ends of the range. Use \"Present\" for your current role.",
      }),
    );
  }

  // --- Chronology --------------------------------------------------------
  const dated = withDates
    .map((e) => e.dateRange?.startYear)
    .filter((y): y is number => typeof y === "number");
  const isReverseChronological = dated.every(
    (year, i) => i === 0 || year <= (dated[i - 1] ?? year),
  );
  if (dated.length >= 2 && !isReverseChronological) {
    const deduction = budget.deduct(1.5);
    findings.push(
      makeFinding({
        id: "experience.not_reverse_chronological",
        category: CATEGORY,
        severity: "medium",
        title: "Roles are not in reverse-chronological order",
        description: `Your roles start in ${dated.join(", ")}. Recruiters read the first role as your current one; a different order makes them work to reconstruct your timeline.`,
        evidence: null,
        deduction,
        recommendation:
          "List your most recent role first and work backwards.",
      }),
    );
  }

  // --- Employment gaps ---------------------------------------------------
  const sorted = withDates
    .map((e) => e.dateRange)
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .filter((d) => d.startYear !== null)
    .sort((a, b) => (b.startYear ?? 0) - (a.startYear ?? 0));
  let largestGap = 0;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const newer = sorted[i];
    const older = sorted[i + 1];
    if (!newer || !older) continue;
    const olderEnd = older.endYear ?? older.startYear;
    if (olderEnd === null || newer.startYear === null) continue;
    largestGap = Math.max(largestGap, newer.startYear - olderEnd);
  }
  if (largestGap >= 2) {
    const deduction = budget.deduct(1);
    findings.push(
      makeFinding({
        id: "experience.timeline_gap",
        category: CATEGORY,
        severity: "medium",
        title: `An unexplained gap of about ${largestGap} years`,
        description:
          "Your timeline contains a multi-year gap with nothing in it. Unexplained gaps invite the least generous interpretation from a screener.",
        evidence: null,
        deduction,
        recommendation:
          "Account for the period honestly with a short entry — study, certification, freelance work, caregiving or a career break. One line is enough.",
      }),
    );
  }

  // --- Substance under each role ----------------------------------------
  const thinEntries = entries.filter((e) => e.bullets.length === 0);
  if (thinEntries.length > 0) {
    const deduction = budget.deduct(Math.min(3, thinEntries.length * 1.2));
    findings.push(
      makeFinding({
        id: "experience.roles_without_detail",
        category: CATEGORY,
        severity: "high",
        title: `${thinEntries.length} role${thinEntries.length > 1 ? "s have" : " has"} no description`,
        description:
          "A job title with no supporting lines tells a recruiter nothing about what you actually did or how well you did it.",
        evidence: thinEntries[0]
          ? truncate(thinEntries[0].headerLine, 160)
          : null,
        deduction,
        recommendation:
          "Add 3–5 bullets to each substantive role. Lead with what you delivered, not what you were assigned.",
      }),
    );
  }

  const underDescribed = entries.filter(
    (e) => e.bullets.length > 0 && e.bullets.length < 2,
  );
  if (underDescribed.length >= 2) {
    const deduction = budget.deduct(1.5);
    findings.push(
      makeFinding({
        id: "experience.under_described",
        category: CATEGORY,
        severity: "medium",
        title: "Several roles are described in a single line",
        description: `${underDescribed.length} roles carry only one line of detail, which is rarely enough to convey scope or results.`,
        evidence: underDescribed[0]?.bullets[0] ?? null,
        deduction,
        recommendation:
          "For your most relevant roles, expand to 3–5 lines covering scope, what you delivered, and the outcome.",
      }),
    );
  }

  // --- Employer identification ------------------------------------------
  const withOrg = entries.filter((e) => e.hasOrganizationHint);
  if (withOrg.length === 0 && entries.length >= 2) {
    const deduction = budget.deduct(1.5);
    findings.push(
      makeFinding({
        id: "experience.employer_unclear",
        category: CATEGORY,
        severity: "high",
        title: "Employer names are hard to identify",
        description:
          "No clear organisation names could be picked out of your role headers. Where you worked is a primary screening signal and a required parser field.",
        evidence: truncate(entries[0]?.headerLine ?? "", 160),
        deduction,
        recommendation:
          "Write the employer name on its own line under each job title, with the city — e.g. \"Almarai — Riyadh\".",
      }),
    );
  }

  // --- Progression -------------------------------------------------------
  if (entries.length >= 3) {
    const levels = entries.map((e) => detectSeniority(e.headerLine));
    const allUnknown = levels.every((l) => l === "unknown");
    if (allUnknown) {
      const deduction = budget.deduct(1);
      findings.push(
        makeFinding({
          id: "experience.progression_unclear",
          category: CATEGORY,
          severity: "low",
          title: "Career progression is not visible",
          description:
            "Your role titles do not signal a level, so a reader cannot see whether you have grown across your career.",
          evidence: entries
            .slice(0, 3)
            .map((e) => truncate(e.headerLine, 50))
            .join(" · "),
          deduction,
          recommendation:
            "Use your official titles exactly as they appear in your contracts. If a title was internal jargon, add the standard equivalent in brackets.",
        }),
      );
    }
  }

  if (budget.score >= CATEGORY_WEIGHTS[CATEGORY] - 1.5) {
    findings.push(
      makeFinding({
        id: "experience.clear_history",
        category: CATEGORY,
        severity: "positive",
        title: "Your work history reads clearly",
        description: `${entries.length} roles with clear titles, employers and dates in reverse-chronological order.`,
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
      score >= 12
        ? "A clear, complete and well-dated work history."
        : score >= 8
          ? "Readable history with gaps in dates or detail."
          : "The work history is difficult to reconstruct.",
    summaryAr:
      score >= 12
        ? "تاريخ وظيفي واضح ومكتمل ومؤرَّخ بدقة."
        : score >= 8
          ? "التاريخ الوظيفي مقروء لكن تنقصه تواريخ أو تفاصيل."
          : "يصعب تتبّع التاريخ الوظيفي بشكله الحالي.",
  };
}
