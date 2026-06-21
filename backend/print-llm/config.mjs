import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BACKEND_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CACHE_DB_PATH = resolve(BACKEND_DIR, ".cache", "print-llm-cache.sqlite");

export function readPrintLlmConfig(env = process.env) {
  const ollamaBaseUrl = env.OLLAMA_BASE_URL || "http://localhost:11434";

  return {
    enabled: env.PRINT_LLM_CLASSIFIER_ENABLED === "true",
    ollamaBaseUrl,
    ollamaChatUrl: env.OLLAMA_CHAT_URL || env.OLLAMA_API_URL || `${ollamaBaseUrl.replace(/\/$/, "")}/api/chat`,
    model: env.PRINT_LLM_MODEL || "qwen3:4b",
    timeoutMs: Number(env.PRINT_LLM_TIMEOUT_MS || 30000),
    batchSize: Number(env.PRINT_LLM_BATCH_SIZE || 20),
    cacheEnabled: env.PRINT_LLM_CACHE_ENABLED !== "false",
    cacheDbPath: env.PRINT_LLM_CACHE_DB_PATH || DEFAULT_CACHE_DB_PATH,
    schemaVersion: String(env.PRINT_LLM_SCHEMA_VERSION || 4),
    port: Number(env.PRINT_LLM_PORT || 8787),
  };
}
