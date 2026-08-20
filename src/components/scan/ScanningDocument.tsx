"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * A stylised CV with a scanning beam travelling down it.
 *
 * The "document" is abstract shapes, never the user's actual content — the
 * real CV is not rendered here at any point. Regions light up as the beam
 * passes so the animation reads as inspection rather than as a loading bar.
 */

interface ScanningDocumentProps {
  /** 0-1 progress through the scan, used to position the beam. */
  progress: number;
}

interface Block {
  width: string;
  height: number;
  accent?: boolean;
  gapAfter?: number;
}

/** Layout of the fake document: a header, then four blocks of "content". */
const BLOCKS: Block[] = [
  { width: "58%", height: 13, accent: true, gapAfter: 6 },
  { width: "40%", height: 7, gapAfter: 18 },

  { width: "34%", height: 9, accent: true, gapAfter: 8 },
  { width: "100%", height: 6 },
  { width: "92%", height: 6 },
  { width: "78%", height: 6, gapAfter: 18 },

  { width: "30%", height: 9, accent: true, gapAfter: 8 },
  { width: "100%", height: 6 },
  { width: "88%", height: 6 },
  { width: "95%", height: 6 },
  { width: "72%", height: 6, gapAfter: 18 },

  { width: "26%", height: 9, accent: true, gapAfter: 8 },
  { width: "84%", height: 6 },
  { width: "66%", height: 6 },
];

export function ScanningDocument({ progress }: ScanningDocumentProps) {
  const reduceMotion = useReducedMotion();

  // Total height of the stacked blocks, used to decide which are "lit".
  const totalHeight = BLOCKS.reduce(
    (sum, block) => sum + block.height + (block.gapAfter ?? 4),
    0,
  );

  let cursor = 0;
  const positions = BLOCKS.map((block) => {
    const top = cursor;
    cursor += block.height + (block.gapAfter ?? 4);
    return top / totalHeight;
  });

  const beamPosition = Math.min(1, Math.max(0, progress));

  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="relative overflow-hidden rounded-2xl border border-ink-200 bg-white p-6 shadow-lift">
        <div className="space-y-0">
          {BLOCKS.map((block, i) => {
            const blockPosition = positions[i] ?? 0;
            // A block is "read" once the beam has passed it.
            const isRead = beamPosition >= blockPosition;
            // And briefly highlighted as the beam crosses it.
            const isActive =
              Math.abs(beamPosition - blockPosition) < 0.06 && beamPosition < 1;

            return (
              <motion.div
                key={i}
                style={{
                  width: block.width,
                  height: block.height,
                  marginBottom: block.gapAfter ?? 4,
                }}
                className="rounded-[3px]"
                animate={{
                  backgroundColor: isActive
                    ? "#3388fb"
                    : isRead
                      ? block.accent
                        ? "#424a5f"
                        : "#b0b8c9"
                      : "#eceef2",
                  opacity: isActive ? 1 : isRead ? 1 : 0.55,
                }}
                transition={{ duration: 0.28 }}
              />
            );
          })}
        </div>

        {/* The beam itself */}
        {!reduceMotion && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 h-16"
            style={{
              top: 0,
              background:
                "linear-gradient(180deg, transparent, rgba(51,136,251,0.16) 45%, rgba(51,136,251,0.28) 50%, rgba(51,136,251,0.16) 55%, transparent)",
            }}
            animate={{ y: `${beamPosition * 100}%` }}
            transition={{ duration: 0.5, ease: "linear" }}
            aria-hidden="true"
          >
            <div className="absolute inset-x-0 top-1/2 h-px bg-accent-500 shadow-[0_0_12px_2px_rgba(51,136,251,0.5)]" />
          </motion.div>
        )}
      </div>

      {/* Grounding shadow */}
      <div
        className="mx-auto mt-3 h-6 w-3/4 rounded-[50%] bg-ink-900/[0.07] blur-lg"
        aria-hidden="true"
      />
    </div>
  );
}
