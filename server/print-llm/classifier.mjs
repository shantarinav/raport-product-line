import { cacheKey } from "./cache.mjs";
import { PrintLlmSqliteCache } from "./sqliteCache.mjs";
import { callOllamaChat } from "./ollamaClient.mjs";
import { buildPrintLlmPrompt, PRINT_LLM_JSON_SCHEMA } from "./prompt.mjs";

const TECHNICAL_SUFFIXES = new Set(["final", "copy", "копия", "version"]);
const VERSION_TOKEN_PATTERN = /^v\d+$/i;
const TECHNICAL_NUMBER_PATTERN = /^0+\d+$/;
const EXTENSION_PATTERN = /\.(pdf|doc|docx|rtf|xls|xlsx|xlsm|ppt|pptx|jpg|jpeg|png|tif|tiff|bmp|txt|csv)$/i;
const CATEGORIES = new Set(["work", "education", "children", "finance", "travel", "household", "medical", "media", "legal", "other_personal", "unknown"]);
const PERSONAL_TOPIC_CATEGORIES = new Set(["education", "children", "finance", "travel", "household", "medical", "media", "legal", "other_personal"]);
const SIGNALS = new Set([
  "education",
  "children_or_school",
  "recipe_or_food",
  "household",
  "personal_finance",
  "travel_or_tickets",
  "medical",
  "legal_personal",
  "entertainment",
  "ambiguous_name",
  "too_short",
  "technical_scan_name",
  "work_like",
  "unknown",
]);
const PERSONAL_TOPIC_SIGNALS = new Set([
  "education",
  "children_or_school",
  "recipe_or_food",
  "household",
  "personal_finance",
  "travel_or_tickets",
  "medical",
  "legal_personal",
  "entertainment",
]);

export function normalizeDocumentTitle(value) {
  const original = String(value ?? "").trim();
  if (!original) return "";
  const withoutExtension = original.replace(EXTENSION_PATTERN, "");
  const withCamelSpaces = withoutExtension.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
  const normalized = withCamelSpaces.toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized
    .split(" ")
    .filter((token) => token && !TECHNICAL_SUFFIXES.has(token) && !VERSION_TOKEN_PATTERN.test(token) && !TECHNICAL_NUMBER_PATTERN.test(token))
    .join(" ");
}

export function validateLlmClassification(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  const required = ["is_personal", "primary_category", "confidence_raw", "needs_review", "reason_short", "signals"];
  if (!keys.every((key) => required.includes(key))) return null;
  if (!required.every((key) => Object.prototype.hasOwnProperty.call(value, key))) return null;
  if (typeof value.is_personal !== "boolean") return null;
  if (typeof value.primary_category !== "string" || !CATEGORIES.has(value.primary_category)) return null;
  if (typeof value.confidence_raw !== "number" || !Number.isFinite(value.confidence_raw) || value.confidence_raw < 0 || value.confidence_raw > 1) return null;
  if (typeof value.needs_review !== "boolean") return null;
  if (typeof value.reason_short !== "string" || value.reason_short.length > 180) return null;
  if (!Array.isArray(value.signals) || value.signals.length > 5) return null;
  if (!value.signals.every((signal) => typeof signal === "string" && SIGNALS.has(signal))) return null;
  return value;
}

export function postprocessRisk(input) {
  const shouldUpgradePersonalTopic =
    !input.is_personal &&
    input.primary_category !== "unknown" &&
    !input.signals.includes("work_like") &&
    (PERSONAL_TOPIC_CATEGORIES.has(input.primary_category) || input.signals.some((signal) => PERSONAL_TOPIC_SIGNALS.has(signal)));
  const normalized = shouldUpgradePersonalTopic ? { ...input, is_personal: true, needs_review: true } : input;

  if (normalized.primary_category === "unknown") return { ...normalized, risk_level: "unknown", needs_review: true };
  if (normalized.is_personal && normalized.confidence_raw >= 0.75) return { ...normalized, risk_level: "high" };
  if (normalized.is_personal && normalized.confidence_raw >= 0.55) return { ...normalized, risk_level: "medium", needs_review: true };
  if (normalized.is_personal) return { ...normalized, risk_level: "low", needs_review: true };
  return { ...normalized, risk_level: "low" };
}

function fallbackItem(item, normalizedTitle, source = "rules_fallback", reason = "Ошибка классификации") {
  return {
    id: item.id,
    normalized_title: normalizedTitle,
    source,
    is_personal: false,
    primary_category: "unknown",
    risk_level: "unknown",
    confidence_raw: 0,
    needs_review: true,
    reason_short: reason,
    signals: ["unknown"],
  };
}

function parseOllamaJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

async function classifyOne(item, config, dependencies) {
  const normalizedTitle = normalizeDocumentTitle(item.document_title);
  if (!config.enabled) return fallbackItem(item, normalizedTitle, "disabled", "LLM-классификация выключена");

  const key = cacheKey({
    schemaVersion: config.schemaVersion,
    modelName: config.model,
    normalizedTitle,
    pages: item.pages,
    color: item.color,
    duplex: item.duplex,
    paperSize: item.paper_size,
  });

  if (config.cacheEnabled) {
    const cached = dependencies.cache.get(key);
    if (cached) return { ...cached, id: item.id };
  }

  const prompt = buildPrintLlmPrompt({
    normalizedTitle,
    pages: item.pages,
    color: item.color,
    duplex: item.duplex,
    paperSize: item.paper_size,
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await dependencies.callOllama({
        chatUrl: config.ollamaChatUrl,
        model: config.model,
        prompt,
        schema: PRINT_LLM_JSON_SCHEMA,
        timeoutMs: config.timeoutMs,
      });
      const validated = validateLlmClassification(parseOllamaJson(text));
      if (!validated) continue;
      const result = {
        id: item.id,
        normalized_title: normalizedTitle,
        source: "llm",
        ...postprocessRisk(validated),
      };
      if (config.cacheEnabled) {
        const { id, ...cacheValue } = result;
        dependencies.cache.set(key, cacheValue);
      }
      return result;
    } catch {
      if (attempt === 1) return fallbackItem(item, normalizedTitle);
    }
  }

  return fallbackItem(item, normalizedTitle);
}

export async function classifyPrintPersonalItems(items, config, dependencies = {}) {
  const ownedCache = dependencies.cache ? null : new PrintLlmSqliteCache(config.cacheDbPath);
  const deps = {
    callOllama: dependencies.callOllama ?? callOllamaChat,
    cache: dependencies.cache ?? ownedCache,
  };

  try {
    const batchSize = Math.max(1, Number(config.batchSize || items.length || 1));
    const results = [];
    for (let index = 0; index < items.length; index += batchSize) {
      const batch = items.slice(index, index + batchSize);
      const classified = await Promise.all(batch.map((item) => classifyOne(item, config, deps)));
      results.push(...classified);
    }
    return { items: results };
  } finally {
    ownedCache?.close();
  }
}
