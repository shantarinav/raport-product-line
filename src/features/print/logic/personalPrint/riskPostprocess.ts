import type { PrintLlmRawClassification, PrintLlmRiskLevel } from "./types";

export const DEFAULT_PRINT_LLM_RISK_THRESHOLDS = {
  high: 0.75,
  medium: 0.55,
};

const PERSONAL_TOPIC_CATEGORIES = new Set([
  "education",
  "children",
  "finance",
  "travel",
  "household",
  "medical",
  "media",
  "legal",
  "other_personal",
]);

const PERSONAL_TOPIC_SIGNALS = new Set([
  "education",
  "children_or_school",
  "recipe_or_food",
  "household",
  "personal_finance",
  "travel_or_tickets",
  "medical",
  "legal_personal",
  "entertainment",
]);

function shouldUpgradePersonalTopic(input: PrintLlmRawClassification): boolean {
  if (input.is_personal || input.primary_category === "unknown" || input.signals.includes("work_like")) {
    return false;
  }

  return PERSONAL_TOPIC_CATEGORIES.has(input.primary_category) || input.signals.some((signal) => PERSONAL_TOPIC_SIGNALS.has(signal));
}

export function postprocessPrintLlmRisk(
  input: PrintLlmRawClassification,
  thresholds = DEFAULT_PRINT_LLM_RISK_THRESHOLDS,
): PrintLlmRawClassification & { risk_level: PrintLlmRiskLevel } {
  const normalized = shouldUpgradePersonalTopic(input) ? { ...input, is_personal: true, needs_review: true } : input;

  if (normalized.primary_category === "unknown") {
    return { ...normalized, risk_level: "unknown", needs_review: true };
  }

  if (normalized.is_personal && normalized.confidence_raw >= thresholds.high) {
    return { ...normalized, risk_level: "high" };
  }

  if (normalized.is_personal && normalized.confidence_raw >= thresholds.medium) {
    return { ...normalized, risk_level: "medium", needs_review: true };
  }

  if (normalized.is_personal) {
    return { ...normalized, risk_level: "low", needs_review: true };
  }

  return { ...normalized, risk_level: "low" };
}
