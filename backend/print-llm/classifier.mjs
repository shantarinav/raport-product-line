import { createHash } from "node:crypto";
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

const CLEAR_PERSONAL_REASON_PATTERN =
  /\u043b\u0438\u0447\u043d[\p{L}\p{N}_]*\s+\u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d|\u043b\u0438\u0447\u043d[\p{L}\p{N}_]*\s+(?:\u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442|\u0442\u0435\u043c\u0430|\u043f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u043d|\u043f\u043e\u0437\u0434\u0440\u0430\u0432\u043b\u0435\u043d)|\u043d\u0435\s+\u0441\u0432\u044f\u0437\u0430\u043d[\u0430\u043e]?\s+\u0441\s+\u0440\u0430\u0431\u043e\u0442|\u043d\u0435\s+\u0441\u0432\u044f\u0437\u0430\u043d[\u0430\u043e]?\s+\u0441\s+\u043a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d|\u043d\u0435\s+\u0443\u043a\u0430\u0437\u0430\u043d[\u0430\u043e]?\s+\u043a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d/iu;
const CLEAR_WORK_REASON_PATTERN =
  /\u0443\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442\s+\u043d\u0430\s+(?:\u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d|\u043a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d|\u0442\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a|\u0440\u0430\u0431\u043e\u0447|\u043f\u0440\u043e\u0438\u0437\u0432\u043e\u0434\u0441\u0442\u0432\u0435\u043d\u043d|\u0441\u043b\u0443\u0436\u0435\u0431\u043d)|\u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d[\p{L}\p{N}_]*\s+\u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u0446|\u043a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d[\p{L}\p{N}_]*\s+(?:\u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442|\u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442)|\u0442\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a[\p{L}\p{N}_]*\s+\u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u0446|\u0440\u0430\u0431\u043e\u0447[\p{L}\p{N}_]*\s+\u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442|\u043f\u0440\u043e\u0435\u043a\u0442\u043d[\p{L}\p{N}_]*\s+\u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u0446|\u0441\u043b\u0443\u0436\u0435\u0431\u043d[\p{L}\p{N}_]*\s+\u0437\u0430\u043f\u0438\u0441\u043a|\u0441\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d[\p{L}\p{N}_]*\s+\u0437\u0430\u043a\u0443\u043f\u043a|\u043f\u0440\u043e\u0442\u043e\u043a\u043e\u043b[\p{L}\p{N}_]*\s+(?:\u043f\u043e\u0440\u0442\u0444\u0435\u043b|\u0441\u043e\u0432\u0435\u0449\u0430\u043d|\u043a\u043e\u043c\u0438\u0441\u0441\u0438)|\u0431\u0435\u0437\s+\u044f\u0432\u043d[\p{L}\p{N}_]*\s+(?:\u043b\u0438\u0447\u043d[\p{L}\p{N}_]*\s+\u0434\u0430\u043d\u043d|\u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d[\p{L}\p{N}_]*\s+\u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442)|\u043d\u0435\s+\u043e\u0442\u043d\u043e\u0441\u0438\u0442\u0441\u044f\s+\u043a\s+(?:\u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d|\u043f\u0435\u0440\u0435\u0447\u0438\u0441\u043b\u0435\u043d\u043d[\p{L}\p{N}_]*\s+\u043b\u0438\u0447\u043d)|\u043d\u0435\s+\u044f\u0432\u043b\u044f\u0435\u0442\u0441\u044f\s+\u043b\u0438\u0447\u043d|\u043d\u0435\s+\u0441\u0432\u044f\u0437\u0430\u043d[\u0430\u043e]?\s+\u0441\s+\u043b\u0438\u0447\u043d/iu;
const CORPORATE_HEALTH_MEMO_PATTERN =
  /\u043a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d[\p{L}\p{N}_]*\s+\u043f\u0430\u043c\u044f\u0442\u043a|\u043f\u0440\u043e\u0444\s*\.?\s*\u043e\u0441\u043c\u043e\u0442\u0440|\u043f\u0440\u043e\u0444\u043e\u0441\u043c\u043e\u0442\u0440/iu;

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
  const hasPersonalTopic =
    PERSONAL_TOPIC_CATEGORIES.has(input.primary_category) || input.signals.some((signal) => PERSONAL_TOPIC_SIGNALS.has(signal));
  const hasClearPersonalClassification = input.is_personal && hasPersonalTopic;
  const hasClearPersonalReason = CLEAR_PERSONAL_REASON_PATTERN.test(input.reason_short);
  if (hasClearPersonalReason && hasPersonalTopic) {
    const primaryCategory = PERSONAL_TOPIC_CATEGORIES.has(input.primary_category)
      ? input.primary_category
      : input.signals.includes("education")
        ? "education"
        : "other_personal";
    return {
      ...input,
      is_personal: true,
      primary_category: primaryCategory,
      needs_review: input.confidence_raw < 0.75 ? true : input.needs_review,
      risk_level: input.confidence_raw >= 0.75 ? "high" : input.confidence_raw >= 0.55 ? "medium" : "low",
    };
  }
  const isClearWorkContext =
    !hasClearPersonalReason &&
    ((!hasClearPersonalClassification && (input.signals.includes("work_like") || input.signals.includes("technical_scan_name"))) ||
      CLEAR_WORK_REASON_PATTERN.test(input.reason_short));
  const hasCorporateHealthMemoContext = !hasClearPersonalReason && CORPORATE_HEALTH_MEMO_PATTERN.test(input.reason_short);

  if (isClearWorkContext || hasCorporateHealthMemoContext) {
    return {
      ...input,
      is_personal: false,
      primary_category: "work",
      risk_level: "low",
      needs_review: false,
      signals: input.signals.includes("work_like") ? input.signals : ["work_like", ...input.signals].slice(0, 5),
    };
  }

  const shouldUpgradePersonalTopic =
    !input.is_personal &&
    input.primary_category !== "unknown" &&
    !input.signals.includes("work_like") &&
    hasPersonalTopic;
  const normalized = shouldUpgradePersonalTopic ? { ...input, is_personal: true, needs_review: true } : input;

  if (normalized.primary_category === "unknown") return { ...normalized, risk_level: "unknown", needs_review: true };
  if (normalized.is_personal && normalized.confidence_raw >= 0.75) return { ...normalized, risk_level: "high" };
  if (normalized.is_personal && normalized.confidence_raw >= 0.55) return { ...normalized, risk_level: "medium", needs_review: true };
  if (normalized.is_personal) return { ...normalized, risk_level: "low", needs_review: true };
  return { ...normalized, risk_level: "low" };
}

