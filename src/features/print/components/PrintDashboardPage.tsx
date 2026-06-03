import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronDown, FileSpreadsheet, FileText, Gauge, Printer, Users } from "lucide-react";
import {
  ChartCard,
  DashboardHeader,
  DashboardSwitch,
  DataTable,
  FilterPanel,
  FilterStatusBar,
  MetricCard,
  PageShell,
  SectionCard,
} from "../../../shared/ui";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { Input } from "../../../shared/ui/shadcn/input";
import { Select } from "../../../shared/ui/shadcn/select";
import { readPendingDashboardData } from "../../../shared/pendingDashboardFile";
import {
  applyPrintFilters,
  buildPrintFilterOptions,
  buildRiskJobs,
  buildTopUsers,
  calculatePrintAnalytics,
  calculatePrintKpis,
  DEFAULT_TABLE_LIMITS,
  DEFAULT_TARIFFS,
  DOC_TYPES,
  formatDate,
  formatDateTime,
  formatInteger,
  formatPercent,
  formatShortDateTime,
  initialPrintFilters,
  PAPER_BUCKETS,
  RISK_REASON_OPTIONS,
} from "../logic/dashboard";
import type { PaperBucket, PrintBarDatum, PrintFilters, PrintImportResult, PrintJob, PrintTariffs, PrintUserAggregate } from "../types";

const REPORT_ROUTE = "/print";

type TableLimits = typeof DEFAULT_TABLE_LIMITS;
type UserSort = keyof Pick<PrintUserAggregate, "pages" | "cost" | "noDuplexPages" | "colorPages" | "bigJobs">;
type PrintQuickFocus = "all" | "simplex" | "color" | "bigJobs" | "pdfIncluded" | "pdfExcluded";

const QUICK_FOCUS_OPTIONS: Array<{ value: PrintQuickFocus; label: string; tone?: "neutral" | "warning" | "danger" | "success" }> = [
  { value: "all", label: "Все" },
  { value: "simplex", label: "Односторонняя", tone: "warning" },
  { value: "color", label: "Цветная", tone: "warning" },
  { value: "bigJobs", label: "100+ стр.", tone: "danger" },
  { value: "pdfIncluded", label: "PDF включен" },
  { value: "pdfExcluded", label: "PDF исключен", tone: "success" },
];

const USER_SORT_OPTIONS: Array<{ value: UserSort; label: string }> = [
  { value: "pages", label: "Страницы" },
  { value: "cost", label: "Оценка" },
  { value: "noDuplexPages", label: "Без двуст." },
  { value: "colorPages", label: "Цвет" },
  { value: "bigJobs", label: "100+" },
];

function quickFocusLabel(value: PrintQuickFocus): string {
  return QUICK_FOCUS_OPTIONS.find((option) => option.value === value)?.label ?? "Все";
}

function quickFocusFromFilters(filters: PrintFilters): PrintQuickFocus {
  if (filters.riskReason === "big-job") return "bigJobs";
  if (filters.color === "NOT GRAYSCALE") return "color";
  if (filters.duplex === "NOT DUPLEX") return "simplex";
  if (!filters.excludePdfPrinter) return "pdfIncluded";
  return "all";
}

function quickFocusButtonClass(active: boolean, tone: "neutral" | "warning" | "danger" | "success" = "neutral") {
  if (!active) return "border-[var(--raport-border)] bg-white text-[var(--raport-text)] hover:bg-[var(--raport-action-bg)]";
  if (tone === "danger") return "border-rose-300 bg-rose-50 text-rose-700 shadow-[inset_0_0_0_1px_rgb(254_205_211)]";
  if (tone === "warning") return "border-amber-300 bg-amber-50 text-amber-700 shadow-[inset_0_0_0_1px_rgb(253_230_138)]";
  if (tone === "success") return "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-[inset_0_0_0_1px_rgb(167_243_208)]";
  return "border-[var(--raport-action-border)] bg-[var(--raport-action-bg-active)] text-[var(--raport-primary)] shadow-[inset_0_0_0_1px_var(--raport-action-border)]";
}

