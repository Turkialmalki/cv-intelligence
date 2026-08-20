import { CATEGORY_WEIGHTS, THRESHOLDS } from "../config";
import type { Finding } from "../schema";
import { makeFinding, ScoreBudget, type DimensionResult, type ScoringContext } from "./shared";

const CATEGORY = "ats_parseability" as const;

/**
 * How reliably an applicant tracking system can turn this file back into
 * structured text. This is about machine readability, not design taste.
 */
export function scoreAtsParseability(ctx: ScoringContext): DimensionResult {
  const { doc, condition } = ctx;
  const budget = new ScoreBudget(CATEGORY_WEIGHTS[CATEGORY]);
  const findings: Finding[] = [];

  if (condition === "image_based_document") {
    const deduction = budget.deduct(CATEGORY_WEIGHTS[CATEGORY]);
    findings.push(
      makeFinding({
        id: "ats.image_based",
        category: CATEGORY,
        severity: "critical",
        title: "Your CV appears to be an image, not text",
        description:
          "Almost no machine-readable text could be extracted from this file. Applicant tracking systems read text, not pictures — a scanned or image-only CV is very often discarded before a human ever sees it.",
        evidence: null,
        deduction,
        recommendation:
          "Export your CV directly from Word, Google Docs or Pages as a PDF (File → Export as PDF), rather than scanning a printout or exporting an image. Then re-run this scan.",
        addressable: true,
      }),
    );
    return {
      score: budget.score,
      findings,
      summary: "No readable text could be extracted from this document.",
      summaryAr: "تعذّر استخراج نص قابل للقراءة من هذا الملف.",
    };
  }

  if (condition === "too_short") {
    const deduction = budget.deduct(6);
    findings.push(
      makeFinding({
        id: "ats.too_short",
        category: CATEGORY,
        severity: "critical",
        title: "Very little content could be read from your CV",
        description: `Only about ${doc.totalWords} words were extracted. Either the document is genuinely very short, or its layout is preventing text from being read correctly.`,
        evidence: null,
        deduction,
        recommendation:
          "Confirm your CV opens as selectable text (try selecting a paragraph in your PDF reader). If the text is not selectable, re-export it from your word processor.",
      }),
    );
  }

  const { formatting } = doc;

  // Multi-column layouts: the single biggest real-world parsing failure.
  if (formatting.suspectedColumnLines >= 6) {
    const severity =
      formatting.suspectedColumnLines >= 14 ? "critical" : "high";
    const deduction = budget.deduct(
      formatting.suspectedColumnLines >= 14 ? 5 : 3,
    );
    findings.push(
      makeFinding({
        id: "ats.multi_column_layout",
        category: CATEGORY,
        severity,
        title: "Multi-column layout detected",
        description: `${formatting.suspectedColumnLines} lines show the wide internal gaps typical of a two-column CV template. Many parsers read such layouts left-to-right across both columns, which scrambles your sentences into nonsense before a recruiter sees them.`,
        evidence:
          doc.lines.find((l) => /\S {6,}\S/.test(l.raw))?.raw ?? null,
        deduction,
        recommendation:
          "Move to a single-column layout. Keep your sidebar content (skills, contact, languages) as normal full-width sections instead.",
      }),
    );
  }

  if (formatting.tabularLines >= 10) {
    const deduction = budget.deduct(2.5);
    findings.push(
      makeFinding({
        id: "ats.tables_detected",
        category: CATEGORY,
        severity: "high",
        title: "Content appears to sit inside tables",
        description:
          "Wide column gaps and tab characters suggest your content is laid out in tables. Table cells are frequently flattened out of order — or dropped entirely — during parsing.",
        evidence: doc.lines.find((l) => /\S {3,}\S/.test(l.raw))?.raw ?? null,
        deduction,
        recommendation:
          "Replace tables with plain headings and bullet lists. Dates can sit on the same line as the role, separated by a simple dash.",
      }),
    );
  }

  if (formatting.glyphNoiseLines >= 4) {
    const deduction = budget.deduct(2);
    findings.push(
      makeFinding({
        id: "ats.glyph_noise",
        category: CATEGORY,
        severity: "medium",
        title: "Unusual symbols or icons in your text",
        description: `${formatting.glyphNoiseLines} lines contain more symbols than letters. Icon fonts and decorative glyphs usually extract as garbage characters, and can corrupt the fields around them.`,
        evidence: null,
        deduction,
        recommendation:
          "Replace icon fonts with plain text labels — write \"Email:\" and \"Phone:\" instead of using icon glyphs.",
      }),
    );
  }

  if (formatting.hasEmojis) {
    const deduction = budget.deduct(1);
    findings.push(
      makeFinding({
        id: "ats.emojis",
        category: CATEGORY,
        severity: "low",
        title: "Emojis found in your CV",
        description:
          "Emojis frequently extract as replacement characters and read as informal in most professional hiring contexts.",
        evidence: null,
        deduction,
        recommendation: "Remove emojis and use plain text headings instead.",
      }),
    );
  }

  // Sections must be recognisable for a parser to map fields at all.
  if (doc.sections.length === 0) {
    const deduction = budget.deduct(4);
    findings.push(
      makeFinding({
        id: "ats.no_recognizable_sections",
        category: CATEGORY,
        severity: "critical",
        title: "No standard section headings were recognised",
        description:
          "Your CV does not use headings a parser recognises, so it cannot tell which text is your experience, your education or your skills. Everything is treated as one undifferentiated block.",
        evidence: null,
        deduction,
        recommendation:
          "Add plain, conventional headings on their own lines: Summary, Experience, Education, Skills, Certifications.",
      }),
    );
  } else if (doc.sections.length <= 2) {
    const deduction = budget.deduct(2);
    findings.push(
      makeFinding({
        id: "ats.few_recognizable_sections",
        category: CATEGORY,
        severity: "medium",
        title: "Only a few sections could be identified",
        description: `Just ${doc.sections.length} standard heading(s) were recognised. Parsers rely on these headings to map your CV into the right database fields.`,
        evidence: doc.sections.map((s) => s.heading).join(" · "),
        deduction,
        recommendation:
          "Use the conventional heading names rather than creative alternatives — \"Experience\" parses; \"My Journey\" does not.",
      }),
    );
  }

  if (formatting.shoutingLines >= 6) {
    const deduction = budget.deduct(1);
    findings.push(
      makeFinding({
        id: "ats.all_caps_body",
        category: CATEGORY,
        severity: "low",
        title: "Long passages set in ALL CAPS",
        description:
          "Extended uppercase text is slower to read and can defeat the casing heuristics parsers use to separate headings from body content.",
        evidence: null,
        deduction,
        recommendation:
          "Reserve capitals for short headings; keep body text in sentence case.",
      }),
    );
  }

  // Length: too long and it is skimmed, too short and it looks thin.
  const pages = doc.estimatedPages;
  if (doc.totalWords > THRESHOLDS.cvWords.max) {
    const deduction = budget.deduct(1.5);
    findings.push(
      makeFinding({
        id: "ats.too_long",
        category: CATEGORY,
        severity: "medium",
        title: "Your CV is longer than most recruiters will read",
        description: `At roughly ${doc.totalWords} words (about ${pages} pages), your CV is well past the two-page norm for most roles.`,
        evidence: null,
        deduction,
        recommendation:
          "Cut older or less relevant roles down to one line each and keep detail on the last 5–8 years.",
      }),
    );
  }

  if (budget.score === budget.maxPoints) {
    findings.push(
      makeFinding({
        id: "ats.clean_structure",
        category: CATEGORY,
        severity: "positive",
        title: "Cleanly machine-readable",
        description:
          "Your CV extracts as clean, single-column text with recognisable headings — exactly what an applicant tracking system needs.",
        evidence: null,
        deduction: 0,
        recommendation:
          "Keep exporting as a text-based PDF from your word processor.",
        addressable: false,
      }),
    );
  }

  const score = budget.score;
  return {
    score,
    findings,
    summary:
      score >= 13
        ? "Parses cleanly into structured text."
        : score >= 9
          ? "Mostly readable, with formatting that risks misparsing."
          : "Formatting is likely to break automated parsing.",
    summaryAr:
      score >= 13
        ? "يُقرأ الملف بوضوح ويتحوّل إلى نص منظم."
        : score >= 9
          ? "مقروء غالبًا، لكن التنسيق قد يسبب أخطاء في القراءة الآلية."
          : "التنسيق الحالي قد يعطّل قراءة الأنظمة لسيرتك.",
  };
}
