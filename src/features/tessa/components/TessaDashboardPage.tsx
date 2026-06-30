import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  ListChecks,
  UploadCloud,
  Users,
} from "lucide-react";
import {
  DashboardHeader,
  DashboardHeaderMark,
  DashboardSwitch,
  FilterStatusBar,
  HeaderIconButton,
  HelpLink,
  MetricCard,
  PageShell,
  SectionCard,
} from "../../../shared/ui";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { Button } from "../../../shared/ui/shadcn/button";
import { readPendingDashboardData } from "../../../shared/pendingDashboardFile";
import type { LocalA3DraftInput } from "../../local-a3/localA3Commands";
import { A3DashboardDraftPanel } from "../../local-a3/components/A3DashboardDraftPanel";
import { A3ReviewButton } from "../../local-a3/components/A3ReviewButton";
import { createA3DraftFromDeviation } from "../../local-a3/dashboardDeviation";
import {
  buildAgreementFacts,
  calculateTessaDashboardAnalytics,
  DEADLINE_MODES,
  declineAgreement,
  declineRisk,
  DEFAULT_FILTERS,
  formatDate,
  formatInteger,
  formatNumber,
  formatPercent,
  formatShortDateTime,
  getDocumentDatePeriod,
  registryTitle,
  toExportCsv,
} from "../logic/dashboard";
import { mapTessaMainInsightToA3Deviation } from "../logic/a3Mapper";
import type { AgreementFilters, LoadedFile, NormalizedRecord, QualitySummary, TessaImportResult } from "../types";
import { TessaFilterSidebar, quickFocusChipLabel } from "./TessaControls";

function toneByRating(rating: number): "ok" | "warn" | "error" {
  if (rating >= 50) return "error";
  if (rating >= 20) return "warn";
  return "ok";
}

function rowToneClass(rating: number, riskTodayCount: number): string {
  if (riskTodayCount > 0) return "border-raport-warning-border bg-raport-warning-muted";
  const tone = toneByRating(rating);
  if (tone === "error") return "border-raport-danger-border bg-raport-danger-muted";
  if (tone === "warn") return "border-raport-warning-border bg-raport-warning-muted";
  return "border-raport-success-border bg-raport-success-muted";
}

function priorityStripClass(rating: number, riskTodayCount: number): string {
  if (riskTodayCount > 0) return "bg-raport-warning";
  const tone = toneByRating(rating);
  if (tone === "error") return "bg-raport-danger";
  if (tone === "warn") return "bg-raport-warning";
  return "bg-raport-success";
}

function priorityBadgeVariant(rating: number, riskTodayCount: number): "success" | "warning" | "danger" {
  if (riskTodayCount > 0) return "warning";
  const tone = toneByRating(rating);
  if (tone === "error") return "danger";
  if (tone === "warn") return "warning";
  return "success";
}

function priorityLabel(maxStuckDays: number, riskTodayCount: number): string {
  if (maxStuckDays > 0) return `${formatNumber(maxStuckDays)} дн.`;
  if (riskTodayCount > 0) return "сегодня";
  return "в работе";
}

