#!/usr/bin/env npx tsx
/**
 * Fixture inspector.
 *
 * Runs any real CV through the full parse + score pipeline and prints what
 * the engine actually saw — extracted structure, category scores, findings
 * and the before/after rewrites.
 *
 * This exists because the failure modes that matter most are invisible to
 * unit tests: a PDF that extracts as one long line, an Arabic file encoded
 * as presentation forms, a name that fails to parse. Those look fine in the
 * aggregate score and obvious the moment you read the extracted text.
 *
 * Usage:
 *   npm run inspect                          # every file in the fixture dir
 *   npm run inspect -- path/to/cv.pdf        # one specific file
 *   npm run inspect -- --text                # also dump extracted text
 *   npm run inspect -- --jd path/to/jd.txt   # score against a job description
 *
 * Real CVs in tests/fixtures/real-cvs/ are personal data and are git-ignored.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";

import { analyzeCV } from "../src/lib/analysis/engine";
import type { AnalysisResult } from "../src/lib/analysis/schema";
import { normalizeCV } from "../src/lib/analysis/normalize";
import { parseDocument } from "../src/lib/parsing/index";

const FIXTURE_DIR = resolve(__dirname, "../tests/fixtures/real-cvs");
const SUPPORTED = new Set([".pdf", ".docx", ".txt"]);

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: c.red,
  high: c.red,
  medium: c.yellow,
  low: c.dim,
  positive: c.green,
};

function bar(value: number, max: number, width = 22): string {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const filled = Math.round(ratio * width);
  const color = ratio >= 0.8 ? c.green : ratio >= 0.5 ? c.yellow : c.red;
  return `${color}${"█".repeat(filled)}${c.dim}${"░".repeat(width - filled)}${c.reset}`;
}

function heading(text: string): void {
  console.log(`\n${c.bold}${c.cyan}${text}${c.reset}`);
  console.log(c.dim + "─".repeat(72) + c.reset);
}

function printResult(
  label: string,
  result: AnalysisResult,
  extractedText: string,
  meta: { format: string; pages: number | null; chars: number },
  options: { showText: boolean },
): void {
  console.log(`\n${c.bold}${"═".repeat(72)}${c.reset}`);
  console.log(`${c.bold}${label}${c.reset}`);
  console.log(
    `${c.dim}${meta.format.toUpperCase()} · ${meta.pages ?? "?"} page(s) · ${meta.chars} chars · language: ${result.language} · condition: ${result.condition}${c.reset}`,
  );

  const scoreColor =
    result.overallScore >= 80
      ? c.green
      : result.overallScore >= 60
        ? c.yellow
        : c.red;
  console.log(
    `\n  ${scoreColor}${c.bold}${result.overallScore}/100${c.reset} ` +
      `${c.dim}(${result.classification})${c.reset}  →  potential ${c.bold}${result.potentialScore}${c.reset}`,
  );

  heading("Category breakdown");
  for (const category of result.categories) {
    const score = String(category.score).padStart(5);
    console.log(
      `  ${category.label.padEnd(24)} ${bar(category.score, category.max)} ${score}/${category.max}`,
    );
  }

  heading("What the parser extracted");
  const doc = normalizeCV(extractedText);
  const candidate = result.candidate;
  console.log(`  name       ${candidate.name ?? c.red + "(not found)" + c.reset}` +
    (candidate.name ? c.dim + (candidate.nameConfident ? "  [confident]" : "  [low confidence]") + c.reset : ""));
  console.log(`  email      ${candidate.email ?? c.red + "(not found)" + c.reset}`);
  console.log(`  phone      ${candidate.phone ?? c.red + "(not found)" + c.reset}`);
  console.log(`  location   ${candidate.location ?? c.red + "(not found)" + c.reset}`);
  console.log(`  linkedin   ${candidate.linkedin ?? c.dim + "(not found)" + c.reset}`);
  console.log(`  portfolio  ${candidate.portfolio ?? c.dim + "(not found)" + c.reset}`);
  console.log(
    `  sections   ${result.sections.length > 0 ? result.sections.map((s) => s.type).join(", ") : c.red + "(none detected)" + c.reset}`,
  );
  console.log(`  roles      ${doc.experience.length} experience entr(ies)`);
  for (const entry of doc.experience.slice(0, 8)) {
    const dates = entry.dateRange
      ? `${c.green}${entry.dateRange.raw}${c.reset}`
      : `${c.red}no dates${c.reset}`;
    console.log(
      `             ${c.dim}·${c.reset} ${entry.headerLine.slice(0, 46).padEnd(46)} ${dates} ${c.dim}(${entry.bullets.length} bullets)${c.reset}`,
    );
  }
  console.log(
    `  skills     ${doc.skills.length > 0 ? doc.skills.slice(0, 14).join(", ") : c.red + "(none extracted)" + c.reset}`,
  );
  console.log(
    `  volume     ${doc.totalWords} words · ${doc.bullets.length} bullets · ~${doc.estimatedPages} page(s)`,
  );

  if (result.jobMatch) {
    heading("Job match");
    console.log(`  overall            ${result.jobMatch.score}%`);
    console.log(`  skills             ${result.jobMatch.breakdown.skills}%`);
    console.log(`  experience         ${result.jobMatch.breakdown.experience}%`);
    console.log(`  keyword coverage   ${result.jobMatch.breakdown.keywordCoverage}%`);
    console.log(`  seniority          ${result.jobMatch.breakdown.seniority}%`);
    console.log(`  ${c.green}matched${c.reset}  ${result.jobMatch.matchedSkills.join(", ") || "-"}`);
    console.log(`  ${c.red}missing${c.reset}  ${result.jobMatch.missingSkills.join(", ") || "-"}`);
  }

  heading(`Findings (${result.findings.length})`);
  for (const finding of result.findings) {
    const color = SEVERITY_COLOR[finding.severity] ?? "";
    const deduction =
      finding.deduction > 0 ? `${c.red}-${finding.deduction}${c.reset}` : `${c.dim}   ·${c.reset}`;
    console.log(
      `  ${deduction}  ${color}${finding.severity.padEnd(8)}${c.reset} ${finding.title}`,
    );
    if (finding.evidence) {
      console.log(`          ${c.dim}evidence: ${finding.evidence.slice(0, 110)}${c.reset}`);
    }
  }

  heading("Fastest improvements");
  for (const priority of result.priorities) {
    console.log(
      `  ${priority.rank}. ${priority.title} ${c.green}(+${priority.estimatedGain})${c.reset}`,
    );
  }

  heading(`Before / after (${result.comparison.length} examples)`);
  for (const line of result.comparison.slice(0, 5)) {
    console.log(`  ${c.red}−${c.reset} ${line.original.slice(0, 150)}`);
    console.log(`  ${c.green}+${c.reset} ${line.optimized.slice(0, 200)}`);
    if (line.note) console.log(`    ${c.dim}${line.note}${c.reset}`);
    console.log();
  }

  if (options.showText) {
    heading("Extracted text");
    console.log(
      extractedText
        .split("\n")
        .map((l, i) => `${c.dim}${String(i + 1).padStart(3)}│${c.reset} ${l}`)
        .join("\n"),
    );
  }
}

async function inspectFile(
  path: string,
  jobDescription: string | null,
  options: { showText: boolean; summaryOnly: boolean },
): Promise<{ label: string; result: AnalysisResult }> {
  const buffer = readFileSync(path);
  const parsed = await parseDocument(buffer, basename(path), "");
  const result = analyzeCV({
    text: parsed.text,
    parserPageCount: parsed.pageCount,
    condition: parsed.condition,
    jobDescription,
  });
  if (!options.summaryOnly) {
    printResult(
      basename(path),
      result,
      parsed.text,
      { format: parsed.format, pages: parsed.pageCount, chars: parsed.characters },
      options,
    );
  }
  return { label: basename(path), result };
}

/**
 * Side-by-side table across every fixture.
 *
 * The point of the real-CV set is relative behaviour: drafts of the same
 * career should rank in the order a human would rank them. That is far easier
 * to check in one table than by reading six separate reports.
 */
