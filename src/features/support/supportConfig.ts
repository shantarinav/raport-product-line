export const SUPPORT_REQUIRED_COLUMNS = ["№", "Тема", "Дата создания", "SLA_plan", "SLA_fact"] as const;

export const SUPPORT_MAX_PARSE_ROWS = 20_000;

export const SUPPORT_PLAN_BUCKETS = [
  { value: "1 час", maxHours: 1 },
  { value: "2 часа", maxHours: 2 },
  { value: "4 часа", maxHours: 4 },
  { value: "8 часов", maxHours: 8 },
  { value: "1 рабочий день", maxHours: 24 },
  { value: "2-3 дня", maxHours: 72 },
  { value: "4+ дня", maxHours: Number.POSITIVE_INFINITY },
] as const;

export const SUPPORT_OVERDUE_BUCKETS = [
  { value: "В срок", maxHours: 0 },
  { value: "до 1 часа", maxHours: 1 },
  { value: "1-4 часа", maxHours: 4 },
  { value: "4-24 часа", maxHours: 24 },
  { value: "1-3 дня", maxHours: 72 },
  { value: "3+ дня", maxHours: Number.POSITIVE_INFINITY },
] as const;

export const SUPPORT_CATEGORY_ORDER = [
  "Почта / Outlook",
  "Доступы / пароли / учетные записи",
  "АРМ / ПК / ПО",
  "1С / учетные системы",
  "Печать / принтеры",
  "Сеть / удаленный доступ",
  "Прочее / нужен классификатор",
] as const;

export const SUPPORT_SLA_STATUSES = ["В SLA", "Нарушен SLA", "Нет SLA_plan", "Нет SLA_fact"] as const;

export const SUPPORT_THRESHOLDS = {
  healthySlaPercent: 95,
  controlSlaPercent: 80,
  heavyTailMultiplier: 2,
  heavyTailMinGapHours: 8,
  extremeOverdueHours: 72,
} as const;
