export type PrintLlmPrimaryCategory =
  | "work"
  | "education"
  | "children"
  | "finance"
  | "travel"
  | "household"
  | "medical"
  | "media"
  | "legal"
  | "other_personal"
  | "unknown";

export type PrintLlmSignal =
  | "education"
  | "children_or_school"
  | "recipe_or_food"
  | "household"
  | "personal_finance"
  | "travel_or_tickets"
  | "medical"
  | "legal_personal"
  | "entertainment"
  | "ambiguous_name"
  | "too_short"
  | "technical_scan_name"
  | "work_like"
  | "unknown";

export type PrintLlmRiskLevel = "low" | "medium" | "high" | "unknown";
export type PrintLlmSource = "rules" | "llm" | "rules_fallback" | "disabled";

export type PrintLlmRawClassification = {
  is_personal: boolean;
  primary_category: PrintLlmPrimaryCategory;
  confidence_raw: number;
  needs_review: boolean;
  reason_short: string;
  signals: PrintLlmSignal[];
};

export type PrintPersonalClassification = PrintLlmRawClassification & {
  source: PrintLlmSource;
  risk_level: PrintLlmRiskLevel;
  normalized_title: string;
};

export type PrintPersonalClassifierRequestItem = {
  id: string;
  document_title: string;
  pages: number;
  color: boolean;
  duplex: boolean;
  paper_size: string;
};

export type PrintPersonalClassifierResponseItem = PrintPersonalClassification & {
  id: string;
};

export type PrintPersonalClassifierResponse = {
  items: PrintPersonalClassifierResponseItem[];
};

export type ExcessPrintMatch = {
  category: string;
  label: string;
};
