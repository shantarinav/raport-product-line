import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ImportPanel } from "./ImportPanel";
import type { ImportedReport } from "./types";

const report: ImportedReport = {
  sourceId: "source-1",
  sourceName: "quality.xls",
  importedAt: "2026-05-22T00:00:00.000Z",
  period: { start: "2026-04-01", end: "2026-05-01", label: "2026-04-01 - 2026-05-01" },
  statuses: ["Завершен"],
  sszRecords: [],
  operationRows: [],
  warnings: [{ rowNumber: 10, message: "Строка операции пропущена: не найден контекст ССЗ." }],
  errors: [],
};

describe("ImportPanel", () => {
  it("shows loaded report summaries", () => {
    render(
      <ImportPanel
        report={report}
        onFileSelected={vi.fn()}
        importError=""
      />,
    );

    expect(screen.getByText("quality.xls")).toBeInTheDocument();
    expect(screen.queryByText("Период данных")).not.toBeInTheDocument();
    expect(screen.queryByText("01.04.2026 - 01.05.2026")).not.toBeInTheDocument();
    expect(screen.getByText(/1 предупрежд/)).toBeInTheDocument();
  });

  it("passes selected files to the caller", async () => {
    const onFileSelected = vi.fn();
    const user = userEvent.setup();
    render(
      <ImportPanel
        report={null}
        onFileSelected={onFileSelected}
        importError=""
      />,
    );
    const file = new File(["content"], "quality.xls", { type: "application/vnd.ms-excel" });

    await user.upload(screen.getByLabelText("Загрузить XLS"), file);

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("passes dropped files to the caller", () => {
    const onFileSelected = vi.fn();
    render(
      <ImportPanel
        report={null}
        onFileSelected={onFileSelected}
        importError=""
      />,
    );
    const file = new File(["content"], "quality.xls", { type: "application/vnd.ms-excel" });

    fireEvent.drop(screen.getByLabelText("Импорт XLS"), {
      dataTransfer: {
        files: {
          item: () => file,
          length: 1,
          0: file,
        },
      },
    });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("does not expose comparison or duplicate actions", () => {
    render(
      <ImportPanel
        report={report}
        importError=""
        onFileSelected={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Оставить оба" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Заменить период" })).not.toBeInTheDocument();
  });
});
