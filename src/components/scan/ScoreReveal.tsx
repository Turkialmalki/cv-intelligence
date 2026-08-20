"use client";

import { motion } from "framer-motion";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { ScoreGauge, scoreColor } from "@/components/report/ScoreGauge";
import type { AnalysisResult } from "@/lib/analysis/schema";
import { useLocale } from "@/lib/i18n/context";

interface ScoreRevealProps {
  result: AnalysisResult;
  onContinue: () => void;
}

/**
 * The moment the score lands.
 *
 * The gauge counts up from zero rather than appearing at its final value —
 * the count is what makes the number feel measured rather than asserted. The
 * potential score and CTA are held back until the count settles so the eye
 * has one thing to follow at a time.
 */
export function ScoreReveal({ result, onContinue }: ScoreRevealProps) {
  const { t } = useLocale();
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), 1650);
    return () => window.clearTimeout(timer);
  }, []);

  const classification = t.classifications[result.classification];
  const color = scoreColor(result.overallScore);
  const gain = result.potentialScore - result.overallScore;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-white px-5 py-10"
    >
      <div className="ambient-top pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="eyebrow"
        >
          {t.reveal.eyebrow}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6"
        >
          <ScoreGauge
            score={result.overallScore}
            size={248}
            label={t.reveal.outOf}
            classification={classification}
            delay={150}
          />
        </motion.div>

        {/* Potential — revealed only once the main number has settled. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={settled ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mt-8 w-full"
        >
          {gain > 0 && (
            <div className="card flex items-center justify-center gap-3 px-5 py-4">
              <TrendingUp
                className="h-4 w-4 shrink-0 text-signal-positive"
                aria-hidden="true"
              />
              <span className="text-[14px] text-ink-600">
                {t.reveal.potential}
              </span>
              <span className="num inline-flex items-center gap-1.5 text-[15px] font-bold">
                <span style={{ color }}>{result.overallScore}</span>
                <ArrowRight
                  className="h-3.5 w-3.5 text-ink-300 rtl:rotate-180"
                  aria-hidden="true"
                />
                <span className="text-signal-positive">
                  {result.potentialScore}
                </span>
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onContinue}
            className="btn-primary group mt-4 w-full"
          >
            {t.reveal.viewReport}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
