import type { AnalysisResult, CVLanguage, Finding } from "../analysis/schema";

/**
 * Optional AI enrichment.
 *
 * Scoring never touches this. The engine is deterministic and fully
 * self-sufficient; enrichment only ever adds nicer prose on top of findings
 * that already exist. With CV_AI_PROVIDER=none — the default — the product is
 * complete, and that is the configuration the test suite runs under.
 *
 * The hard constraint on any provider added here: it may rephrase, condense
 * or organise the candidate's own words, or name something that is missing.
 * It must never introduce an employer, job title, date, degree, certification,
 * metric or responsibility that was not in the source document. A model that
 * invents a plausible-sounding achievement turns this product into a liability
 * for the person using it.
 */

export interface CVEnrichmentProvider {
  readonly id: string;
  improveSummary(input: {
    original: string;
    language: CVLanguage;
  }): Promise<string | null>;
  rewriteBullet(input: {
    original: string;
    language: CVLanguage;
  }): Promise<string | null>;
  suggestKeywords(input: {
    cvText: string;
    jobDescription: string | null;
    language: CVLanguage;
  }): Promise<string[]>;
  explainFinding(input: {
    finding: Finding;
    language: CVLanguage;
  }): Promise<string | null>;
}

/**
 * The default provider. Every method declines, which the caller treats as
 * "keep the deterministic output" — so `none` is a fully supported mode
 * rather than a degraded one.
 */
const noopProvider: CVEnrichmentProvider = {
  id: "none",
  async improveSummary() {
    return null;
  },
  async rewriteBullet() {
    return null;
  },
  async suggestKeywords() {
    return [];
  },
  async explainFinding() {
    return null;
  },
};

const providers: Record<string, CVEnrichmentProvider> = {
  none: noopProvider,
};

export function getEnrichmentProvider(): CVEnrichmentProvider {
  const configured = process.env.CV_AI_PROVIDER?.toLowerCase().trim() ?? "none";
  const provider = providers[configured];
  if (!provider) {
    console.warn(
      `[ai] Unknown CV_AI_PROVIDER "${configured}"; falling back to deterministic output.`,
    );
    return noopProvider;
  }
  return provider;
}

export function isEnrichmentEnabled(): boolean {
  return getEnrichmentProvider().id !== "none";
}

/**
 * Applies enrichment to a finished analysis.
 *
 * Failures are swallowed on purpose: enrichment is decoration, and a model
 * timeout must never cost the user their report. The deterministic result is
 * always returned intact.
 */
export async function enrichAnalysis(
  result: AnalysisResult,
): Promise<AnalysisResult> {
  const provider = getEnrichmentProvider();
  if (provider.id === "none") return result;

  try {
    const enrichedFindings = await Promise.all(
      result.findings.map(async (finding) => {
        const explanation = await provider.explainFinding({
          finding,
          language: result.language,
        });
        return explanation
          ? { ...finding, description: explanation }
          : finding;
      }),
    );
    return { ...result, findings: enrichedFindings };
  } catch (error) {
    console.error("[ai] enrichment failed; using deterministic result", error);
    return result;
  }
}
