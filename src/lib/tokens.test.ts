import { describe, expect, it } from "vitest";

import { generatePublicToken, isValidTokenFormat, tokensEqual } from "./tokens";

describe("public report tokens", () => {
  it("generates tokens of the expected length and alphabet", () => {
    const token = generatePublicToken();
    expect(token).toHaveLength(32);
    expect(isValidTokenFormat(token)).toBe(true);
  });

  it("never produces visually ambiguous characters", () => {
    const joined = Array.from({ length: 200 }, () => generatePublicToken()).join(
      "",
    );
    expect(joined).not.toMatch(/[01loI]/);
  });

  it("produces unique tokens across a large sample", () => {
    const count = 20_000;
    const tokens = new Set(
      Array.from({ length: count }, () => generatePublicToken()),
    );
    expect(tokens.size).toBe(count);
  });

  it("is not sequential or time-ordered", () => {
    const a = generatePublicToken();
    const b = generatePublicToken();
    // Consecutive tokens must share no meaningful prefix.
    let shared = 0;
    while (shared < a.length && a[shared] === b[shared]) shared += 1;
    expect(shared).toBeLessThan(6);
  });

  it("distributes characters across the alphabet rather than clustering", () => {
    const sample = Array.from({ length: 500 }, () =>
      generatePublicToken(),
    ).join("");
    const distinct = new Set(sample.split("")).size;
    // All 31 alphabet symbols should appear in 16k characters.
    expect(distinct).toBe(31);
  });

  it("rejects malformed tokens", () => {
    expect(isValidTokenFormat("")).toBe(false);
    expect(isValidTokenFormat("short")).toBe(false);
    expect(isValidTokenFormat("123")).toBe(false);
    // Sequential ids and UUIDs must not pass as report tokens.
    expect(isValidTokenFormat("42")).toBe(false);
    expect(
      isValidTokenFormat("3f2504e0-4f89-11d3-9a0c-0305e82c3301"),
    ).toBe(false);
    // Ambiguous characters are outside the alphabet.
    expect(isValidTokenFormat(`${"a".repeat(31)}0`)).toBe(false);
    expect(isValidTokenFormat(`${"a".repeat(31)}O`)).toBe(false);
  });

  it("compares tokens safely", () => {
    const token = generatePublicToken();
    expect(tokensEqual(token, token)).toBe(true);
    expect(tokensEqual(token, generatePublicToken())).toBe(false);
    expect(tokensEqual(token, token.slice(0, 10))).toBe(false);
  });
});
