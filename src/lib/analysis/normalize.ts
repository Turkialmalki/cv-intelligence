import {
  CANONICAL_ORDER,
  MONTHS,
  PRESENT_TERMS,
  SECTION_HEADINGS,
  SECTION_TYPES,
  type SectionType,
} from "./lexicon";
import type { CVLanguage } from "./schema";
import {
  containsArabic,
  isBulletLine,
  normalizeDigits,
  normalizeForMatch,
  stripBulletGlyph,
  wordCount,
} from "./text";

export interface CVLine {
  index: number;
  raw: string;
  /** Bullet glyph removed. */
  text: string;
  isBullet: boolean;
  words: number;
  /** The section this line belongs to, or null before the first heading. */
  section: SectionType | null;
}

export interface CVSection {
  type: SectionType;
  heading: string;
  headingIndex: number;
  order: number;
  lines: CVLine[];
  text: string;
}

export interface DateRange {
  raw: string;
  hasStart: boolean;
  hasEnd: boolean;
  isCurrent: boolean;
  startYear: number | null;
  endYear: number | null;
}

export interface ExperienceEntry {
  headerLine: string;
  dateRange: DateRange | null;
  bullets: string[];
  /** Whether an organisation-like token sits alongside the role. */
  hasOrganizationHint: boolean;
}

export interface ContactSignals {
  name: string | null;
  nameConfident: boolean;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  portfolio: string | null;
}

export interface FormattingSignals {
  /** Lines that look like they came out of a multi-column layout. */
  suspectedColumnLines: number;
  /** Runs of 2+ spaces mid-line, a strong table/column indicator. */
  tabularLines: number;
  /** Non-ASCII, non-Arabic symbol soup that parsers choke on. */
  glyphNoiseLines: number;
  /** Lines that are entirely uppercase and long (poor for parsers). */
  shoutingLines: number;
  hasEmojis: boolean;
}

export interface CVDocument {
  text: string;
  lines: CVLine[];
  language: CVLanguage;
  sections: CVSection[];
  sectionMap: Map<SectionType, CVSection>;
  bullets: CVLine[];
  experience: ExperienceEntry[];
  skills: string[];
  contact: ContactSignals;
  formatting: FormattingSignals;
  totalWords: number;
  estimatedPages: number;
  /** Page count reported by the parser, when the format provides it. */
  parserPageCount: number | null;
}

/* -------------------------------------------------------------------------- */
/* Language                                                                   */
/* -------------------------------------------------------------------------- */

const ARABIC_CHAR = /[؀-ۿ]/g;
const LATIN_CHAR = /[A-Za-z]/g;

export function detectLanguage(text: string): CVLanguage {
  const arabic = (text.match(ARABIC_CHAR) ?? []).length;
  const latin = (text.match(LATIN_CHAR) ?? []).length;
  const total = arabic + latin;
  if (total < 40) return "unknown";
  const arabicRatio = arabic / total;
  if (arabicRatio >= 0.75) return "ar";
  if (arabicRatio <= 0.12) return "en";
  return "mixed";
}

/* -------------------------------------------------------------------------- */
/* Section detection                                                          */
/* -------------------------------------------------------------------------- */

const HEADING_LOOKUP: Map<string, SectionType> = (() => {
  const map = new Map<string, SectionType>();
  for (const type of SECTION_TYPES) {
    for (const alias of SECTION_HEADINGS[type]) {
      map.set(normalizeForMatch(alias), type);
    }
  }
  return map;
})();

