import { describe, expect, it } from "vitest";
import type { PrintJob } from "../../types";
import { buildPrintClassificationCsv } from "./exportClassification";

function job(overrides: Partial<PrintJob> = {}): PrintJob {
  return {
    date: new Date("2026-06-01T10:00:00"),
    dateKey: "2026-06-01",
    user: "secret.user",
    pages: 2,
    copies: 1,
    totalPages: 2,
    printer: "secret-printer",
    documentName: "Matematika_5klass_domashka.pdf",
    computer: "secret-computer",
    driver: "secret-driver",
    duplex: "NOT DUPLEX",
    color: "GRAYSCALE",
    paperBucket: "до A4 включительно",
    docType: "PDF",
    isBigJob: false,
    isMultiNoDuplex: true,
    isColor: false,
    isPdfPrinter: false,
    isExcessPrint: true,
    excessCategories: ["Личные тематики"],
    excessMatches: [{ category: "Личные тематики", label: "детские/школьные материалы" }],
    riskScore: 65,
    riskReasons: [],
    riskReasonCodes: [],
    raw: {},
    personalPrintClassification: {
      normalized_title: "matematika 5klass domashka",
      source: "llm",
      is_personal: true,
      primary_category: "education",
      risk_level: "high",
      confidence_raw: 0.86,
      needs_review: true,
      reason_short: "Похоже на школьные материалы",
      signals: ["education", "children_or_school"],
    },
    ...overrides,
  };
}

describe("buildPrintClassificationCsv", () => {
  it("exports review fields without operational personal data", () => {
    const csv = buildPrintClassificationCsv([job()]);

    expect(csv).toContain("normalized_title");
    expect(csv).toContain("matematika 5klass domashka");
    expect(csv).toContain("education");
    expect(csv).not.toContain("secret.user");
    expect(csv).not.toContain("secret-computer");
    expect(csv).not.toContain("secret-printer");
  });
});
