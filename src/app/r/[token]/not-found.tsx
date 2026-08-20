"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useLocale } from "@/lib/i18n/context";

export default function ReportNotFound() {
  const { t } = useLocale();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-20">
        <div className="max-w-md text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink-50 text-ink-500">
            <FileQuestion className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-ink-900">
            {t.report.notFoundTitle}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
            {t.report.notFoundBody}
          </p>
          <Link href="/scan" className="btn-primary mt-7">
            {t.report.notFoundCta}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
