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
      title="Самые долгие нарушения SLA"
      description="Где срок закрытия был превышен сильнее всего."
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
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        emptyText="Нет просроченных заявок по выбранным фильтрам."
        columns={[
          {
            key: "topic",
            header: "Проблема",
            cell: (row) => (
              <div className="grid max-w-[460px] gap-1">
                <span className="line-clamp-2 font-semibold leading-snug text-raport-text" title={row.topic}>
                  {row.topic}
                </span>
                <span className="truncate text-xs font-semibold text-raport-muted" title={`${row.category} · № ${row.ticketNumber}`}>
                  {row.category} · № {row.ticketNumber}
                </span>
              </div>
            ),
          },
          { key: "priority", header: "Приоритет", cell: (row) => row.priorityLabel ?? row.planBucket ?? "нет", className: "whitespace-nowrap" },
          {
            key: "planFact",
            header: "План / факт",
            cell: (row) => (
              <div className="grid gap-1 text-xs">
                <span className="whitespace-nowrap text-raport-muted">план: {formatSupportDateTime(row.slaPlan)}</span>
                <span className="whitespace-nowrap text-raport-text">факт: {formatSupportDateTime(row.slaFact)}</span>
              </div>
            ),
            className: "whitespace-nowrap",
          },
          {
            key: "time",
            header: "Время решения",
            cell: (row) => (
              <div className="grid gap-1 text-right text-xs">
                <span className="whitespace-nowrap text-raport-text">всего {formatSupportHours(row.fullTimeHours)}</span>
                <span className="whitespace-nowrap text-raport-muted">чистое {formatSupportHours(row.slaWorkHours)}</span>
              </div>
            ),
            className: "whitespace-nowrap text-right",
          },
          {
            key: "overdue",
            header: "Просрочка",
            cell: (row) => (
              <div className="grid justify-items-end gap-1">
                <strong className="text-base font-extrabold tabular-nums text-raport-danger">{formatSupportHours(row.overdueHours)}</strong>
                {row.overdueHours > SUPPORT_THRESHOLDS.extremeOverdueHours ? <Badge variant="danger">Критично</Badge> : null}
              </div>
            ),
            className: "whitespace-nowrap text-right",
          },
        ]}
      />
    </SectionCard>
  );
}
