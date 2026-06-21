import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleOff,
  Database,
  History,
  KeyRound,
  Loader2,
  PlugZap,
  RefreshCcw,
  Server,
  ShieldCheck,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { Button } from "../../../shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/shadcn/card";
import { Input } from "../../../shared/ui/shadcn/input";
import {
  clearDashboardHistory,
  deleteSnapshot,
  getSnapshots,
  type DashboardSnapshot,
  type DashboardType,
} from "../../../shared/lib/historyDB";
import { useTrendsEnabled } from "../../../shared/lib/trendSettings";
import {
  checkPrintAiConnection,
  DEFAULT_PRINT_AI_BACKEND_URL,
  type PrintAiHealthResult,
  type PrintAiSettings,
  usePrintAiSettings,
} from "../../../shared/lib/printAiSettings";
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
    return `покрытие ${snapshot.coverage.days}/${snapshot.coverage.periodDays} дн.`;
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

function SettingCard({
  icon,
  title,
  description,
  status,
  isEnabled,
  onDisable,
  onEnable,
  disableLabel,
  enableLabel,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  status: string;
  isEnabled: boolean;
  onDisable: () => void;
  onEnable: () => void;
  disableLabel: string;
  enableLabel: string;
}) {
  return (
    <div className="grid gap-3 rounded-control border border-raport-border bg-raport-surface-soft p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-raport-border bg-raport-surface text-raport-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black text-raport-text">{title}</p>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]",
                  isEnabled
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-raport-border bg-raport-surface text-raport-muted",
                )}
              >
                {status}
              </span>
            </div>
            <p className="mt-2 max-w-xl text-xs font-semibold leading-relaxed text-raport-muted">{description}</p>
          </div>
        </div>
      </div>
      <div
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-raport-border bg-raport-surface p-1 justify-self-start sm:justify-self-end"
        role="group"
        aria-label={title}
        title={isEnabled ? disableLabel : enableLabel}
      >
        <button
          type="button"
          className={cn(
            "inline-flex h-7 w-8 items-center justify-center rounded-full text-raport-muted transition-colors hover:bg-raport-surface-elevated hover:text-raport-text",
            !isEnabled && "bg-raport-action-bg-active text-raport-primary shadow-[inset_0_0_0_1px_var(--raport-action-border)]",
          )}
          aria-label={disableLabel}
          aria-pressed={!isEnabled}
          onClick={onDisable}
        >
          <CircleOff className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 w-8 items-center justify-center rounded-full text-raport-muted transition-colors hover:bg-raport-surface-elevated hover:text-raport-text",
            isEnabled && "bg-raport-action-bg-active text-raport-primary shadow-[inset_0_0_0_1px_var(--raport-action-border)]",
          )}
          aria-label={enableLabel}
          aria-pressed={isEnabled}
          onClick={onEnable}
        >
          {icon}
        </button>
      </div>
    </div>
  );
}

function healthBadgeClass(result: PrintAiHealthResult | null, isChecking: boolean, isEnabled: boolean): string {
  if (isChecking) return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300";
  if (!isEnabled) return "border-raport-border bg-raport-surface text-raport-muted";
  if (!result) return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300";
  if (result.status === "available") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (result.status === "disabled") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300";
  return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300";
}

function healthLabel(result: PrintAiHealthResult | null, isChecking: boolean, isEnabled: boolean): string {
  if (isChecking) return "проверка";
  if (!isEnabled) return "выключено";
  if (!result) return "настроено";
  if (result.status === "available") return "подключен";
  if (result.status === "disabled") return "проверка выключена";
  if (result.status === "unauthorized") return "проверьте ключ";
  return "нет связи";
}

