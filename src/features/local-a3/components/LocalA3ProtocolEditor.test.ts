import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocalA3ProtocolEditor } from "./LocalA3ProtocolEditor";

function html() {
  return renderToStaticMarkup(
    createElement(LocalA3ProtocolEditor, {
      initialDraft: {
        dashboardType: "print",
        dashboardTitle: "Рапорт Печать",
        periodLabel: "01.06.2026 - 24.06.2026",
        deviationTitle: "Высокая доля односторонней печати",
        metricName: "Односторонняя печать",
        actualValue: "60,8%",
        targetValue: "ниже 30%",
        deviationScale: "превышение 30,8 п.п.",
        sourceFileName: "paper-cut.csv",
      },
    }),
  );
}

function compactHtml() {
  return renderToStaticMarkup(
    createElement(LocalA3ProtocolEditor, {
      variant: "compact",
      initialDraft: {
        dashboardType: "ssz",
        dashboardTitle: "ССЗ: качество оформления",
        periodLabel: "01.05.2026 - 31.05.2026",
        deviationTitle: "Доля работ по технологии ниже цели",
        metricName: "Доля работ по технологии",
        actualValue: "15,6%",
        targetValue: "70%",
        deviationScale: "отклонение: 54,4 п.п.",
        evidenceSummary: "Фильтры: цех 400 · операция Сварка\nЦех: 26 174 н-ч без технологии",
        affectedObjectType: "department",
        affectedObjectName: "400 Цех аппаратов высокого давления № 40",
      },
    }),
  );
}

describe("LocalA3ProtocolEditor", () => {
  it("renders business sections and local storage warning", () => {
    const markup = html();

    expect(markup).toContain("A3-протокол хранится в этом браузере на этом компьютере");
    expect(markup).toContain("Отклонение");
    expect(markup).toContain("Причина");
    expect(markup).toContain("Решение");
    expect(markup).toContain("Исполнение");
    expect(markup).toContain("Комментарии и история");
  });

  it("renders draft context without dashboard integration", () => {
    const markup = html();

    expect(markup).toContain("Рапорт Печать");
    expect(markup).toContain("01.06.2026 - 24.06.2026");
    expect(markup).toContain("Высокая доля односторонней печати");
    expect(markup).toContain("paper-cut.csv");
  });

  it("renders a compact dashboard editor without editable technical fields", () => {
    const markup = compactHtml();

    expect(markup).toContain("Контекст разбора");
    expect(markup).toContain("Фильтры: цех 400");
    expect(markup).toContain("Доля работ по технологии");
    expect(markup).toContain("15,6%");
    expect(markup).toContain("Что не так");
    expect(markup).toContain("Как проверим");
    expect(markup).not.toContain("Файл-источник");
    expect(markup).not.toContain("Объект: department");
    expect(markup).not.toContain("Комментарии и история");
    expect(markup).not.toContain('aria-label="Статус"');
    expect(markup).not.toContain("A3-протокол хранится в этом браузере");
  });
});
