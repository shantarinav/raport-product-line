import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CircleOff,
  Database,
  KeyRound,
  Loader2,
  Settings2,
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
  getPrintAiStoredHealth,
  setPrintAiStoredHealth,
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
  hasLoaded: boolean;
  error: string;
};

type SettingsTab = "user" | "admin" | "history";

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
  if (isChecking) return "проверяем";
  if (!isEnabled) return "выключено";
  if (!result) return "проверьте";
  if (result.status === "available") return "готово";
  if (result.status === "disabled") return "нужна настройка";
  if (result.status === "unauthorized") return "проверьте ключ";
  return "нет связи";
}

function printAiUserMessage(result: PrintAiHealthResult | null, isChecking: boolean, isEnabled: boolean): string {
  if (!isEnabled) return "Рапорт работает по словарю. Личные тематики ищутся без ИИ.";
  if (isChecking) return "Проверяем подключение к ИИ.";
  if (!result) return "ИИ включен. Проверьте подключение во вкладке «Администратор» перед загрузкой отчета.";
  if (result.status === "available") return "ИИ готов к работе. Print будет уточнять личную печать.";
  if (result.status === "disabled") return "Сервис ИИ отвечает, но проверка выключена в его настройках. Print продолжит работу по словарю.";
  if (result.status === "unauthorized") return "Сервис найден, но ключ доступа не принят.";
  return "ИИ не отвечает. Print продолжит работу по словарю.";
}

function printAiQueueLabel(result: PrintAiHealthResult | null): string {
  if (!result?.queue) return "нет данных";
  return "активно " + result.queue.active + " · ожидает " + result.queue.pending + " · потоков " + result.queue.concurrency;
}

function printAiCacheLabel(result: PrintAiHealthResult | null): string {
  if (!result) return "нет данных";
  if (result.cacheStatus === "error") return "ошибка чтения";
  if (result.cacheEnabled === false) return "выключен";
  if (typeof result.cacheClassifications === "number") return result.cacheClassifications.toLocaleString("ru-RU") + " ответов";
  return "включен";
}

function printAiStateLabel(result: PrintAiHealthResult | null, isChecking: boolean): string {
  if (isChecking) return "проверяем связь";
  if (!result) return "ожидает проверки";
  if (result.status === "available") return "готов к работе";
  if (result.status === "disabled") return "нужна настройка сервиса";
  if (result.status === "unauthorized") return "ключ не принят";
  return "нет связи";
}

