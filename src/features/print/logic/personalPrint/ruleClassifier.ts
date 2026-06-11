import type { ExcessPrintMatch } from "./types";

export const EXCESS_CATEGORIES = ["Личные тематики", "Нормативные документы", "Служебные записки"];

const EXCESS_KEYWORDS: Array<{ category: string; label: string; pattern: RegExp }> = [
  { category: "Личные тематики", label: "книги", pattern: /учебник|пособи[ея]|повесть|рассказ|\.fb2\b|\.epub\b|\.djvu\b/iu },
  {
    category: "Личные тематики",
    label: "учебные работы",
    pattern:
      /реферат|курсов(ая|ой|ик)|диплом|дипломная|(?:^|[^а-яёa-z0-9])вкр(?:$|[^а-яёa-z0-9])|контрольная|лабораторная|эссе|практическая работа/iu,
  },
  {
    category: "Личные тематики",
    label: "праздники",
    pattern:
      /пасха|нов(?:ый|ого)\s+год|новогодн|рождество|8\s*марта|23\s*февраля|день\s+рождения|юбилей|поздравлен|открытк|валентинк|свадьб/iu,
  },
  { category: "Личные тематики", label: "хобби и быт", pattern: /рецепт|меню|вязани|выкройк|путеводител/iu },
  {
    category: "Личные тематики",
    label: "детские/школьные материалы",
    pattern: /раскраск|пропис[ьи]|домашн(?:ее|яя)\s+задани|детск(?:ий|ого|ом)?\s+сад|садик|школ[ауыое]?|олимпиад|егэ|огэ/iu,
  },
  { category: "Нормативные документы", label: "ГОСТ", pattern: /(?:^|[^а-яёa-z0-9])гост(?:\s*р)?(?:$|[^а-яёa-z0-9])/iu },
  { category: "Нормативные документы", label: "СНиП", pattern: /снип/iu },
  { category: "Нормативные документы", label: "СП", pattern: /(?:^|[^а-яёa-z0-9])сп\s*\d+(?:\.\d+)?/iu },
  { category: "Нормативные документы", label: "СанПиН", pattern: /санпин/iu },
  { category: "Нормативные документы", label: "ФНП", pattern: /(?:^|[^а-яёa-z0-9])фнп(?:$|[^а-яёa-z0-9])/iu },
  { category: "Нормативные документы", label: "РД", pattern: /(?:^|[^а-яёa-z0-9])рд\s*\d+/iu },
  { category: "Нормативные документы", label: "ПБ", pattern: /(?:^|[^а-яёa-z0-9])пб\s*\d+/iu },
  { category: "Нормативные документы", label: "НПБ", pattern: /(?:^|[^а-яёa-z0-9])нпб(?:$|[^а-яёa-z0-9])/iu },
  { category: "Нормативные документы", label: "ТР ТС", pattern: /тр\s*тс|техническ(?:ий|ого)\s+регламент/iu },
  { category: "Нормативные документы", label: "ISO/IEC", pattern: /(?:^|[^a-zа-яё0-9])(?:iso|iec)\s*\d*/iu },
  { category: "Нормативные документы", label: "стандарты", pattern: /стандарт|норматив|правила безопасности/iu },
  {
    category: "Служебные записки",
    label: "служебная записка",
    pattern: /служебн(?:ая|ой|ую|ые|ых|ым|ыми)?\s+записк|служебн(?:ая|ой|ую|ые|ых|ым|ыми)?\s+запис|служебка|сл\.?\s*записк|служ\.?\s*записк/iu,
  },
];

export function classifyExcessPrintByRules(documentName: unknown): ExcessPrintMatch[] {
  const name = String(documentName || "");
  const seen = new Set<string>();
  const matches: ExcessPrintMatch[] = [];

  EXCESS_KEYWORDS.forEach((keyword) => {
    if (!keyword.pattern.test(name)) return;
    const key = `${keyword.category}:${keyword.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    matches.push({ category: keyword.category, label: keyword.label });
  });

  return matches;
}
