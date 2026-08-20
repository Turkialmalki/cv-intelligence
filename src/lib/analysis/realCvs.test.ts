import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseDocument } from "../parsing/index";
import { analyzeCV } from "./engine";
import { normalizeCV } from "./normalize";
import { analysisResultSchema } from "./schema";

/**
 * Smoke tests over real CVs.
 *
 * These are deliberately property-based rather than value-based. The fixture
 * set grows over time and will eventually include other people's CVs, so
 * asserting "this file scores 84" would be a maintenance trap that breaks on
 * every legitimate engine improvement.
 *
 * What is asserted instead are invariants that must hold for *any* real CV:
 * the document parses, the output validates, scoring is deterministic and
 * within bounds, and — most importantly — nothing is fabricated.
 *
 * Drop any .pdf/.docx/.txt into tests/fixtures/real-cvs/ and it is picked up
 * automatically. Run `npm run inspect` to see a full breakdown of each.
 */

const FIXTURE_DIR = resolve(__dirname, "../../../tests/fixtures/real-cvs");
const SUPPORTED = new Set([".pdf", ".docx", ".txt"]);

const fixtures = existsSync(FIXTURE_DIR)
  ? readdirSync(FIXTURE_DIR).filter((f) => SUPPORTED.has(extname(f).toLowerCase()))
  : [];

/** Placeholders the rewriter is allowed to insert. */
const PLACEHOLDER = /\[(?:add|اضف|أضف|اكتب)[^\]]*\]/i;

describe.skipIf(fixtures.length === 0)("real CV fixtures", () => {
  for (const filename of fixtures) {
    describe(filename, () => {
      const buffer = readFileSync(join(FIXTURE_DIR, filename));

      it("parses into readable text", async () => {
        const parsed = await parseDocument(buffer, filename, "");
        expect(parsed.condition).toBe("ok");
        expect(parsed.characters).toBeGreaterThan(400);
        // A PDF that collapses to a single line has lost its structure.
        expect(parsed.text.split("\n").length).toBeGreaterThan(10);
      });

      it("produces a valid, in-range analysis", async () => {
        const parsed = await parseDocument(buffer, filename, "");
        const result = analyzeCV({
          text: parsed.text,
          parserPageCount: parsed.pageCount,
          condition: parsed.condition,
        });

        expect(() => analysisResultSchema.parse(result)).not.toThrow();
        expect(result.overallScore).toBeGreaterThanOrEqual(0);
        expect(result.overallScore).toBeLessThanOrEqual(100);
        expect(result.potentialScore).toBeGreaterThanOrEqual(result.overallScore);
        for (const category of result.categories) {
          expect(category.score).toBeLessThanOrEqual(category.max);
          expect(category.score).toBeGreaterThanOrEqual(0);
        }
      });

      it("extracts real structure rather than guessing", async () => {
        const parsed = await parseDocument(buffer, filename, "");
        const doc = normalizeCV(parsed.text, {
          parserPageCount: parsed.pageCount,
        });
        const result = analyzeCV({
          text: parsed.text,
          parserPageCount: parsed.pageCount,
          condition: parsed.condition,
        });

        // Every real CV here has a name and an email on it.
        expect(result.candidate.name).toBeTruthy();
        expect(result.candidate.email).toContain("@");
        // At least one section heading must be recognised.
        expect(result.sections.length).toBeGreaterThan(0);
        // Each parsed role must begin with text we actually saw in the
        // document. Only the opening is compared, because a role header may
        // legitimately be a join of a wrapped line or of a company line and
        // its title line.
        for (const entry of doc.experience) {
          const opening = (entry.headerLine.split(" — ")[0] ?? "").slice(0, 24);
          if (opening.length < 8) continue;
          expect(parsed.text).toContain(opening);
        }
      });

      it("never fabricates content in its rewrites", async () => {
        const parsed = await parseDocument(buffer, filename, "");
        const result = analyzeCV({
          text: parsed.text,
          parserPageCount: parsed.pageCount,
          condition: parsed.condition,
        });

        for (const line of result.comparison) {
          // Every "before" must be verbatim from the document.
          expect(parsed.text).toContain(line.original.slice(0, 40));

          // Any number in the "after" must already exist in the "before".
          // A digit appearing from nowhere would be an invented metric.
          const withoutPlaceholder = line.optimized.replace(PLACEHOLDER, "");
          const afterDigits = withoutPlaceholder.match(/\d+/g) ?? [];
          const beforeDigits = new Set(line.original.match(/\d+/g) ?? []);
          for (const digit of afterDigits) {
            expect(beforeDigits.has(digit)).toBe(true);
          }
        }

        // The same rule applies to the worked examples inside findings.
        for (const finding of result.findings) {
          if (!finding.exampleAfter || !finding.exampleBefore) continue;
          const withoutPlaceholder = finding.exampleAfter.replace(
            PLACEHOLDER,
            "",
          );
          const beforeDigits = new Set(
            finding.exampleBefore.match(/\d+/g) ?? [],
          );
          for (const digit of withoutPlaceholder.match(/\d+/g) ?? []) {
            expect(beforeDigits.has(digit)).toBe(true);
          }
        }
      });

      it("scores deterministically", async () => {
        const parsed = await parseDocument(buffer, filename, "");
        const run = () =>
          JSON.stringify(
            analyzeCV({
              text: parsed.text,
              parserPageCount: parsed.pageCount,
              condition: parsed.condition,
            }),
          );
        expect(run()).toBe(run());
      });

      it("explains every deduction it makes", async () => {
        const parsed = await parseDocument(buffer, filename, "");
        const result = analyzeCV({
          text: parsed.text,
          parserPageCount: parsed.pageCount,
          condition: parsed.condition,
        });

        for (const finding of result.findings) {
          expect(finding.description.length).toBeGreaterThan(20);
          expect(finding.recommendation.length).toBeGreaterThan(20);
          if (finding.deduction > 0) {
            expect(finding.severity).not.toBe("positive");
          }
        }
      });
    });
  }
});

/**
 * Cross-fixture behaviour. These assert *relative* ordering only, which is
 * the property that actually matters and the one most likely to regress.
 */
describe.skipIf(fixtures.length < 2)("real CV set — relative behaviour", () => {
  it("differentiates quality rather than rewarding length", async () => {
    const scored = await Promise.all(
      fixtures.map(async (filename) => {
        const parsed = await parseDocument(
          readFileSync(join(FIXTURE_DIR, filename)),
          filename,
          "",
        );
        const result = analyzeCV({
          text: parsed.text,
          parserPageCount: parsed.pageCount,
          condition: parsed.condition,
        });
        return { filename, result, words: result.summary.wordCount };
      }),
    );

    const scores = scored.map((s) => s.result.overallScore);
    // The set must actually spread out — a scorer that rates everything the
    // same is useless regardless of how principled it looks.
    expect(Math.max(...scores) - Math.min(...scores)).toBeGreaterThan(10);

    // Score must not simply track document length.
    const byWords = [...scored].sort((a, b) => b.words - a.words);
    const byScore = [...scored].sort(
      (a, b) => b.result.overallScore - a.result.overallScore,
    );
    expect(byWords.map((s) => s.filename)).not.toEqual(
      byScore.map((s) => s.filename),
    );
  });
});
