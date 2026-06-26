import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../theme/ThemeProvider";
import { LocalA3JournalPage } from "./LocalA3JournalPage";

function renderJournal(initialEntry = "/a3") {
  return renderToStaticMarkup(
    createElement(
      ThemeProvider,
      null,
      createElement(MemoryRouter, { initialEntries: [initialEntry] }, createElement(LocalA3JournalPage)),
    ),
  );
}

describe("LocalA3JournalPage", () => {
  it("renders journal controls and local storage warning", () => {
    const markup = renderJournal();

    expect(markup).toContain("Разборы отклонений");
    expect(markup).toContain("Excel докладывает главное");
    expect(markup).toContain("хранится в этом браузере");
    expect(markup).toContain("Загрузить отчет");
    expect(markup).toContain("Резервная копия журнала");
    expect(markup).toContain("Найти разбор или исполнителя");
    expect(markup).toContain("Дашборд: Все");
    expect(markup).toContain("Требуют внимания");
    expect(markup).toContain("Сортировка: По приоритету");
    expect(markup).toContain("Журнал разборов");
    expect(markup).toContain("Журнал разборов · 0");
    expect(markup).toContain("Сначала показываются разборы, где нужен контроль");
    expect(markup).toContain("Загрузите отчет, откройте дашборд");
    expect(markup).not.toContain("Новый разбор");
  });

  it("accepts a dashboard filter from the URL", () => {
    const markup = renderJournal("/a3?dashboard=ssz");

    expect(markup).toContain('<option value="ssz" selected="">Дашборд: ССЗ</option>');
  });
});