export function HistoryManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeType, setActiveType] = useState<DashboardType>("ssz");
  const [showAll, setShowAll] = useState(false);
  const [state, setState] = useState<HistoryState>({ snapshots: [], isLoading: false, error: "" });
  const [trendsEnabled, setTrendsEnabled] = useTrendsEnabled();
  const [printAiSettings, setPrintAiSettings] = usePrintAiSettings();
  const [printAiDraft, setPrintAiDraft] = useState<PrintAiSettings>(printAiSettings);
  const [isPrintAiEditorOpen, setIsPrintAiEditorOpen] = useState(false);
  const [printAiHealth, setPrintAiHealth] = useState<PrintAiHealthResult | null>(null);
  const [isCheckingPrintAi, setIsCheckingPrintAi] = useState(false);

  const grouped = useMemo(() => groupByDashboard(state.snapshots), [state.snapshots]);
  const activeSnapshots = grouped[activeType];
  const totalSnapshots = state.snapshots.length;

  const VISIBLE_LIMIT = 12;
  const visibleSnapshots = showAll ? activeSnapshots : activeSnapshots.slice(0, VISIBLE_LIMIT);
  const hiddenCount = activeSnapshots.length - visibleSnapshots.length;

  useEffect(() => {
    setShowAll(false);
  }, [activeType]);

  useEffect(() => {
    if (!isOpen) return;
    setPrintAiDraft(printAiSettings);
  }, [isOpen, printAiSettings]);

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

  async function handleCheckPrintAiConnection() {
    setIsCheckingPrintAi(true);
    const result = await checkPrintAiConnection(printAiDraft);
    setPrintAiHealth(result);
    setIsCheckingPrintAi(false);
  }

  function handleSavePrintAiSettings() {
    setPrintAiSettings({ ...printAiDraft, enabled: true });
    setIsPrintAiEditorOpen(false);
  }

  function handleDisablePrintAi() {
    setPrintAiSettings({ enabled: false });
    setPrintAiDraft((current) => ({ ...current, enabled: false }));
    setPrintAiHealth(null);
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex min-h-8 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-raport-muted transition-colors hover:bg-raport-action-bg hover:text-raport-primary"
          onClick={() => setIsOpen(true)}
        >
          <History className="h-4 w-4" strokeWidth={2} />
          История и возможности
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
            <CardHeader className="border-b border-raport-border p-4">
              <div className="min-w-0">
                <CardTitle id="history-manager-title" className="flex items-center gap-2">
                  <History className="h-5 w-5 text-raport-primary" strokeWidth={2} />
                  История и возможности Рапорта
                </CardTitle>
                <p className="mt-1 max-w-3xl text-sm text-raport-muted">
                  Настройки возможностей Рапорта: ИИ-проверка личной печати, месячные тренды и локальная история KPI. Сырые отчеты не сохраняются.
                </p>
              </div>
              <Button variant="ghost" className="h-10 w-10 shrink-0 px-0 py-0" aria-label="Закрыть" onClick={() => setIsOpen(false)}>
                <X className="h-6 w-6" strokeWidth={2} />
              </Button>
            </CardHeader>

            <CardContent className="max-h-[calc(86vh-92px)] overflow-auto px-4 pb-4 pt-5">
              <div className="grid gap-4">
                <section className="rounded-control border border-raport-border bg-raport-surface-soft p-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-raport-border bg-raport-surface text-raport-primary">
                        <Bot className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-black text-raport-text">ИИ-проверка личной печати</h3>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]",
                              healthBadgeClass(printAiHealth, isCheckingPrintAi, printAiSettings.enabled),
                            )}
                          >
                            {healthLabel(printAiHealth, isCheckingPrintAi, printAiSettings.enabled)}
                          </span>
                        </div>
                        <p className="mt-2 max-w-2xl text-xs font-semibold leading-relaxed text-raport-muted">
                          По умолчанию Рапорт проверяет личную печать словарем. Подключите ИИ, чтобы перепроверять спорные документы локальной моделью.
                        </p>
                        {printAiHealth ? <p className="mt-2 text-xs font-semibold text-raport-muted">{printAiHealth.message}</p> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button
                        variant="outline"
                        className="min-h-9"
                        onClick={() => {
                          setPrintAiDraft(printAiSettings);
                          setIsPrintAiEditorOpen((current) => !current);
                        }}
                      >
                        <PlugZap className="h-4 w-4" strokeWidth={2} />
                        {printAiSettings.enabled ? "Настроить ИИ" : "Подключить ИИ"}
                      </Button>
                      {printAiSettings.enabled ? (
                        <Button variant="ghost" className="min-h-9 text-raport-muted" onClick={handleDisablePrintAi}>
                          <CircleOff className="h-4 w-4" strokeWidth={2} />
                          Выключить
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {isPrintAiEditorOpen ? (
                    <div className="mt-4 grid gap-3 border-t border-raport-border pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                      <label className="grid gap-1 text-xs font-semibold text-raport-muted">
                        <span className="inline-flex items-center gap-1">
                          <Server className="h-3.5 w-3.5" strokeWidth={2} />
                          Адрес сервиса ИИ
                        </span>
                        <Input
                          value={printAiDraft.backendUrl}
                          placeholder={DEFAULT_PRINT_AI_BACKEND_URL}
                          onChange={(event) => setPrintAiDraft((current) => ({ ...current, backendUrl: event.target.value }))}
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-semibold text-raport-muted">
                        <span className="inline-flex items-center gap-1">
                          <KeyRound className="h-3.5 w-3.5" strokeWidth={2} />
                          Ключ доступа, если требуется
                        </span>
                        <Input
                          value={printAiDraft.apiKey}
                          type="password"
                          autoComplete="off"
                          placeholder="необязательно"
                          onChange={(event) => setPrintAiDraft((current) => ({ ...current, apiKey: event.target.value }))}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button variant="outline" className="min-h-9" onClick={() => void handleCheckPrintAiConnection()} disabled={isCheckingPrintAi}>
                          {isCheckingPrintAi ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <ShieldCheck className="h-4 w-4" strokeWidth={2} />}
                          Проверить
                        </Button>
                        <Button className="min-h-9" onClick={handleSavePrintAiSettings}>
                          <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                          Сохранить
                        </Button>
                      </div>
                      {printAiHealth && printAiHealth.status !== "available" ? (
                        <p className="flex items-start gap-2 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 lg:col-span-3 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                          {printAiHealth.message}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                <SettingCard
                  icon={<TrendingUp className="h-4 w-4" strokeWidth={2} />}
                  title="Сбор трендов"
                  description={
                    trendsEnabled
                      ? "Рапорт сохраняет только месячные KPI для динамики показателей. Исходные строки отчетов не попадают в историю."
                      : "Отчеты открываются без сохранения KPI. Уже сохраненные снимки остаются доступными, пока вы их не удалите."
                  }
                  status={trendsEnabled ? "включено" : "выключено"}
                  isEnabled={trendsEnabled}
                  onDisable={() => setTrendsEnabled(false)}
                  onEnable={() => setTrendsEnabled(true)}
                  disableLabel="Выключить сбор трендов"
                  enableLabel="Включить сбор трендов"
                />

                <section className="grid gap-3 rounded-control border border-raport-border bg-raport-surface-soft p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-raport-primary" strokeWidth={2} />
                        <h3 className="text-sm font-black text-raport-text">Месячные снимки KPI по дашбордам · {totalSnapshots}</h3>
                      </div>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-raport-muted">
                        Здесь можно проверить, какие месячные KPI сохранены локально, удалить отдельный период или очистить историю дашборда.
                      </p>
                    </div>
                    <Button variant="ghost" className="min-h-8 px-2 py-1 text-xs" onClick={() => void loadHistory()}>
                      <RefreshCcw className="h-3.5 w-3.5" strokeWidth={2} />
                      Обновить
                    </Button>
                  </div>

                  <div className="inline-flex w-full flex-wrap gap-1 rounded-control border border-raport-border bg-raport-surface p-1 sm:w-fit">
                    {DASHBOARD_TYPES.map((dashboardType) => (
                      <button
                        key={dashboardType}
                        type="button"
                        className={cn(
                          "inline-flex min-h-8 items-center gap-2 rounded-control px-3 text-sm font-semibold transition-colors",
                          activeType === dashboardType
                            ? "bg-white text-raport-primary shadow-sm dark:bg-raport-surface-elevated"
                            : "text-raport-muted hover:bg-white/70 hover:text-raport-text dark:hover:bg-raport-surface-elevated",
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

                  {state.error ? <p className="text-sm font-semibold text-red-700">{state.error}</p> : null}
                  {state.isLoading ? <p className="text-sm text-raport-muted">Загрузка локальной истории...</p> : null}

                  {!state.isLoading && activeSnapshots.length === 0 ? (
                    <div className="rounded-control border border-dashed border-raport-border bg-white px-3 py-4 text-sm text-raport-muted dark:bg-raport-surface">
                      История {DASHBOARD_LABELS[activeType]} пока пуста.
                    </div>
                  ) : null}

                  {!state.isLoading && activeSnapshots.length > 0 ? (
                    <div className="grid gap-2">
                      <div className="divide-y divide-raport-border rounded-control border border-raport-border bg-white dark:bg-raport-surface">
                        {visibleSnapshots.map((snapshot) => (
                          <div key={snapshot.id} className="grid gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                            <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(150px,220px)_minmax(0,1fr)_auto] sm:items-center">
                              <p className="truncate text-sm font-semibold text-raport-text">{periodLabel(snapshot)}</p>
                              <p className="truncate text-xs font-semibold text-raport-muted">{snapshotTypeNote(snapshot)}</p>
                              <p className="text-xs font-semibold text-raport-muted sm:text-right">{formatDateTime(snapshot.meta.savedAt)}</p>
                            </div>
                            <Button
                              variant="ghost"
                              className="h-9 w-9 justify-self-start px-0 py-0 text-red-600 hover:bg-red-50 sm:justify-self-end dark:hover:bg-red-950/30"
                              aria-label={`Удалить снимок ${periodLabel(snapshot)}`}
                              onClick={() => void handleDeleteSnapshot(snapshot.id)}
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2} />
                            </Button>
                          </div>
                        ))}
                        {hiddenCount > 0 && (
                          <div className="bg-raport-surface-soft p-1">
                            <Button
                              variant="ghost"
                              className="h-8 w-full text-xs text-raport-muted hover:bg-white hover:text-raport-text dark:hover:bg-raport-surface-elevated"
                              onClick={() => setShowAll(true)}
                            >
                              Показать еще {hiddenCount}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button variant="destructive" onClick={() => void handleClearDashboardHistory()}>
                          Очистить историю {DASHBOARD_LABELS[activeType]}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}