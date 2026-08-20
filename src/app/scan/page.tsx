"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CVUploader, type UploadPayload } from "@/components/scan/CVUploader";
import { ScanExperience } from "@/components/scan/ScanExperience";
import { ScoreReveal } from "@/components/scan/ScoreReveal";
import type { AnalysisResult } from "@/lib/analysis/schema";
import { useLocale } from "@/lib/i18n/context";

type Phase = "upload" | "scanning" | "reveal";

interface AnalyzeResponse {
  token: string;
  reportPath: string;
  result: AnalysisResult;
  notice: string | null;
}

export default function ScanPage() {
  const { t, locale } = useLocale();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("upload");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisReady, setAnalysisReady] = useState(false);

  // Held in a ref rather than state: the scan animation must not re-render
  // on arrival of the result, it only needs the `analysisReady` flag.
  const responseRef = useRef<AnalyzeResponse | null>(null);
  const [revealed, setRevealed] = useState<AnalyzeResponse | null>(null);

  const handleSubmit = useCallback(
    async (payload: UploadPayload) => {
      setSubmitting(true);
      setError(null);
      setAnalysisReady(false);
      responseRef.current = null;

      // The scan animation starts immediately, in parallel with the request.
      // It is presentation only — the work below is the real analysis.
      setPhase("scanning");

      try {
        const form = new FormData();
        if (payload.file) form.append("file", payload.file);
        if (payload.pastedText) form.append("pastedText", payload.pastedText);
        form.append("name", payload.name);
        form.append("email", payload.email);
        form.append("targetRole", payload.targetRole);
        form.append("jobDescription", payload.jobDescription);
        form.append("locale", locale);

        const response = await fetch("/api/analyze", {
          method: "POST",
          body: form,
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data?.error?.message ?? t.upload.errors.generic);
          setPhase("upload");
          setSubmitting(false);
          return;
        }

        responseRef.current = data as AnalyzeResponse;
        // Prefetch so the report page is already warm when they tap through.
        router.prefetch(data.reportPath);
        setAnalysisReady(true);
      } catch {
        setError(t.upload.errors.generic);
        setPhase("upload");
        setSubmitting(false);
      }
    },
    [locale, router, t],
  );

  const handleScanComplete = useCallback(() => {
    const response = responseRef.current;
    if (!response) return;

    // sessionStorage is a pure optimisation so the report renders instantly
    // on the hand-off. The report page always works without it — it fetches
    // from the server by token — so a cleared cache costs nothing.
    try {
      window.sessionStorage.setItem(
        `cv-report:${response.token}`,
        JSON.stringify(response.result),
      );
    } catch {
      // Storage may be unavailable; the report still loads from the server.
    }

    setRevealed(response);
    setPhase("reveal");
    setSubmitting(false);
  }, []);

  const handleContinue = useCallback(() => {
    if (revealed) router.push(revealed.reportPath);
  }, [revealed, router]);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader showCta={false} />

      <main className="flex-1">
        <section className="ambient-top relative">
          <div className="container-page relative py-10 sm:py-16">
            <div className="mx-auto max-w-xl">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">
                  {t.upload.title}
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
                  {t.upload.subtitle}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="card mt-8 p-5 sm:p-7"
              >
                <CVUploader
                  onSubmit={handleSubmit}
                  submitting={submitting}
                  serverError={error}
                />
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      <AnimatePresence>
        {phase === "scanning" && (
          <ScanExperience
            key="scanning"
            analysisReady={analysisReady}
            onComplete={handleScanComplete}
          />
        )}
        {phase === "reveal" && revealed && (
          <ScoreReveal
            key="reveal"
            result={revealed.result}
            onContinue={handleContinue}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
