import type { Category, Classification } from "./schema";

/**
 * Single source of truth for scoring weights. Every dimension's maximum is
 * read from here — no magic numbers inside the dimension scorers.
 * The weights must sum to 100.
 */
export const CATEGORY_WEIGHTS: Record<Category, number> = {
  ats_parseability: 15,
  contact_information: 8,
  structure: 12,
  experience_quality: 15,
  achievement_strength: 15,
  skills_quality: 10,
  recruiter_readability: 10,
  keyword_job_match: 10,
  professional_impact: 5,
};

export const TOTAL_POINTS = Object.values(CATEGORY_WEIGHTS).reduce(
  (sum, w) => sum + w,
  0,
);

export const ENGINE_VERSION = "1.0.0";

export const CATEGORY_LABELS: Record<Category, { en: string; ar: string }> = {
  ats_parseability: {
    en: "ATS Readiness",
    ar: "جاهزية السيرة لأنظمة التوظيف",
  },
  contact_information: { en: "Contact Details", ar: "بيانات التواصل" },
  structure: { en: "CV Structure", ar: "هيكل السيرة الذاتية" },
  experience_quality: { en: "Experience Quality", ar: "جودة الخبرات" },
  achievement_strength: { en: "Achievements", ar: "قوة الإنجازات" },
  skills_quality: { en: "Skills", ar: "المهارات" },
  recruiter_readability: {
    en: "Recruiter Readability",
    ar: "سهولة القراءة للموظِّف",
  },
  keyword_job_match: {
    en: "Job Match",
    ar: "مدى توافق السيرة مع الوظيفة",
  },
  professional_impact: { en: "Professional Impact", ar: "الأثر المهني" },
};

export const CLASSIFICATION_BANDS: ReadonlyArray<{
  min: number;
  max: number;
  key: Classification;
  en: string;
  ar: string;
}> = [
  { min: 90, max: 100, key: "exceptional", en: "Exceptional", ar: "استثنائية" },
  { min: 80, max: 89, key: "strong", en: "Strong", ar: "قوية" },
  { min: 70, max: 79, key: "competitive", en: "Competitive", ar: "تنافسية" },
  {
    min: 60,
    max: 69,
    key: "needs_improvement",
    en: "Needs Improvement",
    ar: "تحتاج تحسين",
  },
  { min: 40, max: 59, key: "weak", en: "Weak", ar: "ضعيفة" },
  { min: 0, max: 39, key: "critical", en: "Critical", ar: "حرجة" },
];

export function classify(score: number): Classification {
  const band = CLASSIFICATION_BANDS.find(
    (b) => score >= b.min && score <= b.max,
  );
  return band ? band.key : "critical";
}

export function classificationLabel(key: Classification): {
  en: string;
  ar: string;
} {
  const band = CLASSIFICATION_BANDS.find((b) => b.key === key);
  return band ? { en: band.en, ar: band.ar } : { en: "Critical", ar: "حرجة" };
}

/** Document-level thresholds used by parsing and readability checks. */
export const THRESHOLDS = {
  /** Below this many characters we treat the document as unreadable. */
  minExtractedChars: 220,
  /** Below this we suspect an image-only / graphics-only PDF. */
  imageBasedCharsPerPage: 180,
  /** Ideal bullet length in words. */
  bulletWords: { min: 6, ideal: [10, 26] as const, max: 34 },
  /** Paragraph density: a run of prose longer than this is a wall of text. */
  paragraphWordLimit: 60,
  /** Words per page used to estimate CV length. */
  wordsPerPage: 500,
  /** Ideal total CV length. */
  cvWords: { min: 220, ideal: [350, 900] as const, max: 1400 },
  /** Minimum measurable-achievement ratio for full achievement credit. */
  quantifiedBulletRatio: { good: 0.4, acceptable: 0.2 },
  /** Minimum distinct skills for full skills credit. */
  skills: { min: 6, ideal: 12, max: 40 },
} as const;

/**
 * The potential score never assumes a perfect rewrite. We only credit back
 * this fraction of an addressable deduction, so "73 → 91" stays honest
 * rather than always landing at 95+.
 */
export const POTENTIAL_RECOVERY_RATE = 0.78;

/**
 * Diminishing returns on the recoverable pool. A CV with 8 points of fixable
 * problems really can recover most of them; a CV with 45 points of problems
 * needs a rewrite, a different career narrative, and in some cases more
 * experience — promising it a near-perfect ceiling would be dishonest.
 * Larger constant = gentler damping.
 */
export const POTENTIAL_DAMPING_CONSTANT = 60;

/** No CV is ever told it can reach a perfect score by editing alone. */
export const POTENTIAL_CEILING = 97;

/** Findings the candidate genuinely cannot fix by editing text. */
export const NON_ADDRESSABLE_FINDINGS = new Set<string>([
  "experience.no_history",
]);

export const RATE_LIMIT = {
  max: Number(process.env.RATE_LIMIT_MAX ?? 5),
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60 * 60 * 1000),
} as const;

export const UPLOAD_LIMITS = {
  maxBytes: 8 * 1024 * 1024,
  allowedMimeTypes: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
  ] as const,
  allowedExtensions: [".pdf", ".docx", ".doc", ".txt"] as const,
} as const;
