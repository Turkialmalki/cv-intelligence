"use client";

import { motion } from "framer-motion";
import { ArrowRight, Calendar, Mail, TrendingUp } from "lucide-react";
import { useState } from "react";

import type { AnalysisResult } from "@/lib/analysis/schema";
import { useLocale } from "@/lib/i18n/context";

import { ScoreGauge, scoreColor } from "./ScoreGauge";

interface ReportHeaderProps {
  result: AnalysisResult;
  candidateName: string | null;
  createdAt: string;
  token: string;
}

export function ReportHeader({
  result,
  candidateName,
  createdAt,
  token,
}: ReportHeaderProps) {
  const { t, locale } = useLocale();
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );

  const classification = t.classifications[result.classification];
  const gain = result.potentialScore - result.overallScore;
  const interpretation =
    locale === "ar" ? result.summary.interpretationAr : result.summary.interpretation;

  // Only shown when extraction was unambiguous — a misidentified name at the
  // top of someone's report destroys trust in everything below it.
  const showName = Boolean(candidateName) && result.candidate.nameConfident;

  const handleResend = async () => {
    if (emailState !== "idle") return;
    setEmailState("sending");
    try {
      const response = await fetch(`/api/report/${token}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      setEmailState(response.ok ? "sent" : "idle");
    } catch {
      setEmailState("idle");
    }
  };

  const formattedDate = new Date(createdAt).toLocaleDateString(
    locale === "ar" ? "ar-SA" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <div className="ambient-top relative overflow-hidden border-b border-ink-200/60">
      <div className="grid-faint pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="container-page relative py-10 sm:py-14">
        <div className="grid items-center gap-9 lg:grid-cols-[1fr_auto] lg:gap-14">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="eyebrow">{t.report.eyebrow}</div>

              {showName && (
                <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
                  {candidateName}
                </h1>
              )}

              <p
                className={`${showName ? "mt-3" : "mt-3 text-2xl font-bold text-ink-900 sm:text-3xl"} max-w-2xl text-[15px] leading-relaxed text-ink-600`}
              >
                {interpretation}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-500"
            >
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {t.report.scannedOn} {formattedDate}
              </span>

              <button
                type="button"
                onClick={handleResend}
                disabled={emailState !== "idle"}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 font-semibold text-accent-700 transition-colors hover:bg-accent-50 disabled:text-ink-400 disabled:hover:bg-transparent"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {emailState === "sent"
                  ? t.report.emailSent
                  : emailState === "sending"
                    ? t.report.emailSending
                    : t.report.emailResend}
              </button>
            </motion.div>

            {gain > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.18 }}
                className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-3 shadow-card"
              >
                <TrendingUp
                  className="h-4 w-4 shrink-0 text-signal-positive"
                  aria-hidden="true"
                />
                <span className="text-[13px] text-ink-600">
                  {t.report.couldReach}
                </span>
                <span className="num inline-flex items-center gap-1.5 text-[15px] font-bold">
                  <span style={{ color: scoreColor(result.overallScore) }}>
                    {result.overallScore}
                  </span>
                  <ArrowRight
                    className="h-3.5 w-3.5 text-ink-300 rtl:rotate-180"
                    aria-hidden="true"
                  />
                  <span className="text-signal-positive">
                    {result.potentialScore}
                  </span>
                </span>
              </motion.div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto lg:mx-0"
          >
            <ScoreGauge
              score={result.overallScore}
              potential={result.potentialScore}
              size={230}
              label={t.reveal.outOf}
              classification={classification}
              delay={200}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
