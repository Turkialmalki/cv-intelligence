import "server-only";

import { tryGetServiceClient } from "../supabase/admin";

/**
 * Admin dashboard queries.
 *
 * Every function here runs with the service role, so each one must only ever
 * be called from a context that has already verified the session belongs to
 * ADMIN_EMAIL. That check lives in the page, before any of this is reached.
 *
 * Note what is deliberately absent: nothing here selects `extracted_text`.
 * The dashboard shows who scanned and what they scored, never the contents
 * of anyone's CV.
 */

export interface AdminAnalysisRow {
  id: string;
  token: string;
  createdAt: string;
  overallScore: number;
  potentialScore: number;
  classification: string;
  language: string;
  targetRole: string | null;
  leadName: string;
  leadEmail: string;
  source: string;
  paymentStatus: string | null;
}

export interface AdminStats {
  totalAnalyses: number;
  totalLeads: number;
  averageScore: number;
  analysesLast7Days: number;
  paidCount: number;
}

export interface AdminData {
  stats: AdminStats;
  analyses: AdminAnalysisRow[];
  available: boolean;
}

const EMPTY: AdminData = {
  stats: {
    totalAnalyses: 0,
    totalLeads: 0,
    averageScore: 0,
    analysesLast7Days: 0,
    paidCount: 0,
  },
  analyses: [],
  available: false,
};

interface RawRow {
  id: string;
  public_token: string;
  created_at: string;
  overall_score: number;
  potential_score: number;
  classification: string;
  language: string;
  target_role: string | null;
  leads: { name: string; email: string; source: string } | null;
  payments: Array<{ status: string }> | null;
}

export async function getAdminData(limit = 200): Promise<AdminData> {
  const supabase = tryGetServiceClient();
  if (!supabase) return EMPTY;

  try {
    const { data, error } = await supabase
      .from("analyses")
      .select(
        `id, public_token, created_at, overall_score, potential_score,
         classification, language, target_role,
         leads ( name, email, source ),
         payments ( status )`,
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[admin] query failed", error);
      return EMPTY;
    }

    const rows = (data ?? []) as unknown as RawRow[];

    const analyses: AdminAnalysisRow[] = rows.map((row) => ({
      id: row.id,
      token: row.public_token,
      createdAt: row.created_at,
      overallScore: row.overall_score,
      potentialScore: row.potential_score,
      classification: row.classification,
      language: row.language,
      targetRole: row.target_role,
      leadName: row.leads?.name ?? "—",
      leadEmail: row.leads?.email ?? "—",
      source: row.leads?.source ?? "web",
      // A lead may have several payment rows; "paid" wins if any succeeded.
      paymentStatus:
        row.payments?.find((p) => p.status === "paid")?.status ??
        row.payments?.[0]?.status ??
        null,
    }));

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const totalScore = analyses.reduce((sum, a) => sum + a.overallScore, 0);

    const { count: leadCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true });

    return {
      available: true,
      analyses,
      stats: {
        totalAnalyses: analyses.length,
        totalLeads: leadCount ?? analyses.length,
        averageScore:
          analyses.length > 0
            ? Math.round((totalScore / analyses.length) * 10) / 10
            : 0,
        analysesLast7Days: analyses.filter(
          (a) => new Date(a.createdAt).getTime() >= sevenDaysAgo,
        ).length,
        paidCount: analyses.filter((a) => a.paymentStatus === "paid").length,
      },
    };
  } catch (error) {
    console.error("[admin] getAdminData threw", error);
    return EMPTY;
  }
}
