import { TrendingUp } from "lucide-react";
import { ChartCard } from "../../../shared/ui";
import type { DashboardSnapshot } from "../../../shared/lib/historyDB";

type TrendPointTone = "success" | "warning" | "danger";

type TrendPoint = {
  id: string;
  periodLabel: string;
  tooltipLabel: string;
  coverageLabel: string;
  valueLabel: string;
  value: number;
  x: number;
  y: number;
  tone: TrendPointTone;
  showLabel: boolean;
};

type TrendModel = {
  points: TrendPoint[];
  targetY: number;
};

const CHART_WIDTH = 720;
const CHART_HEIGHT = 200;
const PADDING_X = 34;
const PADDING_TOP = 26;
const PADDING_BOTTOM = 58;
const WARNING_GAP_PERCENT = 10;

const pointToneClass: Record<TrendPointTone, string> = {
  success: "fill-raport-success stroke-raport-surface",
  warning: "fill-raport-warning stroke-raport-surface",
  danger: "fill-raport-danger stroke-raport-surface",
};

function isFiniteMetric(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isTrendSnapshot(snapshot: DashboardSnapshot): boolean {
  return snapshot.grain === "month" && snapshot.coverage?.isTrendReady === true;
}

function formatMonth(value: string): string {
  const [, year, month] = value.match(/^(\d{4})-(\d{2})-\d{2}$/) ?? [];
  return year && month ? `${month}.${year}` : value;
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  return `${sign}${Math.abs(value).toLocaleString("ru-RU", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} п.п.`;
}

function formatAbsolutePercentPoints(value: number): string {
  return `${Math.abs(value).toLocaleString("ru-RU", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} п.п.`;
}

function pointTone(value: number, targetPercent: number): TrendPointTone {
  if (value >= targetPercent) return "success";
  if (targetPercent - value <= WARNING_GAP_PERCENT) return "warning";
  return "danger";
}

function formatCoverage(snapshot: DashboardSnapshot): string {
  const coverage = snapshot.coverage;
  if (!coverage) return "";
  return `${coverage.days}/${coverage.periodDays} дн.`;
}

function shouldShowPointLabel(index: number, total: number): boolean {
  if (total <= 6) return true;
  if (index === 0 || index === total - 1) return true;

  const labelStep = total <= 12 ? 2 : 3;
  const middleIndex = Math.floor((total - 1) / 2);
  return index === middleIndex || index % labelStep === 0;
}

function buildTrendModel(data: DashboardSnapshot[], targetPercent: number): TrendModel {
  const source = data
    .filter((snapshot) => isTrendSnapshot(snapshot) && isFiniteMetric(snapshot.metrics.workTechnologyPercent))
    .sort((left, right) => left.period.from.localeCompare(right.period.from));

  if (source.length < 2) return { points: [], targetY: PADDING_TOP };

  const values = [...source.map((snapshot) => snapshot.metrics.workTechnologyPercent), targetPercent];
  const minValue = Math.max(0, Math.min(...values));
  const maxValue = Math.min(100, Math.max(...values));
  const range = Math.max(10, maxValue - minValue);
  const yMin = Math.max(0, minValue - range * 0.22);
  const yMax = Math.min(100, maxValue + range * 0.22);
  const yRange = Math.max(1, yMax - yMin);
  const chartInnerWidth = CHART_WIDTH - PADDING_X * 2;
  const chartInnerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const yForValue = (value: number) => PADDING_TOP + chartInnerHeight - ((value - yMin) / yRange) * chartInnerHeight;

  return {
    targetY: yForValue(targetPercent),
    points: source.map((snapshot, index) => {
      const value = snapshot.metrics.workTechnologyPercent;
      const periodLabel = formatMonth(snapshot.period.from);
      const coverageLabel = formatCoverage(snapshot);
      const gap = value - targetPercent;
      const targetGapLabel =
        gap >= 0 ? `выше цели на ${formatAbsolutePercentPoints(gap)}` : `ниже цели на ${formatAbsolutePercentPoints(gap)}`;

      return {
        id: snapshot.id,
        periodLabel,
        tooltipLabel: `${periodLabel}: ${formatPercent(value)}, ${targetGapLabel}, покрытие ${coverageLabel}`,
        coverageLabel,
        valueLabel: formatPercent(value),
        value,
        x: source.length === 1 ? CHART_WIDTH / 2 : PADDING_X + (chartInnerWidth * index) / (source.length - 1),
        y: yForValue(value),
        tone: pointTone(value, targetPercent),
        showLabel: shouldShowPointLabel(index, source.length),
      };
    }),
  };
}

export function SSZTrendChart({ data, targetPercent }: { data: DashboardSnapshot[]; targetPercent: number }) {
  const { points, targetY } = buildTrendModel(data, targetPercent);
  if (points.length < 2) return null;

  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const periodDelta = lastPoint.value - firstPoint.value;
  const previousPoint = points[points.length - 2];
  const monthDelta = lastPoint.value - previousPoint.value;

  return (
    <ChartCard
      title="Тренд технологии по месяцам"
      description="Как меняется доля работ по технологии по месяцам."
      Icon={TrendingUp}
    >
      <div className="grid gap-3">
        <p className="text-sm font-semibold leading-5 text-raport-text">
          <span className="text-raport-muted">Период тренда:</span> {firstPoint.periodLabel} → {lastPoint.periodLabel} ·{" "}
          <span className="text-raport-muted">общий сдвиг:</span>{" "}
          <span className="tabular-nums">{formatSignedPercent(periodDelta)}</span> ·{" "}
          <span className="text-raport-muted">к предыдущему:</span>{" "}
          <span className="tabular-nums">{formatSignedPercent(monthDelta)}</span>
        </p>

        <svg className="h-56 w-full overflow-visible" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label="Помесячный тренд доли работ по технологии">
          <line
            x1={PADDING_X}
            y1={targetY}
            x2={CHART_WIDTH - PADDING_X}
            y2={targetY}
            className="stroke-raport-muted"
            strokeWidth={1.2}
            strokeDasharray="5 5"
          />
          <text
            x={CHART_WIDTH - PADDING_X}
            y={Math.max(12, targetY - 8)}
            textAnchor="end"
            className="fill-raport-muted text-[11px] font-medium"
          >
            Цель {targetPercent}%
          </text>
          <line
            x1={PADDING_X}
            y1={CHART_HEIGHT - PADDING_BOTTOM}
            x2={CHART_WIDTH - PADDING_X}
            y2={CHART_HEIGHT - PADDING_BOTTOM}
            className="stroke-raport-border"
            strokeWidth={1}
          />
          <polyline
            points={polylinePoints}
            fill="none"
            className="stroke-raport-primary"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3.5}
          />
          {points.map((point) => (
            <g key={point.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={points.length > 12 ? 4 : 5}
                className={`${pointToneClass[point.tone]} transition-opacity hover:opacity-80`}
                strokeWidth={1.8}
              >
                <title>{point.tooltipLabel}</title>
              </circle>
              {point.showLabel ? (
                <>
                  <text
                    x={point.x}
                    y={CHART_HEIGHT - 40}
                    textAnchor="middle"
                    className="fill-raport-muted text-[11px] font-medium"
                  >
                    {point.periodLabel}
                  </text>
                  <text
                    x={point.x}
                    y={CHART_HEIGHT - 24}
                    textAnchor="middle"
                    className="fill-raport-text text-[12px] font-semibold"
                  >
                    {point.valueLabel}
                  </text>
                  <text
                    x={point.x}
                    y={CHART_HEIGHT - 8}
                    textAnchor="middle"
                    className="fill-raport-muted text-[11px] font-medium"
                  >
                    {point.coverageLabel}
                  </text>
                </>
              ) : null}
            </g>
          ))}
        </svg>

        <p className="border-t border-raport-border pt-2 text-xs font-semibold leading-4 text-raport-muted">
          При построении тренда учитываются только месяцы с покрытием не меньше 50%.
        </p>
      </div>
    </ChartCard>
  );
}