function printComparison(
  results: Array<{ label: string; result: AnalysisResult }>,
): void {
  if (results.length < 2) return;

  const columns: Array<{ key: string; label: string }> = [
    { key: "ats_parseability", label: "ATS" },
    { key: "structure", label: "Struct" },
    { key: "experience_quality", label: "Exp" },
    { key: "achievement_strength", label: "Achv" },
    { key: "skills_quality", label: "Skills" },
    { key: "recruiter_readability", label: "Read" },
    { key: "professional_impact", label: "Impact" },
  ];

  console.log(`\n${c.bold}${"═".repeat(96)}${c.reset}`);
  console.log(`${c.bold}Comparison across ${results.length} fixtures${c.reset}`);
  console.log(c.dim + "─".repeat(96) + c.reset);

  const header =
    "  " +
    "fixture".padEnd(44) +
    "score".padStart(6) +
    "pot".padStart(5) +
    columns.map((col) => col.label.padStart(7)).join("");
  console.log(c.dim + header + c.reset);

  const sorted = [...results].sort(
    (a, b) => b.result.overallScore - a.result.overallScore,
  );

  for (const { label, result } of sorted) {
    const scoreColor =
      result.overallScore >= 80
        ? c.green
        : result.overallScore >= 60
          ? c.yellow
          : c.red;
    const cells = columns
      .map((col) => {
        const category = result.categories.find((x) => x.category === col.key);
        if (!category) return "".padStart(7);
        const ratio = category.score / category.max;
        const color = ratio >= 0.8 ? c.green : ratio >= 0.5 ? c.yellow : c.red;
        return `${color}${String(category.score).padStart(7)}${c.reset}`;
      })
      .join("");
    console.log(
      "  " +
        label.slice(0, 43).padEnd(44) +
        `${scoreColor}${String(result.overallScore).padStart(6)}${c.reset}` +
        `${c.dim}${String(result.potentialScore).padStart(5)}${c.reset}` +
        cells,
    );
  }
  console.log(
    `\n  ${c.dim}Maximums: ATS 15 · Struct 12 · Exp 15 · Achv 15 · Skills 10 · Read 10 · Impact 5${c.reset}`,
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const showText = args.includes("--text");
  const summaryOnly = args.includes("--summary");

  let jobDescription: string | null = null;
  const jdIndex = args.indexOf("--jd");
  if (jdIndex >= 0) {
    const jdPath = args[jdIndex + 1];
    if (jdPath && existsSync(jdPath)) {
      jobDescription = readFileSync(jdPath, "utf-8");
    }
  }

  const explicit = args.filter(
    (a, i) => !a.startsWith("--") && args[i - 1] !== "--jd",
  );

  let targets: string[];
  if (explicit.length > 0) {
    targets = explicit.map((p) => resolve(p));
  } else {
    if (!existsSync(FIXTURE_DIR)) {
      console.error(
        `${c.yellow}No fixture directory at ${FIXTURE_DIR}.${c.reset}\n` +
          `Drop real CVs there (they are git-ignored) or pass a path directly.`,
      );
      process.exit(1);
    }
    targets = readdirSync(FIXTURE_DIR)
      .filter((f) => SUPPORTED.has(extname(f).toLowerCase()))
      .map((f) => join(FIXTURE_DIR, f));
  }

  if (targets.length === 0) {
    console.error(`${c.yellow}No CV files found to inspect.${c.reset}`);
    process.exit(1);
  }

  const results: Array<{ label: string; result: AnalysisResult }> = [];

  for (const target of targets) {
    if (!existsSync(target) || !statSync(target).isFile()) {
      console.error(`${c.red}Not a file: ${target}${c.reset}`);
      continue;
    }
    try {
      results.push(
        await inspectFile(target, jobDescription, { showText, summaryOnly }),
      );
    } catch (error) {
      console.error(`${c.red}Failed on ${target}:${c.reset}`, error);
    }
  }

  printComparison(results);
}

void main();
