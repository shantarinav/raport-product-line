import { TrendingUp } from "lucide-react";
import { ChartCard } from "../../../shared/ui";
import type { DashboardSnapshot } from "../../../shared/lib/historyDB";

type TrendPoint = {
  id: string;
  periodLabel: string;
  tooltipLabel: string;
  coverageLabel: string;
  valueLabel: string;
  value: number;
  x: number;
  y: number;
  showLabel: boolean;
};

const CHART_WIDTH = 720;
const CHART_HEIGHT = 190;
const PADDING_X = 34;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 58;

function isFiniteMetric(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatMonth(value: string): string {
  const [, year, month] = value.match(/^(\d{4})-(\d{2})-\d{2}$/) ?? [];
  return year && month ? `${month}.${year}` : value;
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("ru-RU");
}

function formatSignedInteger(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  return `${sign}${formatInteger(Math.abs(value))} стр.`;
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

function buildTrendPoints(data: DashboardSnapshot[]): TrendPoint[] {
  const source = data
    .filter((snapshot) => snapshot.grain === "month" && snapshot.coverage?.isTrendReady === true && isFiniteMetric(snapshot.metrics.totalPages))
    .sort((left, right) => left.period.from.localeCompare(right.period.from));

  if (source.length < 2) return [];

  const values = source.map((snapshot) => snapshot.metrics.totalPages);
  const minValue = Math.max(0, Math.min(...values));
  const maxValue = Math.max(...values);
  const range = Math.max(1, maxValue - minValue);
  const yMin = Math.max(0, minValue - range * 0.2);
  const yMax = maxValue + range * 0.2;
  const yRange = Math.max(1, yMax - yMin);
  const chartInnerWidth = CHART_WIDTH - PADDING_X * 2;
  const chartInnerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const yForValue = (value: number) => PADDING_TOP + chartInnerHeight - ((value - yMin) / yRange) * chartInnerHeight;

  return source.map((snapshot, index) => {
    const value = snapshot.metrics.totalPages;
    const periodLabel = formatMonth(snapshot.period.from);
    const coverageLabel = formatCoverage(snapshot);

    return {
      id: snapshot.id,
      periodLabel,
      tooltipLabel: `${periodLabel}: ${formatInteger(value)} стр., покрытие ${coverageLabel}`,
      coverageLabel,
      valueLabel: `${formatInteger(value)} стр.`,
      value,
      x: PADDING_X + (chartInnerWidth * index) / (source.length - 1),
      y: yForValue(value),
      showLabel: shouldShowPointLabel(index, source.length),
    };
  });
}

export function PrintPagesTrendChart({ data }: { data: DashboardSnapshot[] }) {
  const points = buildTrendPoints(data);
  if (points.length < 2) return null;

  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const previousPoint = points[points.length - 2];
  const periodDelta = lastPoint.value - firstPoint.value;
  const monthDelta = lastPoint.value - previousPoint.value;

  return (
    <ChartCard title="Тренд печати по месяцам" description="Как меняется общий объем напечатанных страниц по месяцам." Icon={TrendingUp}>
      <div className="grid gap-3">
        <p className="text-sm font-semibold leading-5 text-raport-text">
          <span className="text-raport-muted">Период тренда:</span> {firstPoint.periodLabel} → {lastPoint.periodLabel} ·{" "}
          <span className="text-raport-muted">общий сдвиг:</span>{" "}
          <span className="tabular-nums">{formatSignedInteger(periodDelta)}</span> ·{" "}
          <span className="text-raport-muted">к предыдущему:</span>{" "}
          <span className="tabular-nums">{formatSignedInteger(monthDelta)}</span>
        </p>

        <svg
          className="h-56 w-full overflow-visible"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label="Помесячный тренд общего объема напечатанных страниц"
        >
          <line
            x1={PADDING_X}
            y1={CHART_HEIGHT - PADDING_BOTTOM}
            x2={CHART_WIDTH - PADDING_X}
            y2={CHART_HEIGHT - PADDING_BOTTOM}
            className="stroke-slate-200"
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
                className="fill-raport-primary stroke-white transition-opacity hover:opacity-80"
                strokeWidth={1.8}
              >
                <title>{point.tooltipLabel}</title>
              </circle>
              {point.showLabel ? (
                <>
                  <text x={point.x} y={CHART_HEIGHT - 40} textAnchor="middle" className="fill-raport-muted text-[11px] font-medium">
                    {point.periodLabel}
                  </text>
                  <text x={point.x} y={CHART_HEIGHT - 24} textAnchor="middle" className="fill-raport-text text-[12px] font-semibold">
                    {point.valueLabel}
                  </text>
                  <text x={point.x} y={CHART_HEIGHT - 8} textAnchor="middle" className="fill-raport-muted text-[11px] font-medium">
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
