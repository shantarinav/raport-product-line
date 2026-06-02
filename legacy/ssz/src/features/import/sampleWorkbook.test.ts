import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readWorkbookFile } from "./readWorkbook";

describe("sample SSZ workbook", () => {
  it("imports the project XLS sample", async () => {
    const filePath = resolve("Статистика по качеству выдаваемых ССЗ апрель накопительным итогом 2026.xls");
    const buffer = readFileSync(filePath);
    const file = new File([buffer], "Статистика по качеству выдаваемых ССЗ апрель накопительным итогом 2026.xls", {
      type: "application/vnd.ms-excel",
    });

    const report = await readWorkbookFile(file);

    expect(report.errors).toEqual([]);
    expect(report.period.label).toBe("2026-04-01 - 2026-05-01");
    expect(report.sszRecords.length).toBeGreaterThanOrEqual(850);
    expect(report.sszRecords.length).toBeLessThanOrEqual(880);
    expect(report.operationRows.length).toBeGreaterThanOrEqual(22000);
    expect(report.statuses).toEqual(["В подготовке", "Завершен", "Утвержден"]);
  });
});
