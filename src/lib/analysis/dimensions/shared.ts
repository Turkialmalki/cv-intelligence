import { NON_ADDRESSABLE_FINDINGS } from "../config";
import type { CVDocument } from "../normalize";
import type {
  Category,
  DocumentCondition,
  Finding,
  Severity,
} from "../schema";
import { truncate } from "../text";

export interface ScoringContext {
  doc: CVDocument;
  condition: DocumentCondition;
  jobDescription: string | null;
  targetRole: string | null;
}

export interface DimensionResult {
  /** Points awarded, always within [0, max] for the dimension. */
  score: number;
  findings: Finding[];
  summary: string;
  summaryAr: string;
}

export interface FindingInput {
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
  deduction: number;
  evidence?: string | null;
  exampleBefore?: string | null;
  exampleAfter?: string | null;
  addressable?: boolean;
  isLocked?: boolean;
}

export function makeFinding(input: FindingInput): Finding {
  return {
    id: input.id,
    category: input.category,
    severity: input.severity,
    title: input.title,
    description: input.description,
    evidence: input.evidence ? truncate(input.evidence, 220) : null,
    deduction: Math.max(0, Math.round(input.deduction * 100) / 100),
    recommendation: input.recommendation,
    exampleBefore: input.exampleBefore ?? null,
    exampleAfter: input.exampleAfter ?? null,
    addressable:
      input.addressable ?? !NON_ADDRESSABLE_FINDINGS.has(input.id),
    isLocked: input.isLocked ?? false,
  };
}

/**
 * Deducts points from a running budget, never below zero, and returns the
 * amount actually deducted so the finding reports the true impact.
 */
export class ScoreBudget {
  private remaining: number;

  constructor(private readonly max: number) {
    this.remaining = max;
  }

  /** Returns the deduction actually applied (clamped to what is left). */
  deduct(amount: number): number {
    const applied = Math.min(Math.max(amount, 0), this.remaining);
    this.remaining -= applied;
    return Math.round(applied * 100) / 100;
  }

  get score(): number {
    return Math.round(this.remaining * 100) / 100;
  }

  get maxPoints(): number {
    return this.max;
  }
}

export function pct(score: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((score / max) * 100);
}

/** Picks representative real bullets as evidence without inventing content. */
export function sampleBullets(doc: CVDocument, limit = 3): string[] {
  const source = doc.bullets.length > 0 ? doc.bullets : doc.lines;
  return source
    .filter((l) => l.words >= 4)
    .slice(0, limit)
    .map((l) => l.text);
}
