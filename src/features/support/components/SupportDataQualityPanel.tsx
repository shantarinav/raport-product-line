import { CircleX } from "lucide-react";
import { SectionCard } from "../../../shared/ui";
import type { SupportDataQualitySummary, SupportTicket } from "../supportTypes";
import { formatSupportDateTime, formatSupportHours } from "../logic/supportMetrics";

function ticketUrl(ticketNumber: string): string {
  return `https://eka-sd.eka.tmk.group/otrs/index.pl?Action=AgentTicketZoom;TicketID=${encodeURIComponent(ticketNumber)}`;
}

function AnomalyList({ rows }: { rows: SupportTicket[] }) {
  if (rows.length === 0) {
    return <p className="text-xs font-semibold text-[var(--raport-muted)]">Заявок нет.</p>;
  }

  return (
    <div className="grid gap-1">
      {rows.slice(0, 12).map((ticket) => (
        <div key={ticket.id} className="grid gap-1 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-2 py-1 text-xs">
          <div className="flex items-center justify-between gap-2">
            <a
              href={ticketUrl(ticket.ticketNumber)}
              target="_blank"
              rel="noreferrer"
              className="truncate font-bold text-[var(--raport-primary)] hover:underline"
            >
              № {ticket.ticketNumber}
            </a>
            <span className="shrink-0 text-[var(--raport-muted)]">{formatSupportHours(ticket.overdueHours)}</span>
          </div>
          <span className="truncate text-[var(--raport-text)]" title={ticket.topic}>{ticket.topic}</span>
          <span className="text-[var(--raport-muted)]">создана: {formatSupportDateTime(ticket.createdAt)}</span>
        </div>
      ))}
      {rows.length > 12 ? <p className="text-xs font-semibold text-[var(--raport-muted)]">Показано 12 из {rows.length}.</p> : null}
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

  return (
    <SectionCard title="Аномалии и качество данных" description="Строки, которые искажают расчет или требуют проверки." Icon={CircleX}>
      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-white px-3 py-2">
            <strong className="block text-2xl font-extrabold text-[var(--raport-text)]">{card.rows.length}</strong>
            <span className="text-xs font-semibold text-[var(--raport-muted)]">{card.title}</span>
          </div>
        ))}
      </div>
      <details className="mt-3 rounded-[var(--raport-radius-control)] border border-[var(--raport-border)] bg-[var(--raport-surface-soft)] px-3 py-2">
        <summary className="cursor-pointer select-none text-xs font-semibold text-[var(--raport-muted)]">Показать заявки с аномалиями</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {cards.map((card) => (
            <div key={`${card.title}-list`} className="grid gap-2">
              <strong className="text-sm text-[var(--raport-text)]">{card.title}</strong>
              <AnomalyList rows={card.rows} />
            </div>
          ))}
        </div>
      </details>
    </SectionCard>
  );
}
