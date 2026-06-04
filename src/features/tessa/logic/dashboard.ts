import type {
  AgreementFact,
  AgreementFilters,
  AgreementKpis,
  AttentionPerson,
  DeadlineMode,
  DocumentProblem,
  FilterDimension,
  FocusMode,
  NormalizedRecord,
} from "../types";

export const DEFAULT_FILTERS: AgreementFilters = {
  focusMode: "allOpen",
  deadlineMode: "all",
  documentType: "",
  contractNumber: "",
  subject: "",
  responsible: "",
  author: "",
  legalEntity: "",
};

export const DEADLINE_MODES: Array<{ value: DeadlineMode; label: string }> = [
  { value: "all", label: "Все" },
  { value: "over30", label: ">30 дн." },
  { value: "days8to30", label: "8-30 дн." },
  { value: "days1to7", label: "1-7 дн." },
  { value: "today", label: "Сегодня" },
  { value: "week", label: "7 дней" },
];

const CONTRACT_DOCUMENT_TYPES = new Set(["Договор", "Дополнительное соглашение", "Спецификация"]);
const FILTER_DIMENSIONS: FilterDimension[] = ["documentType", "contractNumber", "subject", "responsible", "author", "legalEntity"];

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
}

function groupBy<T>(items: T[], selectKey: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  items.forEach((item) => {
    const key = selectKey(item) || "Не указан";
    const group = grouped.get(key);
    if (group) {
      group.push(item);
    } else {
      grouped.set(key, [item]);
    }
  });
  return grouped;
}

function startOfLocalDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isContractDocumentRecord(record: NormalizedRecord): boolean {
  return CONTRACT_DOCUMENT_TYPES.has(record.documentType.trim());
}

export function rootContractNumber(record: NormalizedRecord): string {
  if (record.documentType === "Договор") return record.regNumber || record.contractNumber || "Без номера договора";
  return record.contractNumber || record.regNumber || "Без номера договора";
}

function documentProblemKey(record: NormalizedRecord): string {
  return `${record.contractNumber || "Без номера договора"}\u001F${record.regNumber || "Без рег. номера"}\u001F${record.documentType || "Не указан"}`;
}

