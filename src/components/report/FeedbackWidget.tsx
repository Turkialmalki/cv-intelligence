"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useState } from "react";

import { useLocale } from "@/lib/i18n/context";

export function FeedbackWidget({ token }: { token: string }) {
  const { t } = useLocale();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  const submit = async (value: number, text: string) => {
    setState("sending");
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating: value, comment: text || null }),
      });
    } catch {
      // Feedback is non-critical; a failure is not worth interrupting the
      // user over, and retrying would be more annoying than losing it.
    }
    setState("done");
  };

  if (state === "done") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card-quiet p-5 text-center text-[14px] font-medium text-ink-600"
      >
        {t.report.feedbackThanks}
      </motion.div>
    );
  }

  return (
    <div className="card-quiet p-5">
      <h3 className="text-[14px] font-semibold text-ink-900">
        {t.report.feedbackTitle}
      </h3>

      <div
        className="mt-3 flex gap-1"
        role="radiogroup"
        aria-label={t.report.feedbackTitle}
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={String(value)}
            onClick={() => setRating(value)}
            onMouseEnter={() => setHovered(value)}
            onMouseLeave={() => setHovered(0)}
            className="grid h-11 w-11 place-items-center rounded-lg transition-colors hover:bg-ink-100"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                value <= (hovered || rating)
                  ? "fill-signal-medium text-signal-medium"
                  : "text-ink-300"
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      {rating > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3"
        >
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.report.feedbackPlaceholder}
            rows={2}
            maxLength={2000}
            className="field text-[14px]"
          />
          <button
            type="button"
            onClick={() => submit(rating, comment.trim())}
            disabled={state === "sending"}
            className="btn-secondary mt-2.5 w-full sm:w-auto"
          >
            {t.report.feedbackSubmit}
          </button>
        </motion.div>
      )}
    </div>
  );
}
