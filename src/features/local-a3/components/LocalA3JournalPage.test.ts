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
    expect(markup).toContain("Разборы хранятся в этом браузере");
    expect(markup).toContain("Резервная копия журнала");
    expect(markup).toContain("Найти разбор, исполнителя или комментарий");
    expect(markup).toContain("Все дашборды");
    expect(markup).toContain("Контроль разборов");
    expect(markup).toContain("Главный вывод");
    expect(markup).toContain("Без исполнителя");
    expect(markup).toContain("Без срока");
  });

  it("accepts a dashboard filter from the URL", () => {
    const markup = renderJournal("/a3?dashboard=ssz");

    expect(markup).toContain('<option value="ssz" selected="">ССЗ</option>');
  });
});
