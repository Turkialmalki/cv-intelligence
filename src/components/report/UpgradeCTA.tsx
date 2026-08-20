"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Lock } from "lucide-react";

import { useLocale } from "@/lib/i18n/context";

/**
 * The locked premium section and the conversion CTA.
 *
 * Deliberately restrained. The free report is genuinely complete — every
 * finding, its evidence and its fix are all visible — so this section sells
 * the work of applying them rather than withholding the diagnosis. Blurring
 * real findings the user has already been shown would be manipulative and
 * would undermine the credibility the report just earned.
 */

export function LockedInsight() {
  const { t } = useLocale();

  return (
    <div className="card-quiet overflow-hidden p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-200/60 text-ink-600">
          <Lock className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-[15px] font-semibold text-ink-900">
            {t.report.lockedTitle}
          </h3>
          <p className="text-[13px] text-ink-500">{t.report.lockedSubtitle}</p>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {t.report.lockedItems.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400"
              aria-hidden="true"
            />
            <span className="text-[13px] leading-relaxed text-ink-600">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface UpgradeCTAProps {
  currentScore: number;
  potentialScore: number;
  checkoutUrl: string | null;
}

export function UpgradeCTA({
  currentScore,
  potentialScore,
  checkoutUrl,
}: UpgradeCTAProps) {
  const { t } = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55 }}
      className="relative overflow-hidden rounded-3xl bg-ink-900 p-6 sm:p-10"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(36rem 18rem at 50% 0%, rgba(51,136,251,.26), transparent 66%)",
        }}
        aria-hidden="true"
      />

      <div className="relative flex flex-col items-center gap-7 text-center lg:flex-row lg:justify-between lg:text-start">
        <div className="max-w-lg">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {t.report.upgradeTitle}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-300">
            {t.report.upgradeBody}
          </p>
        </div>

        <div className="w-full max-w-xs shrink-0">
          {/* The before/after score framing is the entire pitch, so it is
              stated numerically rather than in adjectives. */}
          <div className="flex items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4">
            <div className="text-center">
              <div className="text-[11px] font-medium text-ink-400">
                {t.report.upgradeFrom}
              </div>
              <div className="num mt-0.5 text-2xl font-bold text-white">
                {currentScore}
              </div>
            </div>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-ink-500 rtl:rotate-180"
              aria-hidden="true"
            />
            <div className="text-center">
              <div className="text-[11px] font-medium text-ink-400">
                {t.report.upgradeTo}
              </div>
              <div className="num mt-0.5 text-2xl font-bold text-signal-positive">
                {potentialScore}
              </div>
            </div>
          </div>

          {checkoutUrl ? (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn group mt-3 w-full !bg-white !text-ink-900 hover:!bg-ink-50"
            >
              {t.report.upgradeCta}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                aria-hidden="true"
              />
            </a>
          ) : (
            // With no checkout configured the button would go nowhere, so it
            // is not rendered as a button at all.
            <p className="mt-3 rounded-xl border border-white/10 px-4 py-3 text-[13px] text-ink-400">
              {t.report.upgradeCta}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
