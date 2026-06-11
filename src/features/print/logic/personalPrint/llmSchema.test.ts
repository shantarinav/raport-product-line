import { describe, expect, it } from "vitest";
import { validateLlmClassification } from "./llmSchema";

const validValue = {
  is_personal: true,
  primary_category: "education",
  confidence_raw: 0.82,
  needs_review: true,
  reason_short: "Похоже на учебный материал",
  signals: ["education", "children_or_school"],
};

describe("validateLlmClassification", () => {
  it("accepts valid strict classification", () => {
    expect(validateLlmClassification(validValue)).toEqual(validValue);
  });

  it.each([
    { ...validValue, is_personal: undefined },
    { ...validValue, primary_category: "private" },
    { ...validValue, confidence_raw: 1.2 },
    { ...validValue, confidence_raw: -0.1 },
    { ...validValue, signals: ["education", "children_or_school", "household", "medical", "unknown", "work_like"] },
    { ...validValue, signals: ["not_allowed"] },
    { ...validValue, extra: true },
  ])("rejects invalid value %#", (value) => {
    expect(validateLlmClassification(value)).toBeNull();
  });
});
