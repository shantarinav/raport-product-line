import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Download, Info, MessageSquare, MoreHorizontal, Pencil, Plus, RefreshCcw, Upload, X } from "lucide-react";
import { DashboardHeader, ErrorState, MetricCard, PageShell, SectionCard } from "../../../shared/ui";
import { Alert, AlertDescription, AlertTitle } from "../../../shared/ui/shadcn/alert";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { Button } from "../../../shared/ui/shadcn/button";
import { Input } from "../../../shared/ui/shadcn/input";
import { Select } from "../../../shared/ui/shadcn/select";
import {
  addLocalA3Comment,
  changeLocalA3DueDate,
  changeLocalA3Owner,
  changeLocalA3Status,
  createLocalA3ProtocolDraft,
  type LocalA3SaveResult,
} from "../localA3Commands";
import {
  exportLocalA3JournalArchiveJson,
  exportLocalA3ProtocolArchiveJson,
  filterAndSortLocalA3JournalItems,
  importLocalA3JournalJsonSafely,
  isLocalA3Overdue,
  loadLocalA3JournalItems,
  type LocalA3JournalFilters,
  type LocalA3JournalItem,
  type LocalA3SortDirection,
  type LocalA3SortKey,
  type LocalA3StatusFilter,
} from "../localA3Journal";
import { localA3Repository, type LocalA3Repository } from "../localA3Repository";
import { LOCAL_A3_DASHBOARD_TYPES, type LocalA3DashboardType, type LocalA3Protocol, type LocalA3Status } from "../localA3Types";
import { LOCAL_A3_DASHBOARD_LABEL, LOCAL_A3_STATUS_BADGE_VARIANT, LOCAL_A3_STATUS_FILTER_LABEL, LOCAL_A3_STATUS_LABEL } from "../localA3Ui";
import { LocalA3ProtocolEditor } from "./LocalA3ProtocolEditor";

const STATUS_FILTERS: LocalA3StatusFilter[] = ["all", "open", "in_progress", "waiting_review", "closed", "cancelled"];
const DASHBOARD_FILTERS = ["all", ...LOCAL_A3_DASHBOARD_TYPES] as const;
type LocalA3DashboardFilter = (typeof DASHBOARD_FILTERS)[number];

const SORT_OPTIONS: Array<{ key: LocalA3SortKey; direction: LocalA3SortDirection; label: string }> = [
  { key: "updatedAt", direction: "desc", label: "Сначала обновленные" },
  { key: "dueDate", direction: "asc", label: "Сначала ближайший срок" },
  { key: "status", direction: "asc", label: "По статусу" },
  { key: "dashboardType", direction: "asc", label: "По дашборду" },
];

