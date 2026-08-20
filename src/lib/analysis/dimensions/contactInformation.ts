import { CATEGORY_WEIGHTS } from "../config";
import type { Finding } from "../schema";
import {
  makeFinding,
  ScoreBudget,
  type DimensionResult,
  type ScoringContext,
} from "./shared";

const CATEGORY = "contact_information" as const;

/**
 * Whether a recruiter (and a parser) can actually reach this candidate.
 * Required fields fail hard; optional fields cost only a little.
 */
export function scoreContactInformation(ctx: ScoringContext): DimensionResult {
  const { doc } = ctx;
  const budget = new ScoreBudget(CATEGORY_WEIGHTS[CATEGORY]);
  const findings: Finding[] = [];
  const c = doc.contact;

  if (!c.email) {
    const deduction = budget.deduct(3);
    findings.push(
      makeFinding({
        id: "contact.missing_email",
        category: CATEGORY,
        severity: "critical",
        title: "No email address found",
        description:
          "No email address could be detected in your CV. This is the single field every applicant tracking system requires — without it your application may not be storable at all.",
        evidence: null,
        deduction,
        recommendation:
          "Add a professional email address in the top three lines of your CV as plain text (not inside an image or an icon).",
      }),
    );
  } else if (/(?:hotmail|yahoo|aol|live|msn)\./i.test(c.email)) {
    const deduction = budget.deduct(0.5);
    findings.push(
      makeFinding({
        id: "contact.dated_email_domain",
        category: CATEGORY,
        severity: "low",
        title: "Dated email provider",
        description:
          "Your email uses a provider that reads as dated to some recruiters. It is a small signal, but a free one to fix.",
        evidence: c.email,
        deduction,
        recommendation:
          "Consider a firstname.lastname address on Gmail, Outlook or your own domain.",
      }),
    );
  }

  if (!c.phone) {
    const deduction = budget.deduct(2);
    findings.push(
      makeFinding({
        id: "contact.missing_phone",
        category: CATEGORY,
        severity: "high",
        title: "No phone number found",
        description:
          "No phone number could be detected. Recruiters screening a shortlist often call before they email, and a missing number moves you down the list.",
        evidence: null,
        deduction,
        recommendation:
          "Add your phone number with its country code, for example +966 5X XXX XXXX, as plain text near your name.",
      }),
    );
  }

  if (!c.name || !c.nameConfident) {
    const deduction = budget.deduct(1.5);
    findings.push(
      makeFinding({
        id: "contact.name_not_prominent",
        category: CATEGORY,
        severity: "high",
        title: "Your name is not clearly at the top",
        description:
          "A parser could not confidently identify your name as the first element of the document. Names buried inside headers, images or contact blocks are frequently mis-assigned.",
        evidence: null,
        deduction,
        recommendation:
          "Put your full name on its own line as the very first line of the document, in a larger font than the body text.",
      }),
    );
  }

  if (!c.location) {
    const deduction = budget.deduct(0.75);
    findings.push(
      makeFinding({
        id: "contact.missing_location",
        category: CATEGORY,
        severity: "medium",
        title: "No location listed",
        description:
          "No city or country was found. Many roles are filtered by location, and a blank location field often means being excluded from the search entirely.",
        evidence: null,
        deduction,
        recommendation:
          "Add your city and country — for example \"Riyadh, Saudi Arabia\". A full street address is not needed.",
      }),
    );
  }

  if (!c.linkedin) {
    const deduction = budget.deduct(0.75);
    findings.push(
      makeFinding({
        id: "contact.missing_linkedin",
        category: CATEGORY,
        severity: "medium",
        title: "No LinkedIn profile linked",
        description:
          "Recruiters routinely check LinkedIn before making contact. Without a link they either search for you — and may find the wrong person — or move on.",
        evidence: null,
        deduction,
        recommendation:
          "Add your public LinkedIn URL as plain text, and make sure the profile matches the dates and titles in your CV.",
      }),
    );
  }

  if (!c.portfolio) {
    const deduction = budget.deduct(0.4);
    findings.push(
      makeFinding({
        id: "contact.missing_portfolio",
        category: CATEGORY,
        severity: "low",
        title: "No portfolio, GitHub or personal site",
        description:
          "For technical, design and content roles, a link to real work is often the strongest evidence on the page. This is optional for many roles.",
        evidence: null,
        deduction,
        recommendation:
          "If your field has visible output, add a GitHub, Behance or personal site link.",
      }),
    );
  }

  if (budget.score >= CATEGORY_WEIGHTS[CATEGORY] - 0.5) {
    findings.push(
      makeFinding({
        id: "contact.complete",
        category: CATEGORY,
        severity: "positive",
        title: "Contact details are complete and reachable",
        description:
          "Your name, email, phone, location and profile links are all present and machine-readable.",
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
      score >= 7
        ? "A recruiter can reach you easily."
        : score >= 4.5
          ? "Reachable, but missing details that filters rely on."
          : "Critical contact details are missing.",
    summaryAr:
      score >= 7
        ? "بيانات التواصل كاملة ويسهل الوصول إليك."
        : score >= 4.5
          ? "يمكن الوصول إليك، لكن تنقص بيانات تعتمد عليها فلاتر التوظيف."
          : "تنقص بيانات تواصل أساسية.",
  };
}
