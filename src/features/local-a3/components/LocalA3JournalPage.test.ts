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
    expect(markup).toContain("A3-протоколы хранятся в этом браузере на этом компьютере");
    expect(markup).toContain("Экспорт журнала");
    expect(markup).toContain("Импорт JSON");
    expect(markup).toContain("Поиск по разбору");
    expect(markup).toContain("Все дашборды");
    expect(markup).toContain("Журнал A3");
  });

  it("accepts a dashboard filter from the URL", () => {
    const markup = renderJournal("/a3?dashboard=ssz");

    expect(markup).toContain('<option value="ssz" selected="">ССЗ</option>');
  });
});
