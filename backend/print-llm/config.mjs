import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BACKEND_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CACHE_DB_PATH = resolve(BACKEND_DIR, ".cache", "print-llm-cache.sqlite");
const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

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

export function readPrintLlmConfig(env = process.env) {
  const ollamaBaseUrl = env.OLLAMA_BASE_URL || "http://localhost:11434";

  return {
    enabled: env.PRINT_LLM_CLASSIFIER_ENABLED === "true",
    ollamaBaseUrl,
    ollamaChatUrl: env.OLLAMA_CHAT_URL || env.OLLAMA_API_URL || `${ollamaBaseUrl.replace(/\/$/, "")}/api/chat`,
    model: env.PRINT_LLM_MODEL || "qwen3:4b",
    timeoutMs: positiveNumber(env.PRINT_LLM_TIMEOUT_MS, 30000),
    batchSize: positiveInteger(env.PRINT_LLM_BATCH_SIZE, 20),
    cacheEnabled: env.PRINT_LLM_CACHE_ENABLED !== "false",
    cacheDbPath: env.PRINT_LLM_CACHE_DB_PATH || DEFAULT_CACHE_DB_PATH,
    schemaVersion: String(env.PRINT_LLM_SCHEMA_VERSION || 4),
    host: env.PRINT_LLM_HOST || "127.0.0.1",
    port: positiveInteger(env.PRINT_LLM_PORT, 8787),
    allowedOrigins: parseOrigins(env.PRINT_LLM_ALLOWED_ORIGINS),
    apiKey: typeof env.PRINT_LLM_API_KEY === "string" ? env.PRINT_LLM_API_KEY : "",
    requestBodyLimitBytes: positiveInteger(env.PRINT_LLM_REQUEST_BODY_LIMIT_BYTES, 1_000_000),
    httpRequestTimeoutMs: positiveInteger(env.PRINT_LLM_HTTP_REQUEST_TIMEOUT_MS, 300_000),
    httpHeadersTimeoutMs: positiveInteger(env.PRINT_LLM_HTTP_HEADERS_TIMEOUT_MS, 60_000),
    httpKeepAliveTimeoutMs: positiveInteger(env.PRINT_LLM_HTTP_KEEP_ALIVE_TIMEOUT_MS, 5_000),
    concurrency: positiveInteger(env.PRINT_LLM_CONCURRENCY, 1),
    sqliteBusyTimeoutMs: positiveInteger(env.PRINT_LLM_SQLITE_BUSY_TIMEOUT_MS, 5_000),
  };
}
