import "server-only";

import { analysisResultSchema, type AnalysisResult } from "./analysis/schema";
import { serverEnv } from "./env";
import { tryGetServiceClient } from "./supabase/admin";
import { generatePublicToken } from "./tokens";
import type { AnalysisRow, LeadRow } from "./supabase/types";

/**
 * All database access for the analysis flow.
 *
 * Persistence is deliberately best-effort at the individual-write level: a
 * failure to store, say, the findings rows must not lose the user's report.
 * The one write that genuinely matters is the analysis row itself, because
 * it carries the token the report URL resolves against.
 */

export interface PersistInput {
  lead: {
    name: string;
    email: string;
    targetRole: string | null;
    source: string;
  };
  document: {
    filename: string;
    mimeType: string;
    fileSize: number;
    language: string;
    extractedText: string;
    storagePath: string | null;
  };
  analysis: {
    jobDescription: string | null;
    targetRole: string | null;
  };
  result: AnalysisResult;
}

export interface PersistedAnalysis {
  token: string;
  analysisId: string | null;
  leadId: string | null;
  persisted: boolean;
}

/**
 * Stores a completed analysis and returns its public token.
 *
 * The token is generated here regardless of whether the database is
 * reachable, so the caller always has a stable identifier to return.
 */
export async function persistAnalysis(
  input: PersistInput,
): Promise<PersistedAnalysis> {
  const token = generatePublicToken();
  const supabase = tryGetServiceClient();

  if (!supabase) {
    return { token, analysisId: null, leadId: null, persisted: false };
  }

  try {
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        name: input.lead.name,
        email: input.lead.email,
        target_role: input.lead.targetRole,
        source: input.lead.source,
      })
      .select("id")
      .single<Pick<LeadRow, "id">>();

    if (leadError || !lead) throw leadError ?? new Error("lead insert failed");

    // In temporary retention mode the original file is already gone by now;
    // the extracted text is the durable record.
    const { data: document, error: documentError } = await supabase
      .from("cv_documents")
      .insert({
        lead_id: lead.id,
        original_filename: input.document.filename,
        mime_type: input.document.mimeType,
        file_size: input.document.fileSize,
        language: input.document.language,
        storage_path:
          serverEnv.fileRetentionMode === "persistent"
            ? input.document.storagePath
            : null,
        extracted_text: input.document.extractedText,
      })
      .select("id")
      .single<{ id: string }>();

    if (documentError || !document) {
      throw documentError ?? new Error("document insert failed");
    }

    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .insert({
        lead_id: lead.id,
        cv_document_id: document.id,
        public_token: token,
        overall_score: input.result.overallScore,
        potential_score: input.result.potentialScore,
        classification: input.result.classification,
        language: input.result.language,
        job_description: input.analysis.jobDescription,
        target_role: input.analysis.targetRole,
        score_breakdown: input.result,
        summary: input.result.summary,
        status: "completed",
      })
      .select("id")
      .single<{ id: string }>();

    if (analysisError || !analysis) {
      throw analysisError ?? new Error("analysis insert failed");
    }

    // Findings are denormalised into their own table so the admin view and
    // future analytics can query across them without unpacking JSON.
    if (input.result.findings.length > 0) {
      const rows = input.result.findings.map((f) => ({
        analysis_id: analysis.id,
        finding_key: f.id,
        category: f.category,
        severity: f.severity,
        title: f.title,
        description: f.description,
        evidence: f.evidence,
        recommendation: f.recommendation,
        score_deduction: f.deduction,
        before_text: f.exampleBefore,
        after_text: f.exampleAfter,
        is_locked: f.isLocked,
      }));
      const { error } = await supabase.from("findings").insert(rows);
      if (error) console.error("[repository] findings insert failed", error);
    }

    if (input.result.comparison.length > 0) {
      const rows = input.result.comparison.map((c) => ({
        analysis_id: analysis.id,
        section_type: c.section,
        original_content: c.original,
        suggested_content: c.optimized,
        confidence: 1.0,
        is_locked: false,
      }));
      const { error } = await supabase
        .from("generated_improvements")
        .insert(rows);
      if (error) {
        console.error("[repository] improvements insert failed", error);
      }
    }

    return {
      token,
      analysisId: analysis.id,
      leadId: lead.id,
      persisted: true,
    };
  } catch (error) {
    console.error("[repository] persistAnalysis failed", error);
    return { token, analysisId: null, leadId: null, persisted: false };
  }
}