/** A heading is a short, standalone line matching a known alias. */
function matchHeading(line: string): SectionType | null {
  const stripped = line
    .replace(/[:：·|•\-–—_=]+$/g, "")
    .replace(/^[#*>\s]+/, "")
    .trim();
  if (!stripped || wordCount(stripped) > 5 || stripped.length > 46) return null;
  const key = normalizeForMatch(stripped);
  const direct = HEADING_LOOKUP.get(key);
  if (direct) return direct;
  // Tolerate headings with decorative separators, e.g. "— EXPERIENCE —".
  const inner = key.replace(/^[^a-z؀-ۿ]+|[^a-z؀-ۿ]+$/g, "");
  return HEADING_LOOKUP.get(inner) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Line unwrapping                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Rejoins lines that a PDF's fixed column width split mid-sentence.
 *
 * This is one of the highest-leverage steps in the whole pipeline. A bullet
 * like "…using React Native, JavaScript, / and Redux, resulting in a 95%
 * positive user feedback rate" arrives as two lines. Left split, the metric
 * lands on an orphan line that is then mistaken for a new role header — so a
 * strong CV is told it has no measurable results and eleven undated jobs.
 *
 * A line is treated as a continuation when the line above it ran to near the
 * full column width and ended mid-thought. Headings, bullets and role headers
 * are never absorbed.
 */
function joinWrappedLines(rawLines: string[]): string[] {
  const lines = rawLines.map((l) => l.trim());

  // Infer the column width from the document rather than assuming one, so
  // this adapts to different page sizes and font sizes.
  const lengths = lines.filter((l) => l.length > 0).map((l) => l.length);
  if (lengths.length === 0) return lines;
  const longest = Math.max(...lengths);
  const wrapThreshold = Math.max(56, Math.round(longest * 0.72));

  const endsMidThought = (line: string): boolean =>
    !/[.!?:;•·]$/.test(line) && !/[،؛۔]$/.test(line);

  const output: string[] = [];

  for (const line of lines) {
    if (!line) {
      output.push(line);
      continue;
    }

    const previous = output[output.length - 1];
    const isContinuationCandidate =
      previous !== undefined &&
      previous.length >= wrapThreshold &&
      endsMidThought(previous) &&
      !isBulletLine(line) &&
      matchHeading(line) === null &&
      matchHeading(previous) === null &&
      // A line carrying its own dates is a new role, not a continuation.
      parseDateRange(line) === null;

    if (isContinuationCandidate) {
      output[output.length - 1] = `${previous} ${line}`;
    } else {
      output.push(line);
    }
  }

  return output;
}

/* -------------------------------------------------------------------------- */
/* Contact extraction                                                         */
/* -------------------------------------------------------------------------- */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE =
  /(?:\+?\d{1,4}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d{3}[\s.-]?\d{3,4}[\s.-]?\d{0,4}/;
const LINKEDIN_RE = /(?:linkedin\.com|lnkd\.in)\/[^\s,|)•]+/i;
/**
 * Personal sites are frequently written bare ("turkialmalki.com"), so a
 * scheme cannot be required. The TLD list keeps this from matching ordinary
 * prose containing a full stop.
 */
const URL_RE = new RegExp(
  [
    "(?:https?://|www\\.)[^\\s,|)•]+",
    "(?:github|gitlab|behance|dribbble|medium|notion\\.site|vercel\\.app|netlify\\.app)\\.[^\\s,|)•]+",
    "[a-z0-9][a-z0-9-]{2,}\\.(?:com|net|org|io|dev|me|co|sa|app|design|portfolio)(?:/[^\\s,|)•]*)?",
  ].join("|"),
  "i",
);

const LOCATION_HINTS = [
  "riyadh", "jeddah", "dammam", "khobar", "mecca", "makkah", "medina",
  "madinah", "dubai", "abu dhabi", "doha", "kuwait", "manama", "muscat",
  "cairo", "amman", "beirut", "london", "new york", "saudi", "ksa", "uae",
  "qatar", "bahrain", "oman", "egypt", "jordan", "remote",
  "الرياض", "جدة", "الدمام", "الخبر", "مكة", "المدينة", "دبي", "أبوظبي",
  "الدوحة", "الكويت", "المنامة", "مسقط", "القاهرة", "عمان", "بيروت",
  "السعودية", "الإمارات", "قطر", "البحرين", "عن بعد",
];

function looksLikeName(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 48) return false;
  const words = t.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  if (EMAIL_RE.test(t) || URL_RE.test(t) || /\d/.test(t)) return false;
  if (/[|,@:/\\•]/.test(t)) return false;
  if (matchHeading(t)) return false;
  if (containsArabic(t)) return words.every((w) => w.length >= 2);
  // Latin: Title Case or ALL CAPS, letters only.
  return words.every((w) => /^[A-Z][a-zA-Z'’.-]*$/.test(w) || /^[A-Z.'’-]+$/.test(w));
}

function extractContact(lines: CVLine[]): ContactSignals {
  const head = lines.slice(0, 14);
  const all = lines.map((l) => l.text).join("\n");

  const email = all.match(EMAIL_RE)?.[0] ?? null;

  let phone: string | null = null;
  for (const line of lines.slice(0, 20)) {
    // Contact lines routinely pack an email, a site and a phone together, and
    // digits inside an email ("…202200@gmail.com") would otherwise poison a
    // digit count taken over the whole line. Strip those first, then judge
    // each candidate on its own digits.
    const candidate = normalizeDigits(line.text)
      .replace(EMAIL_RE, " ")
      .replace(/(?:https?:\/\/|www\.)\S+/gi, " ")
      .replace(/[a-z0-9][a-z0-9-]{2,}\.[a-z]{2,}(?:\/\S*)?/gi, " ");

    for (const match of candidate.matchAll(new RegExp(PHONE_RE, "g"))) {
      const digits = match[0].replace(/\D/g, "");
      // Long enough to be a real number, short enough not to be an id.
      if (digits.length >= 9 && digits.length <= 15) {
        phone = match[0].trim();
        break;
      }
    }
    if (phone) break;
  }

  const linkedin = all.match(LINKEDIN_RE)?.[0] ?? null;
  // Email addresses must be removed before hunting for a personal site, or
  // the provider's domain ("gmail.com") is mistaken for a portfolio.
  // LinkedIn is stripped as well: it is reported separately, and leaving it
  // in means it wins the first match and hides an actual personal site.
  const withoutKnownLinks = all
    .replace(new RegExp(EMAIL_RE, "g"), " ")
    .replace(new RegExp(LINKEDIN_RE, "gi"), " ");
  const portfolioMatch = withoutKnownLinks.match(URL_RE)?.[0] ?? null;
  const portfolio =
    portfolioMatch && !LINKEDIN_RE.test(portfolioMatch) ? portfolioMatch : null;

  let location: string | null = null;
  for (const line of head) {
    const norm = normalizeForMatch(line.text);
    const hit = LOCATION_HINTS.find((h) => norm.includes(normalizeForMatch(h)));
    if (hit) {
      location = line.text.length <= 80 ? line.text : hit;
      break;
    }
  }

  let name: string | null = null;
  let nameConfident = false;
  for (const line of head.slice(0, 6)) {
    if (looksLikeName(line.text)) {
      name = line.text.trim();
      // Confident when the name is in the first three lines of the document.
      nameConfident = line.index < 3;
      break;
    }
  }

  return { name, nameConfident, email, phone, location, linkedin, portfolio };
}

/* -------------------------------------------------------------------------- */
/* Dates and experience entries                                               */
/* -------------------------------------------------------------------------- */

const YEAR_RE = /\b(19[7-9]\d|20[0-4]\d)\b/g;
const MONTH_ALTERNATION = MONTHS.map((m) =>
  m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
).join("|");
const DATE_LINE_RE = new RegExp(
  `(${MONTH_ALTERNATION})|\\b(19[7-9]\\d|20[0-4]\\d)\\b`,
  "i",
);

export function parseDateRange(line: string): DateRange | null {
  const normalized = normalizeForMatch(line);
  if (!DATE_LINE_RE.test(normalized)) return null;
  const years = [...line.matchAll(YEAR_RE)].map((m) => Number(m[1]));
  const isCurrent = PRESENT_TERMS.some((t) =>
    normalized.includes(normalizeForMatch(t)),
  );
  if (years.length === 0 && !isCurrent) return null;
  const startYear = years[0] ?? null;
  const endYear = years.length > 1 ? (years[years.length - 1] ?? null) : null;
  return {
    raw: line.trim(),
    hasStart: startYear !== null,
    hasEnd: endYear !== null || isCurrent,
    isCurrent,
    startYear,
    endYear: isCurrent ? null : endYear,
  };
}

const ORG_HINTS = [
  "ltd", "llc", "inc", "co.", "company", "corp", "group", "bank", "holding",
  "technologies", "solutions", "consulting", "services", "university",
  "college", "institute", "authority", "ministry", "agency", "foundation",
  "شركة", "مؤسسة", "بنك", "مجموعة", "جامعة", "معهد", "كلية", "هيئة", "وزارة",
  "مركز", "مستشفى",
];

function buildExperienceEntries(section: CVSection | undefined): ExperienceEntry[] {
  if (!section) return [];
  const entries: ExperienceEntry[] = [];
  let current: ExperienceEntry | null = null;

  for (const line of section.lines) {
    if (line.isBullet) {
      if (current) current.bullets.push(line.text);
      continue;
    }
    const dateRange = parseDateRange(line.text);
    const norm = normalizeForMatch(line.text);
    const hasOrg = ORG_HINTS.some((h) => norm.includes(normalizeForMatch(h)));
    const looksLikeHeader =
      dateRange !== null ||
      hasOrg ||
      (line.words <= 12 && /[|,–—-]/.test(line.text) && line.words >= 2);

    if (looksLikeHeader) {
      // A role is routinely spread over two or three consecutive lines:
      //   "Acme Group • Riyadh • Jan 2022 - Present"
      //   "Engineering Manager • Full-time"
      // Both look like headers. Treating them as two roles invents a job with
      // no description and another with no dates, so consecutive header lines
      // are merged until the first bullet arrives.
      // Two header lines that each carry their own date range are two
      // different jobs, not one job spread over two lines — even when the
      // first has no bullets under it (which is itself a finding).
      const bothDated = dateRange !== null && current?.dateRange != null;

      if (current && current.bullets.length === 0 && !bothDated) {
        current.headerLine = `${current.headerLine} — ${line.text}`;
        current.dateRange = current.dateRange ?? dateRange;
        current.hasOrganizationHint = current.hasOrganizationHint || hasOrg;
        continue;
      }
      current = {
        headerLine: line.text,
        dateRange,
        bullets: [],
        hasOrganizationHint: hasOrg,
      };
      entries.push(current);
    } else if (current) {
      // Prose under a role still counts as described work.
      current.bullets.push(line.text);
    }
  }

  return entries;
}

/* -------------------------------------------------------------------------- */
/* Skills                                                                     */
/* -------------------------------------------------------------------------- */

/** Rejects the sentence fragments a naive comma-split pulls out of prose. */
function isPlausibleSkill(candidate: string): boolean {
  const skill = candidate.trim();
  if (skill.length < 2 || skill.length > 48) return false;
  if (wordCount(skill) > 4) return false;

  // Fragments cut out of a sentence carry orphaned brackets.
  const opens = (skill.match(/\(/g) ?? []).length;
  const closes = (skill.match(/\)/g) ?? []).length;
  if (opens !== closes) return false;

  // "and TypeScript", "to ensure quality" — conjunction fragments.
  if (/^(?:and|or|to|with|for|the|a|an|in|on|of|using)\b/i.test(skill)) {
    return false;
  }
  // "Optimizing application performance" — a described activity, not a skill.
  if (/^[a-z]+ing\b/i.test(skill) && wordCount(skill) > 1) return false;
  // Must contain an actual word.
  if (!/[a-z؀-ۿ]/i.test(skill)) return false;

  return true;
}

/**
 * Pulls the skills list out of the skills section.
 *
 * Two shapes are common and need different handling. A delimiter-separated
 * list ("React, Next.js, TypeScript") splits directly. A labelled bullet
 * ("Frontend Architecture: designing scalable systems using…") carries the
 * competency in the *label* — splitting the prose after the colon yields
 * sentence fragments, so the label is taken and the prose discarded.
 */
function extractSkills(section: CVSection | undefined): string[] {
  if (!section) return [];
  const items: string[] = [];

  const push = (raw: string) => {
    const skill = raw.trim().replace(/[.,;،؛]+$/, "").trim();
    if (isPlausibleSkill(skill)) items.push(skill);
  };

  for (const line of section.lines) {
    const labelled = line.text.match(/^(.{2,44}?)\s*[:：]\s*\S/);

    if (labelled?.[1] && wordCount(labelled[1]) <= 5) {
      // The label is the competency; split it on conjunctions only.
      for (const part of labelled[1].split(/\s*[&+/]\s*|\s+and\s+/i)) {
        push(part);
      }
      continue;
    }

    for (const part of line.text.split(/[,،|/·•;؛]+/)) {
      push(part);
    }
  }

  return items;
}

/* -------------------------------------------------------------------------- */
/* Formatting signals                                                         */
/* -------------------------------------------------------------------------- */

const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

function analyzeFormatting(rawText: string, lines: CVLine[]): FormattingSignals {
  let tabularLines = 0;
  let suspectedColumnLines = 0;
  let glyphNoiseLines = 0;
  let shoutingLines = 0;

  for (const rawLine of rawText.split("\n")) {
    if (/\S {3,}\S/.test(rawLine)) tabularLines += 1;
    if (/\t/.test(rawLine)) tabularLines += 1;
    // Two capitalised fragments separated by a wide gap => two columns merged.
    if (/\S {6,}\S/.test(rawLine)) suspectedColumnLines += 1;
  }

  for (const line of lines) {
    const letters = line.text.replace(/[^A-Za-z؀-ۿ]/g, "").length;
    const symbols = line.text.replace(/[A-Za-z0-9؀-ۿ\s.,;:()\-–—/&'"%+#@]/g, "").length;
    if (line.text.length > 8 && symbols > letters) glyphNoiseLines += 1;
    const latin = line.text.replace(/[^A-Za-z]/g, "");
    if (latin.length > 24 && latin === latin.toUpperCase()) shoutingLines += 1;
  }

  return {
    suspectedColumnLines,
    tabularLines,
    glyphNoiseLines,
    shoutingLines,
    hasEmojis: EMOJI_RE.test(rawText),
  };
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

export interface NormalizeOptions {
  parserPageCount?: number | null;
}

export function normalizeCV(
  rawText: string,
  options: NormalizeOptions = {},
): CVDocument {
  const rawLines = joinWrappedLines(rawText.split("\n"));
  const lines: CVLine[] = [];
  const sections: CVSection[] = [];
  let currentSection: CVSection | null = null;
  let order = 0;

  rawLines.forEach((raw, i) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const headingType = matchHeading(trimmed);
    if (headingType) {
      currentSection = {
        type: headingType,
        heading: trimmed,
        headingIndex: i,
        order: order++,
        lines: [],
        text: "",
      };
      sections.push(currentSection);
      return;
    }

    const bullet = isBulletLine(trimmed);
    const text = bullet ? stripBulletGlyph(trimmed) : trimmed;
    if (!text) return;

    const line: CVLine = {
      index: lines.length,
      raw: trimmed,
      text,
      isBullet: bullet,
      words: wordCount(text),
      section: currentSection ? currentSection.type : null,
    };
    lines.push(line);
    if (currentSection) currentSection.lines.push(line);
  });

  for (const section of sections) {
    section.text = section.lines.map((l) => l.text).join("\n");
  }

  // Keep the first occurrence when a heading appears more than once.
  const sectionMap = new Map<SectionType, CVSection>();
  for (const section of sections) {
    const existing = sectionMap.get(section.type);
    if (existing) {
      existing.lines.push(...section.lines);
      existing.text = existing.lines.map((l) => l.text).join("\n");
    } else {
      sectionMap.set(section.type, section);
    }
  }

  const totalWords = lines.reduce((sum, l) => sum + l.words, 0);
  const experienceSection = sectionMap.get("experience");

  return {
    text: rawText,
    lines,
    language: detectLanguage(rawText),
    sections: [...sectionMap.values()].sort((a, b) => a.order - b.order),
    sectionMap,
    bullets: lines.filter((l) => l.isBullet),
    experience: buildExperienceEntries(experienceSection),
    skills: extractSkills(sectionMap.get("skills")),
    contact: extractContact(lines),
    formatting: analyzeFormatting(rawText, lines),
    totalWords,
    estimatedPages:
      options.parserPageCount && options.parserPageCount > 0
        ? options.parserPageCount
        : Math.max(1, Math.round((totalWords / 500) * 10) / 10),
    parserPageCount: options.parserPageCount ?? null,
  };
}

/** How far the document deviates from the conventional section order. */
export function sectionOrderPenalty(sections: CVSection[]): number {
  const present = sections
    .map((s) => CANONICAL_ORDER.indexOf(s.type))
    .filter((i) => i >= 0);
  let inversions = 0;
  for (let i = 0; i < present.length; i += 1) {
    for (let j = i + 1; j < present.length; j += 1) {
      const a = present[i];
      const b = present[j];
      if (a !== undefined && b !== undefined && a > b) inversions += 1;
    }
  }
  return inversions;
}
