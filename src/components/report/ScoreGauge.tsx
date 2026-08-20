"use client";

import { motion, useReducedMotion } from "framer-motion";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

interface ScoreGaugeProps {
  score: number;
  potential?: number | null;
  size?: number;
  label?: string;
  classification?: string;
  /** Milliseconds before the arc starts filling. */
  delay?: number;
}

/** Maps a score to its band colour. Kept in one place so nothing drifts. */
export function scoreColor(score: number): string {
  if (score >= 80) return "#12a672";
  if (score >= 70) return "#3388fb";
  if (score >= 60) return "#e2a600";
  if (score >= 40) return "#f76b15";
  return "#e5484d";
}

/**
 * The headline score dial.
 *
 * Drawn as a 270-degree arc rather than a full circle: the gap reads as a
 * measurement scale instead of a loading spinner, and it leaves room for the
 * potential-score track to sit behind the actual score without the two
 * being confused.
 */
export function ScoreGauge({
  score,
  potential = null,
  size = 220,
  label,
  classification,
  delay = 0,
}: ScoreGaugeProps) {
  const reduceMotion = useReducedMotion();

  const strokeWidth = size * 0.075;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  /** Fraction of the circle the arc spans (270deg of 360deg). */
  const sweep = 0.75;
  const arcLength = circumference * sweep;

  const clamped = Math.max(0, Math.min(100, score));
  const color = scoreColor(clamped);

  const scoreOffset = arcLength * (1 - clamped / 100);
  const potentialValue =
    potential !== null ? Math.max(0, Math.min(100, potential)) : null;
  const potentialOffset =
    potentialValue !== null ? arcLength * (1 - potentialValue / 100) : null;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        // The arc starts at the lower-left, sweeping clockwise.
        style={{ transform: "rotate(135deg)" }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#eceef2"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />

        {/* Potential — a faint ghost showing the reachable ceiling. */}
        {potentialOffset !== null && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeOpacity={0.2}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            initial={{ strokeDashoffset: reduceMotion ? potentialOffset : arcLength }}
            animate={{ strokeDashoffset: potentialOffset }}
            transition={{
              duration: reduceMotion ? 0 : 1.6,
              delay: reduceMotion ? 0 : delay / 1000 + 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        )}

        {/* Actual score */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          initial={{ strokeDashoffset: reduceMotion ? scoreOffset : arcLength }}
          animate={{ strokeDashoffset: scoreOffset }}
          transition={{
            duration: reduceMotion ? 0 : 1.5,
            delay: reduceMotion ? 0 : delay / 1000,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="num font-bold leading-none tracking-tight text-ink-900"
          style={{ fontSize: size * 0.3 }}
        >
          <AnimatedNumber value={clamped} duration={1500} delay={delay} />
        </div>
        {label && (
          <div
            className="mt-1 font-medium text-ink-400"
            style={{ fontSize: size * 0.062 }}
          >
            {label}
          </div>
        )}
        {classification && (
          <div
            className="mt-2 font-semibold"
            style={{ color, fontSize: size * 0.072 }}
          >
            {classification}
          </div>
        )}
      </div>
    </div>
  );
}
