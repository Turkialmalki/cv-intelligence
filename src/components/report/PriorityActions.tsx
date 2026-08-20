"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

import type { PriorityAction } from "@/lib/analysis/schema";
import { useLocale } from "@/lib/i18n/context";

/**
 * The three changes that recover the most score.
 *
 * Ranked by the engine's own estimate of recoverable points, so the ordering
 * is derived rather than editorial.
 */
export function PriorityActions({
  priorities,
}: {
  priorities: PriorityAction[];
}) {
  const { t } = useLocale();

  if (priorities.length === 0) return null;

  return (
    <ol className="grid gap-3 md:grid-cols-3">
      {priorities.map((priority, i) => (
        <motion.li
          key={priority.id}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.45, delay: i * 0.08 }}
          className="card flex flex-col p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-900 text-[13px] font-bold text-white">
              {priority.rank}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-signal-positive/10 px-2 py-1 text-[11px] font-bold text-signal-positive">
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              <span className="num">+{priority.estimatedGain}</span>
            </span>
          </div>

          <h3 className="mt-3.5 text-[15px] font-semibold leading-snug text-ink-900">
            {priority.title}
          </h3>
          <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-500">
            {priority.description}
          </p>

          <p className="mt-3 border-t border-ink-100 pt-3 text-[12px] text-ink-400">
            {t.report.prioritiesGain}{" "}
            <span className="num font-semibold text-ink-600">
              {priority.estimatedGain}
            </span>{" "}
            {t.report.prioritiesPoints}
          </p>
        </motion.li>
      ))}
    </ol>
  );
}