function PrintAiServiceDiagnostics({
  result,
  isChecking,
  isEnabled,
}: {
  result: PrintAiHealthResult | null;
  isChecking: boolean;
  isEnabled: boolean;
}) {
  if (!isEnabled) return null;

  const items = [
    { label: "Состояние", value: printAiStateLabel(result, isChecking) },
    { label: "Модель", value: result?.model ?? "не определена" },
    { label: "Очередь", value: printAiQueueLabel(result) },
    { label: "Кэш", value: printAiCacheLabel(result) },
  ];

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-control border border-raport-border bg-raport-surface px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-raport-muted">{item.label}</p>
          <p className="mt-1 truncate text-xs font-black text-raport-text" title={item.value}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function HistoryManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>("user");
  const [activeType, setActiveType] = useState<DashboardType>("ssz");
  const [showAll, setShowAll] = useState(false);
  const [state, setState] = useState<HistoryState>({ snapshots: [], isLoading: false, hasLoaded: false, error: "" });
  const [trendsEnabled, setTrendsEnabled] = useTrendsEnabled();
  const [printAiSettings, setPrintAiSettings] = usePrintAiSettings();
  const [printAiDraft, setPrintAiDraft] = useState<PrintAiSettings>(printAiSettings);
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
    setPrintAiHealth(getPrintAiStoredHealth(printAiSettings)?.result ?? null);
  }, [isOpen, printAiSettings]);

  async function loadHistory() {
    setState((current) => ({ ...current, isLoading: true, error: "" }));
    try {
      const snapshotsByType = await Promise.all(DASHBOARD_TYPES.map((dashboardType) => getSnapshots(dashboardType)));
      setState({ snapshots: snapshotsByType.flat(), isLoading: false, hasLoaded: true, error: "" });
    } catch (error) {
      console.error("Не удалось загрузить локальную историю", error);
      setState({ snapshots: [], isLoading: false, hasLoaded: true, error: "Не удалось загрузить локальную историю." });
    }
  }

  useEffect(() => {
    if (!isOpen || state.hasLoaded || state.isLoading) return;
    void loadHistory();
  }, [isOpen, state.hasLoaded, state.isLoading]);

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
    const nextSettings = { ...printAiDraft, enabled: printAiSettings.enabled };
    setPrintAiSettings(nextSettings);
    setPrintAiDraft(nextSettings);
    setIsCheckingPrintAi(true);
    const result = await checkPrintAiConnection(nextSettings);
    setPrintAiHealth(result);
    setPrintAiStoredHealth(nextSettings, result);
    setIsCheckingPrintAi(false);
  }

  function handleEnablePrintAi() {
    setPrintAiSettings({ enabled: true });
    setPrintAiDraft((current) => ({ ...current, enabled: true }));
    setPrintAiHealth(null);
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
          <Settings2 className="h-4 w-4" strokeWidth={2} />
          Дополнительные возможности
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
                  <Settings2 className="h-5 w-5 text-raport-primary" strokeWidth={2} />
                  Настройки Рапорта
                </CardTitle>
                <p className="mt-1 max-w-3xl text-sm text-raport-muted">
                  Настройки возможностей Рапорта: личная печать с ИИ, месячные тренды и локальная история KPI. Сырые отчеты не сохраняются.
                </p>
              </div>
              <Button variant="ghost" className="h-10 w-10 shrink-0 px-0 py-0" aria-label="Закрыть" onClick={() => setIsOpen(false)}>
                <X className="h-6 w-6" strokeWidth={2} />
              </Button>
            </CardHeader>

            <CardContent className="max-h-[calc(86vh-92px)] overflow-auto px-4 pb-4 pt-5">
              <div className="grid gap-4">
                <div className="inline-flex w-full flex-wrap gap-1 rounded-control border border-raport-border bg-raport-surface-soft p-1 sm:w-fit">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex min-h-9 items-center gap-2 rounded-control px-3 text-sm font-semibold transition-colors",
                      activeSettingsTab === "user"
                        ? "bg-white text-raport-primary shadow-sm dark:bg-raport-surface-elevated"
                        : "text-raport-muted hover:bg-white/70 hover:text-raport-text dark:hover:bg-raport-surface-elevated",
                    )}
                    onClick={() => setActiveSettingsTab("user")}
                  >
                    <ShieldCheck className="h-4 w-4" strokeWidth={2} />
                    Пользователь
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex min-h-9 items-center gap-2 rounded-control px-3 text-sm font-semibold transition-colors",
                      activeSettingsTab === "admin"
                        ? "bg-white text-raport-primary shadow-sm dark:bg-raport-surface-elevated"
                        : "text-raport-muted hover:bg-white/70 hover:text-raport-text dark:hover:bg-raport-surface-elevated",
                    )}
                    onClick={() => setActiveSettingsTab("admin")}
                  >
                    <Server className="h-4 w-4" strokeWidth={2} />
                    Администратор
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex min-h-9 items-center gap-2 rounded-control px-3 text-sm font-semibold transition-colors",
                      activeSettingsTab === "history"
                        ? "bg-white text-raport-primary shadow-sm dark:bg-raport-surface-elevated"
                        : "text-raport-muted hover:bg-white/70 hover:text-raport-text dark:hover:bg-raport-surface-elevated",
                    )}
                    onClick={() => setActiveSettingsTab("history")}
                  >
                    <Database className="h-4 w-4" strokeWidth={2} />
                    История
                    <Badge variant="secondary" className="min-h-4 px-1.5 py-0 text-[10px]">
                      {totalSnapshots}
                    </Badge>
                  </button>
                </div>

                {activeSettingsTab === "user" ? (
                  <section className="rounded-control border border-raport-border bg-raport-surface p-4 shadow-sm">
                    <div className="mb-4 flex min-w-0 items-start gap-3 border-b border-raport-border pb-4">
                      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-raport-action-border bg-raport-action-bg text-raport-primary">
                        <ShieldCheck className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-raport-muted">Для пользователя</p>
                        <h3 className="mt-1 text-base font-black text-raport-text">Что включить в работе</h3>
                        <p className="mt-1 max-w-2xl text-xs font-semibold leading-relaxed text-raport-muted">
                          Здесь только прикладные возможности. Если ничего не включать, Рапорт продолжит открывать отчеты как обычный фронтенд-дашборд.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="grid gap-3 rounded-control border border-raport-border bg-raport-surface-soft p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <div className="min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-raport-border bg-raport-surface text-raport-primary">
                              <Bot className="h-4 w-4" strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-black text-raport-text">ИИ-проверка личной печати</p>
                                <span
                                  className={cn(
                                    "rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]",
                                    healthBadgeClass(printAiHealth, isCheckingPrintAi, printAiSettings.enabled),
                                  )}
                                >
                                  {healthLabel(printAiHealth, isCheckingPrintAi, printAiSettings.enabled)}
                                </span>
                              </div>
                              <p className="mt-2 max-w-xl text-xs font-semibold leading-relaxed text-raport-muted">
                                Уточняет личную печать в дашборде Print. Если ИИ выключен или не отвечает, Print работает по словарю без ИИ-артефактов.
                              </p>
                              <p className="mt-3 rounded-control border border-raport-border bg-raport-surface px-3 py-2 text-xs font-semibold leading-relaxed text-raport-muted">
                                {printAiUserMessage(printAiHealth, isCheckingPrintAi, printAiSettings.enabled)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-raport-border bg-raport-surface p-1 justify-self-start sm:justify-self-end"
                          role="group"
                          aria-label="ИИ-проверка личной печати"
                          title={printAiSettings.enabled ? "Выключить ИИ-проверку личной печати" : "Включить ИИ-проверку личной печати"}
                        >
                          <button
                            type="button"
                            className={cn(
                              "inline-flex h-7 w-8 items-center justify-center rounded-full text-raport-muted transition-colors hover:bg-raport-surface-elevated hover:text-raport-text",
                              !printAiSettings.enabled &&
                                "bg-raport-action-bg-active text-raport-primary shadow-[inset_0_0_0_1px_var(--raport-action-border)]",
                            )}
                            aria-label="Выключить ИИ-проверку личной печати"
                            aria-pressed={!printAiSettings.enabled}
                            onClick={handleDisablePrintAi}
                          >
                            <CircleOff className="h-4 w-4" strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            className={cn(
                              "inline-flex h-7 w-8 items-center justify-center rounded-full text-raport-muted transition-colors hover:bg-raport-surface-elevated hover:text-raport-text",
                              printAiSettings.enabled &&
                                "bg-raport-action-bg-active text-raport-primary shadow-[inset_0_0_0_1px_var(--raport-action-border)]",
                            )}
                            aria-label="Включить ИИ-проверку личной печати"
                            aria-pressed={printAiSettings.enabled}
                            onClick={handleEnablePrintAi}
                          >
                            <Bot className="h-4 w-4" strokeWidth={2} />
                          </button>
                        </div>
                      </div>

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
                    </div>
                  </section>
                ) : null}

                {activeSettingsTab === "admin" ? (
                  <section className="rounded-control border border-raport-border bg-raport-surface p-4 shadow-sm">
                    <div className="mb-4 flex min-w-0 items-start gap-3 border-b border-raport-border pb-4">
                      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-raport-border bg-raport-surface-soft text-raport-primary">
                        <Server className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-raport-muted">Для администратора</p>
                        <h3 className="mt-1 text-base font-black text-raport-text">Сервис ИИ и диагностика</h3>
                        <p className="mt-1 max-w-3xl text-xs font-semibold leading-relaxed text-raport-muted">
                          Техническая зона для подключения ИИ-сервиса: адрес, ключ доступа, проверка связи, кэш и очередь обработки.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="grid gap-3 rounded-control border border-raport-border bg-raport-surface-soft p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
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
                          <Button className="min-h-9" onClick={() => void handleCheckPrintAiConnection()} disabled={isCheckingPrintAi}>
                            {isCheckingPrintAi ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <ShieldCheck className="h-4 w-4" strokeWidth={2} />}
                            Проверить подключение
                          </Button>
                        </div>
                      </div>

                      {printAiHealth && printAiHealth.status !== "available" ? (
                        <p className="flex items-start gap-2 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                          {printAiUserMessage(printAiHealth, isCheckingPrintAi, printAiSettings.enabled)}
                        </p>
                      ) : null}
                      <PrintAiServiceDiagnostics result={printAiHealth} isChecking={isCheckingPrintAi} isEnabled={printAiSettings.enabled} />
                    </div>
                  </section>
                ) : null}

                {activeSettingsTab === "history" ? (
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
                    <Button
                      variant="outline"
                      className="h-9 w-9 rounded-full border-raport-action-border bg-raport-action-bg px-0 py-0 text-raport-primary shadow-[inset_0_0_0_1px_var(--raport-action-border)] hover:bg-raport-action-bg-active hover:text-raport-primary"
                      aria-label="Обновить месячные снимки KPI"
                      title="Обновить месячные снимки KPI"
                      onClick={() => void loadHistory()}
                    >
                      <RefreshCcw className="h-4 w-4" strokeWidth={2} />
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
                  {state.isLoading ? <p className="text-sm text-raport-muted">Проверяем сохраненные месячные KPI...</p> : null}

                  {!state.isLoading && state.hasLoaded && activeSnapshots.length === 0 ? (
                    <div className="rounded-control border border-dashed border-raport-border bg-white px-3 py-4 text-sm text-raport-muted dark:bg-raport-surface">
                      Для {DASHBOARD_LABELS[activeType]} пока нет сохраненных месячных KPI.
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
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}