function documentClassificationHash(item, config) {
  const normalizedTitle = normalizeDocumentTitle(item.document_title);
  return createHash("sha256").update(`${config.schemaVersion}::${config.model}::${normalizedTitle}`).digest("hex");
}

function ownDependencies(config, dependencies) {
  const ownedCache = dependencies.cache ? null : new PrintLlmSqliteCache(config.cacheDbPath, { busyTimeoutMs: config.sqliteBusyTimeoutMs });
  return {
    ownedCache,
    deps: {
      callOllama: dependencies.callOllama ?? callOllamaChat,
      cache: dependencies.cache ?? ownedCache,
      queue: dependencies.queue ?? { run: (task) => task() },
    },
  };
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
    if (cached?.source === "llm") {
      return { id: item.id, normalized_title: normalizedTitle, ...postprocessRisk(cached), cache_hit: true };
    }
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
      const text = await dependencies.queue.run(() =>
        dependencies.callOllama({
          chatUrl: config.ollamaChatUrl,
          model: config.model,
          prompt,
          schema: PRINT_LLM_JSON_SCHEMA,
          timeoutMs: config.timeoutMs,
        }),
      );
      const validated = validateLlmClassification(parseOllamaJson(text));
      if (!validated) continue;
      const result = {
        id: item.id,
        normalized_title: normalizedTitle,
        source: "llm",
        ...postprocessRisk(validated),
        cache_hit: false,
      };
      if (config.cacheEnabled) {
        const { id, normalized_title: _normalizedTitle, cache_hit: _cacheHit, ...cacheValue } = result;
        dependencies.cache.set(key, cacheValue);
      }
      return result;
    } catch {
      if (attempt === 1) return fallbackItem(item, normalizedTitle);
    }
  }

  return fallbackItem(item, normalizedTitle);
}

export async function lookupPrintPersonalClassifications(items, config, dependencies = {}) {
  const { ownedCache, deps } = ownDependencies(config, dependencies);

  try {
    if (!config.cacheEnabled) return { items: [], missing: items };

    const keysByItem = items.map((item) => ({ item, key: documentClassificationHash(item, config), normalizedTitle: normalizeDocumentTitle(item.document_title) }));
    const cachedByKey = deps.cache.getClassifications(keysByItem.map(({ key }) => key));
    const found = [];
    const missing = [];

    keysByItem.forEach(({ item, key, normalizedTitle }) => {
      const cached = cachedByKey.get(key);
      if (cached?.source === "llm") {
        found.push({ id: item.id, normalized_title: cached.normalized_title ?? normalizedTitle, ...postprocessRisk(cached), cache_hit: true });
      } else {
        missing.push(item);
      }
    });

    return { items: found, missing };
  } finally {
    ownedCache?.close();
  }
}

export async function classifyMissingPrintPersonalItems(items, config, dependencies = {}) {
  const { ownedCache, deps } = ownDependencies(config, dependencies);

  try {
    const batchSize = Math.max(1, Number(config.batchSize || items.length || 1));
    const results = [];
    for (let index = 0; index < items.length; index += batchSize) {
      const batch = items.slice(index, index + batchSize);
      const classified = await Promise.all(batch.map((item) => classifyOne(item, config, deps)));
      classified.forEach((result) => {
        const original = batch.find((item) => item.id === result.id);
        if (original && config.cacheEnabled && result.source === "llm") {
          const { id, normalized_title: _normalizedTitle, cache_hit: _cacheHit, ...stored } = result;
          deps.cache.putClassification(documentClassificationHash(original, config), stored, { schemaVersion: config.schemaVersion, model: config.model });
        }
      });
      results.push(...classified);
    }
    return { items: results };
  } finally {
    ownedCache?.close();
  }
}

export async function classifyPrintPersonalItems(items, config, dependencies = {}) {
  const lookup = await lookupPrintPersonalClassifications(items, config, dependencies);
  const classified = await classifyMissingPrintPersonalItems(lookup.missing, config, dependencies);
  return { items: [...lookup.items, ...classified.items] };
}
