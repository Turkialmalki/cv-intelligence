import type { CVLanguage } from "./schema";
import { hasMetric, startsWithWeakOpener } from "./signals";
import { normalizeForMatch, truncate, wordCount } from "./text";

/**
 * Deterministic bullet rewriting.
 *
 * HARD RULE: this module never invents employers, titles, dates, degrees,
 * certifications, metrics or responsibilities. It may only
 *   - remove filler and weak openers that carry no information,
 *   - restate the candidate's own words in a stronger grammatical shape,
 *   - append an explicit placeholder prompting the candidate to supply a
 *     real number they alone know.
 * Any figure that appears in the output was present in the input.
 */

export const METRIC_PLACEHOLDER = {
  en: "[add measurable result — e.g. %, amount, time saved, or scale]",
  ar: "[أضف نتيجة قابلة للقياس — نسبة، مبلغ، وقت موفَّر، أو حجم]",
} as const;

export const SCOPE_PLACEHOLDER = {
  en: "[add scope — team size, budget, or number of users]",
  ar: "[أضف نطاق العمل — حجم الفريق أو الميزانية أو عدد المستخدمين]",
} as const;

/**
 * Weak opener → neutral strong replacement. Each mapping preserves meaning;
 * none of them upgrade the candidate's actual level of responsibility.
 */
const OPENER_REPLACEMENTS: ReadonlyArray<{
  match: RegExp;
  en: string;
  ar: string;
}> = [
  { match: /^responsible for\s+/i, en: "Owned", ar: "أدرت" },
  { match: /^was responsible for\s+/i, en: "Owned", ar: "أدرت" },
  { match: /^responsibilities included\s+/i, en: "Owned", ar: "أدرت" },
  { match: /^duties included\s+/i, en: "Handled", ar: "نفّذت" },
  { match: /^tasked with\s+/i, en: "Delivered", ar: "نفّذت" },
  { match: /^in charge of\s+/i, en: "Led", ar: "قدت" },
  { match: /^worked on\s+/i, en: "Delivered", ar: "نفّذت" },
  { match: /^worked with\s+/i, en: "Partnered with", ar: "تعاونت مع" },
  { match: /^helped (?:to\s+)?/i, en: "Supported", ar: "ساهمت في" },
  { match: /^assisted (?:in|with)\s+/i, en: "Supported", ar: "ساهمت في" },
  { match: /^participated in\s+/i, en: "Contributed to", ar: "ساهمت في" },
  { match: /^involved in\s+/i, en: "Contributed to", ar: "ساهمت في" },
  { match: /^handled\s+/i, en: "Managed", ar: "أدرت" },
  { match: /^dealt with\s+/i, en: "Managed", ar: "أدرت" },
  { match: /^used\s+/i, en: "Applied", ar: "استخدمت" },
  { match: /^utilized\s+/i, en: "Applied", ar: "استخدمت" },
  { match: /^performed\s+/i, en: "Executed", ar: "نفّذت" },
  { match: /^مسؤول عن\s+/, en: "Owned", ar: "أدرت" },
  { match: /^كنت مسؤول(?:اً|ا)? عن\s+/, en: "Owned", ar: "أدرت" },
  { match: /^قمت ب/, en: "Delivered", ar: "نفّذت " },
  { match: /^عملت على\s+/, en: "Delivered", ar: "نفّذت " },
  { match: /^ساعدت في\s+/, en: "Supported", ar: "ساهمت في " },
  { match: /^شاركت في\s+/, en: "Contributed to", ar: "ساهمت في " },
];

const FILLER_STRIP: ReadonlyArray<RegExp> = [
  /\b(?:successfully|effectively|efficiently|actively|proactively)\s+/gi,
  /\b(?:various|several|many|different|numerous)\s+/gi,
  /\bin order to\b/gi,
  /\bas needed\b/gi,
  /\bon a daily basis\b/gi,
  /\bبنجاح\b/g,
  /\bبشكل فعال\b/g,
  /\bبشكل يومي\b/g,
  /\bالعديد من\b/g,
];

function capitalizeFirst(text: string): string {
  if (!text) return text;
  const first = text[0];
  if (!first) return text;
  return first.toUpperCase() + text.slice(1);
}

function tidy(text: string): string {
  let out = text;
  for (const re of FILLER_STRIP) out = out.replace(re, " ");
  return out
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/[.\s]+$/, "")
    .trim();
}

export interface RewriteResult {
  text: string;
  changed: boolean;
  /** Human-readable reasons, used for the before/after annotations. */
  notes: string[];
  /** True when a placeholder was inserted rather than a fabricated figure. */
  needsCandidateInput: boolean;
}

/**
 * Produces an "optimized direction" for a single bullet.
 * Returns `changed: false` when the bullet is already in good shape.
 */
