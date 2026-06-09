import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Factory, Gauge, type LucideIcon } from "lucide-react";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { DashboardSwitch, DataTable, MetricCard, SectionCard } from "../../../shared/ui";
import type { DashboardSnapshot } from "../../../shared/lib/historyDB";
import type { ContributionRow, KpiCardData } from "../logic/dashboard";
import { formatHours, formatPercent } from "../logic/format";
import { RankBadge, RowNameButton } from "./SszControls";

type TechnologyStatusFilter = "all" | "met" | "below";

type MetricDelta = {
  label: string;
  variant: "success" | "danger" | "secondary";
};

const targetMarkerClassByStep: Record<number, string> = {
  0: "left-0",
  5: "left-[5%]",
  10: "left-[10%]",
  15: "left-[15%]",
  20: "left-[20%]",
  25: "left-[25%]",
  30: "left-[30%]",
  35: "left-[35%]",
  40: "left-[40%]",
  45: "left-[45%]",
  50: "left-1/2",
  55: "left-[55%]",
  60: "left-[60%]",
  65: "left-[65%]",
  70: "left-[70%]",
  75: "left-3/4",
  80: "left-[80%]",
  85: "left-[85%]",
  90: "left-[90%]",
  95: "left-[95%]",
  100: "left-full",
};

const deltaTextClass: Record<MetricDelta["variant"], string> = {
  success: "text-emerald-700",
  danger: "text-red-700",
  secondary: "text-raport-muted",
};

export function targetTone(value: number | null, targetRatio: number): "low" | "medium" | "high" {
  const ratioValue = value ?? 0;
  if (ratioValue >= targetRatio) return "high";
  if (targetRatio - ratioValue <= 0.1) return "medium";
  return "low";
}

function statusLabel(row: ContributionRow, targetRatio: number): "Цель достигнута" | "Ниже цели" {
  return (row.ownTechnologyRatio ?? 0) >= targetRatio ? "Цель достигнута" : "Ниже цели";
}

function filterByTechnologyStatus(rows: ContributionRow[], filter: TechnologyStatusFilter, targetRatio: number): ContributionRow[] {
  if (filter === "met") return rows.filter((row) => (row.ownTechnologyRatio ?? 0) >= targetRatio);
  if (filter === "below") return rows.filter((row) => (row.ownTechnologyRatio ?? 0) < targetRatio);
  return rows;
}

export function leaderboardRows(rows: ContributionRow[], mode: "leaders" | "attention"): ContributionRow[] {
  return [...rows].sort((left, right) => {
    const leftRatio = left.ownTechnologyRatio ?? 0;
    const rightRatio = right.ownTechnologyRatio ?? 0;
    if (mode === "leaders") {
      return right.technologyTime - left.technologyTime || right.technologyOperationCount - left.technologyOperationCount || rightRatio - leftRatio;
    }

    return (
      right.noTechnologyTime - left.noTechnologyTime ||
      right.noTechnologyOperationCount - left.noTechnologyOperationCount ||
      leftRatio - rightRatio
    );
  });
}

function growthSeverity(value: number | null): "critical" | "risk" | "soft" {
  const ratioValue = value ?? 0;
  if (ratioValue >= 0.8) return "critical";
  if (ratioValue >= 0.5) return "risk";
  return "soft";
}

