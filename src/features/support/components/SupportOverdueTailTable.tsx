import { AlertTriangle } from "lucide-react";
import { DashboardSwitch, DataTable, SectionCard } from "../../../shared/ui";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { SUPPORT_THRESHOLDS } from "../supportConfig";
import type { SupportTicket } from "../supportTypes";
import { formatSupportDateTime, formatSupportHours } from "../logic/supportMetrics";

export function SupportOverdueTailTable({
  rows,
  limit,
  onLimitChange,
}: {
  rows: SupportTicket[];
  limit: number;
  onLimitChange: (value: number) => void;
}) {
  return (
    <SectionCard
      title="Хвост просрочек"
      description={`Самые тяжелые нарушения SLA по времени просрочки. Показано: ${limit}.`}
      Icon={AlertTriangle}
      actions={
        <DashboardSwitch
          label="Показать"
          value={String(limit)}
          onChange={(value) => onLimitChange(Number(value))}
          options={[
            { value: "10", label: "10" },
            { value: "20", label: "20" },
          ]}
        />
      }
    >
      <p className="mb-3 rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2 text-xs font-semibold text-raport-muted">
        Критично = просрочка выше установленного порога.
      </p>
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        emptyText="Нет просроченных заявок по выбранным фильтрам."
        columns={[
          {
            key: "ticketNumber",
            header: "№",
            cell: (row) => <span className="font-bold tabular-nums text-raport-text">{row.ticketNumber}</span>,
            className: "whitespace-nowrap",
          },
          {
            key: "topic",
            header: "Тема",
            cell: (row) => (
              <div className="grid max-w-[320px] gap-1">
                <span className="truncate font-semibold text-raport-text" title={row.topic}>
                  {row.topic}
                </span>
                <span className="truncate text-xs text-raport-muted" title={row.category}>
                  {row.category}
                </span>
              </div>
            ),
          },
          { key: "createdAt", header: "Создана", cell: (row) => formatSupportDateTime(row.createdAt), className: "whitespace-nowrap text-xs" },
          { key: "plan", header: "SLA_plan", cell: (row) => formatSupportDateTime(row.slaPlan), className: "whitespace-nowrap text-xs" },
          { key: "fact", header: "SLA_fact", cell: (row) => formatSupportDateTime(row.slaFact), className: "whitespace-nowrap text-xs" },
          { key: "bucket", header: "SLA-срок", cell: (row) => row.planBucket ?? "нет", className: "whitespace-nowrap" },
          {
            key: "overdue",
            header: "Просрочка",
            cell: (row) => (
              <div className="flex items-center justify-end gap-1">
                {row.overdueHours > SUPPORT_THRESHOLDS.extremeOverdueHours ? <Badge variant="danger">Критично</Badge> : null}
                <strong className="tabular-nums">{formatSupportHours(row.overdueHours)}</strong>
              </div>
            ),
            className: "whitespace-nowrap text-right",
          },
        ]}
      />
    </SectionCard>
  );
}
