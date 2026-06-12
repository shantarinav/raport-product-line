import { Badge } from "../../../shared/ui/shadcn/badge";
import { formatDateTime, formatInteger, getEffectivePersonalPrintStatus } from "../logic/dashboard";
import type { PrintBarDatum, PrintJob } from "../types";

function riskBadgeVariant(kind: PrintJob["riskReasons"][number]["kind"]): "danger" | "warning" | "default" {
  if (kind === "danger") return "danger";
  if (kind === "warning" || kind === "success") return "warning";
  return "default";
}

type PersonalClassification = NonNullable<PrintJob["personalPrintClassification"]>;

function personalRiskLabel(riskLevel: PersonalClassification["risk_level"]): string {
  if (riskLevel === "high") return "высокий";
  if (riskLevel === "medium") return "средний";
  if (riskLevel === "low") return "низкий";
  return "не определен";
}

function shouldShowPersonalClassification(classification: PersonalClassification): boolean {
  return classification.source === "llm" || classification.is_personal;
}

export function BarList({ items, valueLabel = "стр." }: { items: PrintBarDatum[]; valueLabel?: string }) {
  const max = Math.max(1, ...items.map((item) => item.pages));
  const hasData = items.some((item) => item.pages > 0);

  if (!hasData) {
    return (
      <p className="rounded-control border border-dashed border-raport-border bg-raport-surface-soft px-3 py-2 text-sm text-raport-muted">
        Нет данных по выбранным фильтрам.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item.label} className="grid gap-1">
          <div className="flex min-h-4 items-center justify-between gap-3 text-xs font-semibold text-raport-muted">
            <span className="min-w-0 truncate" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 tabular-nums text-raport-text">
              {formatInteger(item.pages)} {valueLabel}
            </span>
          </div>
          <progress
            max={max}
            value={item.pages}
            className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-200 [&::-moz-progress-bar]:bg-raport-primary [&::-webkit-progress-value]:bg-raport-primary"
          />
        </div>
      ))}
    </div>
  );
}

export function RiskJobList({ rows, onUserSelect }: { rows: PrintJob[]; onUserSelect: (user: string) => void }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-control border border-dashed border-raport-border bg-raport-surface-soft px-3 py-2 text-sm text-raport-muted">
        Нет заданий с отклонениями по выбранным фильтрам.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {rows.map((row, index) => {
        const personalStatus = getEffectivePersonalPrintStatus(row);
        const visibleRiskReasons = row.riskReasons.filter((reason) => reason.code !== "excess-personal" || personalStatus.isPersonal);
        return (
        <article
          key={`${row.dateKey}-${row.user}-${row.documentName}-${index}`}
          className="grid gap-2 rounded-control border border-raport-border bg-white px-3 py-2"
        >
          <div className="grid min-w-0 gap-2 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start">
            <span className="inline-flex min-h-7 min-w-9 items-center justify-center rounded-full border border-raport-action-border bg-raport-action-bg px-2 text-xs font-extrabold tabular-nums text-raport-primary">
              #{index + 1}
            </span>
            <div className="min-w-0">
              <button className="block max-w-full truncate text-left text-sm font-bold text-raport-primary hover:underline" onClick={() => onUserSelect(row.user)}>
                {row.user}
              </button>
              <p className="mt-0.5 truncate text-xs font-semibold text-raport-text" title={row.documentName}>
                {row.documentName}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-raport-muted md:justify-end">
              <span className="tabular-nums text-raport-text">{formatInteger(row.totalPages)} стр.</span>
              <time dateTime={row.date?.toISOString()}>{formatDateTime(row.date)}</time>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="danger">Балл риска: {formatInteger(row.riskScore)}</Badge>
            {visibleRiskReasons.map((reason) => (
              <Badge key={`${row.documentName}-${reason.code}`} variant={riskBadgeVariant(reason.kind)}>
                {reason.label}
              </Badge>
            ))}
            {personalStatus.isPersonal && personalStatus.source === "llm" && !row.riskReasonCodes.includes("excess-personal") ? (
              <Badge variant="warning">личная тематика: LLM</Badge>
            ) : null}
            {row.personalPrintClassification && shouldShowPersonalClassification(row.personalPrintClassification) ? (
              <Badge variant="secondary">Риск LLM: {personalRiskLabel(row.personalPrintClassification.risk_level)}</Badge>
            ) : null}
          </div>
          {row.personalPrintClassification?.reason_short && shouldShowPersonalClassification(row.personalPrintClassification) ? (
            <p className="rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2 text-xs font-semibold text-raport-muted">
              Основание классификации: {row.personalPrintClassification.reason_short}
            </p>
          ) : null}
        </article>
        );
      })}
    </div>
  );
}
