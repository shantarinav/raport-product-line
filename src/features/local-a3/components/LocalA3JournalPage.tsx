import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, Download, FileJson, MessageSquare, Plus, RefreshCcw, Upload } from "lucide-react";
import { DashboardHeader, ErrorState, PageShell, SectionCard } from "../../../shared/ui";
import { Alert, AlertDescription, AlertTitle } from "../../../shared/ui/shadcn/alert";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { Button } from "../../../shared/ui/shadcn/button";
import { Input } from "../../../shared/ui/shadcn/input";
import { Select } from "../../../shared/ui/shadcn/select";
import { addLocalA3Comment, changeLocalA3DueDate, changeLocalA3Owner, changeLocalA3Status, createLocalA3ProtocolDraft } from "../localA3Commands";
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
  const overdue = isLocalA3Overdue(item.protocol);

  async function run(action: () => Promise<void>) {
    setIsBusy(true);
    try {
      await action();
      await onChanged();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <article className={overdue ? "rounded-card border border-raport-danger-border bg-raport-danger-muted p-4" : "rounded-card border border-raport-border bg-raport-surface p-4"}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={LOCAL_A3_STATUS_BADGE_VARIANT[item.protocol.status]}>{LOCAL_A3_STATUS_LABEL[item.protocol.status]}</Badge>
            <Badge variant="secondary">{LOCAL_A3_DASHBOARD_LABEL[item.protocol.dashboardType]}</Badge>
            {overdue ? <Badge variant="danger">срок просрочен</Badge> : null}
          </div>
          <h3 className="text-base font-semibold text-raport-text">{item.protocol.deviation.title}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-raport-muted">
            <span>Период: {item.protocol.period.label}</span>
            <span>Исполнитель: {item.protocol.form.owner || "не указан"}</span>
            <span>Срок: {formatDate(item.protocol.form.dueDate)}</span>
            <span>Обновлен: {formatDateTime(item.protocol.updatedAt)}</span>
            <span>Комментарии: {item.events.filter((event) => event.type === "comment_added").length}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => onOpen(item.protocol)}>
            Открыть <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Button>
          <Button variant="ghost" onClick={() => onExport(item.protocol.id)} title="Экспортировать A3 в JSON">
            <FileJson className="h-4 w-4" strokeWidth={2} />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-[180px_minmax(140px,1fr)_160px_auto]">
        <Select
          value={item.protocol.status}
          disabled={isBusy}
          onChange={(event) => run(async () => {
            await changeLocalA3Status(item.protocol.id, event.target.value as LocalA3Status, { repository });
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
            await changeLocalA3Owner(item.protocol.id, owner, { repository });
            await changeLocalA3DueDate(item.protocol.id, dueDate || undefined, { repository });
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
            await addLocalA3Comment(item.protocol.id, comment, { repository });
            setComment("");
          })}
        >
          <MessageSquare className="h-4 w-4" strokeWidth={2} />
          Добавить
        </Button>
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
  const [status, setStatus] = useState<LocalA3StatusFilter>("all");
  const [dashboard, setDashboard] = useState<LocalA3DashboardFilter>(() => parseDashboardFilter(searchParams.get("dashboard")));
  const [query, setQuery] = useState("");
  const [sortValue, setSortValue] = useState("updatedAt:desc");
  const [selectedProtocol, setSelectedProtocol] = useState<LocalA3Protocol | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDashboard(parseDashboardFilter(searchParams.get("dashboard")));
  }, [searchParams]);

  const filters = useMemo<LocalA3JournalFilters>(() => {
    const [sortKey, sortDirection] = sortValue.split(":") as [LocalA3SortKey, LocalA3SortDirection];
    return { status, query, sortKey, sortDirection };
  }, [query, sortValue, status]);

  const visibleItems = useMemo(() => {
    const dashboardItems = dashboard === "all" ? items : items.filter((item) => item.protocol.dashboardType === dashboard);
    return filterAndSortLocalA3JournalItems(dashboardItems, filters);
  }, [dashboard, filters, items]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setItems(await loadLocalA3JournalItems(repository));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось прочитать локальный журнал A3.");
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
      setError("A3-разбор не найден для экспорта.");
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
      setError(`Импорт не выполнен: ${result.errors.map((item) => `${item.path}: ${item.message}`).join("; ")}`);
      return;
    }
    setMessage(`Импорт: добавлено ${result.added}, обновлено ${result.updated}, пропущено ${result.skipped}, конфликтов ${result.conflicts.length}.`);
    await refresh();
  }

  function createEmptyProtocol() {
    setSelectedProtocol(createLocalA3ProtocolDraft({ dashboardTitle: "Ручной A3-разбор", deviationTitle: "Новое отклонение" }));
  }

  return (
    <PageShell>
      <DashboardHeader
        title="Разборы отклонений"
        slogan="Excel докладывает главное"
        description="Локальный журнал A3-разборов: проблема, причина, решение, исполнитель, срок и история комментариев."
        actions={(
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={createEmptyProtocol}><Plus className="h-4 w-4" strokeWidth={2} />Новый разбор</Button>
            <Button variant="outline" onClick={exportAll}><Download className="h-4 w-4" strokeWidth={2} />Экспорт журнала</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4" strokeWidth={2} />Импорт JSON</Button>
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

      <Alert className="mb-4 border-raport-warning-border bg-raport-warning-muted">
        <AlertTitle className="flex items-center gap-2 text-raport-text">
          <AlertTriangle className="h-4 w-4 text-raport-warning" strokeWidth={2} />
          A3-протоколы хранятся в этом браузере на этом компьютере. Для резервного копирования используйте экспорт
        </AlertTitle>
        <AlertDescription>Импорт не перезаписывает локальные разборы с тем же id: конфликтующие записи пропускаются и показываются в отчете.</AlertDescription>
      </Alert>

      {error ? <Alert className="mb-4 border-raport-danger-border bg-raport-danger-muted"><AlertTitle className="text-raport-danger">Ошибка</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {message ? <Alert className="mb-4 border-raport-success-border bg-raport-success-muted"><AlertTitle className="text-raport-success">Готово</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}

      {selectedProtocol ? (
        <SectionCard
          className="mb-4"
          title="Редактор A3"
          description="Открытый разбор можно изменить, сохранить и дополнить комментариями."
          actions={<Button variant="ghost" onClick={() => setSelectedProtocol(null)}>Закрыть редактор</Button>}
        >
          <LocalA3ProtocolEditor initialProtocol={selectedProtocol} repository={repository} onSaved={refresh} />
        </SectionCard>
      ) : null}

      <SectionCard
        title="Журнал A3"
        description={`Показано ${visibleItems.length} из ${items.length}. Поиск работает по отклонению, исполнителю, причине, решению и комментариям.`}
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
        <div className="mb-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_170px_180px_220px]">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по разбору, исполнителю, причине, решению, комментарию" />
          <Select value={dashboard} onChange={(event) => handleDashboardChange(event.target.value as LocalA3DashboardFilter)}>
            {DASHBOARD_FILTERS.map((item) => (
              <option key={item} value={item}>{item === "all" ? "Все дашборды" : LOCAL_A3_DASHBOARD_LABEL[item]}</option>
            ))}
          </Select>
          <Select value={status} onChange={(event) => setStatus(event.target.value as LocalA3StatusFilter)}>
            {STATUS_FILTERS.map((item) => <option key={item} value={item}>{LOCAL_A3_STATUS_FILTER_LABEL[item]}</option>)}
          </Select>
          <Select value={sortValue} onChange={(event) => setSortValue(event.target.value)}>
            {SORT_OPTIONS.map((item) => <option key={`${item.key}:${item.direction}`} value={`${item.key}:${item.direction}`}>{item.label}</option>)}
          </Select>
        </div>

        {visibleItems.length > 0 ? (
          <div className="space-y-3">
            {visibleItems.map((item) => (
              <ProtocolCard key={item.protocol.id} item={item} repository={repository} onOpen={openProtocol} onChanged={refresh} onExport={exportOne} />
            ))}
          </div>
        ) : (
          <ErrorState title="A3-разборы не найдены" message={items.length === 0 ? "Локальный журнал пока пуст." : "По текущим фильтрам разборы не найдены."} />
        )}
      </SectionCard>
    </PageShell>
  );
}
