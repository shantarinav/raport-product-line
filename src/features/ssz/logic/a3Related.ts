import type { LocalA3Protocol, LocalA3Status } from "../../local-a3/localA3Types";

export type SszRelatedA3Summary = Record<LocalA3Status | "total", number>;

const EMPTY_SUMMARY: SszRelatedA3Summary = {
  total: 0,
  open: 0,
  in_progress: 0,
  waiting_review: 0,
  closed: 0,
  cancelled: 0,
};

function dateOrFallback(value: string | undefined, fallback: string): string {
  return value || fallback;
}

function rangesOverlap(leftFrom?: string, leftTo?: string, rightFrom?: string, rightTo?: string): boolean {
  if (!leftFrom && !leftTo) return true;
  if (!rightFrom && !rightTo) return true;

  const leftStart = dateOrFallback(leftFrom, "0000-01-01");
  const leftEnd = dateOrFallback(leftTo, "9999-12-31");
  const rightStart = dateOrFallback(rightFrom, "0000-01-01");
  const rightEnd = dateOrFallback(rightTo, "9999-12-31");

  return leftStart <= rightEnd && rightStart <= leftEnd;
}

function isTechnologyA3(protocol: LocalA3Protocol): boolean {
  const text = [protocol.deviation.title, protocol.deviation.metricKey, protocol.deviation.metricLabel]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ru-RU");

  return text.includes("технолог") || text.includes("С‚РµС…".toLocaleLowerCase("ru-RU"));
}

export function isSszRelatedTechnologyA3(protocol: LocalA3Protocol, periodStart?: string, periodEnd?: string): boolean {
  if (protocol.dashboardType !== "ssz") return false;
  if (!isTechnologyA3(protocol)) return false;
  return rangesOverlap(protocol.period.from, protocol.period.to, periodStart, periodEnd);
}

export function summarizeSszRelatedTechnologyA3(protocols: LocalA3Protocol[], periodStart?: string, periodEnd?: string): SszRelatedA3Summary {
  return protocols
    .filter((protocol) => isSszRelatedTechnologyA3(protocol, periodStart, periodEnd))
    .reduce<SszRelatedA3Summary>((summary, protocol) => {
      summary.total += 1;
      summary[protocol.status] += 1;
      return summary;
    }, { ...EMPTY_SUMMARY });
}