export function buildAgreementFacts(records: NormalizedRecord[], analysisDate: Date): AgreementFact[] {
  const todayStart = startOfLocalDay(analysisDate);
  const tomorrowStart = addDays(todayStart, 1);
  const weekEnd = addDays(todayStart, 8);

  const facts: AgreementFact[] = records.filter(isContractDocumentRecord).map((record) => {
    const isOpen = record.completionDate === null;
    const deadline = record.deadline;
    const deadlineDay = deadline ? startOfLocalDay(deadline) : null;
    const isStuck = Boolean(isOpen && deadlineDay && deadlineDay.getTime() < todayStart.getTime());
    const isRiskToday = Boolean(
      isOpen &&
        deadlineDay &&
        deadlineDay.getTime() >= todayStart.getTime() &&
        deadlineDay.getTime() < tomorrowStart.getTime(),
    );
    const isRiskWeek = Boolean(
      isOpen &&
        deadlineDay &&
        deadlineDay.getTime() >= todayStart.getTime() &&
        deadlineDay.getTime() < weekEnd.getTime(),
    );
    const stuckDays = isStuck && deadlineDay ? Math.max(0, (todayStart.getTime() - deadlineDay.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const daysToDeadline = deadlineDay ? Math.floor((deadlineDay.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)) : null;

    return {
      record,
      isOpen,
      isStuck,
      isRiskToday,
      isRiskWeek,
      stuckDays,
      daysToDeadline,
      problemRating: 0,
      problemStuckCount: 0,
      problemMaxStuckDays: 0,
      problemHasRiskToday: false,
    };
  });

  const grouped = groupBy(facts, (fact) => documentProblemKey(fact.record));
  grouped.forEach((group) => {
    const stuckCount = group.filter((fact) => fact.isStuck).length;
    const maxStuckDays = group.reduce((max, fact) => Math.max(max, fact.stuckDays), 0);
    const hasRiskToday = group.some((fact) => fact.isRiskToday);
    const rating = Math.round(stuckCount * 10 + maxStuckDays * 2 + (hasRiskToday ? 5 : 0));
    group.forEach((fact) => {
      fact.problemRating = rating;
      fact.problemStuckCount = stuckCount;
      fact.problemMaxStuckDays = maxStuckDays;
      fact.problemHasRiskToday = hasRiskToday;
    });
  });

  return facts;
}

function matchesFocusFilter(fact: AgreementFact, focusMode: FocusMode): boolean {
  if (focusMode === "stuck") return fact.isStuck;
  if (focusMode === "riskToday") return fact.isRiskToday;
  return true;
}

function matchesDeadlineFilter(fact: AgreementFact, deadlineMode: DeadlineMode): boolean {
  if (deadlineMode === "over30") return fact.isStuck && fact.stuckDays > 30;
  if (deadlineMode === "days8to30") return fact.isStuck && fact.stuckDays >= 8 && fact.stuckDays <= 30;
  if (deadlineMode === "days1to7") return fact.isStuck && fact.stuckDays >= 1 && fact.stuckDays <= 7;
  if (deadlineMode === "today") return fact.isRiskToday;
  if (deadlineMode === "week") return fact.isRiskWeek;
  return true;
}

function matchesDimensionFilters(fact: AgreementFact, filters: AgreementFilters, except?: FilterDimension): boolean {
  const record = fact.record;
  if (except !== "documentType" && filters.documentType && record.documentType !== filters.documentType) return false;
  if (except !== "contractNumber" && filters.contractNumber && rootContractNumber(record) !== filters.contractNumber) return false;
  if (except !== "subject" && filters.subject && record.subject !== filters.subject) return false;
  if (except !== "responsible" && filters.responsible && record.responsible !== filters.responsible) return false;
  if (except !== "author" && filters.author && record.author !== filters.author) return false;
  if (except !== "legalEntity" && filters.legalEntity && record.legalEntity !== filters.legalEntity) return false;
  return true;
}

export function applyAgreementFilters(facts: AgreementFact[], filters: AgreementFilters, includeFocus = true): AgreementFact[] {
  return facts.filter((fact) => {
    if (!fact.isOpen) return false;
    if (!matchesDimensionFilters(fact, filters)) return false;
    if (includeFocus && !matchesFocusFilter(fact, filters.focusMode)) return false;
    if (!matchesDeadlineFilter(fact, filters.deadlineMode)) return false;
    return true;
  });
}

export function buildAgreementFilterOptions(facts: AgreementFact[], filters: AgreementFilters) {
  const recordsByDimension: Record<FilterDimension, NormalizedRecord[]> = {
    documentType: [],
    contractNumber: [],
    subject: [],
    responsible: [],
    author: [],
    legalEntity: [],
  };

  facts.forEach((fact) => {
    if (!fact.isOpen) return;
    if (!matchesFocusFilter(fact, filters.focusMode)) return;
    if (!matchesDeadlineFilter(fact, filters.deadlineMode)) return;

    FILTER_DIMENSIONS.forEach((dimension) => {
      if (matchesDimensionFilters(fact, filters, dimension)) {
        recordsByDimension[dimension].push(fact.record);
      }
    });
  });

  return {
    contractNumbers: uniqueSorted(recordsByDimension.contractNumber.map(rootContractNumber).filter(Boolean)),
    documentTypes: uniqueSorted(recordsByDimension.documentType.map((record) => record.documentType)),
    subjects: uniqueSorted(recordsByDimension.subject.map((record) => record.subject).filter(Boolean)),
    responsibles: uniqueSorted(recordsByDimension.responsible.map((record) => record.responsible)),
    authors: uniqueSorted(recordsByDimension.author.map((record) => record.author)),
    legalEntities: uniqueSorted(recordsByDimension.legalEntity.map((record) => record.legalEntity).filter(Boolean)),
  };
}

export function buildAttentionPeople(facts: AgreementFact[]): AttentionPerson[] {
  const grouped = groupBy(
    facts.filter((fact) => fact.isOpen),
    (fact) => fact.record.responsible,
  );
  return Array.from(grouped.entries())
    .map(([name, group]) => {
      const stuck = group.filter((fact) => fact.isStuck);
      const maxStuckDays = group.reduce((max, fact) => Math.max(max, fact.stuckDays), 0);
      const riskToday = group.filter((fact) => fact.isRiskToday).length;
      const stuckRate = group.length === 0 ? 0 : (stuck.length / group.length) * 100;
      return {
        name,
        open: group.length,
        stuck: stuck.length,
        riskToday,
        maxStuckDays,
        attentionScore: Math.round(stuck.length * 10 + maxStuckDays * 1.5 + riskToday * 5 + stuckRate),
        stuckRate,
      };
    })
    .filter((person) => person.stuck > 0)
    .sort((a, b) => b.attentionScore - a.attentionScore || b.stuck - a.stuck || b.riskToday - a.riskToday || b.open - a.open);
}

export function calculateAgreementKpis(facts: AgreementFact[]): AgreementKpis {
  const openFacts = facts.filter((fact) => fact.isOpen);
  const stuckFacts = openFacts.filter((fact) => fact.isStuck);
  const riskFacts = openFacts.filter((fact) => fact.isRiskToday);
  const riskWeekFacts = openFacts.filter((fact) => fact.isRiskWeek);
  const criticalFacts = stuckFacts.filter((fact) => fact.stuckDays > 30);
  return {
    open: openFacts.length,
    stuck: stuckFacts.length,
    riskToday: riskFacts.length,
    riskWeek: riskWeekFacts.length,
    criticalOver30: criticalFacts.length,
    maxStuckDays: stuckFacts.reduce((max, fact) => Math.max(max, fact.stuckDays), 0),
    stuckRate: openFacts.length === 0 ? 0 : (stuckFacts.length / openFacts.length) * 100,
    attentionPeople: buildAttentionPeople(facts).length,
  };
}

function calculateAgreementKpisWithAttention(facts: AgreementFact[], attentionPeopleCount: number): AgreementKpis {
  let open = 0;
  let stuck = 0;
  let riskToday = 0;
  let riskWeek = 0;
  let criticalOver30 = 0;
  let maxStuckDays = 0;

  facts.forEach((fact) => {
    if (!fact.isOpen) return;
    open += 1;
    if (fact.isRiskToday) riskToday += 1;
    if (fact.isRiskWeek) riskWeek += 1;
    if (!fact.isStuck) return;
    stuck += 1;
    if (fact.stuckDays > 30) criticalOver30 += 1;
    maxStuckDays = Math.max(maxStuckDays, fact.stuckDays);
  });

  return {
    open,
    stuck,
    riskToday,
    riskWeek,
    criticalOver30,
    maxStuckDays,
    stuckRate: open === 0 ? 0 : (stuck / open) * 100,
    attentionPeople: attentionPeopleCount,
  };
}

function buildDeadlineCounts(facts: AgreementFact[], filters: AgreementFilters): Record<DeadlineMode, number> {
  const counts: Record<DeadlineMode, number> = {
    all: 0,
    over30: 0,
    days8to30: 0,
    days1to7: 0,
    today: 0,
    week: 0,
  };

  facts.forEach((fact) => {
    if (!fact.isOpen) return;
    if (!matchesDimensionFilters(fact, filters)) return;

    counts.all += 1;
    if (matchesDeadlineFilter(fact, "over30")) counts.over30 += 1;
    if (matchesDeadlineFilter(fact, "days8to30")) counts.days8to30 += 1;
    if (matchesDeadlineFilter(fact, "days1to7")) counts.days1to7 += 1;
    if (matchesDeadlineFilter(fact, "today")) counts.today += 1;
    if (matchesDeadlineFilter(fact, "week")) counts.week += 1;
  });

  return counts;
}

export function calculateTessaDashboardAnalytics(facts: AgreementFact[], filters: AgreementFilters) {
  const contextFacts = applyAgreementFilters(facts, filters, false);
  const filteredFacts = applyAgreementFilters(facts, filters);
  const options = buildAgreementFilterOptions(facts, filters);
  const deadlineCounts = buildDeadlineCounts(facts, filters);
  const attentionPeople = buildAttentionPeople(contextFacts);
  const kpis = calculateAgreementKpisWithAttention(contextFacts, attentionPeople.length);
  const documentProblems = buildDocumentProblems(filteredFacts);

  return {
    contextFacts,
    filteredFacts,
    options,
    deadlineCounts,
    kpis,
    attentionPeople,
    documentProblems,
  };
}

export function buildDocumentProblems(facts: AgreementFact[]): DocumentProblem[] {
  const grouped = groupBy(facts, (fact) => documentProblemKey(fact.record));
  return Array.from(grouped.entries())
    .map(([key, group]) => {
      const first = group[0]?.record;
      const fallbackRecord = group[0]?.record;
      if (!first || !fallbackRecord) {
        return {
          key,
          contractNumber: "Без номера договора",
          rootContractNumber: "Без номера договора",
          regNumber: "не указан",
          documentType: "Не указан",
          subject: "не указан",
          authors: "",
          responsibles: "",
          records: [],
          stuckCount: 0,
          riskTodayCount: 0,
          maxStuckDays: 0,
          rating: 0,
        };
      }
      const stuckCount = group.filter((fact) => fact.isStuck).length;
      const riskTodayCount = group.filter((fact) => fact.isRiskToday).length;
      const maxStuckDays = group.reduce((max, fact) => Math.max(max, fact.stuckDays), 0);
      const rating = group.reduce((max, fact) => Math.max(max, fact.problemRating), 0);
      return {
        key,
        contractNumber: first.contractNumber || "Без номера договора",
        rootContractNumber: rootContractNumber(first),
        regNumber: first.regNumber || "не указан",
        documentType: first.documentType,
        subject: first.subject || "не указан",
        authors: uniqueSorted(group.map((fact) => fact.record.author)).join(", "),
        responsibles: uniqueSorted(group.map((fact) => fact.record.responsible)).join(", "),
        records: group.map((fact) => fact.record),
        stuckCount,
        riskTodayCount,
        maxStuckDays,
        rating,
      };
    })
    .sort((a, b) => b.rating - a.rating || b.maxStuckDays - a.maxStuckDays || a.contractNumber.localeCompare(b.contractNumber));
}

export function registryTitle(mode: FocusMode): string {
  if (mode === "riskToday") return "Договорные согласования, которые истекают сегодня";
  if (mode === "allOpen") return "Все договорные согласования в работе";
  return "Просроченные договорные согласования";
}

export function getDocumentDatePeriod(records: NormalizedRecord[]): { from: Date; to: Date } | null {
  const timestamps = records
    .map((record) => record.documentDate?.getTime())
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (timestamps.length === 0) return null;
  return { from: new Date(Math.min(...timestamps)), to: new Date(Math.max(...timestamps)) };
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: value % 1 === 0 ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${formatNumber(value, 1)}%`;
}

export function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function formatShortDateTime(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function declineAgreement(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "застрявшее согласование";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "застрявших согласования";
  return "застрявших согласований";
}

export function declineRisk(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "риск";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "риска";
  return "рисков";
}

export function toExportCsv(records: NormalizedRecord[]): string {
  const headers = [
    "Процесс",
    "Рег. номер",
    "Тип документа",
    "Дата",
    "Автор",
    "Тема",
    "Текст задания",
    "Ответственный",
    "Срок",
    "Новый срок",
    "Дата завершения",
    "Статус",
    "Просрочка в днях",
    "Комментарий",
  ];

  const escape = (value: string) => {
    if (/[;"\n\r]/.test(value)) return `"${value.replace(/"/g, "\"\"")}"`;
    return value;
  };

  const lines = [
    headers.map(escape).join(";"),
    ...records.map((record) =>
      [
        record.process,
        record.regNumber,
        record.documentType,
        formatDateTime(record.documentDate),
        record.author,
        record.subject,
        record.taskText,
        record.responsible,
        formatDateTime(record.deadline),
        formatDateTime(record.newDeadline),
        formatDateTime(record.completionDate),
        record.status,
        formatNumber(record.overdueDays, 2),
        record.comment,
      ]
        .map((cell) => escape(cell))
        .join(";"),
    ),
  ];

  return `\uFEFF${lines.join("\n")}`;
}
