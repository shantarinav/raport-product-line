import { describe, expect, it } from "vitest";
import type { PrintJob } from "../../types";
import { buildPrintPersonalClassifierRequestItems, selectPrintLlmCandidateRequestItems } from "./requestBuilder";

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
    raw: { Пользователь: "secret.user", Компьютер: "secret-computer", Принтер: "secret-printer", Дата: "2026-06-01" },
    ...overrides,
  };
}

describe("buildPrintPersonalClassifierRequestItems", () => {
  it("contains only safe request fields", () => {
    const [item] = buildPrintPersonalClassifierRequestItems([job()]);
    expect(item).toEqual({
      id: "print-job-0",
      document_title: "Matematika_5klass_domashka.pdf",
      pages: 2,
      color: false,
      duplex: false,
      paper_size: "до A4 включительно",
    });
    const serialized = JSON.stringify(item);
    expect(serialized).not.toContain("secret.user");
    expect(serialized).not.toContain("secret-computer");
    expect(serialized).not.toContain("secret-printer");
    expect(serialized).not.toContain("secret-driver");
    expect(serialized).not.toContain("2026-06-01");
  });

  it("keeps source-row ids when selecting candidates", () => {
    const items = selectPrintLlmCandidateRequestItems([
      job({ documentName: "", riskScore: 0, isMultiNoDuplex: false, isExcessPrint: false, excessCategories: [] }),
      job({ documentName: "school_homework.pdf", riskScore: 65 }),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("print-job-1");
  });
});
