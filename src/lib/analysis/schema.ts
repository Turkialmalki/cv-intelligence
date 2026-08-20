import { z } from "zod";

/**
 * Canonical schemas for everything the scoring engine produces.
 * These are the contract between the engine, the API layer, the database
 * and the UI. Nothing reaches the client that is not shaped by these.
 */

export const CATEGORIES = [
  "ats_parseability",
  "contact_information",
  "structure",
  "experience_quality",
  "achievement_strength",
  "skills_quality",
  "recruiter_readability",
  "keyword_job_match",
  "professional_impact",
] as const;

export const categorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof categorySchema>;

export const severitySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "positive",
]);
export type Severity = z.infer<typeof severitySchema>;

export const classificationSchema = z.enum([
  "exceptional",
  "strong",
  "competitive",
  "needs_improvement",
  "weak",
  "critical",
]);
export type Classification = z.infer<typeof classificationSchema>;

export const languageSchema = z.enum(["en", "ar", "mixed", "unknown"]);
export type CVLanguage = z.infer<typeof languageSchema>;

export const findingSchema = z.object({
  id: z.string().min(1),
  category: categorySchema,
  severity: severitySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  /** Verbatim excerpt from the CV that triggered this finding, if any. */
  evidence: z.string().nullable(),
  /** Points removed from the category subtotal. Positive findings are 0. */
  deduction: z.number().min(0),
  recommendation: z.string().min(1),
  /** Real text from the CV, when the finding is bullet-level. */
  exampleBefore: z.string().nullable(),
  /**
   * A rewritten direction for `exampleBefore`. Never contains invented
   * employers, titles, dates, metrics or credentials — missing data is
   * represented by an explicit placeholder prompt.
   */
  exampleAfter: z.string().nullable(),
  /** Whether fixing this is within the candidate's control (feeds potential). */
  addressable: z.boolean(),
  /** Gated behind the paid tier in the UI. */
  isLocked: z.boolean(),
});
export type Finding = z.infer<typeof findingSchema>;

export const categoryScoreSchema = z.object({
  category: categorySchema,
  score: z.number().min(0),
  max: z.number().positive(),
  /** 0-100 percentage of the category maximum. */
  percentage: z.number().min(0).max(100),
  label: z.string(),
  labelAr: z.string(),
  summary: z.string(),
  summaryAr: z.string(),
});
export type CategoryScore = z.infer<typeof categoryScoreSchema>;

export const candidateInfoSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  linkedin: z.string().nullable(),
  portfolio: z.string().nullable(),
  /** Only true when extraction was unambiguous; drives whether we show it. */
  nameConfident: z.boolean(),
});
export type CandidateInfo = z.infer<typeof candidateInfoSchema>;

export const detectedSectionSchema = z.object({
  type: z.string(),
  heading: z.string(),
  present: z.boolean(),
  lineCount: z.number().int().min(0),
  order: z.number().int(),
});
export type DetectedSection = z.infer<typeof detectedSectionSchema>;

export const jobMatchSchema = z.object({
  score: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  breakdown: z.object({
    skills: z.number().min(0).max(100),
    experience: z.number().min(0).max(100),
    keywordCoverage: z.number().min(0).max(100),
    seniority: z.number().min(0).max(100),
  }),
  inferredTitle: z.string().nullable(),
});
export type JobMatch = z.infer<typeof jobMatchSchema>;

export const priorityActionSchema = z.object({
  id: z.string(),
  rank: z.number().int().min(1),
  title: z.string(),
  titleAr: z.string(),
  description: z.string(),
  descriptionAr: z.string(),
  estimatedGain: z.number().min(0),
  category: categorySchema,
});
export type PriorityAction = z.infer<typeof priorityActionSchema>;

export const comparisonLineSchema = z.object({
  id: z.string(),
  section: z.string(),
  original: z.string(),
  optimized: z.string(),
  /** Nothing rendered here is invented; flags what changed and why. */
  issue: severitySchema.nullable(),
  note: z.string().nullable(),
});
export type ComparisonLine = z.infer<typeof comparisonLineSchema>;

export const documentConditionSchema = z.enum([
  "ok",
  "image_based_document",
  "too_short",
  "unreadable",
]);
export type DocumentCondition = z.infer<typeof documentConditionSchema>;

export const analysisSummarySchema = z.object({
  headline: z.string(),
  headlineAr: z.string(),
  interpretation: z.string(),
  interpretationAr: z.string(),
  strengths: z.array(z.string()),
  strengthsAr: z.array(z.string()),
  wordCount: z.number().int().min(0),
  bulletCount: z.number().int().min(0),
  estimatedPages: z.number().min(0),
});
export type AnalysisSummary = z.infer<typeof analysisSummarySchema>;

export const analysisResultSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  potentialScore: z.number().int().min(0).max(100),
  classification: classificationSchema,
  language: languageSchema,
  condition: documentConditionSchema,
  categories: z.array(categoryScoreSchema),
  findings: z.array(findingSchema),
  priorities: z.array(priorityActionSchema),
  candidate: candidateInfoSchema,
  sections: z.array(detectedSectionSchema),
  jobMatch: jobMatchSchema.nullable(),
  comparison: z.array(comparisonLineSchema),
  summary: analysisSummarySchema,
  engineVersion: z.string(),
});
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

/* -------------------------------------------------------------------------- */
/* API request / response contracts                                           */
/* -------------------------------------------------------------------------- */

export const analyzeRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("A valid email is required").max(200),
  targetRole: z.string().trim().max(160).optional().nullable(),
  jobDescription: z.string().trim().max(20000).optional().nullable(),
  pastedText: z.string().max(200000).optional().nullable(),
  locale: z.enum(["en", "ar"]).default("en"),
});
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export const feedbackRequestSchema = z.object({
  token: z.string().min(16).max(80),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
});
export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;

export const reportPayloadSchema = z.object({
  token: z.string(),
  createdAt: z.string(),
  candidateName: z.string().nullable(),
  targetRole: z.string().nullable(),
  hasJobDescription: z.boolean(),
  result: analysisResultSchema,
});
export type ReportPayload = z.infer<typeof reportPayloadSchema>;