export function rewriteBullet(
  original: string,
  language: CVLanguage = "en",
): RewriteResult {
  const isArabic = language === "ar";
  const notes: string[] = [];
  let text = original.trim().replace(/^[-–—•*]\s*/, "");
  let changed = false;

  const before = text;

  // 1. Replace a weak, information-free opener with a precise verb.
  for (const rule of OPENER_REPLACEMENTS) {
    if (rule.match.test(text)) {
      const replacement = isArabic ? rule.ar : rule.en;
      text = text.replace(rule.match, `${replacement} `);
      notes.push(
        isArabic
          ? "استُبدلت البداية الضعيفة بفعل عمل واضح"
          : "Replaced a weak opener with a concrete action verb",
      );
      changed = true;
      break;
    }
  }

  // 2. Strip filler that adds words without adding information.
  const tidied = tidy(text);
  if (normalizeForMatch(tidied) !== normalizeForMatch(text)) {
    notes.push(
      isArabic ? "حُذفت الكلمات الحشوية" : "Removed filler wording",
    );
    changed = true;
  }
  text = tidied;

  // 3. Trim an over-long bullet at a natural clause boundary.
  if (wordCount(text) > 34) {
    const clauses = text.split(/(?<=[,;،؛])\s+/);
    let assembled = "";
    for (const clause of clauses) {
      if (wordCount(`${assembled} ${clause}`) > 30 && assembled) break;
      assembled = assembled ? `${assembled} ${clause}` : clause;
    }
    if (assembled && wordCount(assembled) < wordCount(text)) {
      text = assembled.replace(/[,;،؛]\s*$/, "");
      notes.push(
        isArabic
          ? "اختُصرت الجملة إلى طول يسهل مسحه بصريًا"
          : "Shortened to a scannable length",
      );
      changed = true;
    }
  }

  // 4. Never invent a number. Prompt the candidate for the real one.
  let needsCandidateInput = false;
  if (!hasMetric(text) && wordCount(text) >= 4) {
    const placeholder = isArabic ? METRIC_PLACEHOLDER.ar : METRIC_PLACEHOLDER.en;
    text = `${text} — ${placeholder}`;
    notes.push(
      isArabic
        ? "أُضيفت خانة لنتيجة قابلة للقياس (تملأها بأرقامك الحقيقية)"
        : "Added a slot for a measurable result (you fill in your real number)",
    );
    needsCandidateInput = true;
    changed = true;
  }

  if (!isArabic) text = capitalizeFirst(text);

  return {
    text,
    changed: changed || normalizeForMatch(text) !== normalizeForMatch(before),
    notes,
    needsCandidateInput,
  };
}

/**
 * A stronger-shaped version of a professional summary built strictly from the
 * candidate's own sentences: dedupe, drop cliches, keep the informative parts.
 */
export function rewriteSummary(
  original: string,
  language: CVLanguage = "en",
): RewriteResult {
  const isArabic = language === "ar";
  const notes: string[] = [];
  const sentences = original
    .split(/(?<=[.!؟?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const CLICHES = [
    "hard working", "team player", "self motivated", "detail oriented",
    "results driven", "fast learner", "passionate about", "dynamic",
    "seeking a challenging position", "looking for an opportunity",
    "لاعب جماعي", "أعمل بجد", "شغوف", "أبحث عن فرصة", "أسعى للتميز",
  ];

  const kept: string[] = [];
  const seen = new Set<string>();
  let dropped = 0;

  for (const sentence of sentences) {
    const norm = normalizeForMatch(sentence);
    if (seen.has(norm)) {
      dropped += 1;
      continue;
    }
    const clicheRatio = CLICHES.filter((c) =>
      norm.includes(normalizeForMatch(c)),
    ).length;
    // Drop only sentences that are mostly cliche and carry no facts.
    if (clicheRatio > 0 && !/\d/.test(sentence) && wordCount(sentence) < 16) {
      dropped += 1;
      continue;
    }
    seen.add(norm);
    kept.push(tidy(sentence));
  }

  if (dropped > 0) {
    notes.push(
      isArabic
        ? `حُذفت ${dropped} عبارة عامة لا تضيف معلومة`
        : `Removed ${dropped} generic sentence(s) that carried no information`,
    );
  }

  let text = kept.join(" ").trim();
  let needsCandidateInput = false;

  if (!text) {
    // Nothing survived: do not fabricate a summary, prompt for one instead.
    text = isArabic
      ? "[اكتب سطرين: مسماك المهني الحالي + سنوات الخبرة + مجالك + أبرز نتيجة حققتها]"
      : "[Write two lines: your current title + years of experience + your domain + your single strongest result]";
    needsCandidateInput = true;
  } else if (!hasMetric(text)) {
    const placeholder = isArabic ? METRIC_PLACEHOLDER.ar : METRIC_PLACEHOLDER.en;
    text = `${text} ${placeholder}`;
    needsCandidateInput = true;
    notes.push(
      isArabic
        ? "أُضيفت خانة لإنجاز رقمي يميّزك"
        : "Added a slot for one quantified achievement that differentiates you",
    );
  }

  return {
    text: truncate(text, 520),
    changed: text.trim() !== original.trim(),
    notes,
    needsCandidateInput,
  };
}

/** Bullet quality tiers used in the report's teaching examples. */
export function bulletTier(bullet: string): "weak" | "better" | "excellent" {
  const quantified = hasMetric(bullet);
  const weakOpener = startsWithWeakOpener(bullet);
  const words = wordCount(bullet);
  if (weakOpener || words < 6) return "weak";
  if (quantified && words >= 8) return "excellent";
  return "better";
}
