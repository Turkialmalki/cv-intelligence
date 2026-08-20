"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  ChevronDown,
  CircleAlert,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useState } from "react";

import type { Finding, Severity } from "@/lib/analysis/schema";
import { useLocale } from "@/lib/i18n/context";

const SEVERITY_STYLE: Record<
  Severity,
  { icon: typeof AlertOctagon; color: string; bg: string; border: string }
> = {
  critical: {
    icon: AlertOctagon,
    color: "#e5484d",
    bg: "rgba(229,72,77,0.06)",
    border: "rgba(229,72,77,0.22)",
  },
  high: {
    icon: AlertTriangle,
    color: "#f76b15",
    bg: "rgba(247,107,21,0.06)",
    border: "rgba(247,107,21,0.22)",
  },
  medium: {
    icon: CircleAlert,
    color: "#e2a600",
    bg: "rgba(226,166,0,0.07)",
    border: "rgba(226,166,0,0.24)",
  },
  low: {
    icon: Info,
    color: "#8591aa",
    bg: "rgba(133,145,170,0.07)",
    border: "rgba(133,145,170,0.24)",
  },
  positive: {
    icon: CheckCircle2,
    color: "#12a672",
    bg: "rgba(18,166,114,0.06)",
    border: "rgba(18,166,114,0.22)",
  },
};

/**
 * One finding, expandable.
 *
 * Collapsed it shows severity, title and score impact. Expanded it shows the
 * evidence from the user's own CV, why it matters, the fix, and where
 * available a real before/after. The evidence is what separates this from
 * generic advice, so it is always rendered as a quotation from their document.
 */
export function FindingCard({
  finding,
  defaultOpen = false,
}: {
  finding: Finding;
  defaultOpen?: boolean;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(defaultOpen);

  const style = SEVERITY_STYLE[finding.severity];
  const Icon = style.icon;

  return (
    <div
      className="overflow-hidden rounded-2xl border bg-white transition-shadow duration-200 hover:shadow-card"
      style={{ borderColor: style.border }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-start sm:p-5"
      >
        <span
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{ backgroundColor: style.bg }}
        >
          <Icon className="h-4 w-4" style={{ color: style.color }} aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: style.color }}
            >
              {t.severity[finding.severity]}
            </span>
            {finding.deduction > 0 && (
              <span className="num rounded-md bg-ink-50 px-1.5 py-0.5 text-[11px] font-semibold text-ink-600">
                −{finding.deduction} {t.common.points}
              </span>
            )}
          </span>
          <span className="mt-1 block text-[15px] font-semibold leading-snug text-ink-900">
            {finding.title}
          </span>
        </span>

        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="space-y-4 border-t border-ink-100 px-4 py-4 sm:px-5">
              {finding.evidence && (
                <div>
                  <div className="eyebrow mb-1.5">{t.report.issuesEvidence}</div>
                  {/* Rendered as plain text, never as HTML — this string comes
                      straight from an uploaded document. */}
                  <blockquote className="rounded-lg border-s-2 border-ink-200 bg-ink-50/60 px-3 py-2 text-[13px] italic leading-relaxed text-ink-700">
                    {finding.evidence}
                  </blockquote>
                </div>
              )}

              <div>
                <div className="eyebrow mb-1.5">{t.report.issuesWhy}</div>
                <p className="text-[14px] leading-relaxed text-ink-600">
                  {finding.description}
                </p>
              </div>

              <div>
                <div className="eyebrow mb-1.5">{t.report.issuesFix}</div>
                <p className="text-[14px] leading-relaxed text-ink-800">
                  {finding.recommendation}
                </p>
              </div>

              {finding.exampleBefore && finding.exampleAfter && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-signal-critical/20 bg-signal-critical/[0.035] p-3">
                    <div
                      className="eyebrow mb-1.5"
                      style={{ color: "#e5484d" }}
                    >
                      {t.report.comparisonBefore}
                    </div>
                    <p className="text-[13px] leading-relaxed text-ink-700">
                      {finding.exampleBefore}
                    </p>
                  </div>
                  <div className="rounded-lg border border-signal-positive/25 bg-signal-positive/[0.04] p-3">
                    <div
                      className="eyebrow mb-1.5"
                      style={{ color: "#12a672" }}
                    >
                      {t.report.comparisonAfter}
                    </div>
                    <p className="text-[13px] leading-relaxed text-ink-800">
                      {finding.exampleAfter}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