export interface StoredReport {
  token: string;
  createdAt: string;
  candidateName: string | null;
  candidateEmail: string;
  targetRole: string | null;
  hasJobDescription: boolean;
  result: AnalysisResult;
  analysisId: string;
}

/**
 * Loads a report by its public token.
 *
 * The token has already been format-checked by the caller. A miss returns
 * null rather than throwing, so the route can render a clean 404 without
 * revealing whether the token ever existed.
 */
export async function getReportByToken(
  token: string,
): Promise<StoredReport | null> {
  const supabase = tryGetServiceClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("analyses")
      .select(
        "id, public_token, created_at, target_role, job_description, score_breakdown, leads(name, email)",
      )
      .eq("public_token", token)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as unknown as AnalysisRow & {
      leads: { name: string; email: string } | null;
    };

    // The stored breakdown is validated on the way out as well as in: a
    // schema change must surface as an error, not as a half-rendered report.
    const parsed = analysisResultSchema.safeParse(row.score_breakdown);
    if (!parsed.success) {
      console.error("[repository] stored analysis failed validation", token);
      return null;
    }

    return {
      token: row.public_token,
      createdAt: row.created_at,
      candidateName: row.leads?.name ?? parsed.data.candidate.name,
      candidateEmail: row.leads?.email ?? "",
      targetRole: row.target_role,
      hasJobDescription: Boolean(row.job_description),
      result: parsed.data,
      analysisId: row.id,
    };
  } catch (error) {
    console.error("[repository] getReportByToken failed", error);
    return null;
  }
}

export async function recordEmailEvent(params: {
  analysisId: string | null;
  recipient: string;
  eventType: string;
  status: "queued" | "sent" | "failed" | "skipped";
  providerMessageId?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  const supabase = tryGetServiceClient();
  if (!supabase) return;

  try {
    await supabase.from("email_events").insert({
      analysis_id: params.analysisId,
      recipient: params.recipient,
      event_type: params.eventType,
      status: params.status,
      provider_message_id: params.providerMessageId ?? null,
      error_message: params.errorMessage ?? null,
    });
  } catch (error) {
    // Logging a log failure must never propagate.
    console.error("[repository] recordEmailEvent failed", error);
  }
}

export async function recordFeedback(params: {
  analysisId: string;
  rating: number;
  comment: string | null;
}): Promise<boolean> {
  const supabase = tryGetServiceClient();
  if (!supabase) return false;

  const { error } = await supabase.from("feedback").insert({
    analysis_id: params.analysisId,
    rating: params.rating,
    comment: params.comment,
  });

  if (error) {
    console.error("[repository] recordFeedback failed", error);
    return false;
  }
  return true;
}

/** Idempotent upsert used by the payment webhook. */
export async function upsertPayment(params: {
  analysisId: string | null;
  leadId: string | null;
  provider: string;
  providerReference: string;
  amount: number;
  currency: string;
  status: string;
  rawPayload?: unknown;
}): Promise<boolean> {
  const supabase = tryGetServiceClient();
  if (!supabase) return false;

  const { error } = await supabase.from("payments").upsert(
    {
      analysis_id: params.analysisId,
      lead_id: params.leadId,
      provider: params.provider,
      provider_reference: params.providerReference,
      amount: params.amount,
      currency: params.currency,
      status: params.status,
      raw_payload: params.rawPayload ?? null,
    },
    { onConflict: "provider,provider_reference" },
  );

  if (error) {
    console.error("[repository] upsertPayment failed", error);
    return false;
  }
  return true;
}

/** Resolves an analysis id from a public token, for token-scoped writes. */
export async function getAnalysisIdByToken(
  token: string,
): Promise<string | null> {
  const supabase = tryGetServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("analyses")
    .select("id")
    .eq("public_token", token)
    .maybeSingle<{ id: string }>();

  if (error || !data) return null;
  return data.id;
}
