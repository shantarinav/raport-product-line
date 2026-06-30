import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Archive, Download, Eye, EyeOff, FileSpreadsheet, RefreshCcw, Trash2, Upload, UploadCloud } from "lucide-react";
import { DashboardHeader, DashboardHeaderMark, ErrorState, HeaderIconButton, HelpLink, IconActionButton, PageShell, QuickFocusGroup, SectionCard } from "../../../shared/ui";
import { Alert, AlertDescription, AlertTitle } from "../../../shared/ui/shadcn/alert";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { Button } from "../../../shared/ui/shadcn/button";
import { Input } from "../../../shared/ui/shadcn/input";
import { Select } from "../../../shared/ui/shadcn/select";
import {
  exportLocalA3JournalArchiveJson,
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
import { deleteLocalA3Protocol } from "../localA3Commands";
import { localA3Repository, type LocalA3Repository } from "../localA3Repository";
import { LOCAL_A3_DASHBOARD_TYPES, type LocalA3DashboardType, type LocalA3Protocol, type LocalA3Status } from "../localA3Types";
import { LOCAL_A3_DASHBOARD_LABEL, LOCAL_A3_STATUS_BADGE_VARIANT, LOCAL_A3_STATUS_FILTER_LABEL, LOCAL_A3_STATUS_LABEL } from "../localA3Ui";
import { LocalA3ProtocolEditor } from "./LocalA3ProtocolEditor";

type LocalA3JournalViewFilter = LocalA3StatusFilter | "attention";
const STATUS_FILTERS: LocalA3JournalViewFilter[] = ["all", "attention", "open", "in_progress", "waiting_review", "closed"];
const DASHBOARD_FILTERS = ["all", ...LOCAL_A3_DASHBOARD_TYPES] as const;
type LocalA3DashboardFilter = (typeof DASHBOARD_FILTERS)[number];

const SORT_OPTIONS: Array<{ value: string; key: LocalA3SortKey; direction: LocalA3SortDirection; label: string }> = [
  { value: "priority", key: "updatedAt", direction: "desc", label: "По приоритету" },
  { value: "updatedAt:desc", key: "updatedAt", direction: "desc", label: "Сначала обновленные" },
  { value: "dueDate:asc", key: "dueDate", direction: "asc", label: "Сначала ближайший срок" },
  { value: "status:asc", key: "status", direction: "asc", label: "По статусу" },
  { value: "dashboardType:asc", key: "dashboardType", direction: "asc", label: "По дашборду" },
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

const ACTIVE_STATUSES: LocalA3Status[] = ["open", "in_progress", "waiting_review"];

function isAttentionItem(item: LocalA3JournalItem): boolean {
  const protocol = item.protocol;
  if (!ACTIVE_STATUSES.includes(protocol.status)) return false;
  return isLocalA3Overdue(protocol) || protocol.status === "waiting_review" || !protocol.form.owner.trim() || !protocol.form.dueDate;
}

function attentionPriority(item: LocalA3JournalItem): number {
  const protocol = item.protocol;
  if (isLocalA3Overdue(protocol)) return 1;
  if (!protocol.form.dueDate) return 2;
  if (!protocol.form.owner.trim()) return 3;
  if (protocol.status === "waiting_review") return 4;
  if (protocol.form.dueDate) return 5;
  return 6;
}

function sortByAttentionPriority(items: LocalA3JournalItem[]): LocalA3JournalItem[] {
  return [...items].sort((left, right) => {
    const priority = attentionPriority(left) - attentionPriority(right);
    if (priority !== 0) return priority;
    const leftDue = left.protocol.form.dueDate ?? "9999-12-31";
    const rightDue = right.protocol.form.dueDate ?? "9999-12-31";
    const dueCompare = leftDue.localeCompare(rightDue);
    if (dueCompare !== 0) return dueCompare;
    return right.protocol.updatedAt.localeCompare(left.protocol.updatedAt);
  });
}

function getStatusFilterLabel(filter: LocalA3JournalViewFilter): string {
  if (filter === "attention") return "Требуют внимания";
  return LOCAL_A3_STATUS_FILTER_LABEL[filter];
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
  displayCode: string;
  onOpen: (protocol: LocalA3Protocol) => void;
  onDelete: (protocol: LocalA3Protocol) => void;
};

function ProtocolCard({ item, displayCode, onOpen, onDelete }: ProtocolCardProps) {
  const overdue = isLocalA3Overdue(item.protocol);
  const title = buildProtocolTitle(item.protocol);
  const hasOwner = Boolean(item.protocol.form.owner.trim());
  const hasDueDate = Boolean(item.protocol.form.dueDate);
  const stripeClass = getProtocolStripeClass(item.protocol, overdue);
  const needsAttention = item.protocol.status !== "closed" && item.protocol.status !== "cancelled" && (!hasOwner || !hasDueDate || overdue);


  return (
    <article className={overdue ? "relative rounded-card border border-raport-danger-border bg-raport-danger-muted px-4 py-3 pl-5" : "relative rounded-card border border-raport-border bg-raport-surface px-4 py-3 pl-5"}>
      <span className={`absolute inset-y-0 left-0 w-1 ${stripeClass}`} aria-hidden="true" />
      <div className="grid gap-3 xl:grid-cols-[82px_minmax(320px,1.7fr)_210px_minmax(150px,0.8fr)_130px_155px_170px] xl:items-center">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{displayCode}</Badge>
        </div>

        <button className="min-w-0 text-left" type="button" onClick={() => onOpen(item.protocol)}>
          <h3 className="truncate text-base font-semibold text-raport-text">{title}</h3>
          <p className="mt-1 truncate text-xs text-raport-muted">{buildProblemSummary(item.protocol)}</p>
        </button>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={LOCAL_A3_STATUS_BADGE_VARIANT[item.protocol.status]}>{LOCAL_A3_STATUS_LABEL[item.protocol.status]}</Badge>
          <Badge variant="secondary">{LOCAL_A3_DASHBOARD_LABEL[item.protocol.dashboardType]}</Badge>
          {overdue ? <Badge variant="danger">просрочен</Badge> : null}
          {!hasOwner && needsAttention ? <Badge variant="warning">нет ответственного</Badge> : null}
          {!hasDueDate && needsAttention ? <Badge variant="warning">нет срока</Badge> : null}
        </div>

        <div className={!hasOwner ? "text-sm font-semibold text-raport-warning" : "text-sm text-raport-text"}>
          {item.protocol.form.owner || "не назначен"}
        </div>

        <div className={!hasDueDate || overdue ? "text-sm font-semibold text-raport-warning" : "text-sm text-raport-text"}>
          {formatDate(item.protocol.form.dueDate)}
        </div>

        <div className="min-w-0 text-sm text-raport-muted">
          <span className="block whitespace-nowrap">{formatDateTime(item.protocol.updatedAt)}</span>
        </div>

        <div className="flex justify-start gap-2 xl:justify-end">
          <Button className="h-9 gap-2 px-3 py-0" onClick={() => onOpen(item.protocol)} title="Открыть разбор" aria-label="Открыть разбор">
            <Eye className="h-4 w-4" strokeWidth={2} />
            Открыть
          </Button>
          <Button
            className="h-9 w-9 px-0 py-0 text-raport-muted hover:bg-raport-danger-muted hover:text-raport-danger"
            variant="ghost"
            onClick={() => onDelete(item.protocol)}
            title="Удалить разбор"
            aria-label="Удалить разбор"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </Button>
        </div>
      </div>
    </article>
  );
}

type LocalA3JournalPageProps = {
  repository?: LocalA3Repository;
};

export function LocalA3JournalPage({ repository = localA3Repository }: LocalA3JournalPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<LocalA3JournalItem[]>([]);
  const [status, setStatus] = useState<LocalA3JournalViewFilter>("attention");
  const [dashboard, setDashboard] = useState<LocalA3DashboardFilter>(() => parseDashboardFilter(searchParams.get("dashboard")));
  const [query, setQuery] = useState("");
  const [sortValue, setSortValue] = useState("priority");
  const [selectedProtocol, setSelectedProtocol] = useState<LocalA3Protocol | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<LocalA3Protocol | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBackupActions, setShowBackupActions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDashboard(parseDashboardFilter(searchParams.get("dashboard")));
  }, [searchParams]);

  const filters = useMemo<LocalA3JournalFilters>(() => {
    const option = SORT_OPTIONS.find((item) => item.value === sortValue) ?? SORT_OPTIONS[0];
    const filterStatus: LocalA3StatusFilter = status === "attention" ? "all" : status;
    return { status: filterStatus, query, sortKey: option.key, sortDirection: option.direction };
  }, [query, sortValue, status]);

  const dashboardItems = useMemo(
    () => (dashboard === "all" ? items : items.filter((item) => item.protocol.dashboardType === dashboard)),
    [dashboard, items],
  );

  const visibleItems = useMemo(() => {
    const filtered = filterAndSortLocalA3JournalItems(dashboardItems, filters);
    const scoped = status === "attention" ? filtered.filter(isAttentionItem) : filtered;
    return sortValue === "priority" ? sortByAttentionPriority(scoped) : scoped;
  }, [dashboardItems, filters, sortValue, status]);

  const protocolCodeById = useMemo(() => {
    const sorted = [...items].sort((left, right) => left.protocol.createdAt.localeCompare(right.protocol.createdAt));
    return new Map(sorted.map((item, index) => [item.protocol.id, `A3-${String(index + 1).padStart(3, "0")}`]));
  }, [items]);

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
    };
  }, [dashboardItems]);

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

  async function confirmDeleteProtocol() {
    if (!deleteCandidate) return;
    setMessage(null);
    setError(null);
    try {
      await deleteLocalA3Protocol(deleteCandidate.id, { repository });
      if (selectedProtocol?.id === deleteCandidate.id) {
        setSelectedProtocol(null);
      }
      setDeleteCandidate(null);
      await refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить A3-разбор.");
    }
  }

  return (
    <PageShell>
      <DashboardHeader
        className="mb-3"
        title={
          <div className="flex items-center gap-3">
            <DashboardHeaderMark Icon={FileSpreadsheet} />
            <div className="min-w-0">
              <span className="block truncate text-2xl font-extrabold text-raport-text md:text-3xl">Рапорт</span>
              <span className="mt-1 block text-sm font-bold text-raport-primary">Excel докладывает главное</span>
            </div>
          </div>
        }
        description="Журнал разборов отклонений: что отклонилось, кто отвечает, к какому сроку и что уже сделано."
        actions={(themeToggle) => (
          <div className="grid w-full min-w-0 max-w-[430px] justify-items-end gap-2 sm:min-w-[320px]">
            <div className="relative flex w-full items-center justify-end gap-2">
              <HeaderIconButton to="/" title="Загрузить отчет">
                <UploadCloud className="h-4 w-4 shrink-0" strokeWidth={2} />
              </HeaderIconButton>
              <HeaderIconButton
                onClick={() => setShowBackupActions((value) => !value)}
                title="Резервная копия журнала"
                aria-label="Резервная копия журнала"
              >
                <Archive className="h-4 w-4" strokeWidth={2} />
              </HeaderIconButton>
              {showBackupActions ? (
                <div className="absolute right-10 top-11 z-20 w-80 rounded-card border border-raport-border bg-raport-surface p-2 shadow-lg">
                  <Button className="grid w-full grid-cols-[1.25rem_1fr] justify-start gap-3 px-3 text-left" variant="ghost" onClick={exportAll}>
                    <Download className="h-4 w-4 justify-self-center" strokeWidth={2} />
                    <span className="whitespace-nowrap">Сохранить резервную копию</span>
                  </Button>
                  <Button className="mt-1 grid w-full grid-cols-[1.25rem_1fr] justify-start gap-3 px-3 text-left" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 justify-self-center" strokeWidth={2} />
                    <span className="whitespace-nowrap">Восстановить из резервной копии</span>
                  </Button>
                </div>
              ) : null}
              <HelpLink />
              {themeToggle}
            </div>
            <div className="w-full min-w-0 overflow-hidden rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2 text-xs text-raport-muted">
              <p className="mb-1 truncate font-semibold text-raport-text">Разборы отклонений</p>
              <p className="truncate">{dashboardItems.length} записей · хранится в этом браузере</p>
              <p className="mt-1 truncate">Для переноса используйте резервную копию</p>
            </div>
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

      {error ? <Alert className="mb-4 border-raport-danger-border bg-raport-danger-muted"><AlertTitle className="text-raport-danger">Ошибка</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {message ? <Alert className="mb-4 border-raport-success-border bg-raport-success-muted"><AlertTitle className="text-raport-success">Готово</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}

      {selectedProtocol ? (
        <SectionCard
          className="mb-4"
          title="Открытый разбор"
          actions={(
            <IconActionButton onClick={() => setSelectedProtocol(null)} title="Скрыть разбор" aria-label="Скрыть разбор">
              <EyeOff className="h-4 w-4" strokeWidth={2} />
            </IconActionButton>
          )}
        >
          <LocalA3ProtocolEditor initialProtocol={selectedProtocol} repository={repository} onSaved={refresh} />
        </SectionCard>
      ) : null}

      <SectionCard
        title={`Журнал разборов · ${dashboardItems.length}`}
        actions={(
          <IconActionButton
            onClick={refresh}
            title="Обновить журнал"
            aria-label="Обновить журнал"
          >
            <RefreshCcw className="h-4 w-4" strokeWidth={2} />
          </IconActionButton>
        )}
      >
        <div className="mb-4">
          <div className="rounded-card border border-raport-border bg-raport-surface-soft p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <QuickFocusGroup
                value={status}
                options={STATUS_FILTERS.map((item) => ({ value: item, label: getStatusFilterLabel(item) }))}
                onChange={setStatus}
                columnsClassName="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
                className="min-w-0 flex-1"
                variant="plain"
              />
              <div className="flex flex-wrap items-center gap-2">
                {journalSummary.overdue > 0 ? <Badge variant="danger">Просрочено: {journalSummary.overdue}</Badge> : null}
                {journalSummary.withoutOwner > 0 ? <Badge variant="warning">Без исполнителя: {journalSummary.withoutOwner}</Badge> : null}
                {journalSummary.withoutDueDate > 0 ? <Badge variant="warning">Без срока: {journalSummary.withoutDueDate}</Badge> : null}
              </div>
            </div>
            <p className="mt-3 text-xs text-raport-muted">
              Сначала показываются разборы, где нужен контроль: просрочка, нет срока, нет исполнителя или ожидается проверка.
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_170px_220px]">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти разбор или исполнителя" />
              <Select value={dashboard} onChange={(event) => handleDashboardChange(event.target.value as LocalA3DashboardFilter)}>
                {DASHBOARD_FILTERS.map((item) => (
                  <option key={item} value={item}>{item === "all" ? "Дашборд: Все" : `Дашборд: ${LOCAL_A3_DASHBOARD_LABEL[item]}`}</option>
                ))}
              </Select>
              <Select value={sortValue} onChange={(event) => setSortValue(event.target.value)}>
                {SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{`Сортировка: ${item.label}`}</option>)}
              </Select>
            </div>
          </div>
        </div>
        {visibleItems.length > 0 ? (
          <div className="space-y-2">
            <div className="hidden rounded-control border border-raport-border bg-raport-surface-soft px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-raport-muted xl:grid xl:grid-cols-[82px_minmax(320px,1.7fr)_210px_minmax(150px,0.8fr)_130px_155px_170px]">
              <span>№</span>
              <span>Разбор</span>
              <span>Статус</span>
              <span>Ответственный</span>
              <span>Срок</span>
              <span>Обновлен</span>
              <span className="text-right">Действие</span>
            </div>
            {visibleItems.map((item) => (
              <ProtocolCard
                key={item.protocol.id}
                displayCode={protocolCodeById.get(item.protocol.id) ?? "A3"}
                item={item}
                onOpen={openProtocol}
                onDelete={setDeleteCandidate}
              />
            ))}
          </div>
        ) : (
          <ErrorState title="Разборы не найдены" message={items.length === 0 ? "Загрузите отчет, откройте дашборд и нажмите «Разобрать» рядом с отклонением." : "По текущим фильтрам разборы не найдены."} />
        )}
      </SectionCard>
      {deleteCandidate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="local-a3-delete-title">
          <div className="w-full max-w-lg rounded-card border border-raport-border bg-raport-surface p-5 shadow-xl">
            <h2 id="local-a3-delete-title" className="text-lg font-semibold text-raport-text">
              Удалить A3-разбор?
            </h2>
            <p className="mt-2 text-sm text-raport-muted">
              Разбор «{buildProtocolTitle(deleteCandidate)}» будет удален из локального журнала этого браузера вместе с историей. Отменить действие нельзя.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteCandidate(null)}>
                Отмена
              </Button>
              <Button variant="destructive" onClick={() => void confirmDeleteProtocol()}>
                <Trash2 className="h-4 w-4" strokeWidth={2} />
                Удалить
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
