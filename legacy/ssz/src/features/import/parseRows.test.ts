import { describe, expect, it } from "vitest";
import { parseSszRows } from "./parseRows";

describe("parseSszRows", () => {
  it("parses period, hierarchy, SSZ rows, operation rows, and statuses", () => {
    const rows = [
      [],
      ["Параметры:", "", "Начало периода: 01.04.2026"],
      ["", "", "Конец периода: 01.05.2026"],
      [],
      ["Подразделение", "", "", "", "", "", "", "", "Время выполнения по технологии", "Время выполнения без технологии"],
      ["Мастер смены"],
      ["Сменно-суточное задание", "", "", "", "Статус"],
      ["Продукция", "", "", "", "Комплект", "Полуфабрикат", "Операция", "Исполнитель"],
      ["131 Цех по изготовлению арматурных блоков"],
      ["Беспятых Александр Сергеевич"],
      ["Сменно-суточное задание 00000002617 от 01.04.2026 18:05:09", "", "", "", "Завершен", "", "", "", "", "19"],
      ["206713102", "", "", "", "1", "К0764.05.00.000 Змеевик", "Зачистка", "Большаков Евгений Викторович", "", "11"],
      ["205511211", "", "", "", "2", "К0748.11.01.000 Узел", "Сборка", "Чистяков Алексей Борисович", "8", ""],
    ];

    const report = parseSszRows(rows, "sample.xls");

    expect(report.period.start).toBe("2026-04-01");
    expect(report.period.end).toBe("2026-05-01");
    expect(report.sszRecords).toHaveLength(1);
    expect(report.operationRows).toHaveLength(2);
    expect(report.statuses).toEqual(["Завершен"]);
    expect(report.sszRecords[0]).toMatchObject({
      number: "00000002617",
      department: "131 Цех по изготовлению арматурных блоков",
      master: "Беспятых Александр Сергеевич",
      status: "Завершен",
      technologyTime: 8,
      noTechnologyTime: 11,
    });
  });

  it("keeps rows with empty executor when operation and time are present", () => {
    const rows = [
      ["", "", "Начало периода: 01.04.2026"],
      ["", "", "Конец периода: 01.05.2026"],
      ["150 Цех тяжелой химической аппаратуры № 15"],
      ["Сменно-суточное задание 00000003364 от 28.04.2026 12:31:50", "", "", "", "В подготовке"],
      ["2006021", "", "", "", "1", "К0704.01.02.000 Затвор", "Очистка абразивоструйная", "", "3,9", ""],
    ];

    const report = parseSszRows(rows, "empty-executor.xls");

    expect(report.operationRows).toHaveLength(1);
    expect(report.operationRows[0].executor).toBe("");
    expect(report.operationRows[0].technologyTime).toBe(3.9);
    expect(report.warnings).toEqual([]);
  });

  it("allows reports without period and labels them as not defined", () => {
    const rows = [
      ["131 Цех"],
      ["Сменно-суточное задание 00000002617 от 01.04.2026 18:05:09", "", "", "", "Завершен"],
      ["206713102", "", "", "", "1", "К0764.05.00.000 Змеевик", "Зачистка", "Исполнитель", "", "11"],
    ];

    const report = parseSszRows(rows, "no-period.xls");

    expect(report.period.label).toBe("Не определён");
    expect(report.errors).toEqual([]);
  });

  it("returns an import error when no SSZ rows are found", () => {
    const report = parseSszRows([["Произвольный файл"], ["без ожидаемой структуры"]], "bad.xls");

    expect(report.sszRecords).toHaveLength(0);
    expect(report.errors).toContain("Не найдены строки сменно-суточных заданий.");
  });
});
