import { useEffect, useMemo, useState } from "react";
import { History, RefreshCcw, Trash2, X } from "lucide-react";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { Button } from "../../../shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/shadcn/card";
import {
  clearDashboardHistory,
  deleteSnapshot,
  getSnapshots,
  type DashboardSnapshot,
  type DashboardType,
} from "../../../shared/lib/historyDB";
import { cn } from "../../../shared/ui/cn";

const DASHBOARD_TYPES: DashboardType[] = ["ssz", "tessa", "print", "support"];

const DASHBOARD_LABELS: Record<DashboardType, string> = {
  ssz: "ССЗ",
  tessa: "Tessa",
  print: "Печать",
  support: "Техподдержка",
};

type HistoryState = {
  snapshots: DashboardSnapshot[];
  isLoading: boolean;
  error: string;
};

function formatDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function periodLabel(snapshot: DashboardSnapshot): string {
  return `${formatDate(snapshot.period.from)} - ${formatDate(snapshot.period.to)}`;
}

function snapshotTypeNote(snapshot: DashboardSnapshot): string {
  if (snapshot.grain === "month" && snapshot.coverage) {
    return `месяц · покрытие ${snapshot.coverage.days}/${snapshot.coverage.periodDays} дн.`;
  }
  return "устаревший формат · не используется в трендах";
}

function groupByDashboard(snapshots: DashboardSnapshot[]): Record<DashboardType, DashboardSnapshot[]> {
  return DASHBOARD_TYPES.reduce(
    (groups, dashboardType) => ({
      ...groups,
      [dashboardType]: snapshots
        .filter((snapshot) => snapshot.dashboardType === dashboardType)
        .sort((left, right) => right.period.from.localeCompare(left.period.from)),
    }),
    {} as Record<DashboardType, DashboardSnapshot[]>,
  );
}

export function HistoryManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeType, setActiveType] = useState<DashboardType>("ssz");
  const [state, setState] = useState<HistoryState>({ snapshots: [], isLoading: false, error: "" });

  const grouped = useMemo(() => groupByDashboard(state.snapshots), [state.snapshots]);
  const activeSnapshots = grouped[activeType];
  const totalSnapshots = state.snapshots.length;

  async function loadHistory() {
    setState((current) => ({ ...current, isLoading: true, error: "" }));
    try {
      const snapshotsByType = await Promise.all(DASHBOARD_TYPES.map((dashboardType) => getSnapshots(dashboardType)));
      setState({ snapshots: snapshotsByType.flat(), isLoading: false, error: "" });
    } catch (error) {
      console.error("Не удалось загрузить локальную историю", error);
      setState({ snapshots: [], isLoading: false, error: "Не удалось загрузить локальную историю." });
    }
  }

  useEffect(() => {
    if (!isOpen || state.snapshots.length > 0 || state.isLoading) return;
    void loadHistory();
  }, [isOpen, state.isLoading, state.snapshots.length]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function handleDeleteSnapshot(id: string) {
    try {
      await deleteSnapshot(id);
      await loadHistory();
    } catch (error) {
      console.error("Не удалось удалить снимок истории", error);
      setState((current) => ({ ...current, error: "Не удалось удалить снимок истории." }));
    }
  }

  async function handleClearDashboardHistory() {
    const confirmed = window.confirm(`Очистить историю ${DASHBOARD_LABELS[activeType]}? Это действие нельзя отменить.`);
    if (!confirmed) return;

    try {
      await clearDashboardHistory(activeType);
      await loadHistory();
    } catch (error) {
      console.error("Не удалось очистить историю дашборда", error);
      setState((current) => ({ ...current, error: "Не удалось очистить историю дашборда." }));
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold text-[var(--raport-muted)] transition-colors hover:bg-[var(--raport-action-bg)] hover:text-[var(--raport-primary)]"
          onClick={() => setIsOpen(true)}
        >
          <History className="h-4 w-4" strokeWidth={2} />
          История и тренды
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/35 p-4" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <Card
            className="max-h-[86vh] w-full max-w-5xl overflow-hidden shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-manager-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <CardHeader className="border-b border-[var(--raport-border)] p-4">
              <div className="min-w-0">
                <CardTitle id="history-manager-title" className="flex items-center gap-2">
                  <History className="h-5 w-5 text-[var(--raport-primary)]" strokeWidth={2} />
                  Локальная история и тренды
                </CardTitle>
                <p className="mt-1 text-sm text-[var(--raport-muted)]">
                  Месячные снимки KPI хранятся в этом браузере и используются для динамики показателей. Сырые отчеты не сохраняются.
                </p>
              </div>
              <Button variant="ghost" className="h-8 w-8 shrink-0 px-0 py-0" aria-label="Закрыть" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" strokeWidth={2} />
              </Button>
            </CardHeader>

            <CardContent className="max-h-[calc(86vh-92px)] overflow-auto p-4">
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex flex-wrap gap-1 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-[var(--raport-surface-soft)] p-1">
                    {DASHBOARD_TYPES.map((dashboardType) => (
                      <button
                        key={dashboardType}
                        type="button"
                        className={cn(
                          "inline-flex min-h-8 items-center gap-2 rounded-[var(--raport-radius-control)] px-3 text-sm font-semibold transition-colors",
                          activeType === dashboardType
                            ? "bg-white text-[var(--raport-primary)] shadow-sm"
                            : "text-[var(--raport-muted)] hover:bg-white/70 hover:text-[var(--raport-text)]",
                        )}
                        onClick={() => setActiveType(dashboardType)}
                      >
                        {DASHBOARD_LABELS[dashboardType]}
                        <Badge variant="secondary" className="min-h-4 px-1.5 py-0 text-[10px]">
                          {grouped[dashboardType].length}
                        </Badge>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Всего: {totalSnapshots}</Badge>
                    <Button variant="ghost" className="min-h-8 px-2 py-1 text-xs" onClick={() => void loadHistory()}>
                      <RefreshCcw className="h-3.5 w-3.5" strokeWidth={2} />
                      Обновить
                    </Button>
                  </div>
                </div>

                {state.error ? <p className="text-sm font-semibold text-red-700">{state.error}</p> : null}
                {state.isLoading ? <p className="text-sm text-[var(--raport-muted)]">Загрузка локальной истории...</p> : null}

                {!state.isLoading && activeSnapshots.length === 0 ? (
                  <div className="rounded-[var(--raport-radius-control)] border border-dashed border-[var(--raport-border)] bg-white px-3 py-4 text-sm text-[var(--raport-muted)]">
                    История {DASHBOARD_LABELS[activeType]} пока пуста.
                  </div>
                ) : null}

                {!state.isLoading && activeSnapshots.length > 0 ? (
                  <div className="grid gap-2">
                    <div className="divide-y divide-[var(--raport-border)] rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white">
                      {activeSnapshots.map((snapshot) => (
                        <div key={snapshot.id} className="grid gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--raport-text)]">{periodLabel(snapshot)}</p>
                            <p className="mt-0.5 text-xs font-semibold text-[var(--raport-muted)]">
                              {snapshotTypeNote(snapshot)} · сохранен: {formatDateTime(snapshot.meta.savedAt)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 justify-self-start px-0 py-0 text-red-600 hover:bg-red-50 sm:justify-self-end"
                            aria-label={`Удалить снимок ${periodLabel(snapshot)}`}
                            onClick={() => void handleDeleteSnapshot(snapshot.id)}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2} />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <Button variant="destructive" onClick={() => void handleClearDashboardHistory()}>
                        Очистить историю {DASHBOARD_LABELS[activeType]}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
