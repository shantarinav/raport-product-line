import { describe, expect, it } from "vitest";
import { postprocessPrintLlmRisk } from "./riskPostprocess";
import type { PrintLlmRawClassification } from "./types";

function value(input: Partial<PrintLlmRawClassification>): PrintLlmRawClassification {
  return {
    is_personal: false,
    primary_category: "work",
    confidence_raw: 0.1,
    needs_review: false,
    reason_short: "Похоже на рабочий документ",
    signals: ["work_like"],
    ...input,
  };
}

describe("postprocessPrintLlmRisk", () => {
  it("marks unknown as unknown and review", () => {
    expect(postprocessPrintLlmRisk(value({ primary_category: "unknown" }))).toMatchObject({ risk_level: "unknown", needs_review: true });
  });

  it("marks high personal risk", () => {
    expect(postprocessPrintLlmRisk(value({ is_personal: true, primary_category: "education", confidence_raw: 0.75 }))).toMatchObject({ risk_level: "high" });
  });

  it("marks medium personal risk and review", () => {
    expect(postprocessPrintLlmRisk(value({ is_personal: true, primary_category: "education", confidence_raw: 0.55 }))).toMatchObject({ risk_level: "medium", needs_review: true });
  });

  it("marks low personal risk and review", () => {
    expect(postprocessPrintLlmRisk(value({ is_personal: true, primary_category: "education", confidence_raw: 0.2 }))).toMatchObject({ risk_level: "low", needs_review: true });
  });

  it("marks non-personal as low", () => {
    expect(postprocessPrintLlmRisk(value({ is_personal: false, primary_category: "work", confidence_raw: 0.9 }))).toMatchObject({ risk_level: "low" });
  });
});
