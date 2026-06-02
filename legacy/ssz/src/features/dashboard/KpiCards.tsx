import { brandIconPath } from "../../shared/brandAssets";
import { formatPercent } from "../analytics/metrics";

export interface KpiCardData {
  sszCount: number;
  workTechnologyRatio: number | null;
  operationTechnologyRatio: number | null;
}

interface KpiCardsProps {
  data: KpiCardData;
  targetPercent: number;
}

function deviationLabel(value: number | null, targetPercent: number): string {
  if (value === null) return "Отклонение: н/д";
  const points = value * 100 - targetPercent;
  const sign = points > 0 ? "+" : "";
  return `Отклонение: ${sign}${points.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} п.п.`;
}

function tone(value: number | null, targetPercent: number): string {
  if (value === null) return "";
  const targetRatio = targetPercent / 100;
  if (value >= targetRatio) return "high";
  if (targetRatio - value <= 0.1) return "medium";
  return "low";
}

export function KpiCards({ data, targetPercent }: KpiCardsProps) {
  const cards = [
    {
      label: "Всего ССЗ",
      value: data.sszCount.toLocaleString("ru-RU"),
      note: "в анализируемом периоде",
      hint: "Количество сменно-суточных заданий в текущей выборке с учетом заказа, комплекта и дат.",
      icon: brandIconPath("icon-count.png"),
    },
    {
      label: "Доля работ по технологии",
      value: formatPercent(data.workTechnologyRatio),
      note: `по нормо-часам · Цель: ≥ ${targetPercent}%`,
      extra: deviationLabel(data.workTechnologyRatio, targetPercent),
      deviationTone: tone(data.workTechnologyRatio, targetPercent),
      hint: "Главный KPI по объему работ: нормо-часы по технологии / общий объем нормо-часов.",
      icon: brandIconPath("icon-percent.png"),
      accent: `primary main-kpi ${tone(data.workTechnologyRatio, targetPercent)}`,
    },
    {
      label: "Доля операций по технологии",
      value: formatPercent(data.operationTechnologyRatio),
      note: `по количеству операций · Цель: ≥ ${targetPercent}%`,
      extra: deviationLabel(data.operationTechnologyRatio, targetPercent),
      deviationTone: tone(data.operationTechnologyRatio, targetPercent),
      hint: "KPI по количеству операций: операции с нормо-часами по технологии / все операции.",
      icon: brandIconPath("icon-kpi.png"),
      accent: `primary ${tone(data.operationTechnologyRatio, targetPercent)}`,
    },
  ];

  return (
    <section className="kpi-grid" aria-label="Ключевые показатели">
      {cards.map((card) => (
        <article className={`kpi-card raport-kpi-card ${card.accent ?? "supporting"}`} key={card.label} title={card.hint}>
          <div className="kpi-icon">
            <img src={card.icon} alt="" />
          </div>
          <span>
            {card.label.split("\n").map((part) => (
              <span key={part}>{part}</span>
            ))}
          </span>
          <strong>{card.value}</strong>
          <small>{card.note}</small>
          {card.extra && <em className={card.deviationTone}>{card.extra}</em>}
        </article>
      ))}
    </section>
  );
}