function snapshotMetric(snapshot: DashboardSnapshot | null, key: string): number | null {
  const value = snapshot?.metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatSignedNumber(value: number, digits: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toLocaleString("ru-RU", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}`;
}

function percentDelta(currentRatio: number | null, previousSnapshot: DashboardSnapshot | null, metricKey: string): MetricDelta | null {
  if (currentRatio === null) return null;
  const previousValue = snapshotMetric(previousSnapshot, metricKey);
  if (previousValue === null) return null;
  const currentValue = currentRatio * 100;
  const delta = currentValue - previousValue;

  return {
    label: `${formatSignedNumber(delta, 1)} п.п.`,
    variant: Math.abs(delta) < 0.05 ? "secondary" : delta > 0 ? "success" : "danger",
  };
}

function countDelta(currentValue: number, previousSnapshot: DashboardSnapshot | null, metricKey: string): MetricDelta | null {
  const previousValue = snapshotMetric(previousSnapshot, metricKey);
  if (previousValue === null) return null;
  const delta = currentValue - previousValue;

  return {
    label: formatSignedNumber(delta, 0),
    variant: "secondary",
  };
}

function MetricNote({ label, delta }: { label: string; delta: MetricDelta | null }) {
  return (
    <div className="grid gap-1">
      <span>{label}</span>
      {delta ? <span className={deltaTextClass[delta.variant]}>к предыдущему месяцу: {delta.label}</span> : null}
    </div>
  );
}

function ProgressStrip({
  value,
  targetRatio,
  mode,
  showTargetMarker = false,
  spacingClassName = "mt-1.5",
}: {
  value: number | null;
  targetRatio?: number;
  mode: "technology" | "attention";
  showTargetMarker?: boolean;
  spacingClassName?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, Math.round((value ?? 0) * 1000) / 10));
  const markerRatio = mode === "attention" ? 1 - (targetRatio ?? 0.7) : (targetRatio ?? 0.7);
  const safeTarget = Math.max(0, Math.min(100, Math.round(markerRatio * 100)));
  const targetStep = Math.round(safeTarget / 5) * 5;
  const tone =
    mode === "technology"
      ? targetTone(value, targetRatio ?? 0.7)
      : growthSeverity(value) === "critical"
        ? "low"
        : "medium";

  const barClass =
    tone === "high"
      ? "[&::-moz-progress-bar]:bg-raport-success [&::-webkit-progress-value]:bg-raport-success"
      : tone === "medium"
        ? "[&::-moz-progress-bar]:bg-raport-warning [&::-webkit-progress-value]:bg-raport-warning"
        : "[&::-moz-progress-bar]:bg-raport-danger [&::-webkit-progress-value]:bg-raport-danger";

  return (
    <div className={spacingClassName}>
      <div className="relative">
        <progress
          max={100}
          value={safeValue}
          className={`h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-200 ${barClass}`}
        />
        {showTargetMarker ? (
          <span
            className={`absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-slate-500/70 ${targetMarkerClassByStep[targetStep] ?? "left-[70%]"}`}
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}

export function SszKpiCards({
  data,
  targetPercent,
  previousSnapshot,
}: {
  data: KpiCardData;
  targetPercent: number;
  previousSnapshot: DashboardSnapshot | null;
}) {
  const workTone = targetTone(data.workTechnologyRatio, targetPercent / 100);
  const operationTone = targetTone(data.operationTechnologyRatio, targetPercent / 100);
  const sszDelta = countDelta(data.sszCount, previousSnapshot, "sszCount");
  const workDelta = percentDelta(data.workTechnologyRatio, previousSnapshot, "workTechnologyPercent");
  const operationDelta = percentDelta(data.operationTechnologyRatio, previousSnapshot, "operationTechnologyPercent");

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <MetricCard
        label="Всего ССЗ"
        value={data.sszCount.toLocaleString("ru-RU")}
        note={<MetricNote label="в анализируемом периоде" delta={sszDelta} />}
        Icon={ClipboardList}
        tone="neutral"
      />
      <MetricCard
        label="Доля работ по технологии"
        value={formatPercent(data.workTechnologyRatio)}
        note={<MetricNote label="по нормо-часам" delta={workDelta} />}
        Icon={Factory}
        tone={workTone === "high" ? "success" : workTone === "medium" ? "warning" : "danger"}
      />
      <MetricCard
        label="Доля операций по технологии"
        value={formatPercent(data.operationTechnologyRatio)}
        note={<MetricNote label="по количеству операций" delta={operationDelta} />}
        Icon={Gauge}
        tone={operationTone === "high" ? "success" : operationTone === "medium" ? "warning" : "danger"}
      />
    </div>
  );
}

export function MasterLeaderboardCard({
  title,
  description,
  rows,
  tone,
  targetRatio,
  onMasterClick,
}: {
  title: string;
  description: string;
  rows: ContributionRow[];
  tone: "support" | "growth";
  targetRatio: number;
  onMasterClick: (master: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const scopedRows = useMemo(
    () =>
      rows.filter((row) => {
        const technologyRatio = row.ownTechnologyRatio ?? 0;
        return tone === "support"
          ? technologyRatio >= targetRatio
          : technologyRatio < targetRatio && (row.noTechnologyTime > 0 || row.noTechnologyOperationCount > 0);
      }),
    [rows, targetRatio, tone],
  );

  const ordered = useMemo(() => leaderboardRows(scopedRows, tone === "support" ? "leaders" : "attention"), [scopedRows, tone]);
  const visibleRows = showAll ? ordered : ordered.slice(0, 5);

  return (
    <SectionCard
      title={title}
      description={description}
      Icon={tone === "support" ? CheckCircle2 : AlertTriangle}
      pinActionsRight
      actions={
        ordered.length > 5 ? (
          <DashboardSwitch
            value={showAll ? "all" : "top"}
            onChange={(value) => setShowAll(value === "all")}
            options={[
              { value: "top", label: "ТОП" },
              { value: "all", label: "Все" },
            ]}
          />
        ) : undefined
      }
    >
      {visibleRows.length === 0 ? (
        <p className="text-sm text-raport-muted">Нет данных для текущей выборки.</p>
      ) : (
        <div className="divide-y divide-raport-border rounded-control border border-raport-border bg-white px-3">
          {visibleRows.map((row, index) => (
            <div key={row.key} className="py-1.5">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_64px_86px_74px] items-center gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <RankBadge rank={index + 1} tone={tone === "support" ? "support" : growthSeverity(row.ownNoTechnologyRatio) === "critical" ? "danger" : "warning"} />
                  <RowNameButton text={row.key} onClick={() => onMasterClick(row.key)} className="text-sm font-semibold leading-[14px]" />
                </div>
                <span className="text-right text-sm font-extrabold leading-[14px] tabular-nums text-raport-text">
                  {formatPercent(tone === "support" ? row.ownTechnologyRatio : row.ownNoTechnologyRatio)}
                </span>
                <span className="text-right text-[11px] font-semibold leading-[14px] tabular-nums text-raport-muted">
                  {formatHours(tone === "support" ? row.technologyTime : row.noTechnologyTime)}
                </span>
                <span className="text-right text-[11px] font-semibold leading-[14px] tabular-nums text-raport-muted">
                  {(tone === "support" ? row.technologyOperationCount : row.noTechnologyOperationCount).toLocaleString("ru-RU")}
                </span>
              </div>
              <ProgressStrip
                value={tone === "support" ? row.ownTechnologyRatio : row.ownNoTechnologyRatio}
                targetRatio={targetRatio}
                mode={tone === "support" ? "technology" : "attention"}
                spacingClassName="mt-1"
              />
              <div className="mt-0.5 flex min-h-4 items-center text-[11px] leading-4 tabular-nums text-raport-muted">
                <span>
                  н-ч всего: {formatHours(row.totalTime)} · н-ч {tone === "support" ? "по тех." : "без тех."}:{" "}
                  {formatHours(tone === "support" ? row.technologyTime : row.noTechnologyTime)} · опер. {tone === "support" ? "по тех." : "без тех."}:{" "}
                  {(tone === "support" ? row.technologyOperationCount : row.noTechnologyOperationCount).toLocaleString("ru-RU")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export function TechnologyBoardCard({
  title,
  subtitle,
  Icon,
  rows,
  targetRatio,
  onRowClick,
  layout = "table",
}: {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  rows: ContributionRow[];
  targetRatio: number;
  onRowClick?: (value: string) => void;
  layout?: "table" | "compact-list";
}) {
  const [showAll, setShowAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TechnologyStatusFilter>("all");

  const scopedRows = useMemo(() => filterByTechnologyStatus(rows, statusFilter, targetRatio), [rows, statusFilter, targetRatio]);
  const visibleRows = showAll ? scopedRows : scopedRows.slice(0, 5);

  return (
    <SectionCard
      title={title}
      description={subtitle}
      Icon={Icon}
      pinActionsRight
      headerClassName="pb-1"
      actions={
        scopedRows.length > 5 ? (
          <DashboardSwitch
            value={showAll ? "all" : "top"}
            onChange={(value) => setShowAll(value === "all")}
            options={[
              { value: "top", label: "ТОП" },
              { value: "all", label: "Все" },
            ]}
          />
        ) : undefined
      }
    >
      <div className="mb-2 mt-0 flex justify-center">
        <DashboardSwitch
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as TechnologyStatusFilter)}
          options={[
            { value: "all", label: "Все" },
            { value: "met", label: "Цель достигнута" },
            { value: "below", label: "Ниже цели" },
          ]}
        />
      </div>

      {visibleRows.length === 0 ? (
        <p className="text-sm text-raport-muted">Нет данных для текущей выборки.</p>
      ) : layout === "compact-list" ? (
        <div className="divide-y divide-raport-border rounded-control border border-raport-border bg-white px-3">
          {visibleRows.map((row) => (
            <div key={row.key} className="py-1.5">
              <div className="grid gap-1">
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_132px] items-center gap-2">
                  <div className="min-w-0">
                    {onRowClick ? (
                      <RowNameButton text={row.key} onClick={() => onRowClick(row.key)} className="w-full text-sm font-semibold leading-[14px]" />
                    ) : (
                      <span className="block truncate text-sm font-semibold leading-[14px]">{row.key}</span>
                    )}
                  </div>
                  <div className="grid shrink-0 grid-cols-[44px_88px] items-center gap-1">
                    <span className="text-right text-xs font-semibold leading-[14px] tabular-nums text-raport-text">
                      {formatPercent(row.ownTechnologyRatio)}
                    </span>
                    <Badge
                      className="min-h-5 w-[88px] justify-center overflow-hidden text-ellipsis whitespace-nowrap px-1 py-0 text-[9px] leading-4"
                      variant={statusLabel(row, targetRatio) === "Цель достигнута" ? "secondary" : "warning"}
                    >
                      {statusLabel(row, targetRatio)}
                    </Badge>
                  </div>
                </div>
                <ProgressStrip value={row.ownTechnologyRatio} targetRatio={targetRatio} mode="technology" showTargetMarker spacingClassName="mt-0" />
                <div className="flex min-h-4 items-center text-[11px] leading-4 tabular-nums text-raport-muted">
                  <span>
                    н-ч всего: {formatHours(row.totalTime)} · н-ч по тех.: {formatHours(row.technologyTime)} · опер. по тех.:{" "}
                    {row.technologyOperationCount.toLocaleString("ru-RU")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          rows={visibleRows}
          rowKey={(row) => row.key}
          columns={[
            {
              key: "name",
              header: "Позиция",
              cell: (row): ReactNode =>
                onRowClick ? (
                  <div className="min-w-0">
                    <RowNameButton text={row.key} onClick={() => onRowClick(row.key)} />
                    <ProgressStrip value={row.ownTechnologyRatio} targetRatio={targetRatio} mode="technology" />
                  </div>
                ) : (
                  <div className="min-w-0">
                    <span>{row.key}</span>
                    <ProgressStrip value={row.ownTechnologyRatio} targetRatio={targetRatio} mode="technology" />
                  </div>
                ),
            },
            { key: "ratio", header: "% по тех.", className: "text-right", cell: (row) => formatPercent(row.ownTechnologyRatio) },
            { key: "time", header: "Всего н-ч", className: "text-right", cell: (row) => formatHours(row.totalTime) },
            { key: "tech-time", header: "н-ч по тех.", className: "text-right", cell: (row) => formatHours(row.technologyTime) },
            { key: "operations", header: "Операций", className: "text-right", cell: (row) => row.operationCount.toLocaleString("ru-RU") },
            {
              key: "status",
              header: "Статус",
              cell: (row) => (
                <Badge variant={statusLabel(row, targetRatio) === "Цель достигнута" ? "success" : "warning"}>
                  {statusLabel(row, targetRatio)}
                </Badge>
              ),
            },
          ]}
        />
      )}
    </SectionCard>
  );
}
