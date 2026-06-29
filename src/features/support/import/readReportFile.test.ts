import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readSupportReportFile } from "./readReportFile";

function xlsxFile(name: string, rows: unknown[][]): File {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "ticket");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([buffer], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

describe("readSupportReportFile", () => {
  it("parses work-time support format without treating open tickets as bad data", async () => {
    const report = await readSupportReportFile(xlsxFile("support-new.xlsx", [
      ["Номер заявки", "Тема", "Дата создания", "SLA_plan", "SLA_fact", "SLA_work_time", "Приоритет", "Выполнение SLA", "Full_time"],
      ["1001", "Почта не отвечает", "24.06.2026 10:00:00", "24.06.2026 11:00:00", "24.06.2026 12:30:00", "01:30:00", "Приоритет1, 1ч.", "Превышен", "05:00:00"],
      ["1002", "Предоставить доступ", "25.06.2026 10:43:54", "25.06.2026 12:43:54", "(null)", "00:00:00", "Приоритет2, 2ч.", "В работе", "00:05:53"],
      ["1003", "TESSA", "25.06.2026 09:25:41", "25.06.2026 13:54:47", "25.06.2026 10:23:07", "00:30:00", "Приоритет3, 4ч.", "Выполнен", "04:00:00"],
    ]));

    expect(report.format).toBe("worktime");
    expect(report.quality.rows).toBe(3);
    expect(report.quality.invalidSlaFact).toBe(0);

    expect(report.tickets[0]).toMatchObject({
      format: "worktime",
      ticketNumber: "1001",
      slaStatus: "Нарушен SLA",
      sourceSlaStatus: "Превышен",
      priorityLabel: "Приоритет1, 1ч.",
      priorityLevel: 1,
      priorityHours: 1,
      calendarResolutionHours: 2.5,
      resolutionHours: 2.5,
      slaWorkHours: 1.5,
      fullTimeHours: 2.5,
      waitingHours: 1,
      workOverdueHours: 0.5,
    });
    expect(report.tickets[1]).toMatchObject({
      slaStatus: "В работе",
      sourceSlaStatus: "В работе",
      slaApplicable: false,
      slaFact: null,
    });
    expect(report.tickets[2]).toMatchObject({
      slaStatus: "В SLA",
      sourceSlaStatus: "Выполнен",
      slaWorkHours: 0.5,
      fullTimeHours: 1,
      waitingHours: 0.5,
      workOverdueHours: 0,
    });
  });

  it("keeps legacy support format based on date comparison", async () => {
    const report = await readSupportReportFile(xlsxFile("support-legacy.xlsx", [
      ["Номер заявки", "Тема", "Дата создания", "SLA_plan", "SLA_fact"],
      ["2001", "Не работает принтер", "24.06.2026 10:00:00", "24.06.2026 12:00:00", "24.06.2026 13:30:00"],
    ]));

    expect(report.format).toBe("legacy");
    expect(report.tickets[0]).toMatchObject({
      format: "legacy",
      ticketNumber: "2001",
      slaStatus: "Нарушен SLA",
      resolutionHours: 3.5,
      fullTimeHours: 3.5,
      slaWorkHours: null,
      waitingHours: null,
      sourceSlaStatus: null,
    });
  });
});
