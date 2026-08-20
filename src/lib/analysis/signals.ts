import {
  BUSINESS_IMPACT_TERMS,
  FILLER_PHRASES,
  GENERIC_SKILLS,
  OWNERSHIP_TERMS,
  SENIORITY_TERMS,
  STRONG_ACTION_VERBS,
  TECHNICAL_SKILL_HINTS,
  WEAK_OPENERS,
} from "./lexicon";
import { normalizeForMatch, normalizeDigits } from "./text";

/**
 * Detectors for the qualitative signals the scorers reason about.
 * Every detector is pure and deterministic.
 */

/** Percentages, currency, multipliers, counts with units, time savings. */
const METRIC_PATTERNS: ReadonlyArray<RegExp> = [
  /\b\d+(?:\.\d+)?\s?%/, // 35%
  /\b(?:sar|usd|aed|eur|gbp|qar|kwd|egp|\$|£|€|ر\.س|ريال|درهم|جنيه)\s?\d/i,
  /\b\d[\d,.]*\s?(?:k|m|bn|b|million|billion|thousand|mn)\b/i,
  /\b\d+(?:\.\d+)?\s?x\b/i, // 3x
  /\b\d[\d,]{2,}\b/, // 1,200 / 15000
  /\b\d+\s?(?:hours?|hrs?|days?|weeks?|months?|minutes?|mins?|seconds?)\b/i,
  /\b(?:team|group|squad)\s+of\s+\d+/i,
  /\b\d+\s+(?:people|employees|engineers|developers|staff|members|clients|customers|users|accounts|stores|branches|projects|vendors|suppliers|countries|markets)\b/i,
  /\b(?:top|first)\s+\d+/i,
  // Arabic
  /\d+\s?٪/,
  /\b(?:فريق|فريقاً|فريقا)\s+(?:مكون|مكوّن)\s+من\s+\d+/,
  /\d+\s?(?:مليون|ألف|الف|مليار)/,
  /\d+\s?(?:موظف|عميل|مشروع|فرع|متجر|ساعة|يوم|شهر|أسبوع)/,
];

export function hasMetric(text: string): boolean {
  const normalized = normalizeDigits(text);
  return METRIC_PATTERNS.some((re) => re.test(normalized));
}

/** Extracts the leading verb-ish token of a bullet. */
export function firstToken(text: string): string {
  const cleaned = normalizeForMatch(text).replace(/^[^a-z؀-ۿ]+/, "");
  return cleaned.split(" ")[0] ?? "";
}

export function startsWithStrongVerb(text: string): boolean {
  const token = firstToken(text);
  if (!token) return false;
  if (STRONG_ACTION_VERBS.has(token)) return true;
  // Regular past-tense forms not in the list still read as action verbs.
  return /^[a-z]{4,}ed$/.test(token) && !WEAK_OPENERS.has(token);
}

/**
 * Bullets that open with a gerund ("Leading the migration…", "Managing a
 * team…") describe an ongoing activity rather than a delivered result. They
 * read as a job description; the past tense reads as a track record.
 */
export function startsWithGerund(text: string): boolean {
  const token = firstToken(text);
  if (token.length < 5 || !token.endsWith("ing")) return false;
  // Nouns that merely happen to end in -ing are not gerund framing.
  const NOUN_ING = new Set([
    "engineering", "marketing", "accounting", "banking", "consulting",
    "training", "manufacturing", "outsourcing", "onboarding", "briefing",
  ]);
  return !NOUN_ING.has(token);
}

export function startsWithWeakOpener(text: string): boolean {
  const normalized = normalizeForMatch(text);
  const token = firstToken(text);
  if (WEAK_OPENERS.has(token)) return true;
  return [...WEAK_OPENERS].some((w) => normalized.startsWith(`${w} `));
}

export function containsFiller(text: string): string | null {
  const normalized = normalizeForMatch(text);
  return (
    FILLER_PHRASES.find((p) => normalized.includes(normalizeForMatch(p))) ?? null
  );
}

export function isGenericSkill(skill: string): boolean {
  return GENERIC_SKILLS.has(normalizeForMatch(skill));
}

export function isTechnicalSkill(skill: string): boolean {
  const normalized = normalizeForMatch(skill);
  return TECHNICAL_SKILL_HINTS.some(
    (hint) =>
      normalized === normalizeForMatch(hint) ||
      normalized.includes(normalizeForMatch(hint)),
  );
}

export type SeniorityLevel = "executive" | "leadership" | "senior" | "entry" | "unknown";

export function detectSeniority(text: string): SeniorityLevel {
  const normalized = normalizeForMatch(text);
  const levels: SeniorityLevel[] = ["executive", "leadership", "senior", "entry"];
  for (const level of levels) {
    const terms = SENIORITY_TERMS[level as keyof typeof SENIORITY_TERMS];
    if (terms.some((t) => normalized.includes(normalizeForMatch(t)))) {
      return level;
    }
  }
  return "unknown";
}

export function countOwnershipSignals(text: string): number {
  const normalized = normalizeForMatch(text);
  return OWNERSHIP_TERMS.filter((t) => normalized.includes(normalizeForMatch(t)))
    .length;
}

export function countBusinessImpactSignals(text: string): number {
  const normalized = normalizeForMatch(text);
  return BUSINESS_IMPACT_TERMS.filter((t) =>
    normalized.includes(normalizeForMatch(t)),
  ).length;
}

/** Repeated sentence openers make a CV read as monotonous to recruiters. */
export function repeatedOpeners(bullets: string[]): Array<{
  opener: string;
  count: number;
}> {
  const counts = new Map<string, number>();
  for (const b of bullets) {
    const token = firstToken(b);
    if (token.length < 3) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .map(([opener, count]) => ({ opener, count }))
    .sort((a, b) => b.count - a.count);
}

/** Ratio of bullets carrying at least one measurable outcome. */
export function quantifiedRatio(bullets: string[]): number {
  if (bullets.length === 0) return 0;
  return bullets.filter(hasMetric).length / bullets.length;
}
