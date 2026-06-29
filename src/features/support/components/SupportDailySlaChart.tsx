import { ChartCard } from "../../../shared/ui";
import type { SupportDailyPoint } from "../supportTypes";
import { formatSupportPercent } from "../logic/supportMetrics";
import { Activity } from "lucide-react";

function dayStatus(point: SupportDailyPoint, controlRatio: number): "norm" | "control" | "risk" | "none" {
  if (point.applicable === 0) return "none";
  if (point.slaRate >= 0.95) return "norm";
  if (point.slaRate >= controlRatio) return "control";
  return "risk";
}

function dayStatusLabel(status: ReturnType<typeof dayStatus>): string {
  if (status === "norm") return "норма";
  if (status === "control") return "контроль";
  if (status === "risk") return "риск";
  return "нет закрытых заявок";
}

function dayStatusCount(points: SupportDailyPoint[], controlRatio: number, status: ReturnType<typeof dayStatus>): number {
  return points.filter((point) => dayStatus(point, controlRatio) === status).length;
}

function dayWord(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}

function dayDotClass(status: ReturnType<typeof dayStatus>): string {
  if (status === "risk") return "fill-raport-danger";
  if (status === "control") return "fill-raport-warning";
  if (status === "norm") return "fill-raport-success";
  return "fill-raport-muted";
}

export function SupportDailySlaChart({ points, controlPercent }: { points: SupportDailyPoint[]; controlPercent: number }) {
  const width = 920;
  const height = 300;
  const padding = { top: 34, right: 82, bottom: 54, left: 54 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const controlRatio = controlPercent / 100;
  const healthyRatio = 0.95;
  const maxTotal = Math.max(1, ...points.map((point) => point.total));
  const slotWidth = points.length > 0 ? innerWidth / points.length : 0;
  const barWidth = points.length > 0 ? Math.max(4, slotWidth - 4) : 0;
  const labelStep = points.length <= 8 ? 1 : Math.ceil(points.length / 8);
  const linePoints = points.map((point, index) => {
    const x = padding.left + slotWidth * index + slotWidth / 2;
    const y = padding.top + innerHeight - point.slaRate * innerHeight;
    return `${x},${y}`;
  });
  const normDays = dayStatusCount(points, controlRatio, "norm");
  const controlDays = dayStatusCount(points, controlRatio, "control");
  const riskDays = dayStatusCount(points, controlRatio, "risk");
  const showPointLabels = points.length <= 10;

  return (
    <ChartCard title="SLA по дням" description="Динамика нагрузки и выполнения SLA по датам создания заявок." Icon={Activity}>
      {points.length === 0 ? (
        <p className="text-sm text-raport-muted">Нет данных для построения графика.</p>
      ) : (
        <div className="grid gap-2 overflow-hidden rounded-control border border-raport-border bg-raport-surface-soft p-3">
          <p className="text-xs font-semibold text-raport-muted">
            Столбец — созданные заявки. Линия — выполнение SLA по закрытым заявкам. Открытые заявки учитываются отдельно.
          </p>
          <svg viewBox={`0 0 ${width} ${height}`} role="img" className="h-[300px] w-full rounded-control bg-raport-surface">
            <text x={padding.left} y="18" className="fill-raport-muted text-[11px] font-bold">Заявки</text>
            <text x={width - padding.right} y="18" textAnchor="end" className="fill-raport-muted text-[11px] font-bold">SLA, %</text>
            <line x1={padding.left} y1={padding.top + innerHeight} x2={width - padding.right} y2={padding.top + innerHeight} className="stroke-raport-border" />
            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerHeight} className="stroke-raport-border" />
            <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" className="fill-raport-muted text-[10px] font-semibold">{maxTotal}</text>
            <text x={padding.left - 8} y={padding.top + innerHeight + 4} textAnchor="end" className="fill-raport-muted text-[10px] font-semibold">0</text>
            {[0.5, controlRatio, healthyRatio].filter((v, i, a) => a.indexOf(v) === i).map((ratio) => (
              <line
                key={ratio.toString()}
                x1={padding.left}
                y1={padding.top + innerHeight - ratio * innerHeight}
                x2={width - padding.right}
                y2={padding.top + innerHeight - ratio * innerHeight}
                className={ratio === healthyRatio ? "stroke-raport-success" : ratio === controlRatio ? "stroke-raport-warning" : "stroke-raport-border"}
                strokeDasharray="4 4"
              />
            ))}
            <text x={width - padding.right + 8} y={padding.top + innerHeight - healthyRatio * innerHeight + 4} className="fill-raport-success text-[10px] font-bold">95% норма</text>
            <text x={width - padding.right + 8} y={padding.top + innerHeight - controlRatio * innerHeight + 4} className="fill-raport-warning text-[10px] font-bold">{controlPercent}% контроль</text>
            {points.map((point, index) => {
              const x = padding.left + slotWidth * index + 2;
              const barHeight = (point.total / maxTotal) * innerHeight;
              const status = dayStatus(point, controlRatio);
              return (
                <g key={point.dateKey}>
                  <title>{`${point.label}\nВсего: ${point.total}\nС расчетом SLA: ${point.applicable}\nВ SLA: ${point.inSla}\nПросрочено: ${point.overdue}\nВ работе: ${point.open}\nВыполнение SLA: ${formatSupportPercent(point.slaRate)}\nСтатус: ${dayStatusLabel(status)}`}</title>
                  <rect
                    x={x}
                    y={padding.top + innerHeight - barHeight}
                    width={barWidth}
                    height={barHeight}
                    rx="4"
                    className="fill-raport-neutral"
                    opacity="0.82"
                  />
                  {index % labelStep === 0 || index === points.length - 1 ? (
                    <text
                      x={x + barWidth / 2}
                      y={height - 18}
                      textAnchor="middle"
                      className="fill-raport-muted text-[10px] font-semibold"
                    >
                      {point.label.slice(0, 5)}
                    </text>
                  ) : null}
                </g>
              );
            })}
            <polyline points={linePoints.join(" ")} fill="none" className="stroke-raport-primary" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((point, index) => {
              const x = padding.left + slotWidth * index + slotWidth / 2;
              const y = padding.top + innerHeight - point.slaRate * innerHeight;
              const status = dayStatus(point, controlRatio);
              return (
                <g key={`${point.dateKey}-dot`}>
                  {showPointLabels ? (
                    <text
                      x={x}
                      y={Math.max(16, y - 10)}
                      textAnchor="middle"
                      className="fill-raport-primary text-[10px] font-bold"
                    >
                      {point.applicable > 0 ? formatSupportPercent(point.slaRate).replace(",0%", "%") : "—"}
                    </text>
                  ) : null}
                  <circle cx={x} cy={y} r="4.5" className={`${dayDotClass(status)} stroke-raport-surface`} strokeWidth="2" />
                </g>
              );
            })}
          </svg>
          <p className="rounded-control border border-raport-border bg-raport-surface px-3 py-2 text-xs font-semibold text-raport-muted">
            Статус дней по SLA: норма ≥95% — <span className="text-raport-success">{normDays} {dayWord(normDays)}</span> · контроль {controlPercent}–94,9% —{" "}
            <span className="text-raport-warning">{controlDays} {dayWord(controlDays)}</span> · ниже цели &lt;{controlPercent}% —{" "}
            <span className="text-raport-danger">{riskDays} {dayWord(riskDays)}</span>
          </p>
        </div>
      )}
    </ChartCard>
  );
}
