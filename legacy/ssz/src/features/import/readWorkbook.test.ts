import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readWorkbookFile } from "./readWorkbook";

describe("readWorkbookFile", () => {
  it("reads the first worksheet and returns a parsed report", async () => {
    const workbook = XLSX.utils.book_new();
    const rows = [
      ["", "", "Начало периода: 01.04.2026"],
      ["", "", "Конец периода: 01.05.2026"],
      ["131 Цех по изготовлению арматурных блоков"],
      ["Сменно-суточное задание 00000002617 от 01.04.2026 18:05:09", "", "", "", "Завершен"],
      ["206713102", "", "", "", "1", "К0764.05.00.000 Змеевик", "Зачистка", "Исполнитель", "", "11"],
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "TDSheet");
    const array = XLSX.write(workbook, { type: "array", bookType: "xls" });
    const file = new File([array], "quality.xls", { type: "application/vnd.ms-excel" });

    const report = await readWorkbookFile(file);

    expect(report.sourceName).toBe("quality.xls");
    expect(report.period.label).toBe("2026-04-01 - 2026-05-01");
    expect(report.sszRecords).toHaveLength(1);
  });
});
