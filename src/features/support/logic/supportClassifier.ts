import { SUPPORT_CATEGORY_ORDER } from "../supportConfig";
import type { SupportCategory } from "../supportTypes";

const CATEGORY_KEYWORDS: Array<{ category: SupportCategory; keywords: string[] }> = [
  {
    category: "Почта / Outlook",
    keywords: ["почта", "outlook", "письмо", "ящик", "рассылка", "эл.почта", "email", "e-mail"],
  },
  {
    category: "Доступы / пароли / учетные записи",
    keywords: ["пароль", "доступ", "учетн", "учётн", "заблокирован", "разблокировать", "пользователь", "права", "логин"],
  },
  {
    category: "АРМ / ПК / ПО",
    keywords: ["пк", "компьютер", "ноутбук", "арм", "монитор", "мышь", "клавиатура", "программа", "по", "установка", "не работает пк"],
  },
  {
    category: "1С / учетные системы",
    keywords: ["1с", "упп", "зуп", "бухгалтерия", "учет", "учёт"],
  },
  {
    category: "Печать / принтеры",
    keywords: ["печать", "принтер", "мфу", "сканер", "картридж"],
  },
  {
    category: "Сеть / удаленный доступ",
    keywords: ["сеть", "vpn", "удаленно", "удалённо", "rdp", "терминал", "подключиться", "интернет"],
  },
];

function normalizeTopic(value: string) {
  return value.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

export function classifySupportTopic(topic: string): SupportCategory {
  const normalized = normalizeTopic(topic);
  const matched = CATEGORY_KEYWORDS.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(normalizeTopic(keyword))),
  );

  return matched?.category ?? SUPPORT_CATEGORY_ORDER[SUPPORT_CATEGORY_ORDER.length - 1];
}
