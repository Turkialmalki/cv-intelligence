import { CATEGORY_WEIGHTS, THRESHOLDS } from "../config";
import { rewriteBullet } from "../rewrite";
import type { Finding } from "../schema";
import { repeatedOpeners } from "../signals";
import { truncate, wordCount } from "../text";
import {
  makeFinding,
  ScoreBudget,
  type DimensionResult,
  type ScoringContext,
} from "./shared";

const CATEGORY = "recruiter_readability" as const;

/**
 * How this CV survives the six-to-eight seconds a recruiter actually spends
 * on the first pass. Density, repetition and rhythm.
 */
export function scoreRecruiterReadability(ctx: ScoringContext): DimensionResult {
  const { doc } = ctx;
  const budget = new ScoreBudget(CATEGORY_WEIGHTS[CATEGORY]);
  const findings: Finding[] = [];

  const descriptionLines =
    doc.experience.flatMap((e) => e.bullets).length > 0
      ? doc.experience.flatMap((e) => e.bullets)
      : doc.bullets.map((b) => b.text);

  // --- Walls of text -----------------------------------------------------
  const proseBlocks = doc.lines.filter(
    (l) => !l.isBullet && l.words > THRESHOLDS.paragraphWordLimit,
  );
  if (proseBlocks.length > 0) {
    const deduction = budget.deduct(Math.min(3, proseBlocks.length * 1.2));
    findings.push(
      makeFinding({
        id: "readability.wall_of_text",
        category: CATEGORY,
        severity: proseBlocks.length >= 3 ? "high" : "medium",
        title: `${proseBlocks.length} dense paragraph${proseBlocks.length > 1 ? "s" : ""} of unbroken text`,
        description: `Paragraphs of ${proseBlocks[0]?.words}+ words appear in your CV. On a first pass a recruiter skims for structure — a solid block gets skipped rather than read.`,
        evidence: truncate(proseBlocks[0]?.text ?? "", 220),
        deduction,
        recommendation:
          "Break each paragraph into 2–4 separate bullets, one idea per line.",
      }),
    );
  }

  // --- Bullet length -----------------------------------------------------
  const longBullets = descriptionLines.filter(
    (b) => wordCount(b) > THRESHOLDS.bulletWords.max,
  );
  if (longBullets.length >= 2) {
    const example = longBullets[0]!;
    const deduction = budget.deduct(Math.min(2.5, longBullets.length * 0.6));
    findings.push(
      makeFinding({
        id: "readability.long_bullets",
        category: CATEGORY,
        severity: "medium",
        title: `${longBullets.length} bullets run too long`,
        description: `These bullets exceed ${THRESHOLDS.bulletWords.max} words. Past roughly two lines on screen, the end of a bullet is rarely read — which is usually where the result sits.`,
        evidence: truncate(example, 220),
        deduction,
        recommendation:
          "Keep bullets to 1–2 lines (about 12–26 words). Split anything longer into two bullets, and put the outcome first.",
        exampleBefore: example,
        exampleAfter: rewriteBullet(example, doc.language).text,
      }),
    );
  }

  const stubBullets = descriptionLines.filter(
    (b) => wordCount(b) > 0 && wordCount(b) < THRESHOLDS.bulletWords.min,
  );
  if (stubBullets.length >= 3) {
    const deduction = budget.deduct(1.5);
    findings.push(
      makeFinding({
        id: "readability.stub_bullets",
        category: CATEGORY,
        severity: "medium",
        title: `${stubBullets.length} bullets are too short to say anything`,
        description:
          "Fragments of a few words carry no context, no scope and no outcome — they take up a line without earning it.",
        evidence: stubBullets.slice(0, 3).join(" · "),
        deduction,
        recommendation:
          "Either expand each fragment into a full action-and-result statement, or move it into your skills list.",
      }),
    );
  }

  // --- Repetition --------------------------------------------------------
  const repeats = repeatedOpeners(descriptionLines);
  const worst = repeats[0];
  if (worst && worst.count >= 4) {
    const deduction = budget.deduct(worst.count >= 6 ? 2 : 1.25);
    findings.push(
      makeFinding({
        id: "readability.repetitive_openers",
        category: CATEGORY,
        severity: "medium",
        title: `"${worst.opener}" opens ${worst.count} of your bullets`,
        description:
          "Repeating the same opening word flattens the rhythm of the page and makes distinct achievements blur into one another.",
        evidence: descriptionLines
          .filter((b) => b.toLowerCase().startsWith(worst.opener))
          .slice(0, 2)
          .map((b) => truncate(b, 90))
          .join(" · "),
        deduction,
        recommendation:
          "Vary your verbs. Reserve the strongest one for your single best achievement in each role.",
      }),
    );
  }

  // --- Overall length ----------------------------------------------------
  if (doc.totalWords > THRESHOLDS.cvWords.max) {
    const deduction = budget.deduct(2);
    findings.push(
      makeFinding({
        id: "readability.too_dense",
        category: CATEGORY,
        severity: "medium",
        title: "There is more text here than will be read",
        description: `Roughly ${doc.totalWords} words across about ${doc.estimatedPages} pages. Screening attention drops sharply after the first page.`,
        evidence: null,
        deduction,
        recommendation:
          "Reduce to two pages. Cut roles older than 10 years to a single line and remove anything not relevant to your target role.",
      }),
    );
  } else if (doc.totalWords < THRESHOLDS.cvWords.min) {
    const deduction = budget.deduct(2);
    findings.push(
      makeFinding({
        id: "readability.too_sparse",
        category: CATEGORY,
        severity: "high",
        title: "There is not enough substance on the page",
        description: `Only about ${doc.totalWords} words were found. A CV this thin reads as an outline rather than a case for hiring you.`,
        evidence: null,
        deduction,
        recommendation:
          "Build each recent role out to 3–5 result-focused bullets. Aim for 400–800 words total.",
      }),
    );
  }

  // --- Summary quality ---------------------------------------------------
  const summarySection = doc.sectionMap.get("summary");
  if (summarySection) {
    const text = summarySection.text;
    const firstPerson = /\b(?:i|my|me)\b/i.test(text);
    if (firstPerson) {
      const deduction = budget.deduct(0.75);
      findings.push(
        makeFinding({
          id: "readability.first_person_summary",
          category: CATEGORY,
          severity: "low",
          title: "Your summary is written in the first person",
          description:
            "CV convention drops \"I\" and \"my\" — the reader already knows the document is about you, and the pronouns cost words that could carry evidence.",
          evidence: truncate(text, 200),
          deduction,
          recommendation:
            "Rewrite without pronouns: \"Supply chain manager with 8 years in FMCG distribution…\" rather than \"I am a supply chain manager…\".",
        }),
      );
    }
  }

  if (budget.score >= CATEGORY_WEIGHTS[CATEGORY] - 1) {
    findings.push(
      makeFinding({
        id: "readability.strong",
        category: CATEGORY,
        severity: "positive",
        title: "Easy to scan under time pressure",
        description:
          "Bullet lengths are consistent, there are no walls of text, and the language does not repeat itself.",
        evidence: null,
        deduction: 0,
        recommendation: "No change needed here.",
        addressable: false,
      }),
    );
  }

  const score = budget.score;
  return {
    score,
    findings,
    summary:
      score >= 8
        ? "Scans cleanly in the first few seconds."
        : score >= 5
          ? "Readable, but density or repetition slows the reader down."
          : "Hard to scan quickly — key points get lost.",
    summaryAr:
      score >= 8
        ? "يسهل تصفّح السيرة خلال الثواني الأولى."
        : score >= 5
          ? "مقروءة، لكن الكثافة أو التكرار يبطئان القارئ."
          : "يصعب تصفّحها بسرعة وتضيع فيها النقاط المهمة.",
  };
}
