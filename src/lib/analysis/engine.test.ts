import { describe, expect, it } from "vitest";

import {
  ARABIC_CV,
  IMAGE_BASED_TEXT,
  JOB_DESCRIPTION_SOFTWARE,
  JOB_DESCRIPTION_SUPPLY_CHAIN,
  STRONG_CV,
  STRONG_CV_WITHOUT_CONTACT,
  STRONG_CV_WITHOUT_METRICS,
  WEAK_CV,
} from "./__fixtures__/cvs";
import { CATEGORY_WEIGHTS, TOTAL_POINTS, classify } from "./config";
import { analyzeCV, assessCondition, computePotentialScore } from "./engine";
import { analysisResultSchema, type Category } from "./schema";

const categoryScore = (
  result: ReturnType<typeof analyzeCV>,
  category: Category,
): number => result.categories.find((c) => c.category === category)?.score ?? -1;

describe("scoring configuration", () => {
  it("weights sum to exactly 100 points", () => {
    expect(TOTAL_POINTS).toBe(100);
  });

  it("maps every score to the documented classification band", () => {
    expect(classify(95)).toBe("exceptional");
    expect(classify(90)).toBe("exceptional");
    expect(classify(89)).toBe("strong");
    expect(classify(80)).toBe("strong");
    expect(classify(79)).toBe("competitive");
    expect(classify(70)).toBe("competitive");
    expect(classify(69)).toBe("needs_improvement");
    expect(classify(60)).toBe("needs_improvement");
    expect(classify(59)).toBe("weak");
    expect(classify(40)).toBe("weak");
    expect(classify(39)).toBe("critical");
    expect(classify(0)).toBe("critical");
  });
});

describe("analyzeCV — output contract", () => {
  it("always returns a result matching the published schema", () => {
    for (const text of [STRONG_CV, WEAK_CV, ARABIC_CV]) {
      expect(() => analysisResultSchema.parse(analyzeCV({ text }))).not.toThrow();
    }
  });

  it("keeps every category score within its configured maximum", () => {
    const result = analyzeCV({ text: STRONG_CV });
    for (const category of result.categories) {
      expect(category.score).toBeGreaterThanOrEqual(0);
      expect(category.score).toBeLessThanOrEqual(category.max);
      expect(category.max).toBe(CATEGORY_WEIGHTS[category.category]);
    }
  });

  it("produces an overall score equal to the sum of its categories", () => {
    const result = analyzeCV({ text: STRONG_CV });
    const sum = result.categories.reduce((acc, c) => acc + c.score, 0);
    expect(result.overallScore).toBe(Math.round(sum));
  });
});

describe("analyzeCV — relative scoring", () => {
  it("scores a strong CV higher than a weak one", () => {
    const strong = analyzeCV({ text: STRONG_CV });
    const weak = analyzeCV({ text: WEAK_CV });
    expect(strong.overallScore).toBeGreaterThan(weak.overallScore);
    // The gap should be decisive, not marginal.
    expect(strong.overallScore - weak.overallScore).toBeGreaterThan(20);
  });

  it("scores measurable achievements higher than the same CV without them", () => {
    const withMetrics = analyzeCV({ text: STRONG_CV });
    const withoutMetrics = analyzeCV({ text: STRONG_CV_WITHOUT_METRICS });

    expect(
      categoryScore(withMetrics, "achievement_strength"),
    ).toBeGreaterThan(categoryScore(withoutMetrics, "achievement_strength"));
    expect(withMetrics.overallScore).toBeGreaterThan(
      withoutMetrics.overallScore,
    );
  });

  it("isolates missing contact details to the contact category", () => {
    const complete = analyzeCV({ text: STRONG_CV });
    const stripped = analyzeCV({ text: STRONG_CV_WITHOUT_CONTACT });

    expect(categoryScore(stripped, "contact_information")).toBeLessThan(
      categoryScore(complete, "contact_information"),
    );

    // Every unrelated category must be unaffected by the contact block.
    const unrelated: Category[] = [
      "structure",
      "experience_quality",
      "achievement_strength",
      "skills_quality",
    ];
    for (const category of unrelated) {
      expect(categoryScore(stripped, category)).toBe(
        categoryScore(complete, category),
      );
    }
  });

  it("classifies a weak CV as needing work", () => {
    const weak = analyzeCV({ text: WEAK_CV });
    expect(["critical", "weak", "needs_improvement"]).toContain(
      weak.classification,
    );
  });
});