function BarList({ items, valueLabel = "стр." }: { items: PrintBarDatum[]; valueLabel?: string }) {
  const max = Math.max(1, ...items.map((item) => item.pages));
  const hasData = items.some((item) => item.pages > 0);

  if (!hasData) {
    return <p className="rounded-[var(--raport-radius-control)] border border-dashed border-[var(--raport-border)] bg-[var(--raport-surface-soft)] px-3 py-2 text-sm text-[var(--raport-muted)]">Нет данных по выбранным фильтрам.</p>;
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item.label} className="grid gap-1">
          <div className="flex min-h-4 items-center justify-between gap-3 text-xs font-semibold text-[var(--raport-muted)]">
            <span className="min-w-0 truncate" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 tabular-nums text-[var(--raport-text)]">
              {formatInteger(item.pages)} {valueLabel}
            </span>
          </div>
          <progress
            max={max}
            value={item.pages}
            className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-200 [&::-moz-progress-bar]:bg-[var(--raport-primary)] [&::-webkit-progress-value]:bg-[var(--raport-primary)]"
          />
        </div>
      ))}
    </div>
  );
}

function tariffInputValue(value: number) {
  return Number.isFinite(value) ? String(value) : "0";
}

function parseTariffValue(value: string) {
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function riskBadgeVariant(kind: PrintJob["riskReasons"][number]["kind"]): "danger" | "warning" | "default" | "success" {
  if (kind === "danger") return "danger";
  if (kind === "warning") return "warning";
  if (kind === "success") return "success";
  return "default";
}

function isDate(value: Date | null): value is Date {
  return value instanceof Date;
}

function formatFilterDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}.${month}.${year}` : value;
}

function AutocompleteField({
  value,
  onChange,
  placeholder,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const blurTimerRef = useRef<number | null>(null);
  const visibleOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    const matched = query.length === 0 ? options : options.filter((option) => option.toLowerCase().includes(query));
    return matched.slice(0, 80);
  }, [options, value]);
  useEffect(() => {
    return () => {
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        className="pr-9"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (blurTimerRef.current !== null) {
            window.clearTimeout(blurTimerRef.current);
          }
          blurTimerRef.current = window.setTimeout(() => {
            setOpen(false);
            blurTimerRef.current = null;
          }, 120);
        }}
      />
      <button
        type="button"
        className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-[var(--raport-radius-control)] text-[var(--raport-muted)] hover:bg-[var(--raport-action-bg)]"
        aria-label="Показать список"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </button>
      {open && visibleOptions.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white py-1 shadow-[var(--raport-shadow-card)]">
          {visibleOptions.map((option) => (
            <button
              key={option}
              type="button"
              className="block w-full truncate px-3 py-2 text-left text-sm text-[var(--raport-text)] hover:bg-[var(--raport-action-bg)]"
              title={option}
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function QuickFocusPanel({ value, onChange }: { value: PrintQuickFocus; onChange: (value: PrintQuickFocus) => void }) {
  return (
    <div className="rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-[var(--raport-surface-soft)] p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--raport-muted)]">Быстрый фокус</span>
        <span className="rounded-full border border-[var(--raport-action-border)] bg-[var(--raport-action-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--raport-primary)]">
          {quickFocusLabel(value)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {QUICK_FOCUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`min-h-8 rounded-[var(--raport-radius-control)] border px-2 py-1 text-xs font-semibold transition-colors ${quickFocusButtonClass(value === option.value, option.tone)}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SortToolbar({
  sortLabel = "Сортировка",
  sortValue,
  sortOptions,
  onSortChange,
  limitValue,
  onLimitChange,
}: {
  sortLabel?: string;
  sortValue: string;
  sortOptions: Array<{ value: string; label: string }>;
  onSortChange: (value: string) => void;
  limitValue: string;
  onLimitChange: (value: string) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-[var(--raport-surface-soft)] px-3 py-2">
      <DashboardSwitch label={sortLabel} value={sortValue} onChange={onSortChange} options={sortOptions} />
      <DashboardSwitch
        label="Показать"
        value={limitValue}
        onChange={onLimitChange}
        options={[
          { value: "10", label: "10" },
          { value: "20", label: "20" },
        ]}
      />
    </div>
  );
}

