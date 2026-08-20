"use client";

import { motion } from "framer-motion";
import { Check, Target, X } from "lucide-react";

import type { JobMatch } from "@/lib/analysis/schema";
import { useLocale } from "@/lib/i18n/context";

import { scoreColor } from "./ScoreGauge";

function MetricBar({ label, value }: { label: string; value: number }) {
  const color = scoreColor(value);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-600">{label}</span>
        <span className="num text-[13px] font-semibold" style={{ color }}>
          {value}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

/**
 * Match against the supplied job description.
 *
 * Renders nothing but an explanatory note when no job description was given —
 * the product never guesses at a target role, so there is nothing to report.
 */
export function JobMatchPanel({ jobMatch }: { jobMatch: JobMatch | null }) {
  const { t } = useLocale();

  if (!jobMatch) {
    return (
      <div className="card-quiet p-5">
        <p className="text-[14px] leading-relaxed text-ink-600">
          {t.report.jobMatchNone}
        </p>
      </div>
    );
  }

  const color = scoreColor(jobMatch.score);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-8 sm:p-6">
        <div className="flex items-center gap-4 sm:flex-col sm:items-start">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-50 text-ink-700">
            <Target className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="eyebrow">{t.report.jobMatchOverall}</div>
            <div className="num text-4xl font-extrabold" style={{ color }}>
              {jobMatch.score}
              <span className="text-lg text-ink-300">%</span>
            </div>
          </div>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <MetricBar label={t.report.jobMatchSkills} value={jobMatch.breakdown.skills} />
          <MetricBar
            label={t.report.jobMatchExperience}
            value={jobMatch.breakdown.experience}
          />
          <MetricBar
            label={t.report.jobMatchKeywords}
            value={jobMatch.breakdown.keywordCoverage}
          />
          <MetricBar
            label={t.report.jobMatchSeniority}
            value={jobMatch.breakdown.seniority}
          />
        </div>
      </div>

      {(jobMatch.matchedSkills.length > 0 ||
        jobMatch.missingSkills.length > 0) && (
        <div className="grid gap-5 border-t border-ink-100 p-5 sm:grid-cols-2 sm:p-6">
          {jobMatch.matchedSkills.length > 0 && (
            <div>
              <div className="eyebrow mb-2.5" style={{ color: "#12a672" }}>
                {t.report.jobMatchMatched}
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {jobMatch.matchedSkills.map((skill) => (
                  <li
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-lg bg-signal-positive/10 px-2 py-1 text-[12px] font-medium text-signal-positive"
                  >
                    <Check className="h-3 w-3" aria-hidden="true" />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {jobMatch.missingSkills.length > 0 && (
            <div>
              <div className="eyebrow mb-2.5" style={{ color: "#e5484d" }}>
                {t.report.jobMatchMissing}
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {jobMatch.missingSkills.map((skill) => (
                  <li
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-lg bg-signal-critical/[0.08] px-2 py-1 text-[12px] font-medium text-signal-critical"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
