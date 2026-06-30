import { createHash } from "node:crypto";
import { callOllamaChat } from "../../ollamaClient.mjs";
import { PrintLlmSqliteCache } from "../../sqliteCache.mjs";
import { buildA3AssistPrompt } from "./prompt.mjs";
import { A3_ASSIST_JSON_SCHEMA, parseA3AssistRequest, parseA3AssistResponse } from "./schema.mjs";

const A3_ASSIST_PROMPT_VERSION = "4";

function fallback(error = "ИИ-помощник временно недоступен") {
  return {
    ok: false,
    suggestions: null,
    error,
  };
}

function parseModelJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

function withFinalPunctuation(value) {
  const text = String(value || "").trim();
  if (!text) return text;
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

function numericTokens(text) {
  return new Set(
    String(text || "")
      .match(/\d+(?:[,.]\d+)?\s*%?/g)
      ?.map((value) => value.replace(/\s+/g, "").replace(",", "."))
      .filter(Boolean) ?? [],
  );
}

function a3ContextText(input) {
  return [
    input.periodLabel,
    input.deviationTitle,
    input.metricName,
    input.actualValue,
    input.targetValue,
    input.deviationScale,
    input.affectedObjectName,
    input.sourceFileName,
    input.evidenceSummary,
    input.problem,
    input.cause,
    input.solution,
    input.expectedResult,
    input.checkCriteria,
    input.qualityIssue,
  ]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .join(" ");
}

function removeUnsupportedNumericModifiers(text, allowedTokens) {
  return String(text || "")
    .replace(/\s+(на|за|через)\s+(\d+(?:[,.]\d+)?\s*%?)/gi, (match, _prefix, value) =>
      allowedTokens.has(String(value).replace(/\s+/g, "").replace(",", ".")) ? match : "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeSuggestions(suggestions, input) {
  const allowedTokens = numericTokens(a3ContextText(input));
  const normalizeText = (value) => withFinalPunctuation(removeUnsupportedNumericModifiers(value, allowedTokens));
  return {
    ...suggestions,
    problem: normalizeText(suggestions.problem),
    causeHypotheses: suggestions.causeHypotheses.map(normalizeText),
    fiveWhys: suggestions.fiveWhys.map(normalizeText),
    countermeasures: suggestions.countermeasures.map(normalizeText),
    expectedResult: normalizeText(suggestions.expectedResult),
    checkCriteria: normalizeText(suggestions.checkCriteria),
  };
}

function selectedA3Model(config) {
  return config.a3Model || config.model;
}

function canonicalA3AssistInput(input, config) {
  return JSON.stringify({
    schema_version: String(config.schemaVersion ?? ""),
    a3_prompt_version: A3_ASSIST_PROMPT_VERSION,
    model_name: String(selectedA3Model(config) ?? ""),
    field: input.field ?? "",
    quality_issue: input.qualityIssue ?? "",
    mode: input.mode,
    dashboard_type: input.dashboardType,
    dashboard_title: input.dashboardTitle,
    period_label: input.periodLabel,
    deviation_title: input.deviationTitle,
    metric_name: input.metricName,
    actual_value: input.actualValue ?? "",
    target_value: input.targetValue ?? "",
    deviation_scale: input.deviationScale ?? "",
    affected_object_type: input.affectedObjectType ?? "",
    affected_object_name: input.affectedObjectName ?? "",
    source_file_name: input.sourceFileName ?? "",
    evidence_summary: input.evidenceSummary ?? "",
    problem: input.problem ?? "",
    cause: input.cause ?? "",
    solution: input.solution ?? "",
    expected_result: input.expectedResult ?? "",
    check_criteria: input.checkCriteria ?? "",
  });
}

function a3AssistCacheKey(input, config) {
  return createHash("sha256").update(canonicalA3AssistInput(input, config)).digest("hex");
}

function ownDependencies(config, dependencies) {
  const ownedCache =
    config.cacheEnabled && !dependencies.cache
      ? new PrintLlmSqliteCache(config.cacheDbPath, { busyTimeoutMs: config.sqliteBusyTimeoutMs })
      : null;
  return {
    ownedCache,
    deps: {
      callOllama: dependencies.callOllama ?? callOllamaChat,
      cache: dependencies.cache ?? ownedCache,
      queue: dependencies.queue ?? { run: (task) => task() },
    },
  };
}

export async function assistA3Protocol(input, config, dependencies = {}) {
  if (!config.enabled) return fallback("ИИ-помощник выключен");

  const request = parseA3AssistRequest(input);
  if (!request.success) {
    return { ...fallback("Некорректные данные A3-разбора"), errors: request.errors };
  }

  const { ownedCache, deps } = ownDependencies(config, dependencies);
  try {
    const key = a3AssistCacheKey(request.data, config);
    if (config.cacheEnabled && deps.cache?.getA3Assist) {
      const cached = deps.cache.getA3Assist(key);
      if (cached?.suggestions && Array.isArray(cached.warnings)) {
        return {
          ok: true,
          suggestions: normalizeSuggestions(cached.suggestions, request.data),
          warnings: cached.warnings.map(withFinalPunctuation),
        };
      }
    }

    const prompt = buildA3AssistPrompt(request.data);
    const text = await deps.queue.run(() =>
      deps.callOllama({
        chatUrl: config.ollamaChatUrl,
        model: selectedA3Model(config),
        prompt,
        schema: A3_ASSIST_JSON_SCHEMA,
        timeoutMs: Math.max(Number(config.timeoutMs) || 0, 180000),
        numPredict: 350,
        keepAlive: "30m",
      }),
    );
    const parsed = parseA3AssistResponse(parseModelJson(text));
    if (!parsed.success) return fallback();
    const result = {
      suggestions: normalizeSuggestions(parsed.data.suggestions, request.data),
      warnings: parsed.data.warnings.map(withFinalPunctuation),
    };
    if (config.cacheEnabled && deps.cache?.putA3Assist) {
      deps.cache.putA3Assist(key, result, {
        schemaVersion: `${config.schemaVersion}:a3-prompt-${A3_ASSIST_PROMPT_VERSION}`,
        model: selectedA3Model(config),
      });
    }
    return {
      ok: true,
      ...result,
    };
  } catch {
    return fallback();
  } finally {
    ownedCache?.close();
  }
}
