"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  /** Milliseconds. */
  duration?: number;
  delay?: number;
  decimals?: number;
  className?: string;
  /** Start counting only once the element scrolls into view. */
  onView?: boolean;
}

/**
 * Counts up to a value.
 *
 * Honours prefers-reduced-motion by snapping straight to the final number:
 * an animated counter is decoration, and the information is the number itself.
 */
export function AnimatedNumber({
  value,
  duration = 1400,
  delay = 0,
  decimals = 0,
  className,
  onView = false,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(onView ? 0 : value);

  useEffect(() => {
    if (onView && !inView) return;

    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    const controls = animate(0, value, {
      duration: duration / 1000,
      delay: delay / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    });

    return () => controls.stop();
  }, [value, duration, delay, inView, onView, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {display.toFixed(decimals)}
    </span>
  );
}
