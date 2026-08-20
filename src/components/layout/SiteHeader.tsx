"use client";

import Link from "next/link";
import { ScanLine } from "lucide-react";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLocale } from "@/lib/i18n/context";

export function SiteHeader({ showCta = true }: { showCta?: boolean }) {
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/60 bg-white/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-ink-900"
          aria-label="CV Intelligence"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 text-white">
            <ScanLine className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-[15px] font-bold tracking-tight">
            CV Intelligence
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <LanguageSwitcher className="hidden sm:inline" />
          {showCta && (
            <Link
              href="/scan"
              className="btn-primary !min-h-[42px] !px-4 !py-2 !text-sm"
            >
              {t.nav.scanCta}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
