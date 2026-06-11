import type { PrintLlmPrimaryCategory, PrintLlmRawClassification, PrintLlmSignal } from "./types";

export const PRINT_LLM_PRIMARY_CATEGORIES: PrintLlmPrimaryCategory[] = [
  "work",
  "education",
  "children",
  "finance",
  "travel",
  "household",
  "medical",
  "media",
  "legal",
  "other_personal",
  "unknown",
];

export const PRINT_LLM_SIGNALS: PrintLlmSignal[] = [
  "education",
  "children_or_school",
  "recipe_or_food",
  "household",
  "personal_finance",
  "travel_or_tickets",
  "medical",
  "legal_personal",
  "entertainment",
  "ambiguous_name",
  "too_short",
  "technical_scan_name",
  "work_like",
  "unknown",
];

const REQUIRED_KEYS = ["is_personal", "primary_category", "confidence_raw", "needs_review", "reason_short", "signals"];
const ALLOWED_KEYS = new Set(REQUIRED_KEYS);
const CATEGORY_SET = new Set<string>(PRINT_LLM_PRIMARY_CATEGORIES);
const SIGNAL_SET = new Set<string>(PRINT_LLM_SIGNALS);

export function validateLlmClassification(value: unknown): PrintLlmRawClassification | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (!keys.every((key) => ALLOWED_KEYS.has(key))) return null;
  if (!REQUIRED_KEYS.every((key) => Object.prototype.hasOwnProperty.call(record, key))) return null;
  if (typeof record.is_personal !== "boolean") return null;
  if (typeof record.primary_category !== "string" || !CATEGORY_SET.has(record.primary_category)) return null;
  if (typeof record.confidence_raw !== "number" || !Number.isFinite(record.confidence_raw) || record.confidence_raw < 0 || record.confidence_raw > 1) return null;
  if (typeof record.needs_review !== "boolean") return null;
  if (typeof record.reason_short !== "string" || record.reason_short.length > 180) return null;
  if (!Array.isArray(record.signals) || record.signals.length > 5) return null;
  if (!record.signals.every((signal) => typeof signal === "string" && SIGNAL_SET.has(signal))) return null;

  return {
    is_personal: record.is_personal,
    primary_category: record.primary_category as PrintLlmPrimaryCategory,
    confidence_raw: record.confidence_raw,
    needs_review: record.needs_review,
    reason_short: record.reason_short,
    signals: record.signals as PrintLlmSignal[],
  };
}