function RiskJobList({
  rows,
  onUserSelect,
}: {
  rows: PrintJob[];
  onUserSelect: (user: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-[var(--raport-radius-control)] border border-dashed border-[var(--raport-border)] bg-[var(--raport-surface-soft)] px-3 py-2 text-sm text-[var(--raport-muted)]">
        Нет заданий с отклонениями по выбранным фильтрам.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {rows.map((row, index) => (
        <article
          key={`${row.dateKey}-${row.user}-${row.documentName}-${index}`}
          className="grid gap-2 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-3 py-2"
        >
          <div className="grid min-w-0 gap-2 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start">
            <span className="inline-flex min-h-7 min-w-9 items-center justify-center rounded-full border border-[var(--raport-action-border)] bg-[var(--raport-action-bg)] px-2 text-xs font-extrabold tabular-nums text-[var(--raport-primary)]">
              #{index + 1}
            </span>
            <div className="min-w-0">
              <button className="block max-w-full truncate text-left text-sm font-bold text-[var(--raport-primary)] hover:underline" onClick={() => onUserSelect(row.user)}>
                {row.user}
              </button>
              <p className="mt-0.5 truncate text-xs font-semibold text-[var(--raport-text)]" title={row.documentName}>
                {row.documentName}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--raport-muted)] md:justify-end">
              <span className="tabular-nums text-[var(--raport-text)]">{formatInteger(row.totalPages)} стр.</span>
              <time dateTime={row.date?.toISOString()}>{formatDateTime(row.date)}</time>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="danger">Балл риска: {formatInteger(row.riskScore)}</Badge>
            {row.riskReasons.map((reason) => (
              <Badge key={`${row.documentName}-${reason.code}`} variant={riskBadgeVariant(reason.kind)}>
                {reason.label}
              </Badge>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function PrintDashboardPage() {
  const navigate = useNavigate();
  const [report] = useState<PrintImportResult | null>(() => readPendingDashboardData<PrintImportResult>(REPORT_ROUTE));
  const [filters, setFilters] = useState<PrintFilters | null>(() => (report ? initialPrintFilters(report.jobs) : null));
  const [tariffs, setTariffs] = useState<PrintTariffs>(DEFAULT_TARIFFS);
  const [tableLimits, setTableLimits] = useState<TableLimits>(DEFAULT_TABLE_LIMITS);
  const [userSort, setUserSort] = useState<UserSort>("pages");
  const [riskSort, setRiskSort] = useState<"riskScore" | "totalPages">("riskScore");

  useEffect(() => {
    if (report) return;
    navigate("/", { replace: true, state: { statusNotice: "Данные Print не найдены" } });
  }, [navigate, report]);

  useEffect(() => {
    if (!report || filters) return;
    setFilters(initialPrintFilters(report.jobs));
  }, [filters, report]);

  const options = useMemo(() => buildPrintFilterOptions(report?.jobs ?? []), [report]);
  const filteredRows = useMemo(() => (report && filters ? applyPrintFilters(report.jobs, filters) : []), [filters, report]);
  const kpis = useMemo(() => calculatePrintKpis(filteredRows, tariffs), [filteredRows, tariffs]);
  const topUsers = useMemo(() => buildTopUsers(filteredRows, tariffs, userSort, tableLimits.users), [filteredRows, tariffs, userSort, tableLimits.users]);
  const { paperBars, docTypeBars, excessSummary } = useMemo(() => calculatePrintAnalytics(filteredRows), [filteredRows]);
  const riskJobs = useMemo(() => buildRiskJobs(filteredRows, riskSort, tableLimits.risk), [filteredRows, riskSort, tableLimits.risk]);

  if (!report) return null;

  if (!filters) {
    return (
      <PageShell>
        <DashboardHeader
          title="Рапорт"
          description="Загрузка отчета Print."
          actions={
            <Link
              to="/"
              className="inline-flex min-h-8 items-center rounded-[var(--raport-radius-control)] border border-[var(--raport-action-border)] bg-[var(--raport-action-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--raport-primary)] hover:bg-[var(--raport-action-bg-active)]"
            >
              Заменить отчет
            </Link>
          }
        />
        <SectionCard title="Подготовка Print" description="Данные отчета подготавливаются к отображению.">
          <p className="text-sm text-[var(--raport-muted)]">Пожалуйста, подождите.</p>
        </SectionCard>
      </PageShell>
    );
  }

  const resetFilters = () => setFilters(initialPrintFilters(report.jobs));
  const patchFilters = (next: Partial<PrintFilters>) => setFilters((current) => (current ? { ...current, ...next } : current));
  const reportDates = report.jobs.map((row) => row.date).filter(isDate);
  const period = reportDates.length
    ? {
        from: [...reportDates].sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
        to: [...reportDates].sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
      }
    : null;

  const quickFocus = quickFocusFromFilters(filters);

  function applyQuickFocus(value: PrintQuickFocus) {
    if (value === "all") {
      patchFilters({ color: "", duplex: "", riskReason: "" });
      return;
    }
    if (value === "simplex") {
      patchFilters({ duplex: "NOT DUPLEX", color: "", riskReason: "" });
      return;
    }
    if (value === "color") {
      patchFilters({ color: "NOT GRAYSCALE", duplex: "", riskReason: "" });
      return;
    }
    if (value === "bigJobs") {
      patchFilters({ riskReason: "big-job", color: "", duplex: "" });
      return;
    }
    if (value === "pdfIncluded") {
      patchFilters({ excludePdfPrinter: false });
      return;
    }
    patchFilters({ excludePdfPrinter: true });
  }

  const chips = [
    { label: `Период: ${filters.dateFrom ? formatFilterDate(filters.dateFrom) : "начало"} - ${filters.dateTo ? formatFilterDate(filters.dateTo) : "конец"}` },
    ...(quickFocus !== "all" ? [{ label: `Фокус: ${quickFocusLabel(quickFocus)}`, onRemove: () => applyQuickFocus("all") }] : []),
    ...(filters.excludePdfPrinter ? [{ label: "PDF-принтер исключен" }] : [{ label: "PDF-принтер включен", tone: "secondary" as const }]),
    ...(filters.user ? [{ label: `Пользователь: ${filters.user}`, onRemove: () => patchFilters({ user: "" }) }] : []),
    ...(filters.computer ? [{ label: `Компьютер: ${filters.computer}`, onRemove: () => patchFilters({ computer: "" }) }] : []),
    ...(filters.documentText ? [{ label: `Документ: ${filters.documentText}`, onRemove: () => patchFilters({ documentText: "" }) }] : []),
    ...(filters.docType ? [{ label: `Тип: ${filters.docType}`, onRemove: () => patchFilters({ docType: "" }) }] : []),
    ...(filters.color ? [{ label: filters.color === "NOT GRAYSCALE" ? "Цветная" : "Черно-белая", onRemove: () => patchFilters({ color: "" }) }] : []),
    ...(filters.duplex ? [{ label: filters.duplex === "DUPLEX" ? "Двусторонняя" : "Односторонняя", onRemove: () => patchFilters({ duplex: "" }) }] : []),
    ...(filters.riskReason ? [{ label: RISK_REASON_OPTIONS.find((item) => item.value === filters.riskReason)?.label ?? filters.riskReason, onRemove: () => patchFilters({ riskReason: "" }) }] : []),
  ];

  return (
    <PageShell>
      <DashboardHeader
        className="mb-3"
        title={
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <FileSpreadsheet className="h-6 w-6" strokeWidth={2.3} />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-2xl font-extrabold text-slate-900 md:text-3xl">Рапорт</span>
              <span className="mt-1 block text-sm font-bold text-[var(--raport-primary)]">Excel докладывает главное</span>
            </div>
          </div>
        }
        description="Анализ печати: страницы, пользователи, форматы бумаги, типы документов и задания с отклонениями."
        actions={
          <div className="flex w-full max-w-[420px] flex-col items-end gap-2">
            <Link
              to="/"
              className="inline-flex min-h-8 items-center rounded-[var(--raport-radius-control)] border border-[var(--raport-action-border)] bg-[var(--raport-action-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--raport-primary)] hover:bg-[var(--raport-action-bg-active)]"
            >
              Заменить отчет
            </Link>
            <div className="w-full rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-[var(--raport-surface-soft)] px-3 py-2 text-xs text-[var(--raport-muted)]">
              <p className="mb-1 truncate font-semibold text-[var(--raport-text)]" title={report.file.fileName}>
                {report.file.fileName}
              </p>
              <p>Период: {period?.from && period?.to ? `${formatDate(period.from)} - ${formatDate(period.to)}` : "не определен"}</p>
              <p>Загружен: {formatShortDateTime(report.file.loadedAt)}</p>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-3 lg:self-start">
          <FilterPanel onReset={resetFilters}>
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-[var(--raport-muted)]">Период с</span>
                <Input type="date" value={filters.dateFrom} onChange={(event) => patchFilters({ dateFrom: event.target.value })} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-[var(--raport-muted)]">Период по</span>
                <Input type="date" value={filters.dateTo} onChange={(event) => patchFilters({ dateTo: event.target.value })} />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-[var(--raport-muted)]">Пользователь</span>
                <AutocompleteField
                  value={filters.user}
                  onChange={(value) => patchFilters({ user: value })}
                  placeholder="Все пользователи"
                  options={options.users}
                  ariaLabel="Фильтр по пользователю"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-[var(--raport-muted)]">Компьютер</span>
                <AutocompleteField
                  value={filters.computer}
                  onChange={(value) => patchFilters({ computer: value })}
                  placeholder="Все компьютеры"
                  options={options.computers}
                  ariaLabel="Фильтр по компьютеру"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-[var(--raport-muted)]">Документ</span>
                <Input value={filters.documentText} placeholder="Фрагмент названия" onChange={(event) => patchFilters({ documentText: event.target.value })} />
              </label>

              <QuickFocusPanel value={quickFocus} onChange={applyQuickFocus} />

              <details className="rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-[var(--raport-surface-soft)] px-3 py-2">
                <summary className="cursor-pointer select-none text-xs font-semibold text-[var(--raport-muted)]">Дополнительно</summary>
                <div className="mt-3 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-[var(--raport-muted)]">Тип документа</span>
                <Select value={filters.docType} onChange={(event) => patchFilters({ docType: event.target.value })}>
                  <option value="">Все типы</option>
                  {DOC_TYPES.filter((type) => options.docTypes.includes(type)).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-[var(--raport-muted)]">Цветность</span>
                <Select value={filters.color} onChange={(event) => patchFilters({ color: event.target.value })}>
                  <option value="">Любая</option>
                  <option value="GRAYSCALE">Черно-белая</option>
                  <option value="NOT GRAYSCALE">Цветная</option>
                </Select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-[var(--raport-muted)]">Двусторонняя печать</span>
                <Select value={filters.duplex} onChange={(event) => patchFilters({ duplex: event.target.value })}>
                  <option value="">Все режимы</option>
                  <option value="DUPLEX">Двусторонняя</option>
                  <option value="NOT DUPLEX">Односторонняя</option>
                </Select>
              </label>

              <div className="grid gap-2">
                <span className="text-xs text-[var(--raport-muted)]">Формат бумаги</span>
                <div className="grid gap-1">
                  {PAPER_BUCKETS.map((bucket) => (
                    <label key={bucket} className="flex items-center gap-2 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-2 py-1 text-xs font-semibold text-[var(--raport-text)]">
                      <input
                        type="checkbox"
                        checked={filters.paperBuckets.includes(bucket)}
                        onChange={(event) => {
                          const next = event.target.checked ? [...filters.paperBuckets, bucket] : filters.paperBuckets.filter((item) => item !== bucket);
                          patchFilters({ paperBuckets: next as PaperBucket[] });
                        }}
                      />
                      <span>{bucket}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="grid gap-1">
                <span className="text-xs text-[var(--raport-muted)]">Причина отклонения</span>
                <Select value={filters.riskReason} onChange={(event) => patchFilters({ riskReason: event.target.value })}>
                  <option value="">Все причины</option>
                  {RISK_REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="flex items-start gap-2 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-2 py-2 text-xs text-[var(--raport-muted)]">
                <input type="checkbox" checked={filters.excludePdfPrinter} onChange={(event) => patchFilters({ excludePdfPrinter: event.target.checked })} />
                <span>
                  <strong className="block text-[var(--raport-text)]">Исключить печать в PDF</strong>
                  Принтер Microsoft Print to PDF
                </span>
              </label>
                </div>
              </details>

              <details className="rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-[var(--raport-surface-soft)] px-3 py-2">
                <summary className="cursor-pointer select-none text-xs font-semibold text-[var(--raport-muted)]">Тарифы</summary>
                <div className="mt-2 grid gap-2">
                  {[
                    ["bwRate", "Ч/б страница, руб."],
                    ["colorRate", "Цветная страница, руб."],
                    ["simplexRate", "Односторонняя, коэффициент"],
                    ["duplexRate", "Двусторонняя, коэффициент"],
                  ].map(([key, label]) => (
                    <label key={key} className="grid gap-1">
                      <span className="text-[11px] text-[var(--raport-muted)]">{label}</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={tariffInputValue(tariffs[key as keyof PrintTariffs])}
                        onChange={(event) => setTariffs((current) => ({ ...current, [key]: parseTariffValue(event.target.value) }))}
                      />
                    </label>
                  ))}
                </div>
              </details>
            </div>
          </FilterPanel>
        </div>

        <div className="grid gap-4">
          <FilterStatusBar chips={chips} />

          <div className="grid gap-3">
            <div className="grid gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--raport-muted)]">Объем и стоимость</p>
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Всего страниц" value={formatInteger(kpis.totalPages)} note={`${formatInteger(kpis.totalJobs)} заданий`} Icon={Printer} tone="neutral" />
                <MetricCard label="Уникальные пользователи" value={formatInteger(kpis.usersCount)} note="в текущей выборке" Icon={Users} tone="neutral" />
                <MetricCard label="Оценка стоимости" value={formatInteger(kpis.estimatedCost)} note="руб." Icon={Printer} tone="success" />
              </div>
            </div>
            <div className="grid gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--raport-muted)]">Отклонения печати</p>
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Односторонняя печать" value={formatPercent(kpis.simplexRatio)} note={`${formatInteger(kpis.simplexPages)} страниц`} Icon={FileText} tone="warning" />
                <MetricCard label="Цветная печать" value={formatPercent(kpis.colorRatio)} note={`${formatInteger(kpis.colorPages)} страниц`} Icon={Gauge} tone="warning" />
                <MetricCard label="Задания от 100 стр." value={formatInteger(kpis.bigJobs)} note={`${formatInteger(kpis.bigPages)} страниц`} Icon={AlertTriangle} tone="danger" />
              </div>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <SectionCard title="Нет данных" description="По выбранным фильтрам заданий нет.">
              <p className="text-sm text-[var(--raport-muted)]">Измените параметры или нажмите «Сбросить».</p>
            </SectionCard>
          ) : null}

          <SectionCard
            title="Топ пользователей по страницам"
            description="Рейтинг пользователей в текущей выборке."
            Icon={Users}
          >
            <SortToolbar
              sortValue={userSort}
              sortOptions={USER_SORT_OPTIONS}
              onSortChange={(value) => setUserSort(value as UserSort)}
              limitValue={String(tableLimits.users)}
              onLimitChange={(value) => setTableLimits((current) => ({ ...current, users: Number(value) }))}
            />
            <DataTable
              rows={topUsers.map((row, index) => ({ ...row, rank: index + 1 }))}
              rowKey={(row) => row.user}
              columns={[
                {
                  key: "rank",
                  header: "#",
                  cell: (row) => (
                    <span className="inline-flex min-h-6 min-w-8 items-center justify-center rounded-full border border-[var(--raport-action-border)] bg-[var(--raport-action-bg)] px-2 text-xs font-extrabold tabular-nums text-[var(--raport-primary)]">
                      #{row.rank}
                    </span>
                  ),
                  className: "w-12 whitespace-nowrap",
                },
                { key: "user", header: "Пользователь", cell: (row) => <button className="max-w-[220px] truncate text-left font-semibold text-[var(--raport-primary)] hover:underline" onClick={() => patchFilters({ user: row.user })}>{row.user}</button> },
                { key: "pages", header: "Стр.", cell: (row) => formatInteger(row.pages), className: "text-right tabular-nums" },
                { key: "cost", header: "Оценка, руб", cell: (row) => formatInteger(row.cost), className: "text-right tabular-nums" },
                { key: "noDuplexPages", header: "Без двуст.", cell: (row) => formatInteger(row.noDuplexPages), className: "text-right tabular-nums" },
                { key: "colorPages", header: "Цвет", cell: (row) => formatInteger(row.colorPages), className: "text-right tabular-nums" },
                { key: "bigJobs", header: "100+", cell: (row) => formatInteger(row.bigJobs), className: "text-right tabular-nums" },
              ]}
            />
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Тип документа" description="Распределение напечатанных страниц по типам документов." Icon={FileText}>
              <BarList items={docTypeBars} />
            </ChartCard>
            <ChartCard title="Формат бумаги" description="Распределение страниц по формату бумаги." Icon={Printer}>
              <BarList items={paperBars} />
            </ChartCard>
          </div>

          <SectionCard title="Потенциально избыточная печать" description="Личные тематики, нормативные документы и служебные записки." Icon={AlertTriangle}>
            <div className="mb-3 grid gap-2 md:grid-cols-3">
              <div className="rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-3 py-2">
                <strong className="block text-xl font-extrabold text-[var(--raport-text)]">{formatInteger(excessSummary.jobs)}</strong>
                <span className="text-xs font-semibold text-[var(--raport-muted)]">заданий</span>
              </div>
              <div className="rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-3 py-2">
                <strong className="block text-xl font-extrabold text-[var(--raport-text)]">{formatInteger(excessSummary.pages)}</strong>
                <span className="text-xs font-semibold text-[var(--raport-muted)]">страниц</span>
              </div>
              <div className="rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-3 py-2">
                <strong className="block text-xl font-extrabold text-[var(--raport-text)]">{formatInteger(excessSummary.users)}</strong>
                <span className="text-xs font-semibold text-[var(--raport-muted)]">пользователей</span>
              </div>
            </div>
            <BarList items={excessSummary.categories} />
          </SectionCard>

          <SectionCard
            title="Топ заданий с отклонениями"
            description="Сортировка по баллу риска или по объему страниц."
            Icon={AlertTriangle}
          >
            <SortToolbar
              sortValue={riskSort}
              sortOptions={[
                { value: "riskScore", label: "Балл" },
                { value: "totalPages", label: "Страницы" },
              ]}
              onSortChange={(value) => setRiskSort(value as "riskScore" | "totalPages")}
              limitValue={String(tableLimits.risk)}
              onLimitChange={(value) => setTableLimits((current) => ({ ...current, risk: Number(value) }))}
            />
            <RiskJobList rows={riskJobs} onUserSelect={(user) => patchFilters({ user })} />
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}





