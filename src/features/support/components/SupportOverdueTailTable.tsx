import { AlertTriangle } from "lucide-react";
import { DataTable, SectionCard } from "../../../shared/ui";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { SUPPORT_THRESHOLDS } from "../supportConfig";
import type { SupportTicket } from "../supportTypes";
import { formatSupportDateTime, formatSupportHours } from "../logic/supportMetrics";

function ticketUrl(ticketNumber: string): string {
  return `https://eka-sd.eka.tmk.group/otrs/index.pl?Action=AgentTicketZoom;TicketID=${encodeURIComponent(ticketNumber)}`;
}

export function SupportOverdueTailTable({ rows }: { rows: SupportTicket[] }) {
  return (
    <SectionCard title="Хвост просрочек" description="Топ-10 заявок по размеру просрочки." Icon={AlertTriangle}>
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        emptyText="Нет просроченных заявок по выбранным фильтрам."
        columns={[
          {
            key: "ticketNumber",
            header: "№",
            cell: (row) => (
              <a
                href={ticketUrl(row.ticketNumber)}
                target="_blank"
                rel="noreferrer"
                className="font-bold tabular-nums text-[var(--raport-primary)] hover:underline"
              >
                {row.ticketNumber}
              </a>
            ),
            className: "whitespace-nowrap",
          },
          {
            key: "topic",
            header: "Тема",
            cell: (row) => (
              <div className="grid max-w-[320px] gap-1">
                <span className="truncate font-semibold text-[var(--raport-text)]" title={row.topic}>{row.topic}</span>
                <span className="truncate text-xs text-[var(--raport-muted)]" title={row.category}>{row.category}</span>
              </div>
            ),
          },
          { key: "createdAt", header: "Создана", cell: (row) => formatSupportDateTime(row.createdAt), className: "whitespace-nowrap text-xs" },
          { key: "plan", header: "SLA_plan", cell: (row) => formatSupportDateTime(row.slaPlan), className: "whitespace-nowrap text-xs" },
          { key: "fact", header: "SLA_fact", cell: (row) => formatSupportDateTime(row.slaFact), className: "whitespace-nowrap text-xs" },
          { key: "bucket", header: "План", cell: (row) => row.planBucket ?? "нет", className: "whitespace-nowrap" },
          {
            key: "overdue",
            header: "Просрочка",
            cell: (row) => (
              <div className="flex items-center justify-end gap-1">
                {row.overdueHours > SUPPORT_THRESHOLDS.extremeOverdueHours ? <Badge variant="danger">Критично</Badge> : null}
                <strong className="tabular-nums">{formatSupportHours(row.overdueHours)}</strong>
              </div>
            ),
            className: "text-right whitespace-nowrap",
          },
        ]}
      />
    </SectionCard>
  );
}
