import type { PrintJob } from "../../types";

const CSV_COLUMNS = [
  "id",
  "normalized_title",
  "old_rule_match",
  "llm_is_personal",
  "primary_category",
  "risk_level",
  "confidence_raw",
  "needs_review",
  "reason_short",
  "signals",
  "source",
  "analyst_label",
] as const;

function csvCell(value: string | number | boolean | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildPrintClassificationCsv(rows: PrintJob[]): string {
  const lines = [
    CSV_COLUMNS.map(csvCell).join(";"),
    ...rows.map((row, index) => {
      const classification = row.personalPrintClassification;
      const oldRuleMatch = row.excessCategories.includes("Личные тематики");

      return [
        `print-job-${index}`,
        classification?.normalized_title ?? row.normalizedDocumentTitle ?? "",
        oldRuleMatch,
        classification?.is_personal ?? "",
        classification?.primary_category ?? "",
        classification?.risk_level ?? "",
        classification?.confidence_raw ?? "",
        classification?.needs_review ?? "",
        classification?.reason_short ?? "",
        classification?.signals.join(", ") ?? "",
        classification?.source ?? "",
        "",
      ]
        .map(csvCell)
        .join(";");
    }),
  ];

  return `\uFEFF${lines.join("\n")}`;
}

export function downloadTextFile(content: string, fileName: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
