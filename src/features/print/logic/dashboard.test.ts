import { describe, expect, it } from "vitest";
import type { PrintJob } from "../types";
import { applyPrintFilters, initialPrintFilters } from "./dashboard";

function job(overrides: Partial<PrintJob> = {}): PrintJob {
  return {
    date: null,
    dateKey: "2026-06-08",
    user: "user",
    pages: 1,
    copies: 1,
    totalPages: 1,
    printer: "printer",
    documentName: "document.pdf",
    computer: "computer",
    driver: "driver",
    duplex: "NOT DUPLEX",
    color: "GRAYSCALE",
    paperBucket: "до A4 включительно",
    docType: "PDF",
    isBigJob: false,
    isMultiNoDuplex: false,
    isColor: false,
    isPdfPrinter: false,
    isExcessPrint: false,
    excessCategories: [],
    excessMatches: [],
    riskScore: 0,
    riskReasons: [],
    riskReasonCodes: [],
    raw: {},
    ...overrides,
  };
}

describe("applyPrintFilters", () => {
  it("uses LLM result as the source of truth for personal topics when available", () => {
    const rows = [
      job({
        documentName: "diploma.pdf",
        riskReasonCodes: ["excess-personal"],
        personalPrintClassification: {
          normalized_title: "diploma",
          source: "llm",
          is_personal: false,
          primary_category: "work",
          risk_level: "low",
          confidence_raw: 0.8,
          needs_review: false,
          reason_short: "Рабочий документ.",
          signals: ["work_like"],
        },
      }),
      job({
        documentName: "unknown.pdf",
        personalPrintClassification: {
          normalized_title: "unknown",
          source: "llm",
          is_personal: true,
          primary_category: "education",
          risk_level: "high",
          confidence_raw: 0.9,
          needs_review: true,
          reason_short: "Похоже на учебный материал.",
          signals: ["education"],
        },
      }),
      job({
        documentName: "local-rule.pdf",
        riskReasonCodes: ["excess-personal"],
      }),
    ];
    const filters = { ...initialPrintFilters(rows), riskReason: "excess-personal" };

    expect(applyPrintFilters(rows, filters).map((row) => row.documentName)).toEqual(["unknown.pdf", "local-rule.pdf"]);
  });
});
