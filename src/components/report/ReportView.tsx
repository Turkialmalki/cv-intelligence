"use client";

import { useMemo, useState } from "react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import type { AnalysisResult, Severity } from "@/lib/analysis/schema";
import { useLocale } from "@/lib/i18n/context";

import { CVComparison } from "./CVComparison";
import { FeedbackWidget } from "./FeedbackWidget";
import { FindingCard } from "./FindingCard";
import { JobMatchPanel } from "./JobMatchPanel";
import { PriorityActions } from "./PriorityActions";
import { ReportHeader } from "./ReportHeader";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { LockedInsight, UpgradeCTA } from "./UpgradeCTA";

interface ReportViewProps {
  result: AnalysisResult;
  token: string;
  candidateName: string | null;
  createdAt: string;
  checkoutUrl: string | null;
}

type Filter = "all" | "critical" | "high" | "medium" | "positive";

function Section({
  title,
  subtitle,
  children,
  id,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-20 py-10 sm:py-12">
      <h2 className="text-2xl font-bold text-ink-900 sm:text-[1.75rem]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-500">
          {subtitle}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function ReportView({
  result,
  token,
  candidateName,
  createdAt,
  checkoutUrl,
}: ReportViewProps) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<Filter>("all");

  const issues = useMemo(
    () => result.findings.filter((f) => f.severity !== "positive"),
    [result.findings],
  );
  const strengths = useMemo(
    () => result.findings.filter((f) => f.severity === "positive"),
    [result.findings],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return issues;
    if (filter === "positive") return strengths;
    return issues.filter((f) => f.severity === (filter as Severity));
  }, [filter, issues, strengths]);

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: "all", label: t.report.issuesAll, count: issues.length },
    {
      key: "critical",
      label: t.report.issuesCritical,
      count: issues.filter((f) => f.severity === "critical").length,
    },
    {
      key: "high",
      label: t.report.issuesHigh,
      count: issues.filter((f) => f.severity === "high").length,
    },
    {
      key: "medium",
      label: t.report.issuesMedium,
      count: issues.filter((f) => f.severity === "medium").length,
    },
    {
      key: "positive",
      label: t.report.issuesStrengths,
      count: strengths.length,
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader showCta={false} />

      <main className="flex-1">
        <ReportHeader
          result={result}
          candidateName={candidateName}
          createdAt={createdAt}
          token={token}
        />

        <div className="container-page">
          {/* Priorities first: the single most useful thing on the page. */}
          {result.priorities.length > 0 && (
            <Section
              id="priorities"
              title={t.report.prioritiesTitle}
              subtitle={t.report.prioritiesSubtitle}
            >
              <PriorityActions priorities={result.priorities} />
            </Section>
          )}

          <div className="hairline" />

          <Section
            id="breakdown"
            title={t.report.breakdownTitle}
            subtitle={t.report.breakdownSubtitle}
          >
            <div className="card p-5 sm:p-6">
              <ScoreBreakdown categories={result.categories} />
            </div>
          </Section>

          <div className="hairline" />

          <Section
            id="job-match"
            title={t.report.jobMatchTitle}
            subtitle={result.jobMatch ? t.report.jobMatchSubtitle : undefined}
          >
            <JobMatchPanel jobMatch={result.jobMatch} />
          </Section>

          {result.comparison.length > 0 && (
            <>
              <div className="hairline" />
              <Section id="comparison" title={t.report.comparisonTitle}>
                <CVComparison lines={result.comparison} />
              </Section>
            </>
          )}

          <div className="hairline" />

          <Section
            id="issues"
            title={t.report.issuesTitle}
            subtitle={t.report.issuesSubtitle}
          >
            {/* Filter rail. Horizontally scrollable on narrow screens rather
                than wrapping into a tall block. */}
            <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {filters.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilter(option.key)}
                  className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-semibold transition-colors ${
                    filter === option.key
                      ? "border-ink-900 bg-ink-900 text-white"
                      : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  {option.label}
                  <span
                    className={`num text-[12px] ${
                      filter === option.key ? "text-ink-300" : "text-ink-400"
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              {filtered.map((finding, i) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  // The first card opens so the interaction is discoverable.
                  defaultOpen={i === 0 && filter === "all"}
                />
              ))}
            </div>
          </Section>

          <div className="hairline" />

          <Section id="upgrade" title={t.report.lockedTitle}>
            <div className="space-y-4">
              <LockedInsight />
              <UpgradeCTA
                currentScore={result.overallScore}
                potentialScore={result.potentialScore}
                checkoutUrl={checkoutUrl}
              />
            </div>
          </Section>

          <div className="pb-12">
            <FeedbackWidget token={token} />
            <p className="mt-6 text-[12px] leading-relaxed text-ink-400">
              {t.report.privacyNote}
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
