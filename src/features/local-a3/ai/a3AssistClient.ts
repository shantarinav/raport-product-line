import type { LocalA3Protocol } from "../localA3Types";

export type A3AssistSettings = {
  serviceUrl: string;
  apiKey: string;
  field?: A3AssistField;
  qualityIssue?: string;
  signal?: AbortSignal;
};

export type A3AssistField = "problem" | "cause" | "solution" | "expectedResult" | "checkCriteria";

export type A3AssistSuggestions = {
  problem?: string;
  causeHypotheses?: string[];
  fiveWhys?: string[];
  countermeasures?: string[];
  expectedResult?: string;
  checkCriteria?: string;
};

export type A3AssistResult =
  | {
      ok: true;
      suggestions: A3AssistSuggestions;
      warnings?: string[];
    }
  | {
      ok: false;
      suggestions: null;
      error: string;
    };

function normalizeServiceUrl(value: string): string {
  return value.trim().replace(/\/+$/, "") || "http://127.0.0.1:8787";
}

function headers(settings: A3AssistSettings): Record<string, string> {
  const result: Record<string, string> = { "content-type": "application/json" };
  if (settings.apiKey) result["x-raport-backend-key"] = settings.apiKey;
  return result;
}

export function buildA3AssistRequest(protocol: LocalA3Protocol, field?: A3AssistField, qualityIssue?: string) {
  return {
    protocolId: protocol.id,
    field,
    qualityIssue,
    dashboardType: protocol.dashboardType,
    dashboardTitle: protocol.dashboardTitle,
    periodLabel: protocol.period.label,
    deviationTitle: protocol.deviation.title,
    metricName: protocol.deviation.metricLabel ?? protocol.deviation.metricKey ?? protocol.deviation.title,
    actualValue: protocol.deviation.fact,
    targetValue: protocol.deviation.target,
    deviationScale: protocol.deviation.scale,
    sourceFileName: protocol.source.fileName,
    affectedObjectType: undefined,
    affectedObjectName: undefined,
    evidenceSummary: protocol.deviation.context,
    problem: protocol.form.problem,
    cause: protocol.form.cause,
    solution: protocol.form.solution,
    expectedResult: protocol.form.expectedResult,
    checkCriteria: protocol.form.checkCriteria,
    mode: "draft_suggestions",
  };
}

export async function requestA3AssistSuggestions(
  protocol: LocalA3Protocol,
  settings: A3AssistSettings,
  fetchImpl = fetch,
): Promise<A3AssistResult> {
  try {
    const response = await fetchImpl(`${normalizeServiceUrl(settings.serviceUrl)}/api/a3/assist`, {
      method: "POST",
      headers: headers(settings),
      signal: settings.signal,
      body: JSON.stringify(buildA3AssistRequest(protocol, settings.field, settings.qualityIssue)),
    });
    if (!response.ok) return { ok: false, suggestions: null, error: "ИИ-помощник временно недоступен" };
    const payload = (await response.json()) as A3AssistResult;
    if (!payload || payload.ok !== true || !payload.suggestions) {
      return { ok: false, suggestions: null, error: "ИИ-помощник временно недоступен" };
    }
    return payload;
  } catch {
    return { ok: false, suggestions: null, error: "ИИ-помощник временно недоступен" };
  }
}
