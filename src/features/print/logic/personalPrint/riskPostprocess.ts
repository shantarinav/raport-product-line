import type { PrintLlmRawClassification, PrintLlmRiskLevel } from "./types";

export const DEFAULT_PRINT_LLM_RISK_THRESHOLDS = {
  high: 0.75,
  medium: 0.55,
};

export function postprocessPrintLlmRisk(
  input: PrintLlmRawClassification,
  thresholds = DEFAULT_PRINT_LLM_RISK_THRESHOLDS,
): PrintLlmRawClassification & { risk_level: PrintLlmRiskLevel } {
  if (input.primary_category === "unknown") {
    return { ...input, risk_level: "unknown", needs_review: true };
  }

  if (input.is_personal && input.confidence_raw >= thresholds.high) {
    return { ...input, risk_level: "high" };
  }

  if (input.is_personal && input.confidence_raw >= thresholds.medium) {
    return { ...input, risk_level: "medium", needs_review: true };
  }

  if (input.is_personal) {
    return { ...input, risk_level: "low", needs_review: true };
  }

  return { ...input, risk_level: "low" };
}
