"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Clock,
  FileSearch,
  Globe,
  Languages,
  Lock,
  ListChecks,
  ScanLine,
  Sparkles,
  Target,
} from "lucide-react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ScoreGauge } from "@/components/report/ScoreGauge";
import { useLocale } from "@/lib/i18n/context";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const transition = { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const };

export default function LandingPage() {
  const { t, dir } = useLocale();

  const features = [
    { key: "ats", icon: ScanLine, data: t.features.ats },
    { key: "quality", icon: BarChart3, data: t.features.quality },
    { key: "matching", icon: Target, data: t.features.matching },
    { key: "bilingual", icon: Languages, data: t.features.bilingual },
    { key: "privacy", icon: Lock, data: t.features.privacy },
    { key: "actionable", icon: ListChecks, data: t.features.actionable },
  ];

  const stepIcons = [FileSearch, ScanLine, Sparkles];

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                             */}
        {/* ---------------------------------------------------------------- */}
        <section className="ambient-top relative overflow-hidden">
          <div className="grid-faint pointer-events-none absolute inset-0" aria-hidden="true" />

          <div className="container-page relative py-16 sm:py-24 lg:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
              <div>
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  transition={transition}
                  className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 shadow-card"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-signal-positive" />
                  <span className="eyebrow !tracking-[0.1em]">
                    {t.landing.eyebrow}
                  </span>
                </motion.div>

                <motion.h1
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  transition={{ ...transition, delay: 0.06 }}
                  className="mt-6 text-[2.15rem] font-extrabold leading-[1.08] text-ink-900 sm:text-5xl lg:text-[3.4rem]"
                >
                  {t.landing.headline}
                </motion.h1>

                <motion.p
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  transition={{ ...transition, delay: 0.12 }}
                  className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-500"
                >
                  {t.landing.subhead}
                </motion.p>

                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  transition={{ ...transition, delay: 0.18 }}
                  className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                  <Link href="/scan" className="btn-primary group">
                    {t.landing.primaryCta}
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                  <a href="#what-we-check" className="btn-secondary">
                    {t.landing.secondaryCta}
                  </a>
                </motion.div>

                <motion.ul
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  transition={{ ...transition, delay: 0.24 }}
                  className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-medium text-ink-500"
                >
                  <li className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent-600" aria-hidden="true" />
                    {t.landing.trustFree}
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-accent-600" aria-hidden="true" />
                    {t.landing.trustTime}
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-accent-600" aria-hidden="true" />
                    {t.landing.trustPrivate}
                  </li>
                </motion.ul>
              </div>

              {/* Illustrative preview. Uses a neutral placeholder score — it
                  is a UI sample, never presented as a real analysis. */}
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...transition, delay: 0.2 }}
                className="relative mx-auto w-full max-w-md"
                aria-hidden="true"
              >
                <div className="card overflow-hidden p-6 shadow-lift sm:p-7">
                  <div className="flex items-center justify-between">
                    <div className="eyebrow">{t.report.scoreLabel}</div>
                    <div className="h-2 w-2 rounded-full bg-signal-positive" />
                  </div>

                  <div className="mt-4 flex justify-center">
                    <ScoreGauge
                      score={73}
                      potential={91}
                      size={188}
                      delay={600}
                    />
                  </div>

                  <div className="mt-5 space-y-2.5">
                    {[
                      { label: t.features.ats.title, value: 87 },
                      { label: t.report.jobMatchSkills, value: 64 },
                      { label: t.features.quality.title, value: 78 },
                    ].map((row, i) => (
                      <div key={row.label} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 truncate text-[12px] font-medium text-ink-500">
                          {row.label}
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                          <motion.span
                            className="block h-full rounded-full bg-ink-900"
                            initial={{ width: 0 }}
                            animate={{ width: `${row.value}%` }}
                            transition={{
                              duration: 1.1,
                              delay: 1 + i * 0.12,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                          />
                        </span>
                        <span className="num w-8 shrink-0 text-end text-[12px] font-semibold text-ink-700">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* What we check                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section id="what-we-check" className="border-t border-ink-200/60 py-16 sm:py-24">
          <div className="container-page">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold text-ink-900 sm:text-[2.4rem]">
                {t.landing.featuresTitle}
              </h2>
              <p className="mt-3 text-[16px] leading-relaxed text-ink-500">
                {t.landing.featuresSubtitle}
              </p>
            </div>

            <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.key}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-60px" }}
                  variants={fadeUp}
                  transition={{ ...transition, delay: i * 0.05 }}
                  className="card group p-6 transition-shadow duration-300 hover:shadow-lift"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-50 text-ink-700 transition-colors group-hover:bg-accent-50 group-hover:text-accent-700">
                    <feature.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-[16px] font-semibold text-ink-900">
                    {feature.data.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
                    {feature.data.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* How it works                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-t border-ink-200/60 bg-ink-50/40 py-16 sm:py-24">
          <div className="container-page">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold text-ink-900 sm:text-[2.4rem]">
                {t.landing.howTitle}
              </h2>
              <p className="mt-3 text-[16px] text-ink-500">
                {t.landing.howSubtitle}
              </p>
            </div>

            <ol className="mt-11 grid gap-4 md:grid-cols-3">
              {t.landing.steps.map((step, i) => {
                const Icon = stepIcons[i] ?? FileSearch;
                return (
                  <motion.li
                    key={step.title}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-60px" }}
                    variants={fadeUp}
                    transition={{ ...transition, delay: i * 0.08 }}
                    className="card relative p-6"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-900 text-white">
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <span className="num text-[2.6rem] font-extrabold leading-none text-ink-100">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[16px] font-semibold text-ink-900">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
                      {step.body}
                    </p>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Final CTA                                                        */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-16 sm:py-24">
          <div className="container-page">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeUp}
              transition={transition}
              className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-14 text-center sm:px-12 sm:py-20"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                  backgroundImage:
                    "radial-gradient(40rem 20rem at 50% 0%, rgba(51,136,251,.28), transparent 65%)",
                }}
                aria-hidden="true"
              />
              <div className="relative">
                <h2 className="mx-auto max-w-2xl text-3xl font-bold text-white sm:text-[2.6rem] sm:leading-tight">
                  {t.landing.finalCtaTitle}
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-[16px] text-ink-300">
                  {t.landing.finalCtaBody}
                </p>
                <div className="mt-8 flex justify-center">
                  <Link
                    href="/scan"
                    className="btn group !bg-white !text-ink-900 hover:!bg-ink-50"
                  >
                    {t.landing.primaryCta}
                    <ArrowRight
                      className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${
                        dir === "rtl" ? "rotate-180 group-hover:-translate-x-0.5" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </Link>
                </div>
                <p className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-ink-400">
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.landing.trustPrivate}
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
