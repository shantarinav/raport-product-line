import { describe, expect, it } from "vitest";
import type { PrintJob } from "../../types";
import { enrichPrintJobsWithClassifications } from "./enrichPrintJobs";
import type { PrintPersonalClassifierResponseItem } from "./types";

function job(overrides: Partial<PrintJob> = {}): PrintJob {
  return {
    date: null,
    dateKey: "",
    user: "user",
    pages: 2,
    copies: 1,
    totalPages: 2,
    printer: "printer",
    documentName: "Matematika_5klass_domashka.pdf",
    computer: "computer",
    driver: "driver",
    duplex: "NOT DUPLEX",
    color: "GRAYSCALE",
    paperBucket: "до A4 включительно",
    docType: "PDF",
    isBigJob: false,
    isMultiNoDuplex: true,
    isColor: false,
    isPdfPrinter: false,
    isExcessPrint: false,
    excessCategories: [],
    excessMatches: [],
    riskScore: 35,
    riskReasons: [],
    riskReasonCodes: [],
    raw: {},
    ...overrides,
  };
}

const llmItem: PrintPersonalClassifierResponseItem = {
  id: "print-job-0",
  normalized_title: "matematika 5klass domashka",
  source: "llm",
  is_personal: true,
  primary_category: "education",
  risk_level: "high",
  confidence_raw: 0.82,
  needs_review: true,
  reason_short: "Похоже на учебный материал",
  signals: ["education"],
};

describe("enrichPrintJobsWithClassifications", () => {
  it("merges valid LLM result", () => {
    const [enriched] = enrichPrintJobsWithClassifications([job()], [llmItem]);
    expect(enriched.personalPrintClassification).toMatchObject({ source: "llm", primary_category: "education", risk_level: "high" });
  });

  it("uses rules fallback when LLM item is absent", () => {
    const [enriched] = enrichPrintJobsWithClassifications([job({ excessCategories: ["Личные тематики"] })], []);
    expect(enriched.personalPrintClassification).toMatchObject({ source: "rules_fallback", is_personal: true, primary_category: "other_personal" });
  });

  it("does not mutate original job", () => {
    const original = job();
    const [enriched] = enrichPrintJobsWithClassifications([original], [llmItem]);
    expect(original.personalPrintClassification).toBeUndefined();
    expect(enriched).not.toBe(original);
  });
});
