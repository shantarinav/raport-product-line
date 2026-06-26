import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { LocalA3DraftInput } from "../localA3Commands";
import type { DashboardDeviation } from "../dashboardDeviation";
import { A3ReviewButton } from "./A3ReviewButton";

const deviation: DashboardDeviation = {
  id: "print-main-deviation",
  dashboardType: "print",
  dashboardTitle: "Печать: контроль печати",
  periodLabel: "01.06.2026 - 24.06.2026",
  deviationTitle: "Печать с отклонениями требует разбора",
  metricName: "Страниц с отклонениями",
  actualValue: "62%",
};

describe("A3ReviewButton", () => {
  it("renders the shared A3 review action", () => {
    const html = renderToStaticMarkup(<A3ReviewButton deviation={deviation} onCreateDraft={() => undefined} />);

    expect(html).toContain("Разобрать");
    expect(html).toContain("Создать A3-разбор по этому отклонению");
  });

  it("creates a draft from the provided deviation on click", () => {
    let receivedDraft: LocalA3DraftInput | null = null;
    const onCreateDraft = vi.fn((draft: LocalA3DraftInput) => {
      receivedDraft = draft;
    });
    A3ReviewButton({ deviation, onCreateDraft }).props.onClick();

    expect(onCreateDraft).toHaveBeenCalledTimes(1);
    expect(receivedDraft).toMatchObject({
      dashboardType: "print",
      dashboardTitle: "Печать: контроль печати",
      deviationTitle: "Печать с отклонениями требует разбора",
      metricName: "Страниц с отклонениями",
      actualValue: "62%",
    });
  });
});
