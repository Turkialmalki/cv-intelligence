"use client";

import { motion, useInView } from "framer-motion";
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";
import { useRef } from "react";

import type { ComparisonLine } from "@/lib/analysis/schema";
import { useLocale } from "@/lib/i18n/context";

/**
 * Placeholder prompts inserted by the rewriter, highlighted rather than hidden.
 *
 * Two regexes on purpose: the global one is for splitting, and a separate
 * non-global one for testing. Calling .test() on a /g regex advances its
 * lastIndex between calls, which would make alternate placeholders fail to
 * match.
 */
const PLACEHOLDER_SPLIT_RE = /(\[(?:add|اكتب|أضف)[^\]]*\])/gi;
const PLACEHOLDER_TEST_RE = /^\[(?:add|اكتب|أضف)[^\]]*\]$/i;

/**
 * Renders optimised text, visually distinguishing the placeholders.
 *
 * This is the honesty mechanism made visible: where the engine could have
 * invented a metric it instead leaves a prompt, and that prompt is styled as
 * an obvious blank to fill rather than blending into the sentence.
 */
function OptimizedText({ text }: { text: string }) {
  const parts = text.split(PLACEHOLDER_SPLIT_RE);

  return (
    <p className="text-[13px] leading-relaxed text-ink-800">
      {parts.map((part, i) =>
        PLACEHOLDER_TEST_RE.test(part) ? (
          <span
            key={i}
            className="mx-0.5 inline-block rounded border border-dashed border-accent-400 bg-accent-50 px-1.5 py-0.5 text-[12px] font-medium text-accent-800"
          >
            {part.replace(/^\[|\]$/g, "")}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

const ISSUE_COLOR: Record<string, string> = {
  critical: "#e5484d",
  high: "#f76b15",
  medium: "#e2a600",
  low: "#8591aa",
  positive: "#12a672",
};

function ComparisonRow({ line, index }: { line: ComparisonLine; index: number }) {
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const color = ISSUE_COLOR[line.issue ?? "low"] ?? "#8591aa";

  return (
    <div
      ref={ref}
      className="grid gap-3 border-b border-ink-100 py-5 last:border-0 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-4"
    >
      {/* Before */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.45, delay: index * 0.06 }}
        className="rounded-xl border p-3.5"
        style={{ borderColor: `${color}38`, backgroundColor: `${color}0a` }}
      >
        <div className="eyebrow mb-2" style={{ color }}>
          {t.report.comparisonBefore}
        </div>
        <p className="text-[13px] leading-relaxed text-ink-700">
          {line.original}
        </p>
      </motion.div>

      {/* Connector — a chevron on desktop, an arrow down on mobile. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.35, delay: index * 0.06 + 0.2 }}
        className="mx-auto grid h-8 w-8 place-items-center rounded-full border border-ink-200 bg-white shadow-card"
        aria-hidden="true"
      >
        <ArrowRight className="hidden h-3.5 w-3.5 text-ink-500 md:block rtl:rotate-180" />
        <ArrowDown className="h-3.5 w-3.5 text-ink-500 md:hidden" />
      </motion.div>

      {/* After */}
      <motion.div
        initial={{ opacity: 0, x: 8 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.45, delay: index * 0.06 + 0.28 }}
        className="rounded-xl border border-signal-positive/25 bg-signal-positive/[0.04] p-3.5"
      >
        <div
          className="eyebrow mb-2 inline-flex items-center gap-1"
          style={{ color: "#12a672" }}
        >
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          {t.report.comparisonAfter}
        </div>
        <OptimizedText text={line.optimized} />
        {line.note && (
          <p className="mt-2 border-t border-signal-positive/15 pt-2 text-[12px] text-ink-500">
            {line.note}
          </p>
        )}
      </motion.div>
    </div>
  );
}

export function CVComparison({ lines }: { lines: ComparisonLine[] }) {
  const { t } = useLocale();

  if (lines.length === 0) return null;

  return (
    <div>
      <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
        {t.report.comparisonSubtitle}
      </p>
      <div className="card px-4 sm:px-6">
        {lines.map((line, i) => (
          <ComparisonRow key={line.id} line={line} index={i} />
        ))}
      </div>
    </div>
  );
}