describe("analyzeCV — Arabic support", () => {
  it("detects Arabic and scores an Arabic CV on the same footing", () => {
    const result = analyzeCV({ text: ARABIC_CV });
    // Predominantly Arabic prose with Latin tool names mixed into skills.
    expect(["ar", "mixed"]).toContain(result.language);
    expect(result.overallScore).toBeGreaterThan(45);
    expect(result.sections.length).toBeGreaterThanOrEqual(4);
  });

  it("recognises Arabic-Indic numerals as measurable results", () => {
    const arabic = analyzeCV({ text: ARABIC_CV });
    const weak = analyzeCV({ text: WEAK_CV });
    expect(categoryScore(arabic, "achievement_strength")).toBeGreaterThan(
      categoryScore(weak, "achievement_strength"),
    );
  });
});

describe("analyzeCV — job description matching", () => {
  it("raises the job-match score when the CV fits the role", () => {
    const withoutJd = analyzeCV({ text: STRONG_CV });
    const withJd = analyzeCV({
      text: STRONG_CV,
      jobDescription: JOB_DESCRIPTION_SUPPLY_CHAIN,
    });

    expect(withJd.jobMatch).not.toBeNull();
    expect(withoutJd.jobMatch).toBeNull();
    expect(categoryScore(withJd, "keyword_job_match")).toBeGreaterThan(
      categoryScore(withoutJd, "keyword_job_match"),
    );
  });

  it("scores a relevant job description higher than an irrelevant one", () => {
    const relevant = analyzeCV({
      text: STRONG_CV,
      jobDescription: JOB_DESCRIPTION_SUPPLY_CHAIN,
    });
    const irrelevant = analyzeCV({
      text: STRONG_CV,
      jobDescription: JOB_DESCRIPTION_SOFTWARE,
    });

    expect(relevant.jobMatch!.score).toBeGreaterThan(
      irrelevant.jobMatch!.score,
    );
    expect(relevant.jobMatch!.matchedSkills.length).toBeGreaterThan(
      irrelevant.jobMatch!.matchedSkills.length,
    );
  });

  it("reports missing skills without inventing a target role", () => {
    const result = analyzeCV({
      text: STRONG_CV,
      jobDescription: JOB_DESCRIPTION_SOFTWARE,
    });
    expect(result.jobMatch!.missingSkills.length).toBeGreaterThan(0);
    expect(result.jobMatch!.missingSkills).toContain("kubernetes");
  });

  it("makes no fit claim when no job description is supplied", () => {
    const result = analyzeCV({ text: STRONG_CV });
    expect(result.jobMatch).toBeNull();
    expect(result.findings.some((f) => f.id === "keywords.no_target_provided")).toBe(
      true,
    );
  });
});

describe("analyzeCV — determinism", () => {
  it("returns byte-identical results across repeated runs", () => {
    const runs = Array.from({ length: 5 }, () =>
      JSON.stringify(
        analyzeCV({
          text: STRONG_CV,
          jobDescription: JOB_DESCRIPTION_SUPPLY_CHAIN,
          targetRole: "Senior Supply Chain Manager",
        }),
      ),
    );
    expect(new Set(runs).size).toBe(1);
  });

  it("is deterministic for weak and Arabic inputs too", () => {
    for (const text of [WEAK_CV, ARABIC_CV]) {
      const a = JSON.stringify(analyzeCV({ text }));
      const b = JSON.stringify(analyzeCV({ text }));
      expect(a).toBe(b);
    }
  });
});

