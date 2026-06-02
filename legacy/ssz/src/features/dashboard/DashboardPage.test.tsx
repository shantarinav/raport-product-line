import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ImportedReport } from "../import/types";
import { DashboardPage } from "./DashboardPage";

const report: ImportedReport = {
  sourceId: "current",
  sourceName: "current.xls",
  importedAt: "2026-05-22T00:00:00.000Z",
  period: { start: "2026-04-01", end: "2026-05-01", label: "2026-04-01 - 2026-05-01" },
  statuses: ["Завершен"],
  sszRecords: [
    {
      id: "1",
      sourceName: "current.xls",
      number: "0001",
      date: "2026-04-01T08:00:00",
      department: "131 Цех",
      master: "Мастер A",
      status: "Завершен",
      technologyTime: 80,
      noTechnologyTime: 20,
      operations: [
        {
          id: "op-1",
          sourceName: "current.xls",
          rowNumber: 2,
          sszNumber: "0001",
          sszDate: "2026-04-01T08:00:00",
          department: "131 Цех",
          master: "Мастер A",
          status: "Завершен",
          product: "",
          kit: "",
          semiProduct: "",
          operation: "Сборка",
          executor: "",
          technologyTime: 80,
          noTechnologyTime: 20,
        },
      ],
    },
  ],
  operationRows: [],
  warnings: [],
  errors: [],
};

describe("DashboardPage", () => {
  it("renders KPI cards and ranking widgets without period controls", () => {
    render(<DashboardPage activeReport={report} />);

    expect(screen.queryByLabelText("Основной период")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Период сравнения")).not.toBeInTheDocument();
    expect(screen.getByText("Всего ССЗ")).toBeInTheDocument();
    expect(screen.getByText("Доля работ по технологии")).toBeInTheDocument();
    expect(screen.getByText("Доля операций по технологии")).toBeInTheDocument();
    expect(screen.getByText("Заказы")).toBeInTheDocument();
    expect(screen.queryByText("Доля без технологии")).not.toBeInTheDocument();
    expect(screen.getAllByText("80,0%").length).toBeGreaterThan(0);
  });
});
