"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";

import { scoreColor } from "@/components/report/ScoreGauge";
import type { AdminData } from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/browser";

type ScoreFilter = "all" | "high" | "mid" | "low";
type DateFilter = "all" | "7d" | "30d";
type PaymentFilter = "all" | "paid" | "unpaid";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="eyebrow">{label}</div>
      <div className="num mt-1.5 text-2xl font-bold text-ink-900">{value}</div>
    </div>
  );
}

export function AdminDashboard({
  data,
  adminEmail,
}: {
  data: AdminData;
  adminEmail: string;
}) {
  const router = useRouter();
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [roleQuery, setRoleQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  const sources = useMemo(
    () => [...new Set(data.analyses.map((a) => a.source))],
    [data.analyses],
  );

  const rows = useMemo(() => {
    const now = Date.now();
    return data.analyses.filter((row) => {
      if (scoreFilter === "high" && row.overallScore < 80) return false;
      if (scoreFilter === "mid" && (row.overallScore < 60 || row.overallScore >= 80))
        return false;
      if (scoreFilter === "low" && row.overallScore >= 60) return false;

      if (dateFilter !== "all") {
        const days = dateFilter === "7d" ? 7 : 30;
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        if (new Date(row.createdAt).getTime() < cutoff) return false;
      }

      if (paymentFilter === "paid" && row.paymentStatus !== "paid") return false;
      if (paymentFilter === "unpaid" && row.paymentStatus === "paid") return false;

      if (sourceFilter !== "all" && row.source !== sourceFilter) return false;

      if (roleQuery.trim()) {
        const needle = roleQuery.trim().toLowerCase();
        const haystack = `${row.targetRole ?? ""} ${row.leadName} ${row.leadEmail}`;
        if (!haystack.toLowerCase().includes(needle)) return false;
      }

      return true;
    });
  }, [
    data.analyses,
    scoreFilter,
    dateFilter,
    paymentFilter,
    sourceFilter,
    roleQuery,
  ]);

  const signOut = async () => {
    try {
      await createClient().auth.signOut();
      router.refresh();
    } catch {
      // Nothing useful to do; the session cookie expires regardless.
    }
  };

  return (
    <div className="min-h-dvh bg-ink-50/40">
      <header className="border-b border-ink-200 bg-white">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div>
            <div className="text-[15px] font-bold text-ink-900">Admin</div>
            <div className="text-[12px] text-ink-500">{adminEmail}</div>
          </div>
          <button type="button" onClick={signOut} className="btn-ghost !min-h-[40px] !px-3 !text-sm">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>

      <main className="container-page py-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Analyses" value={data.stats.totalAnalyses} />
          <Stat label="Leads" value={data.stats.totalLeads} />
          <Stat label="Average score" value={data.stats.averageScore} />
          <Stat label="Last 7 days" value={data.stats.analysesLast7Days} />
          <Stat label="Paid" value={data.stats.paidCount} />
        </div>

        {/* Filters */}
        <div className="card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="search"
            value={roleQuery}
            onChange={(e) => setRoleQuery(e.target.value)}
            placeholder="Search name, email or role"
            className="field !py-2 !text-[13px]"
          />
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value as ScoreFilter)}
            className="field !py-2 !text-[13px]"
          >
            <option value="all">All scores</option>
            <option value="high">80 and above</option>
            <option value="mid">60 – 79</option>
            <option value="low">Below 60</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="field !py-2 !text-[13px]"
          >
            <option value="all">All time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
            className="field !py-2 !text-[13px]"
          >
            <option value="all">All payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Not paid</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="field !py-2 !text-[13px]"
          >
            <option value="all">All sources</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>

        {/* Table. Scrolls inside its own container so the page never
            overflows horizontally on a phone. */}
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-start text-[13px]">
            <thead>
              <tr className="border-b border-ink-200 text-[11px] uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3 text-start font-semibold">Name</th>
                <th className="px-4 py-3 text-start font-semibold">Email</th>
                <th className="px-4 py-3 text-start font-semibold">Score</th>
                <th className="px-4 py-3 text-start font-semibold">Target role</th>
                <th className="px-4 py-3 text-start font-semibold">Date</th>
                <th className="px-4 py-3 text-start font-semibold">Payment</th>
                <th className="px-4 py-3 text-start font-semibold">Report</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60"
                >
                  <td className="px-4 py-3 font-medium text-ink-900">
                    {row.leadName}
                  </td>
                  <td className="px-4 py-3 text-ink-600" dir="ltr">
                    {row.leadEmail}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="num font-bold"
                      style={{ color: scoreColor(row.overallScore) }}
                    >
                      {row.overallScore}
                    </span>
                    <span className="num text-ink-400">
                      {" "}
                      → {row.potentialScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {row.targetRole ?? "—"}
                  </td>
                  <td className="num px-4 py-3 text-ink-500">
                    {new Date(row.createdAt).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                        row.paymentStatus === "paid"
                          ? "bg-signal-positive/10 text-signal-positive"
                          : "bg-ink-100 text-ink-500"
                      }`}
                    >
                      {row.paymentStatus ?? "none"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/r/${row.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-accent-700 hover:underline"
                    >
                      Open
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="px-4 py-12 text-center text-[14px] text-ink-500">
              {data.available
                ? "No analyses match these filters."
                : "Supabase is not configured, so there is nothing to show yet."}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