describe("potential score", () => {
  it("is never lower than the current score and never above 100", () => {
    for (const text of [STRONG_CV, WEAK_CV, ARABIC_CV]) {
      const result = analyzeCV({ text });
      expect(result.potentialScore).toBeGreaterThanOrEqual(result.overallScore);
      expect(result.potentialScore).toBeLessThanOrEqual(100);
    }
  });

  it("is derived from addressable deductions, not an arbitrary constant", () => {
    const noFindings = computePotentialScore(70, []);
    expect(noFindings).toBe(70);

    const withFindings = computePotentialScore(70, [
      {
        id: "x",
        category: "structure",
        severity: "high",
        title: "t",
        description: "d",
        evidence: null,
        deduction: 10,
        recommendation: "r",
        exampleBefore: null,
        exampleAfter: null,
        addressable: true,
        isLocked: false,
      },
    ]);
    expect(withFindings).toBeGreaterThan(70);
    expect(withFindings).toBeLessThan(81);
  });

  it("ignores deductions the candidate cannot address", () => {
    const base = {
      id: "y",
      category: "structure" as const,
      severity: "high" as const,
      title: "t",
      description: "d",
      evidence: null,
      deduction: 12,
      recommendation: "r",
      exampleBefore: null,
      exampleAfter: null,
      isLocked: false,
    };
    expect(computePotentialScore(60, [{ ...base, addressable: false }])).toBe(60);
  });

  it("stays realistic rather than promising a near-perfect result", () => {
    const weak = analyzeCV({ text: WEAK_CV });
    // A weak CV cannot honestly claim a near-perfect ceiling by editing alone.
    expect(weak.potentialScore).toBeLessThan(85);
    expect(weak.potentialScore).toBeGreaterThan(weak.overallScore);
  });

  it("applies diminishing returns as the problem pool grows", () => {
    const finding = (deduction: number) => ({
      id: `f${deduction}`,
      category: "structure" as const,
      severity: "high" as const,
      title: "t",
      description: "d",
      evidence: null,
      deduction,
      recommendation: "r",
      exampleBefore: null,
      exampleAfter: null,
      addressable: true,
      isLocked: false,
    });

    const smallGain = computePotentialScore(85, [finding(10)]) - 85;
    const largeGain = computePotentialScore(45, [finding(45)]) - 45;

    // A bigger deficit yields more absolute gain, but a smaller proportion.
    expect(largeGain).toBeGreaterThan(smallGain);
    expect(largeGain / 45).toBeLessThan(smallGain / 10);
  });

  it("never promises a perfect score", () => {
    const inflated = computePotentialScore(96, [
      {
        id: "z",
        category: "structure",
        severity: "high",
        title: "t",
        description: "d",
        evidence: null,
        deduction: 40,
        recommendation: "r",
        exampleBefore: null,
        exampleAfter: null,
        addressable: true,
        isLocked: false,
      },
    ]);
    expect(inflated).toBeLessThanOrEqual(97);
  });
});

describe("document condition", () => {
  it("flags an image-only document instead of scoring it as normal", () => {
    const condition = assessCondition(IMAGE_BASED_TEXT, 2);
    expect(condition).toBe("image_based_document");

    const result = analyzeCV({ text: IMAGE_BASED_TEXT, parserPageCount: 2 });
    expect(result.condition).toBe("image_based_document");
    expect(result.findings.some((f) => f.id === "ats.image_based")).toBe(true);
    expect(categoryScore(result, "ats_parseability")).toBe(0);
  });

  it("flags a text PDF with almost no content per page", () => {
    expect(assessCondition("Ahmed Ali\nEngineer", 3)).toBe(
      "image_based_document",
    );
  });

  it("treats a genuinely short single page as too short, not image-based", () => {
    const shortText = "A short line of real CV text. ".repeat(4);
    expect(assessCondition(shortText, 1)).toBe("too_short");
  });

  it("accepts a normal CV as readable", () => {
    expect(assessCondition(STRONG_CV, 2)).toBe("ok");
  });
});

describe("findings", () => {
  it("gives every deduction an explanation and a recommendation", () => {
    const result = analyzeCV({ text: WEAK_CV });
    for (const finding of result.findings) {
      expect(finding.title.length).toBeGreaterThan(0);
      expect(finding.description.length).toBeGreaterThan(20);
      expect(finding.recommendation.length).toBeGreaterThan(20);
      if (finding.severity === "positive") {
        expect(finding.deduction).toBe(0);
      }
    }
  });

  it("surfaces the weak CV's core problems", () => {
    const result = analyzeCV({ text: WEAK_CV });
    const ids = result.findings.map((f) => f.id);
    expect(ids).toContain("achievement.weak_openers");
    expect(ids).toContain("skills.too_generic");
    expect(ids).toContain("contact.missing_phone");
  });

  it("recognises what a strong CV does well", () => {
    const result = analyzeCV({ text: STRONG_CV });
    const positives = result.findings.filter((f) => f.severity === "positive");
    expect(positives.length).toBeGreaterThan(0);
  });

  it("ranks the three highest-impact fixes as priorities", () => {
    const result = analyzeCV({ text: WEAK_CV });
    expect(result.priorities.length).toBeGreaterThan(0);
    expect(result.priorities.length).toBeLessThanOrEqual(3);
    result.priorities.forEach((p, i) => {
      expect(p.rank).toBe(i + 1);
      expect(p.estimatedGain).toBeGreaterThan(0);
    });
    // Priorities must be ordered by impact.
    const gains = result.priorities.map((p) => p.estimatedGain);
    expect([...gains].sort((a, b) => b - a)).toEqual(gains);
  });
});
