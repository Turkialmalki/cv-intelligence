import { STOPWORDS, TECHNICAL_SKILL_HINTS } from "./lexicon";
import type { CVDocument } from "./normalize";
import type { JobMatch } from "./schema";
import { detectSeniority, type SeniorityLevel } from "./signals";
import { extractPhrases, normalizeForMatch, tokenize } from "./text";

/**
 * Compares the CV against a supplied job description.
 *
 * This never invents a target role. When no job description is provided the
 * caller uses `inferTargetSignals` instead, which reports a cautious
 * observation rather than a match percentage.
 */

/**
 * Realistic ceilings. Even a CV tailored perfectly by hand never echoes 100%
 * of a job description's vocabulary — job ads are padded with boilerplate and
 * company language that has no place in a CV. Scoring raw overlap against 100%
 * would mark every genuine candidate down, so overlap is measured against the
 * coverage a well-targeted CV actually achieves.
 */
const REALISTIC_KEYWORD_COVERAGE = 0.55;
const REALISTIC_EXPERIENCE_COVERAGE = 0.45;

/** Rescales a raw 0-1 overlap against its realistic target, capped at 100. */
function calibrate(raw: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((raw / target) * 100)));
}

const SENIORITY_RANK: Record<SeniorityLevel, number> = {
  entry: 1,
  senior: 2,
  leadership: 3,
  executive: 4,
  unknown: 0,
};

/** Pulls named skills out of free text using the known-skill lexicon. */
export function extractSkillMentions(text: string): Set<string> {
  const phrases = extractPhrases(text, 3);
  const found = new Set<string>();
  for (const hint of TECHNICAL_SKILL_HINTS) {
    if (phrases.has(normalizeForMatch(hint))) found.add(hint);
  }
  return found;
}

/** Frequency-ranked meaningful terms from the job description. */
export function extractKeywords(text: string, limit = 30): string[] {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    if (token.length < 3 || STOPWORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

/** Best-effort role title from the first informative line of a JD. */
export function inferJobTitle(jobDescription: string): string | null {
  const lines = jobDescription
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 6)) {
    const cleaned = line.replace(/^(?:job title|position|role|title)\s*[:：-]\s*/i, "");
    const words = cleaned.split(/\s+/);
    if (words.length >= 1 && words.length <= 8 && cleaned.length <= 70) {
      return cleaned;
    }
  }
  return null;
}

export interface JobMatchInput {
  doc: CVDocument;
  jobDescription: string;
  targetRole: string | null;
}

export function computeJobMatch({
  doc,
  jobDescription,
  targetRole,
}: JobMatchInput): JobMatch {
  const cvText = doc.text;
  const cvPhrases = extractPhrases(cvText, 3);
  const cvTokens = new Set(tokenize(cvText));

  // --- Skills ------------------------------------------------------------
  const jdSkills = [...extractSkillMentions(jobDescription)];
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  for (const skill of jdSkills) {
    if (cvPhrases.has(normalizeForMatch(skill))) matchedSkills.push(skill);
    else missingSkills.push(skill);
  }
  const skillsScore =
    jdSkills.length === 0
      ? 60 // No named skills in the JD: neither reward nor punish.
      : Math.round((matchedSkills.length / jdSkills.length) * 100);

  // --- Keywords ----------------------------------------------------------
  const jdKeywords = extractKeywords(jobDescription, 30);
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];
  for (const keyword of jdKeywords) {
    if (cvTokens.has(keyword)) matchedKeywords.push(keyword);
    else missingKeywords.push(keyword);
  }
  const keywordCoverage =
    jdKeywords.length === 0
      ? 50
      : calibrate(
          matchedKeywords.length / jdKeywords.length,
          REALISTIC_KEYWORD_COVERAGE,
        );

  // --- Seniority ---------------------------------------------------------
  const jdLevel = detectSeniority(
    `${targetRole ?? ""} ${inferJobTitle(jobDescription) ?? ""} ${jobDescription.slice(0, 600)}`,
  );
  const cvLevel = doc.experience.reduce<SeniorityLevel>((best, entry) => {
    const level = detectSeniority(entry.headerLine);
    return SENIORITY_RANK[level] > SENIORITY_RANK[best] ? level : best;
  }, "unknown");

  let seniority: number;
  if (jdLevel === "unknown" || cvLevel === "unknown") {
    seniority = 60;
  } else {
    const gap = Math.abs(SENIORITY_RANK[jdLevel] - SENIORITY_RANK[cvLevel]);
    seniority = gap === 0 ? 100 : gap === 1 ? 70 : gap === 2 ? 40 : 20;
  }

  // --- Experience relevance ---------------------------------------------
  // How much of the JD's vocabulary appears specifically in the experience
  // section, rather than merely in a skills list the candidate padded.
  const experienceText = doc.experience
    .map((e) => `${e.headerLine} ${e.bullets.join(" ")}`)
    .join(" ");
  const experienceTokens = new Set(tokenize(experienceText));
  const inExperience = jdKeywords.filter((k) => experienceTokens.has(k)).length;
  const experience =
    jdKeywords.length === 0
      ? 50
      : calibrate(
          inExperience / jdKeywords.length,
          REALISTIC_EXPERIENCE_COVERAGE,
        );

  const score = Math.round(
    skillsScore * 0.35 +
      experience * 0.25 +
      keywordCoverage * 0.25 +
      seniority * 0.15,
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    matchedSkills: matchedSkills.slice(0, 25),
    missingSkills: missingSkills.slice(0, 25),
    matchedKeywords: matchedKeywords.slice(0, 25),
    missingKeywords: missingKeywords.slice(0, 25),
    breakdown: {
      skills: Math.max(0, Math.min(100, skillsScore)),
      experience: Math.max(0, Math.min(100, experience)),
      keywordCoverage: Math.max(0, Math.min(100, keywordCoverage)),
      seniority: Math.max(0, Math.min(100, seniority)),
    },
    inferredTitle: targetRole ?? inferJobTitle(jobDescription),
  };
}

/**
 * With no job description we make no claim about fit. We only report how
 * keyword-ready the CV is in general terms.
 */
export function inferKeywordReadiness(doc: CVDocument): {
  recognizedSkills: string[];
  density: number;
} {
  const recognized = [...extractSkillMentions(doc.text)];
  const density = doc.totalWords > 0 ? recognized.length / (doc.totalWords / 100) : 0;
  return { recognizedSkills: recognized, density };
}