function PersonLoadStrip({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  const toneClass =
    safeValue >= 60
      ? "[&::-moz-progress-bar]:bg-raport-danger [&::-webkit-progress-value]:bg-raport-danger"
      : safeValue >= 25
        ? "[&::-moz-progress-bar]:bg-raport-warning [&::-webkit-progress-value]:bg-raport-warning"
        : "[&::-moz-progress-bar]:bg-raport-success [&::-webkit-progress-value]:bg-raport-success";

  return (
    <progress
      max={100}
      value={safeValue}
      className={`h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-raport-progress-track ${toneClass}`}
    />
  );
}

function DocumentTitle({
  documentType,
  regNumber,
  contractNumber,
  rootContractNumber,
  onSelectContract,
}: {
  documentType: string;
  regNumber: string;
  contractNumber: string;
  rootContractNumber: string;
  onSelectContract: (value: string) => void;
}) {
  const contractButton = (label: string) => (
    <button
      type="button"
      onClick={() => onSelectContract(rootContractNumber)}
      className="font-semibold text-raport-primary hover:underline"
    >
      {label}
    </button>
  );

  if (documentType === "Договор") return <strong>Договор № {contractButton(regNumber)}</strong>;
  if (documentType === "Спецификация") {
    return (
      <strong>
        Спецификация № {regNumber} к договору № {contractButton(contractNumber)}
      </strong>
    );
  }
  if (documentType === "Дополнительное соглашение") {
    return (
      <strong>
        Дополнительное соглашение № {regNumber} к договору № {contractButton(contractNumber)}
      </strong>
    );
  }

  return (
    <strong>
      {documentType} № {contractButton(regNumber)}
    </strong>
  );
}

export function TessaDashboardPage() {
  const navigate = useNavigate();
  const [pendingData] = useState<TessaImportResult | null>(() => readPendingDashboardData<TessaImportResult>("/tessa"));
  const [records, setRecords] = useState<NormalizedRecord[]>([]);
  const [quality, setQuality] = useState<QualitySummary | null>(null);
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const [filters, setFilters] = useState<AgreementFilters>(DEFAULT_FILTERS);
  const [peopleMode, setPeopleMode] = useState<"top" | "all">("top");
  const [visibleProblemsCount, setVisibleProblemsCount] = useState(25);
  const [expandedProblemKeys, setExpandedProblemKeys] = useState<Set<string>>(() => new Set());
  const [a3Draft, setA3Draft] = useState<LocalA3DraftInput | null>(null);
  const analysisDate = useMemo(() => new Date(), []);

  const hasData = records.length > 0;
  const period = useMemo(() => getDocumentDatePeriod(records), [records]);

  const facts = useMemo(() => buildAgreementFacts(records, analysisDate), [records, analysisDate]);
  const { filteredFacts, options, deadlineCounts, kpis, attentionPeople, documentProblems } = useMemo(
    () => calculateTessaDashboardAnalytics(facts, filters),
    [facts, filters],
  );
  const visiblePeople = peopleMode === "top" ? attentionPeople.slice(0, 5) : attentionPeople;
  const visibleProblems = documentProblems.slice(0, visibleProblemsCount);
  const hasMoreProblems = visibleProblemsCount < documentProblems.length;
  const canCreateA3 = kpis.stuck > 0;

  function currentTessaPeriodLabel(): string {
    return period ? `${formatDate(period.from)} - ${formatDate(period.to)}` : "Период не определен";
  }

  function createTessaA3Deviation() {
    return mapTessaMainInsightToA3Deviation({
      periodLabel: currentTessaPeriodLabel(),
      periodStart: period?.from?.toISOString().slice(0, 10),
      periodEnd: period?.to?.toISOString().slice(0, 10),
      sourceFileName: loadedFile?.fileName,
      kpis,
    });
  }

  function refreshTessaA3Draft() {
    setA3Draft(createA3DraftFromDeviation(createTessaA3Deviation()));
  }

  useEffect(() => {
    if (pendingData) {
      setRecords(pendingData.records);
      setQuality(pendingData.quality);
      setLoadedFile({
        fileName: pendingData.quality.sourceFileName,
        loadedAt: new Date(),
        rows: pendingData.records.length,
        duplicateRows: pendingData.quality.duplicateRows,
      });
      setFilters(DEFAULT_FILTERS);
      setPeopleMode("top");
      setVisibleProblemsCount(25);
      setExpandedProblemKeys(new Set());
      return;
    }

    navigate("/", { replace: true, state: { statusNotice: "Данные Tessa не найдены" } });
  }, [navigate, pendingData]);

  function patchFilters(next: Partial<AgreementFilters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function toggleProblem(problemKey: string) {
    setExpandedProblemKeys((current) => {
      const next = new Set(current);
      if (next.has(problemKey)) {
        next.delete(problemKey);
      } else {
        next.add(problemKey);
      }
      return next;
    });
  }

  function downloadFilteredCsv() {
    const content = toExportCsv(filteredFacts.map((fact) => fact.record));
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `raport-tessa-problems-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 800);
  }

  const deadlineModeLabel = DEADLINE_MODES.find((item) => item.value === filters.deadlineMode)?.label ?? "Все";
  const peopleEmptyMessage =
    filters.deadlineMode === "today" || filters.deadlineMode === "week"
      ? `Для дедлайна «${deadlineModeLabel}» застрявшие договорные согласования не найдены.`
      : "В текущей выборке застрявшие договорные согласования не найдены.";
  const qualityIssueCount = quality
    ? quality.invalidDeadlines + quality.invalidDocumentDates + quality.invalidNewDeadlines + quality.invalidCompletionDates
    : 0;

  const activeFilterChips: Array<{ label: string; tone?: "secondary"; onRemove?: () => void }> = [];
  activeFilterChips.push({
    label: quickFocusChipLabel(filters.deadlineMode, deadlineModeLabel),
    ...(filters.deadlineMode !== "all" ? { onRemove: () => patchFilters({ deadlineMode: "all", focusMode: "allOpen" }) } : {}),
  });
  if (filters.contractNumber) activeFilterChips.push({ label: `Договор: ${filters.contractNumber}`, onRemove: () => patchFilters({ contractNumber: "" }) });
  if (filters.responsible) activeFilterChips.push({ label: `Ответственный: ${filters.responsible}`, onRemove: () => patchFilters({ responsible: "" }) });
  if (filters.subject) activeFilterChips.push({ label: `Вид: ${filters.subject}`, onRemove: () => patchFilters({ subject: "" }) });
  if (filters.documentType) activeFilterChips.push({ label: `Тип: ${filters.documentType}`, onRemove: () => patchFilters({ documentType: "" }) });
  if (filters.author) activeFilterChips.push({ label: `Автор: ${filters.author}`, onRemove: () => patchFilters({ author: "" }) });
  if (filters.legalEntity) activeFilterChips.push({ label: `Юр. лицо: ${filters.legalEntity}`, onRemove: () => patchFilters({ legalEntity: "" }) });
  if (qualityIssueCount > 0) activeFilterChips.push({ label: `Качество данных: ${formatInteger(qualityIssueCount)}`, tone: "secondary" });

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
        description="Договорные согласования Tessa: что уже застряло, что истекает сегодня и где зона внимания по ответственным."
        actions={(themeToggle) => (
          <div className="grid w-full min-w-0 max-w-[430px] justify-items-end gap-2 sm:min-w-[320px]">
            <div className="flex w-full items-center justify-end gap-2">
              <HeaderIconButton to="/" title="Заменить отчет">
                <UploadCloud className="h-4 w-4 shrink-0" strokeWidth={2} />
              </HeaderIconButton>
              <HeaderIconButton to="/a3?dashboard=tessa" title="Открыть журнал A3-разборов">
                <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2} />
              </HeaderIconButton>
              <HelpLink />
              {themeToggle}
            </div>
            {loadedFile ? (
              <div className="w-full min-w-0 overflow-hidden rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2 text-xs text-raport-muted">
                <p className="mb-1 truncate font-semibold text-raport-text" title={loadedFile.fileName}>
                  {loadedFile.fileName}
                </p>
                <p className="truncate">
                  {period ? `${formatDate(period.from)} - ${formatDate(period.to)}` : "Период не определен"} · загружен{" "}
                  {formatShortDateTime(loadedFile.loadedAt)}
                </p>
              </div>
            ) : null}
          </div>
        )}
      />

      {hasData ? (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-3 lg:self-start">
            <TessaFilterSidebar filters={filters} options={options} deadlineCounts={deadlineCounts} onChange={patchFilters} onReset={resetFilters} />
          </div>

          <div className="grid gap-4">
            <FilterStatusBar chips={activeFilterChips} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label="Просрочены"
                value={formatInteger(kpis.stuck)}
                note={`${formatPercent(kpis.stuckRate)} от открытых`}
                Icon={AlertTriangle}
                tone="danger"
              />
              <MetricCard
                label="Исполнителей с просрочками"
                value={formatInteger(kpis.attentionPeople)}
                note="держат просрочки"
                Icon={Users}
                tone="warning"
              />
              <MetricCard label="Открыто в работе" value={formatInteger(kpis.open)} note="активные согласования" Icon={ClipboardCheck} tone="neutral" />
            </div>

            <SectionCard
              title="Главный вывод"
              description="Статус согласований и ключевая зона внимания."
              Icon={ClipboardCheck}
              actions={canCreateA3 ? <A3ReviewButton deviation={createTessaA3Deviation} onCreateDraft={setA3Draft} /> : undefined}
            >
              <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className={`rounded-control border px-4 py-3 ${kpis.stuck > 0 ? "border-raport-danger-border bg-raport-danger-muted text-raport-danger" : "border-raport-success-border bg-raport-success-muted text-raport-success"}`}>
                  <span className="block text-xs font-extrabold uppercase tracking-[0.12em]">{kpis.stuck > 0 ? "Зона внимания" : "Норма"}</span>
                  <strong className="mt-2 block text-3xl font-extrabold tabular-nums">{formatInteger(kpis.stuck)}</strong>
                  <span className="text-xs font-semibold">застрявших согласований</span>
                  <span className="mt-1 block text-xs font-semibold">{formatPercent(kpis.stuckRate)} от открытых</span>
                </div>
                <div className="grid gap-2 rounded-control border border-raport-border bg-raport-surface px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-raport-muted">Что проверить в первую очередь</p>
                  <div className="flex gap-2 text-sm font-semibold leading-relaxed text-raport-text">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-raport-primary" />
                    <span>{kpis.attentionPeople > 0 ? `${formatInteger(kpis.attentionPeople)} исполнителей держат просрочки.` : "Исполнителей с просрочками не найдено."}</span>
                  </div>
                  <div className="flex gap-2 text-sm font-semibold leading-relaxed text-raport-text">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-raport-primary" />
                    <span>{kpis.riskToday > 0 ? `${formatInteger(kpis.riskToday)} согласований рискуют застрять сегодня.` : "Срочных рисков на сегодня нет."}</span>
                  </div>
                </div>
              </div>
            </SectionCard>
            {a3Draft ? (
              <A3DashboardDraftPanel draft={a3Draft} onRefreshDraft={refreshTessaA3Draft} onClose={() => setA3Draft(null)} />
            ) : null}

            <SectionCard
              title="Исполнители с застрявшими договорами"
              description="Выберите ФИО для просмотра застрявших договоров."
              Icon={Users}
              actions={
                attentionPeople.length > 5 ? (
                  <>
                    {attentionPeople.length > 5 ? (
                      <DashboardSwitch
                        value={peopleMode}
                        onChange={(value) => setPeopleMode(value as "top" | "all")}
                        options={[
                          { value: "top", label: "ТОП" },
                          { value: "all", label: "Все" },
                        ]}
                      />
                    ) : null}
                  </>
                ) : undefined
              }
            >
              {visiblePeople.length === 0 ? (
                <div className="rounded-control border border-dashed border-raport-border bg-raport-surface-soft px-3 py-2 text-sm text-raport-muted">
                  {peopleEmptyMessage}
                </div>
              ) : (
                <div className="grid gap-2">
                  {visiblePeople.map((person, index) => (
                  <button
                    key={person.name}
                    type="button"
                    onClick={() => patchFilters({ responsible: person.name })}
                    className="grid gap-1 rounded-control border border-raport-border bg-raport-surface px-3 py-2 text-left hover:bg-raport-action-bg"
                  >
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                      <Badge variant="secondary" className="min-h-5 min-w-8 justify-center rounded-md px-1.5 text-[11px] tabular-nums">
                        #{index + 1}
                      </Badge>
                      <span className="min-w-0 truncate text-sm font-semibold text-raport-primary">{person.name}</span>
                      <span className="text-xs font-bold tabular-nums text-raport-text">{formatInteger(person.stuck)} / {formatInteger(person.open)}</span>
                    </div>
                    <PersonLoadStrip value={person.stuckRate} />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-raport-muted">
                      <span>{formatPercent(person.stuckRate)} просрочено</span>
                      <span>максимум {formatNumber(person.maxStuckDays)} дн.</span>
                      {person.riskToday > 0 ? <span className="text-raport-warning">{formatInteger(person.riskToday)} сегодня</span> : null}
                    </div>
                  </button>
                  ))}
                </div>
              )}
            </SectionCard>


            {quality && quality.invalidDeadlines + quality.invalidDocumentDates > 0 ? (
              <SectionCard title="Качество данных" description="Часть строк содержит некорректные даты.">
                <p className="text-sm text-raport-muted">
                  Строк с проблемными датами: {formatInteger(quality.invalidDeadlines + quality.invalidDocumentDates)}
                </p>
              </SectionCard>
            ) : null}

            <SectionCard
              title={registryTitle(filters.focusMode)}
              description="Детальный перечень договоров по текущим фильтрам."
              Icon={ListChecks}
              actions={
                <Button onClick={downloadFilteredCsv}>
                  <Download className="h-4 w-4" strokeWidth={2} />
                  Скачать таблицу
                </Button>
              }
            >
              <div className="grid gap-2">
                {visibleProblems.map((problem) => {
                  const isExpanded = expandedProblemKeys.has(problem.key);
                  return (
                    <article
                      key={problem.key}
                      className={`relative overflow-hidden rounded-control border px-3 py-2 pl-4 ${rowToneClass(problem.rating, problem.riskTodayCount)}`}
                    >
                      <span className={`absolute left-0 top-0 h-full w-1 ${priorityStripClass(problem.rating, problem.riskTodayCount)}`} aria-hidden />
                      <div className="grid gap-1.5">
                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                          <div className="min-w-0 truncate text-sm text-raport-text">
                            <DocumentTitle
                              documentType={problem.documentType}
                              regNumber={problem.regNumber}
                              contractNumber={problem.contractNumber}
                              rootContractNumber={problem.rootContractNumber}
                              onSelectContract={(value) => patchFilters({ contractNumber: value })}
                            />
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge
                              variant={priorityBadgeVariant(problem.rating, problem.riskTodayCount)}
                              className="min-h-6 px-2.5 py-1 text-xs font-bold tabular-nums"
                              title={problem.maxStuckDays > 0 ? "Максимальная просрочка" : "Срок истекает сегодня"}
                            >
                              {priorityLabel(problem.maxStuckDays, problem.riskTodayCount)}
                            </Badge>
                            <button
                              type="button"
                              onClick={() => toggleProblem(problem.key)}
                              aria-expanded={isExpanded}
                              className="inline-flex min-h-7 items-center gap-1 rounded-control border border-raport-border bg-raport-surface px-2 py-1 text-xs font-semibold text-raport-muted hover:bg-raport-surface-soft"
                            >
                              Детали
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-raport-muted">
                          <span>{formatInteger(problem.stuckCount)} {declineAgreement(problem.stuckCount)}</span>
                          <span>ответственные: {problem.responsibles}</span>
                          {problem.riskTodayCount > 0 ? (
                            <span className="text-raport-warning">{formatInteger(problem.riskTodayCount)} {declineRisk(problem.riskTodayCount)} сегодня</span>
                          ) : null}
                        </div>
                        {isExpanded ? (
                          <div className="mt-2 grid gap-2 border-t border-raport-border pt-2">
                            <p className="text-xs text-raport-muted">
                              Вид: {problem.subject} · Автор: {problem.authors}
                            </p>
                            <div className="grid gap-1">
                              {problem.records.slice(0, 6).map((record) => (
                                <div
                                  key={record.id}
                                  className="grid gap-1 rounded-control bg-raport-surface-soft px-2 py-1.5 text-xs text-raport-muted md:grid-cols-[minmax(0,1fr)_auto]"
                                >
                                  <span className="min-w-0 truncate">
                                    {record.responsible} · срок: {formatDate(record.deadline) || "не указан"}
                                    {record.newDeadline ? ` · новый срок: ${formatDate(record.newDeadline)}` : ""}
                                  </span>
                                  <span className="font-semibold text-raport-text">{record.status}</span>
                                </div>
                              ))}
                              {problem.records.length > 6 ? (
                                <p className="px-2 text-xs text-raport-muted">Еще строк: {formatInteger(problem.records.length - 6)}</p>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              {hasMoreProblems ? (
                <div className="mt-3 flex justify-center">
                  <Button variant="outline" onClick={() => setVisibleProblemsCount((count) => count + 25)}>
                    Показать еще 25
                  </Button>
                </div>
              ) : null}
            </SectionCard>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
