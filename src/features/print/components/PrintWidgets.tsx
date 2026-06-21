import { Badge } from "../../../shared/ui/shadcn/badge";
import { formatDateTime, formatInteger } from "../logic/dashboard";
import type { PrintBarDatum, PrintJob } from "../types";

function riskBadgeVariant(kind: PrintJob["riskReasons"][number]["kind"]): "danger" | "warning" | "default" {
  if (kind === "danger") return "danger";
  if (kind === "warning" || kind === "success") return "warning";
  return "default";
}

type PersonalClassification = NonNullable<PrintJob["personalPrintClassification"]>;

function shouldShowPersonalClassification(classification: PersonalClassification): boolean {
  return classification.source === "llm" || classification.is_personal;
}

function personalRuleBadgeLabel(row: PrintJob): string {
  const labels = row.excessMatches
    .filter((match) => match.category === "Личные тематики")
    .map((match) => match.label)
    .slice(0, 2)
    .join(", ");

  return `Словарь: ${labels || "личная тематика"}`;
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

export function RiskJobList({ rows, onUserSelect, showAiClassification = false }: { rows: PrintJob[]; onUserSelect: (user: string) => void; showAiClassification?: boolean }) {
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
        const personalClassification = row.personalPrintClassification;
        const hasPersonalRuleMatch = row.riskReasonCodes.includes("excess-personal");
        const isLlmRejectedPersonalCandidate = hasPersonalRuleMatch && personalClassification?.source === "llm" && !personalClassification.is_personal;
        const visibleRiskReasons = row.riskReasons.filter((reason) => reason.code !== "excess-personal" || hasPersonalRuleMatch);

        return (
          <article
            key={`${row.dateKey}-${row.user}-${row.documentName}-${index}`}
            className={`grid gap-2 rounded-control border border-raport-border px-3 py-2 ${
              isLlmRejectedPersonalCandidate ? "bg-raport-surface-soft" : "bg-white"
            }`}
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
                <Badge key={`${row.documentName}-${reason.code}`} variant={reason.code === "excess-personal" ? "secondary" : riskBadgeVariant(reason.kind)}>
                  {reason.code === "excess-personal" ? personalRuleBadgeLabel(row) : reason.label}
                </Badge>
              ))}
              {showAiClassification && personalClassification?.source === "llm" ? (
                <Badge variant={personalClassification.is_personal ? "warning" : "secondary"}>{personalClassification.is_personal ? "ИИ: подтвердил" : "ИИ: не подтвердил"}</Badge>
              ) : showAiClassification && hasPersonalRuleMatch ? (
                <Badge variant="secondary">ИИ: не проверено</Badge>
              ) : null}
            </div>
            {showAiClassification && personalClassification?.source === "llm" && personalClassification.reason_short && shouldShowPersonalClassification(personalClassification) ? (
              <p className="rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2 text-xs font-semibold text-raport-muted">
                Комментарий ИИ: {personalClassification.reason_short}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
