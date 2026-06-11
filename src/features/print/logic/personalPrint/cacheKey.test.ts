import { describe, expect, it } from "vitest";
import { canonicalPrintLlmCacheInput, pagesBucket } from "./cacheKey";

describe("pagesBucket", () => {
  it.each([
    [1, "1"],
    [2, "2-5"],
    [5, "2-5"],
    [6, "6-20"],
    [20, "6-20"],
    [21, "20+"],
  ] as const)("maps %s to %s", (pages, expected) => {
    expect(pagesBucket(pages)).toBe(expected);
  });
});

describe("canonicalPrintLlmCacheInput", () => {
  const base = {
    schemaVersion: 1,
    modelName: "qwen3:4b",
    normalizedTitle: "matematika 5klass domashka",
    pages: 2,
    color: false,
    duplex: false,
    paperSize: "до A4 включительно",
  };

  it("is stable for the same input", () => {
    expect(canonicalPrintLlmCacheInput(base)).toBe(canonicalPrintLlmCacheInput({ ...base }));
  });

  it("changes when relevant fields change", () => {
    const current = canonicalPrintLlmCacheInput(base);
    expect(canonicalPrintLlmCacheInput({ ...base, schemaVersion: 2 })).not.toBe(current);
    expect(canonicalPrintLlmCacheInput({ ...base, modelName: "llama3.2:3b" })).not.toBe(current);
    expect(canonicalPrintLlmCacheInput({ ...base, normalizedTitle: "scan" })).not.toBe(current);
    expect(canonicalPrintLlmCacheInput({ ...base, pages: 6 })).not.toBe(current);
    expect(canonicalPrintLlmCacheInput({ ...base, color: true })).not.toBe(current);
    expect(canonicalPrintLlmCacheInput({ ...base, duplex: true })).not.toBe(current);
    expect(canonicalPrintLlmCacheInput({ ...base, paperSize: "A3" })).not.toBe(current);
  });
});
