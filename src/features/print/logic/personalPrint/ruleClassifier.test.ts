import { describe, expect, it } from "vitest";
import { classifyExcessPrintByRules } from "./ruleClassifier";

function personalLabels(documentName: string): string[] {
  return classifyExcessPrintByRules(documentName)
    .filter((match) => match.category === "Личные тематики")
    .map((match) => match.label);
}

describe("classifyExcessPrintByRules", () => {
  it.each([
    ["роман фэнтези.mobi", "книги"],
    ["детектив манга.azw3", "книги"],
    ["альманах современной прозы.pdf", "книги"],
    ["автореферат диссертации.docx", "учебные работы"],
    ["шпаргалка практикум семинар.docx", "учебные работы"],
    ["конспект лекции по математике.pdf", "учебные работы"],
    ["сочинение и семестровая работа.docx", "учебные работы"],
    ["сценарий крестины годовщина торжество.pdf", "праздники"],
    ["9 мая день победы открытка.pdf", "праздники"],
    ["йога фитнес тренировка.docx", "хобби и быт"],
    ["гороскоп астрология анекдот.pdf", "хобби и быт"],
    ["ноты аккорды для гитары.pdf", "хобби и быт"],
    ["ремонт дача рассада рыбалка охота.pdf", "хобби и быт"],
    ["путешествия билеты на тур.pdf", "хобби и быт"],
    ["гдз решебник впр.pdf", "детские/школьные материалы"],
    ["поделка аппликация ребус.docx", "детские/школьные материалы"],
    ["родительское собрание кружок секция выпускной грамота.pdf", "детские/школьные материалы"],
  ])("marks %s as %s", (documentName, label) => {
    expect(personalLabels(documentName)).toContain(label);
  });

  it.each([
    "журнал регистрации инструктажа.xlsx",
    "том 2 проектной документации.pdf",
    "служебный доклад.xlsx",
    "НИР по договору.docx",
    "корпоративная памятка.docx",
    "собрание комиссии.pdf",
    "Сдача ОТК 1123,1124,1125.xls",
    "Соглашение о передаче прав и обязанностеи? АЛРОСА-РГИ-УХМ.pdf",
  ])(
    "does not add personal topic for excluded keyword %s",
    (documentName) => {
      expect(personalLabels(documentName)).toEqual([]);
    },
  );
});
