"use client";

import { useEffect, useState } from "react";

import { useLocale } from "@/lib/i18n/context";

interface NavItem {
  id: string;
  label: string;
}

/**
 * Sticky section rail for the report.
 *
 * The report is long by design, so it needs a way back to the top-level
 * structure. Sits directly beneath the site header and scrolls horizontally
 * on narrow screens rather than wrapping — a wrapping nav on a phone would
 * eat most of the first screen.
 */
export function ReportNavigation({ items }: { items: NavItem[] }) {
  const { t } = useLocale();
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // The topmost intersecting section wins, so the rail reflects what
        // the reader is actually looking at rather than the last one seen.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Bias the band toward the upper third of the viewport.
      { rootMargin: "-88px 0px -55% 0px", threshold: 0 },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label={t.report.eyebrow}
      className="sticky top-16 z-30 border-b border-ink-200/60 bg-white/85 backdrop-blur-md"
    >
      <div className="container-page">
        <ul className="-mx-5 flex gap-1 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active === item.id ? "true" : undefined}
                className={`inline-flex min-h-[44px] shrink-0 items-center border-b-2 px-3 text-[13px] font-semibold transition-colors ${
                  active === item.id
                    ? "border-ink-900 text-ink-900"
                    : "border-transparent text-ink-500 hover:text-ink-800"
                }`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
