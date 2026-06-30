import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLocalA3ProtocolDraft } from "../localA3Commands";
import {
  A3AssistFieldButton,
  LocalA3ProtocolEditor,
  formatA3AssistWaitingMessage,
  shouldDisableA3AssistButton,
} from "./LocalA3ProtocolEditor";

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

function qualityWarningHtml() {
  const protocol = createLocalA3ProtocolDraft({
    dashboardType: "support",
    dashboardTitle: "Техподдержка",
    periodLabel: "18.06.2026 - 25.06.2026",
    deviationTitle: "SLA ниже цели контроля",
    metricName: "SLA выполнен",
    actualValue: "76,7%",
    targetValue: "80%",
  });
  protocol.form = {
    ...protocol.form,
    problem: "SLA ниже цели контроля",
    cause: "SLA ниже цели контроля",
    solution: "Усилить контроль",
    expectedResult: "Улучшить ситуацию",
    checkCriteria: "Проверить потом",
    owner: "Иванов",
    dueDate: "2026-07-01",
  };

  return renderToStaticMarkup(createElement(LocalA3ProtocolEditor, { initialProtocol: protocol }));
}

describe("LocalA3ProtocolEditor", () => {
  it("renders business sections without a duplicated local storage warning", () => {
    const markup = html();

    expect(markup).toContain("Основание разбора");
    expect(markup).not.toContain("Паспорт отклонения");
    expect(markup).toContain("Причина");
    expect(markup).toContain("Решение");
    expect(markup).toContain("Исполнение");
    expect(markup).toContain("История изменений");
    expect(markup).toContain("История изменений ·");
    expect(markup).not.toContain("Служебная фиксация создания");
    expect(markup).not.toContain("Обсуждение");
    expect(markup).not.toContain("Комментарий");
    expect(markup).not.toContain("Добавить");
    expect(markup).not.toContain("Комментарии и история");
    expect(markup).not.toContain("A3-протокол хранится в этом браузере на этом компьютере");
  });

  it("renders draft context without dashboard integration", () => {
    const markup = html();

    expect(markup).toContain("Рапорт Печать");
    expect(markup).toContain("01.06.2026 - 24.06.2026");
    expect(markup).toContain("Высокая доля односторонней печати");
    expect(markup).toContain("paper-cut.csv");
    expect(markup).not.toContain("rounded-full border border-raport-border bg-raport-surface-soft px-2 py-1");
  });

  it("renders a compact dashboard editor without editable technical fields", () => {
    const markup = compactHtml();

    expect(markup).toContain("Основание разбора");
    expect(markup).not.toContain("Паспорт отклонения");
    expect(markup).toContain("Фильтры: цех 400");
    expect(markup).toContain("Доля работ по технологии");
    expect(markup).toContain("15,6%");
    expect(markup).toContain("1. Проблема");
    expect(markup).toContain("2. Причина");
    expect(markup).toContain("3. Действие");
    expect(markup).toContain("4. Результат");
    expect(markup).toContain("5. Проверка");
    expect(markup).toContain("Доля работ по технологии ниже цели · факт 15,6% · цель 70% · отклонение: 54,4 п.п.");
    expect(markup).toContain("Изменения не сохранены.");
    expect(markup).not.toContain("Есть несохраненные изменения");
    expect(markup).not.toContain("Можно сохранить");
    expect(markup).not.toContain("Проверьте подсказки у полей");
    expect(markup).toContain("Показать детали");
    expect(markup).not.toContain("Заполнено 2 из 5 шагов");
    expect(markup).not.toContain("Проблема: заполнено");
    expect(markup).not.toContain("Файл-источник");
    expect(markup).not.toContain("Объект: department");
    expect(markup).not.toContain("Комментарии и история");
    expect(markup).not.toContain('aria-label="Статус"');
    expect(markup).not.toContain("<select");
    expect(markup).not.toContain("A3-протокол хранится в этом браузере");
  });

  it("uses a native date picker in the compact editor", () => {
    const markup = compactHtml();

    expect(markup).toContain('type="date"');
    expect(markup).not.toContain('placeholder="дд.мм.гггг"');
  });

  it("shows field hints and non-blocking quality recommendations", () => {
    const markup = qualityWarningHtml();

    expect(markup).toContain("Что отклонилось от цели, без объяснения причин.");
    expect(markup).toContain("Лучше гипотеза, чем пересказ факта.");
    expect(markup).not.toContain("Есть 4 рекомендации по качеству.");
    expect(markup).toContain("Можно уточнить: причина повторяет проблему.");
    expect(markup).toContain("Можно уточнить: действие слишком общее.");
    expect(markup).toContain("Можно уточнить: результат без измеримого признака.");
    expect(markup).toContain("Можно уточнить: проверка без срока или отчета.");
    expect(markup).toContain("Исправьте формулировку вручную.");
    expect(markup).not.toContain("Исправьте вручную или используйте ИИ.");
  });

  it("renders field quality hints below textarea controls", () => {
    const markup = qualityWarningHtml();
    const causeTextareaIndex = markup.indexOf('id="a3-cause"');
    const causeHintIndex = markup.indexOf("Можно уточнить: причина повторяет проблему.");
    const expectedTextareaIndex = markup.indexOf('id="a3-expected"');
    const expectedHintIndex = markup.indexOf("Можно уточнить: результат без измеримого признака.");

    expect(causeTextareaIndex).toBeGreaterThan(-1);
    expect(causeHintIndex).toBeGreaterThan(causeTextareaIndex);
    expect(expectedTextareaIndex).toBeGreaterThan(-1);
    expect(expectedHintIndex).toBeGreaterThan(expectedTextareaIndex);
  });

  it("formats field-specific AI waiting messages", () => {
    expect(formatA3AssistWaitingMessage("cause", 0)).toBe("Готовятся гипотезы причин...");
    expect(formatA3AssistWaitingMessage("solution", 0, "действие слишком общее")).toBe("Уточняется действие...");
    expect(formatA3AssistWaitingMessage("expectedResult", 10)).toBe("Модель отвечает дольше обычного. Можно продолжать заполнять A3.");
    expect(formatA3AssistWaitingMessage("checkCriteria", 60)).toBe("Ответ всё ещё готовится. Проверьте сервис ИИ/Ollama, если это повторяется.");
  });

  it("disables every AI field button while one field is waiting for the model", () => {
    expect(shouldDisableA3AssistButton("cause", null)).toBe(false);
    expect(shouldDisableA3AssistButton("cause", "cause")).toBe(true);
    expect(shouldDisableA3AssistButton("expectedResult", "cause")).toBe(true);
  });

  it("renders AI assist as a visible secondary text action", () => {
    const markup = renderToStaticMarkup(
      createElement(A3AssistFieldButton, {
        title: "Предложить гипотезы причин",
        onRequest: () => undefined,
      }),
    );

    expect(markup).toContain("ИИ");
    expect(markup).toContain('aria-label="Предложить гипотезы причин"');
    expect(markup).toContain("bg-transparent");
    expect(markup).not.toContain("sr-only");
  });

  it("does not render redundant successful AI helper messages", () => {
    const markup = compactHtml();

    expect(markup).not.toContain("Проверьте и вставьте, если подходит.");
    expect(markup).not.toContain("Вставлено. Проверьте формулировку.");
  });
});
