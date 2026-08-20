"use client";

import { Languages } from "lucide-react";

import { useLocale } from "@/lib/i18n/context";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, toggleLocale, t } = useLocale();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      // The label is the language being switched *to*, which is the
      // convention users expect from a single-button switcher.
      aria-label={locale === "en" ? "التبديل إلى العربية" : "Switch to English"}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className={className}>{t.common.language}</span>
    </button>
  );
}
