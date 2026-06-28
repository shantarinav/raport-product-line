import { CheckCircle2, CircleX } from "lucide-react";
import { SectionCard } from "../../../shared/ui";
import type { SupportDataQualitySummary, SupportTicket } from "../supportTypes";
import { formatSupportDateTime, formatSupportHours } from "../logic/supportMetrics";

function AnomalyList({ rows }: { rows: SupportTicket[] }) {
  if (rows.length === 0) {
    return <p className="text-xs font-semibold text-raport-muted">Заявок нет.</p>;
  }

  return (
    <div className="grid gap-1">
      {rows.slice(0, 12).map((ticket) => (
        <div key={ticket.id} className="grid gap-1 rounded-control border border-raport-border bg-raport-surface px-2 py-1 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold text-raport-text">
              № {ticket.ticketNumber}
            </span>
            <span className="shrink-0 text-raport-muted">{formatSupportHours(ticket.overdueHours)}</span>
          </div>
          <span className="truncate text-raport-text" title={ticket.topic}>{ticket.topic}</span>
          <span className="text-raport-muted">создана: {formatSupportDateTime(ticket.createdAt)}</span>
        </div>
      ))}
      {rows.length > 12 ? <p className="text-xs font-semibold text-raport-muted">Показано 12 из {rows.length}.</p> : null}
    </div>
  );
}

export function SupportDataQualityPanel({ summary }: { summary: SupportDataQualitySummary }) {
  const cards = [
    { title: "Нет SLA_plan", rows: summary.missingPlan },
    { title: "Нет SLA_fact", rows: summary.missingFact },
    { title: "Экстремальные просрочки", rows: summary.extremeOverdue },
    { title: "Закрыто за пределами периода", rows: summary.closedAfterPeriod },
  ];
  const issueCount = cards.reduce((sum, card) => sum + card.rows.length, 0);

  if (issueCount === 0) {
    return (
      <SectionCard title="Аномалии и качество данных" description="Проверка обязательных SLA-полей и экстремальных значений." Icon={CheckCircle2}>
        <div className="rounded-control border border-raport-success-border bg-raport-success-muted px-3 py-2 text-sm font-semibold text-raport-success">
          Проблем качества данных не найдено.
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Аномалии и качество данных" description="Строки, которые искажают расчет или требуют проверки." Icon={CircleX}>
      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="rounded-control border border-raport-border bg-raport-surface px-3 py-2">
            <strong className="block text-2xl font-extrabold text-raport-text">{card.rows.length}</strong>
            <span className="text-xs font-semibold text-raport-muted">{card.title}</span>
          </div>
        ))}
      </div>
      <details className="mt-3 rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2">
        <summary className="cursor-pointer select-none text-xs font-semibold text-raport-muted">Показать заявки с аномалиями</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {cards.map((card) => (
            <div key={`${card.title}-list`} className="grid gap-2">
              <strong className="text-sm text-raport-text">{card.title}</strong>
              <AnomalyList rows={card.rows} />
            </div>
          ))}
        </div>
      </details>
    </SectionCard>
  );
}