function formatDate(value?: string): string {
  if (!value) return "без срока";
  return new Intl.DateTimeFormat("ru-RU").format(new Date(`${value}T00:00:00.000Z`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function downloadJson(fileName: string, json: string) {
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function parseDashboardFilter(value: string | null): LocalA3DashboardFilter {
  if (value && (LOCAL_A3_DASHBOARD_TYPES as readonly string[]).includes(value)) return value as LocalA3DashboardType;
  return "all";
}

function formatActionErrors(result: LocalA3SaveResult): string | null {
  if (result.success) return null;
  return result.errors.map((error) => error.message).join("; ");
}

function assertActionResult(result: LocalA3SaveResult): void {
  const message = formatActionErrors(result);
  if (message) throw new Error(message);
}

const ACTIVE_STATUSES: LocalA3Status[] = ["open", "in_progress", "waiting_review"];

function getNearestDueDate(items: LocalA3JournalItem[]): string | null {
  const dueDates = items
    .filter((item) => ACTIVE_STATUSES.includes(item.protocol.status) && item.protocol.form.dueDate)
    .map((item) => item.protocol.form.dueDate as string)
    .sort((left, right) => left.localeCompare(right));
  return dueDates[0] ?? null;
}


function compactText(value: string, maxLength = 140): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function lowerFirst(value: string): string {
  return value ? `${value[0].toLocaleLowerCase("ru-RU")}${value.slice(1)}` : value;
}

function simplifyDeviationTitle(title: string): string {
  if (/доля работ по технологии ниже цели/i.test(title)) return "технология ниже цели";
  return lowerFirst(title);
}

const AFFECTED_OBJECT_LABEL: Record<string, string> = {
  department: "Цех",
  operation: "Операция",
  order: "Заказ",
  master: "Мастер",
  user: "Пользователь",
  category: "Категория",
};

function extractAffectedObject(context?: string): { typeLabel: string; name: string } | null {
  if (!context) return null;
  const objectLine = context.split(/\r?\n/).find((line) => line.trim().startsWith("Объект:"));
  if (!objectLine) return null;
  const value = objectLine.replace(/^Объект:\s*/, "").trim();
  const separator = value.includes(" — ") ? " — " : " - ";
  const [rawType = "", ...nameParts] = value.split(separator);
  const name = nameParts.join(separator).trim();
  if (!name) return null;
  return { typeLabel: AFFECTED_OBJECT_LABEL[rawType.trim()] ?? (rawType.trim() || "Объект"), name };
}

function buildProtocolTitle(protocol: LocalA3Protocol): string {
  const affectedObject = extractAffectedObject(protocol.deviation.context);
  if (!affectedObject) return protocol.deviation.title;
  return compactText(`${affectedObject.typeLabel} ${affectedObject.name}: ${simplifyDeviationTitle(protocol.deviation.title)}`, 120);
}

function buildProblemSummary(protocol: LocalA3Protocol): string {
  const metric = protocol.deviation.metricLabel ?? protocol.deviation.title;
  const fact = protocol.deviation.fact;
  const target = protocol.deviation.target;
  const scale = protocol.deviation.scale;
  if (fact || target || scale) {
    const parts = [
      fact ? `${metric}: ${fact}` : metric,
      target ? `цель ${target}` : undefined,
      scale,
    ].filter(Boolean);
    return compactText(parts.join(" · "), 180);
  }

  const contextLine = protocol.deviation.context
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("Фильтры:") && !line.startsWith("Объект:"));
  return compactText(contextLine ?? protocol.deviation.title, 180);
}

function isMeaningfulFormText(value: string, protocol: LocalA3Protocol): boolean {
  const normalized = value.replace(/\s+/g, " ").trim().toLocaleLowerCase("ru-RU");
  if (!normalized) return false;
  const title = protocol.deviation.title.replace(/\s+/g, " ").trim().toLocaleLowerCase("ru-RU");
  const problem = protocol.form.problem.replace(/\s+/g, " ").trim().toLocaleLowerCase("ru-RU");
  return normalized !== title && normalized !== problem;
}

function getNextAction(protocol: LocalA3Protocol, overdue: boolean): string {
  if (protocol.status === "closed") return "разбор закрыт";
  if (protocol.status === "cancelled") return "разбор отменен";
  if (overdue) return "обновить срок или закрыть просроченный разбор";
  if (!protocol.form.owner.trim() && !protocol.form.dueDate) return "назначить исполнителя и срок";
  if (!protocol.form.owner.trim()) return "назначить исполнителя";
  if (!protocol.form.dueDate) return "указать срок";
  if (!protocol.form.cause.trim()) return "указать причину";
  if (!protocol.form.solution.trim()) return "назначить контрмеру";
  if (!protocol.form.expectedResult.trim()) return "указать ожидаемый эффект";
  if (protocol.status === "waiting_review") return "проверить результат";
  if (protocol.status === "in_progress") return "контролировать выполнение";
  return "начать разбор";
}

function getProtocolStripeClass(protocol: LocalA3Protocol, overdue: boolean): string {
  if (overdue) return "bg-raport-danger";
  if (ACTIVE_STATUSES.includes(protocol.status) && (!protocol.form.owner.trim() || !protocol.form.dueDate)) return "bg-raport-warning";
  if (protocol.status === "waiting_review") return "bg-raport-warning";
  if (protocol.status === "in_progress") return "bg-raport-primary";
  if (protocol.status === "closed") return "bg-raport-success";
  return "bg-raport-border";
}

type ProtocolCardProps = {
  item: LocalA3JournalItem;
  repository: LocalA3Repository;
  onOpen: (protocol: LocalA3Protocol) => void;
  onChanged: () => Promise<void>;
  onExport: (protocolId: string) => Promise<void>;
};

function ProtocolCard({ item, repository, onOpen, onChanged, onExport }: ProtocolCardProps) {
  const [owner, setOwner] = useState(item.protocol.form.owner);
  const [dueDate, setDueDate] = useState(item.protocol.form.dueDate ?? "");
  const [comment, setComment] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCardMenu, setShowCardMenu] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const overdue = isLocalA3Overdue(item.protocol);
  const commentCount = item.events.filter((event) => event.type === "comment_added").length;
  const title = buildProtocolTitle(item.protocol);
  const problemSummary = buildProblemSummary(item.protocol);
  const nextAction = getNextAction(item.protocol, overdue);
  const cause = item.protocol.form.cause.trim();
  const solution = item.protocol.form.solution.trim();
  const expectedResult = item.protocol.form.expectedResult.trim();
  const showCause = isMeaningfulFormText(cause, item.protocol);
  const showSolution = isMeaningfulFormText(solution, item.protocol);
  const showExpectedResult = isMeaningfulFormText(expectedResult, item.protocol);
  const hasOwner = Boolean(item.protocol.form.owner.trim());
  const hasDueDate = Boolean(item.protocol.form.dueDate);
  const stripeClass = getProtocolStripeClass(item.protocol, overdue);

  async function run(action: () => Promise<string | null | void>) {
    setIsBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const nextMessage = await action();
      await onChanged();
      if (nextMessage) setActionMessage(nextMessage);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось выполнить действие.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <article className={overdue ? "relative rounded-card border border-raport-danger-border bg-raport-danger-muted p-4 pl-5" : "relative rounded-card border border-raport-border bg-raport-surface p-4 pl-5"}>
      <span className={`absolute inset-y-0 left-0 w-1 ${stripeClass}`} aria-hidden="true" />
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={LOCAL_A3_STATUS_BADGE_VARIANT[item.protocol.status]}>{LOCAL_A3_STATUS_LABEL[item.protocol.status]}</Badge>
            <Badge variant="secondary">{LOCAL_A3_DASHBOARD_LABEL[item.protocol.dashboardType]}</Badge>
            {overdue ? <Badge variant="danger">срок просрочен</Badge> : null}
            {!hasOwner && item.protocol.status !== "closed" && item.protocol.status !== "cancelled" ? <Badge variant="warning">нет исполнителя</Badge> : null}
            {!hasDueDate && item.protocol.status !== "closed" && item.protocol.status !== "cancelled" ? <Badge variant="warning">нет срока</Badge> : null}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold leading-snug text-raport-text">{title}</h3>
            <p className="text-sm leading-relaxed text-raport-muted"><span className="font-semibold text-raport-text">Проблема:</span> {problemSummary}</p>
            <p className="text-sm leading-relaxed text-raport-muted"><span className="font-semibold text-raport-text">Следующее действие:</span> {nextAction}.</p>
            {showCause ? <p className="text-sm leading-relaxed text-raport-muted"><span className="font-semibold text-raport-text">Причина:</span> {compactText(cause, 180)}</p> : null}
            {showSolution ? <p className="text-sm leading-relaxed text-raport-muted"><span className="font-semibold text-raport-text">Контрмера:</span> {compactText(solution, 180)}</p> : null}
            {showExpectedResult ? <p className="text-sm leading-relaxed text-raport-muted"><span className="font-semibold text-raport-text">Ожидаемый эффект:</span> {compactText(expectedResult, 180)}</p> : null}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-raport-muted">
            <span><span className="font-semibold text-raport-text">Период:</span> {item.protocol.period.label}</span>
            <span className={!hasOwner ? "font-semibold text-raport-warning" : undefined}><span className="font-semibold text-raport-text">Исполнитель:</span> {item.protocol.form.owner || "не назначен"}</span>
            <span className={!hasDueDate || overdue ? "font-semibold text-raport-warning" : undefined}><span className="font-semibold text-raport-text">Срок:</span> {formatDate(item.protocol.form.dueDate)}</span>
            <span><span className="font-semibold text-raport-text">Обновлен:</span> {formatDateTime(item.protocol.updatedAt)}</span>
            <span className="inline-flex items-center gap-1"><MessageSquare className="h-4 w-4" strokeWidth={2} /><span className="font-semibold text-raport-text">Комментарии:</span> {commentCount}</span>
          </div>
        </div>

        <div className="relative flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => onOpen(item.protocol)}>
            Открыть разбор <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Button>
          <Button variant={isEditing ? "default" : "outline"} onClick={() => setIsEditing((value) => !value)}>
            {isEditing ? <X className="h-4 w-4" strokeWidth={2} /> : <Pencil className="h-4 w-4" strokeWidth={2} />}
            {isEditing ? "Скрыть" : "Быстро изменить"}
          </Button>
          <Button className="h-9 w-9 px-0 py-0" variant="ghost" onClick={() => setShowCardMenu((value) => !value)} title="Дополнительные действия" aria-label="Дополнительные действия">
            <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
          </Button>
          {showCardMenu ? (
            <div className="absolute right-0 top-11 z-20 w-64 rounded-card border border-raport-border bg-raport-surface p-2 shadow-lg">
              <Button className="w-full justify-start" variant="ghost" onClick={() => void onExport(item.protocol.id)}>
                <Download className="h-4 w-4" strokeWidth={2} />
                Сохранить копию разбора
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {isEditing ? (
        <div className="mt-4 rounded-control border border-raport-border bg-raport-surface-soft p-3">
          <div className="grid gap-2 md:grid-cols-[180px_minmax(160px,1fr)_160px_auto]">
            <Select
              value={item.protocol.status}
              disabled={isBusy}
              onChange={(event) => run(async () => {
                assertActionResult(await changeLocalA3Status(item.protocol.id, event.target.value as LocalA3Status, { repository }));
                return "Статус обновлен.";
              })}
            >
              {STATUS_FILTERS.filter((status): status is LocalA3Status => status !== "all").map((status) => (
                <option key={status} value={status}>{LOCAL_A3_STATUS_LABEL[status]}</option>
              ))}
            </Select>
            <Input value={owner} disabled={isBusy} onChange={(event) => setOwner(event.target.value)} placeholder="Исполнитель" />
            <Input type="date" value={dueDate} disabled={isBusy} onChange={(event) => setDueDate(event.target.value)} />
            <Button
              variant="outline"
              disabled={isBusy}
              onClick={() => run(async () => {
                if (!owner.trim()) throw new Error("Укажите исполнителя.");
                if (!dueDate) throw new Error("Укажите срок.");
                assertActionResult(await changeLocalA3Owner(item.protocol.id, owner.trim(), { repository }));
                assertActionResult(await changeLocalA3DueDate(item.protocol.id, dueDate, { repository }));
                return "Изменения сохранены.";
              })}
            >
              Применить
            </Button>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <Input value={comment} disabled={isBusy} onChange={(event) => setComment(event.target.value)} placeholder="Комментарий к разбору" />
            <Button
              variant="outline"
              disabled={isBusy || !comment.trim()}
              onClick={() => run(async () => {
                assertActionResult(await addLocalA3Comment(item.protocol.id, comment.trim(), { repository }));
                setComment("");
                return "Комментарий добавлен.";
              })}
            >
              <MessageSquare className="h-4 w-4" strokeWidth={2} />
              Добавить
            </Button>
          </div>
          {actionError ? <p className="mt-2 text-sm font-semibold text-raport-danger">{actionError}</p> : null}
          {actionMessage ? <p className="mt-2 text-sm font-semibold text-raport-success">{actionMessage}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

type LocalA3JournalPageProps = {
  repository?: LocalA3Repository;
};

export function LocalA3JournalPage({ repository = localA3Repository }: LocalA3JournalPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<LocalA3JournalItem[]>([]);
  const [status, setStatus] = useState<LocalA3StatusFilter>("all");
  const [dashboard, setDashboard] = useState<LocalA3DashboardFilter>(() => parseDashboardFilter(searchParams.get("dashboard")));
  const [query, setQuery] = useState("");
  const [sortValue, setSortValue] = useState("updatedAt:desc");
  const [selectedProtocol, setSelectedProtocol] = useState<LocalA3Protocol | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBackupActions, setShowBackupActions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDashboard(parseDashboardFilter(searchParams.get("dashboard")));
  }, [searchParams]);

  const filters = useMemo<LocalA3JournalFilters>(() => {
    const [sortKey, sortDirection] = sortValue.split(":") as [LocalA3SortKey, LocalA3SortDirection];
    return { status, query, sortKey, sortDirection };
  }, [query, sortValue, status]);

  const dashboardItems = useMemo(
    () => (dashboard === "all" ? items : items.filter((item) => item.protocol.dashboardType === dashboard)),
    [dashboard, items],
  );

  const visibleItems = useMemo(() => filterAndSortLocalA3JournalItems(dashboardItems, filters), [dashboardItems, filters]);

  const journalSummary = useMemo(() => {
    const activeItems = dashboardItems.filter((item) => ACTIVE_STATUSES.includes(item.protocol.status));
    const withoutOwner = activeItems.filter((item) => !item.protocol.form.owner.trim()).length;
    const withoutDueDate = activeItems.filter((item) => !item.protocol.form.dueDate).length;
    const overdue = dashboardItems.filter((item) => isLocalA3Overdue(item.protocol)).length;
    return {
      total: dashboardItems.length,
      active: activeItems.length,
      waitingReview: dashboardItems.filter((item) => item.protocol.status === "waiting_review").length,
      overdue,
      withoutOwner,
      withoutDueDate,
      nearestDueDate: getNearestDueDate(dashboardItems),
    };
  }, [dashboardItems]);

  const journalInsight = useMemo(() => {
    if (journalSummary.total === 0) return "Разборов пока нет. Создайте первый разбор из дашборда или вручную.";
    if (journalSummary.overdue > 0) return `Критично: просрочено ${journalSummary.overdue}. Активных ${journalSummary.active}, ближайший срок — ${formatDate(journalSummary.nearestDueDate ?? undefined)}.`;
    if (journalSummary.withoutOwner > 0 || journalSummary.withoutDueDate > 0) return `Контроль: назначьте ответственных и сроки. Без исполнителя ${journalSummary.withoutOwner}, без срока ${journalSummary.withoutDueDate}.`;
    if (journalSummary.active > 0) return `В работе ${journalSummary.active}. Ближайший срок — ${formatDate(journalSummary.nearestDueDate ?? undefined)}.`;
    return "Все активные разборы закрыты или отменены.";
  }, [journalSummary]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setItems(await loadLocalA3JournalItems(repository));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось прочитать локальный журнал разборов.");
    }
  }, [repository]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleDashboardChange(value: LocalA3DashboardFilter) {
    setDashboard(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value === "all") nextParams.delete("dashboard");
    else nextParams.set("dashboard", value);
    setSearchParams(nextParams, { replace: true });
  }

  async function openProtocol(protocol: LocalA3Protocol) {
    const fresh = await repository.getProtocol(protocol.id);
    if (!fresh) {
      setError("Разбор не найден в локальном хранилище.");
      return;
    }
    setSelectedProtocol(fresh);
  }

  async function exportOne(protocolId: string) {
    const json = await exportLocalA3ProtocolArchiveJson(protocolId, repository);
    if (!json) {
      setError("Не удалось подготовить резервную копию: разбор не найден.");
      return;
    }
    downloadJson(`raport-a3-${protocolId}.json`, json);
  }

  async function exportAll() {
    downloadJson("raport-a3-journal.json", await exportLocalA3JournalArchiveJson(repository));
  }

  async function importFile(file: File) {
    setMessage(null);
    setError(null);
    const result = await importLocalA3JournalJsonSafely(await file.text(), repository);
    if (result.errors.length > 0) {
      setError(`Восстановление не выполнено: ${result.errors.map((item) => `${item.path}: ${item.message}`).join("; ")}`);
      return;
    }
    setMessage(`Восстановление: добавлено ${result.added}, обновлено ${result.updated}, пропущено ${result.skipped}, конфликтов ${result.conflicts.length}.`);
    await refresh();
  }

  function createEmptyProtocol() {
    setSelectedProtocol(createLocalA3ProtocolDraft({ dashboardTitle: "Ручной разбор", deviationTitle: "Новое отклонение" }));
  }

  return (
    <PageShell>
      <DashboardHeader
        className="mb-3"
        title="Разборы отклонений"
        slogan="Excel докладывает главное"
        description="Журнал управленческих разборов: что отклонилось, кто отвечает, к какому сроку и что уже сделано."
        actions={(themeToggle) => (
          <div className="relative flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <Button variant="default" onClick={createEmptyProtocol}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Новый разбор
            </Button>
            <Button
              className="h-9 w-9 px-0 py-0"
              variant={showBackupActions ? "default" : "outline"}
              onClick={() => setShowBackupActions((value) => !value)}
              title="Резервная копия журнала"
              aria-label="Резервная копия журнала"
            >
              <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
            </Button>
            {showBackupActions ? (
              <div className="absolute right-0 top-11 z-20 w-72 rounded-card border border-raport-border bg-raport-surface p-2 shadow-lg">
                <Button className="w-full justify-start" variant="ghost" onClick={exportAll}>
                  <Download className="h-4 w-4" strokeWidth={2} />
                  Сохранить резервную копию
                </Button>
                <Button className="mt-1 w-full justify-start" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" strokeWidth={2} />
                  Восстановить из резервной копии
                </Button>
              </div>
            ) : null}
            {themeToggle}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importFile(file);
                event.target.value = "";
              }}
            />
          </div>
        )}
      />

      <Alert className="mb-4 border-raport-action-border bg-raport-action-bg px-3 py-2">
        <AlertTitle className="mb-0 flex items-center gap-2 text-sm text-raport-text">
          <Info className="h-4 w-4 text-raport-primary" strokeWidth={2} />
          Разборы хранятся в этом браузере. Для переноса на другой компьютер используйте резервную копию.
        </AlertTitle>
        <AlertDescription className="mt-1 text-xs">Восстановление не перезаписывает локальные разборы с тем же id: конфликтующие записи пропускаются и показываются в отчете.</AlertDescription>
      </Alert>
      {error ? <Alert className="mb-4 border-raport-danger-border bg-raport-danger-muted"><AlertTitle className="text-raport-danger">Ошибка</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {message ? <Alert className="mb-4 border-raport-success-border bg-raport-success-muted"><AlertTitle className="text-raport-success">Готово</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}

      {selectedProtocol ? (
        <SectionCard
          className="mb-4"
          title="Открытый разбор"
          description="Детальная карточка: контекст, причина, контрмера, исполнение, комментарии и история."
          actions={<Button variant="ghost" onClick={() => setSelectedProtocol(null)}>Закрыть</Button>}
        >
          <LocalA3ProtocolEditor initialProtocol={selectedProtocol} repository={repository} onSaved={refresh} />
        </SectionCard>
      ) : null}

      <SectionCard
        title="Контроль разборов"
        description={`Показано ${visibleItems.length} из ${dashboardItems.length}. Быстрый обзор проблем, ответственных, сроков и статуса выполнения.`}
        actions={(
          <Button
            variant="ghost"
            className="h-9 w-9 px-0 py-0"
            onClick={refresh}
            title="Обновить журнал"
            aria-label="Обновить журнал"
          >
            <RefreshCcw className="h-4 w-4" strokeWidth={2} />
          </Button>
        )}
      >
        <div className="mb-4 space-y-4">
          <div className="rounded-card border border-raport-border bg-raport-surface-soft px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-raport-muted">Главный вывод</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-raport-text">{journalInsight}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Всего" value={String(journalSummary.total)} className="min-h-0" />
            <MetricCard label="Активные" value={String(journalSummary.active)} tone={journalSummary.active > 0 ? "warning" : "neutral"} className="min-h-0" />
            <MetricCard label="На проверке" value={String(journalSummary.waitingReview)} tone={journalSummary.waitingReview > 0 ? "warning" : "neutral"} className="min-h-0" />
            <MetricCard label="Просрочено" value={String(journalSummary.overdue)} tone={journalSummary.overdue > 0 ? "danger" : "neutral"} className="min-h-0" />
            <MetricCard label="Без исполнителя" value={String(journalSummary.withoutOwner)} tone={journalSummary.withoutOwner > 0 ? "warning" : "neutral"} className="min-h-0" />
            <MetricCard label="Без срока" value={String(journalSummary.withoutDueDate)} tone={journalSummary.withoutDueDate > 0 ? "warning" : "neutral"} className="min-h-0" />
          </div>

          <div className="rounded-card border border-raport-border bg-raport-surface-soft p-3">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((item) => (
                <Button
                  key={item}
                  variant={status === item ? "default" : "ghost"}
                  className="min-h-8 px-3 py-1.5 text-xs"
                  onClick={() => setStatus(item)}
                >
                  {LOCAL_A3_STATUS_FILTER_LABEL[item]}
                </Button>
              ))}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_170px_220px]">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти разбор, исполнителя или комментарий" />
              <Select value={dashboard} onChange={(event) => handleDashboardChange(event.target.value as LocalA3DashboardFilter)}>
                {DASHBOARD_FILTERS.map((item) => (
                  <option key={item} value={item}>{item === "all" ? "Все дашборды" : LOCAL_A3_DASHBOARD_LABEL[item]}</option>
                ))}
              </Select>
              <Select value={sortValue} onChange={(event) => setSortValue(event.target.value)}>
                {SORT_OPTIONS.map((item) => <option key={`${item.key}:${item.direction}`} value={`${item.key}:${item.direction}`}>{item.label}</option>)}
              </Select>
            </div>
          </div>
        </div>
        {visibleItems.length > 0 ? (
          <div className="space-y-3">
            {visibleItems.map((item) => (
              <ProtocolCard key={item.protocol.id} item={item} repository={repository} onOpen={openProtocol} onChanged={refresh} onExport={exportOne} />
            ))}
          </div>
        ) : (
          <ErrorState title="Разборы не найдены" message={items.length === 0 ? "Журнал пока пуст. Создайте разбор из дашборда или вручную." : "По текущим фильтрам разборы не найдены."} />
        )}
      </SectionCard>
    </PageShell>
  );
}
