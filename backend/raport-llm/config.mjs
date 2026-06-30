import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BACKEND_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CACHE_DB_PATH = resolve(BACKEND_DIR, ".cache", "raport-llm-cache.sqlite");
const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function positiveInteger(value, fallback) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOrigins(value) {
  if (typeof value !== "string" || !value.trim()) return DEFAULT_ALLOWED_ORIGINS;
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function readRaportLlmConfig(env = process.env) {
  const ollamaBaseUrl = firstDefined(env.RAPORT_LLM_OLLAMA_BASE_URL, env.OLLAMA_BASE_URL, "http://localhost:11434");
  const normalizedOllamaBaseUrl = String(ollamaBaseUrl).replace(/\/$/, "");

  return {
    enabled: env.RAPORT_LLM_ENABLED === "true",
    ollamaBaseUrl,
    ollamaChatUrl:
      firstDefined(env.RAPORT_LLM_OLLAMA_CHAT_URL, env.OLLAMA_CHAT_URL, env.OLLAMA_API_URL) ||
      `${normalizedOllamaBaseUrl}/api/chat`,
    model: firstDefined(env.RAPORT_LLM_MODEL, "qwen3:1.7b"),
    a3Model: firstDefined(env.RAPORT_LLM_A3_MODEL, env.A3_LLM_MODEL, env.RAPORT_LLM_MODEL, "qwen3:4b"),
    timeoutMs: positiveNumber(env.RAPORT_LLM_TIMEOUT_MS, 30000),
    batchSize: positiveInteger(env.RAPORT_LLM_BATCH_SIZE, 20),
    cacheEnabled: env.RAPORT_LLM_CACHE_ENABLED !== "false",
    cacheDbPath: firstDefined(env.RAPORT_LLM_CACHE_DB_PATH, DEFAULT_CACHE_DB_PATH),
    schemaVersion: String(firstDefined(env.RAPORT_LLM_SCHEMA_VERSION, 4)),
    host: firstDefined(env.RAPORT_LLM_HOST, "127.0.0.1"),
    port: positiveInteger(env.RAPORT_LLM_PORT, 8787),
    allowedOrigins: parseOrigins(env.RAPORT_LLM_ALLOWED_ORIGINS),
    apiKey: typeof env.RAPORT_LLM_API_KEY === "string" ? env.RAPORT_LLM_API_KEY : "",
    requestBodyLimitBytes: positiveInteger(
      env.RAPORT_LLM_REQUEST_BODY_LIMIT_BYTES,
      1_000_000,
    ),
    httpRequestTimeoutMs: positiveInteger(
      env.RAPORT_LLM_HTTP_REQUEST_TIMEOUT_MS,
      300_000,
    ),
    httpHeadersTimeoutMs: positiveInteger(
      env.RAPORT_LLM_HTTP_HEADERS_TIMEOUT_MS,
      60_000,
    ),
    httpKeepAliveTimeoutMs: positiveInteger(
      env.RAPORT_LLM_HTTP_KEEP_ALIVE_TIMEOUT_MS,
      5_000,
    ),
    concurrency: positiveInteger(env.RAPORT_LLM_CONCURRENCY, 1),
    sqliteBusyTimeoutMs: positiveInteger(
      env.RAPORT_LLM_SQLITE_BUSY_TIMEOUT_MS,
      5_000,
    ),
  };
}
