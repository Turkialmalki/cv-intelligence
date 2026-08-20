"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/lib/i18n/context";

import { ScanningDocument } from "./ScanningDocument";

/**
 * The full-screen scan.
 *
 * The real analysis runs in parallel from the moment the user submits — this
 * component only orchestrates how that work is *presented*. Two rules keep it
 * honest and keep it from feeling like a fake progress bar:
 *
 *   1. It never blocks. If the analysis finishes early the remaining stages
 *      are fast-forwarded and the scan completes; it does not sit and wait
 *      out a scripted timeline.
 *   2. It never stalls. If the analysis is slow, the stages ease toward the
 *      last one and hold there with a visible "almost there" state rather
 *      than freezing or claiming completion that has not happened.
 */

interface ScanExperienceProps {
  /** Flips true when the API call resolves. */
  analysisReady: boolean;
  /** Called once both the animation and the analysis are finished. */
  onComplete: () => void;
}

/** Perceived duration targets, in milliseconds. */
const MIN_DURATION = 5_000;
const MAX_DURATION = 12_000;

export function ScanExperience({
  analysisReady,
  onComplete,
}: ScanExperienceProps) {
  const { t } = useLocale();
  const stages = t.scan.stages;

  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const startedAt = useRef<number>(Date.now());
  const completed = useRef(false);

  useEffect(() => {
    const totalStages = stages.length;
    let frame: number;

    const tick = () => {
      const elapsed = Date.now() - startedAt.current;

      // Target progress if the analysis were to take the full window.
      const naturalProgress = Math.min(elapsed / MAX_DURATION, 1);

      // Once the result is in, pull toward completion — but never faster
      // than MIN_DURATION, so the scan does not flash past unreadably.
      const readyProgress = analysisReady
        ? Math.min(elapsed / MIN_DURATION, 1)
        : 0;

      // Without a result yet, hold just short of the end rather than
      // claiming a completion that has not happened.
      const ceiling = analysisReady ? 1 : 0.94;
      const next = Math.min(ceiling, Math.max(naturalProgress, readyProgress));

      setProgress(next);
      setStageIndex(Math.min(totalStages - 1, Math.floor(next * totalStages)));

      if (next >= 1 && analysisReady && !completed.current) {
        completed.current = true;
        setFinishing(true);
        // A short beat on the final state so the completion is legible.
        window.setTimeout(onComplete, 620);
        return;
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [analysisReady, onComplete, stages.length]);

  const isStalling = !analysisReady && progress >= 0.93;
  const currentStage = stages[stageIndex] ?? stages[stages.length - 1] ?? "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-white px-5 py-10"
      role="status"
      aria-live="polite"
      aria-label={t.scan.analyzing}
    >
      <div className="ambient-top pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative flex w-full max-w-md flex-col items-center">
        <ScanningDocument progress={progress} />

        <div className="mt-10 w-full text-center">
          <div className="eyebrow">{t.scan.analyzing}</div>

          {/* Stage label. Swapped with a crossfade so the text never jumps. */}
          <div className="relative mt-3 h-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={isStalling ? "stalling" : currentStage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-x-0 text-[17px] font-semibold text-ink-900"
              >
                {isStalling ? t.scan.almostThere : currentStage}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress rail */}
          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-ink-100">
            <motion.div
              className="h-full rounded-full bg-ink-900"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.4, ease: "linear" }}
            />
          </div>

          <div className="num mt-3 text-[13px] font-medium text-ink-400">
            {Math.round(progress * 100)}%
          </div>
        </div>

        {/* Recently completed stages, so the scan shows what it has done. */}
        <ul className="mt-8 w-full space-y-2">
          {stages.slice(Math.max(0, stageIndex - 2), stageIndex + 1).map((stage) => {
            const isCurrent = stage === currentStage && !finishing;
            return (
              <motion.li
                key={stage}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: isCurrent ? 1 : 0.45, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2.5 text-[13px] text-ink-600"
              >
                {isCurrent && !isStalling ? (
                  <Loader2
                    className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-600"
                    aria-hidden="true"
                  />
                ) : (
                  <Check
                    className="h-3.5 w-3.5 shrink-0 text-signal-positive"
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{stage}</span>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
}
