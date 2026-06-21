import { describe, expect, it } from "vitest";
import { normalizeDocumentTitle } from "./normalizeDocumentTitle";

describe("normalizeDocumentTitle", () => {
  it.each([
    ["Matematika_5klass_domashka_FINAL.pdf", "matematika 5klass domashka"],
    ["scan_001.pdf", "scan"],
    ["Рецепт_торта_на_ДР.docx", "рецепт торта на др"],
    ["Ivanova_zayavlenie_v2.pdf", "ivanova zayavlenie"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeDocumentTitle(input)).toBe(expected);
  });

  it("splits simple camelCase", () => {
    expect(normalizeDocumentTitle("TravelTicketsFinalCopy.pdf")).toBe("travel tickets");
  });

  it("keeps meaningful translit tokens", () => {
    expect(normalizeDocumentTitle("school_klass_recept_spravka.pdf")).toBe("school klass recept spravka");
  });
});
