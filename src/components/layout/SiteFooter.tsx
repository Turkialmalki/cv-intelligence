"use client";

import { ShieldCheck } from "lucide-react";

import { useLocale } from "@/lib/i18n/context";

export function SiteFooter() {
  const { t } = useLocale();

  return (
    <footer className="border-t border-ink-200/60 bg-ink-50/40">
      <div className="container-page py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <div className="text-[15px] font-bold tracking-tight text-ink-900">
              CV Intelligence
            </div>
            {/* The scope disclaimer is deliberately in the footer of every
                page, not just the report — the claim being made must be
                visible wherever the score is discussed. */}
            <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
              {t.landing.disclaimer}
            </p>
          </div>

          <div className="flex items-start gap-2 text-[13px] text-ink-500 sm:max-w-xs">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-signal-positive"
              aria-hidden="true"
            />
            <span>{t.upload.privacyNotice}</span>
          </div>
        </div>

        <div className="mt-8 border-t border-ink-200/70 pt-6 text-[12px] text-ink-400">
          © {new Date().getFullYear()} CV Intelligence
        </div>
      </div>
    </footer>
  );
}
