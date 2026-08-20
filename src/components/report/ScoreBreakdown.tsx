"use client";

import { motion } from "framer-motion";

import type { CategoryScore } from "@/lib/analysis/schema";
import { useLocale } from "@/lib/i18n/context";

import { scoreColor } from "./ScoreGauge";

/**
 * Per-category bars.
 *
 * Each bar is scaled to its own category maximum, and the maximum is printed
 * alongside it. Showing "12.5 / 15" rather than a bare percentage keeps the
 * weighting visible — a user should be able to see that Achievements is worth
 * three times what Professional Impact is.
 */
export function ScoreBreakdown({
  categories,
}: {
  categories: CategoryScore[];
}) {
  const { locale, t } = useLocale();

  return (
    <div className="space-y-1">
      {categories.map((category, i) => {
        const percentage = category.percentage;
        const color = scoreColor(percentage);
        const label = locale === "ar" ? category.labelAr : category.label;
        const summary = locale === "ar" ? category.summaryAr : category.summary;

        return (
          <motion.div
            key={category.category}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: i * 0.05 }}
            className="border-b border-ink-100 py-4 last:border-0"
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[14px] font-semibold text-ink-900">
                {label}
              </span>
              <span className="num shrink-0 text-[13px] font-semibold text-ink-600">
                <span style={{ color }}>{category.score}</span>
                <span className="text-ink-300"> / {category.max}</span>
              </span>
            </div>

            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${percentage}%` }}
                viewport={{ once: true }}
                transition={{
                  duration: 1,
                  delay: 0.15 + i * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            </div>

            <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
              {summary}
            </p>
          </motion.div>
        );
      })}

      <p className="pt-4 text-[12px] leading-relaxed text-ink-400">
        {t.report.disclaimer}
      </p>
    </div>
  );
}
