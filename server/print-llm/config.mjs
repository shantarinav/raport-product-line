export function readPrintLlmConfig(env = process.env) {
  return {
    enabled: env.PRINT_LLM_CLASSIFIER_ENABLED === "true",
    ollamaBaseUrl: env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: env.PRINT_LLM_MODEL || "qwen3:4b",
    timeoutMs: Number(env.PRINT_LLM_TIMEOUT_MS || 8000),
    batchSize: Number(env.PRINT_LLM_BATCH_SIZE || 20),
    cacheEnabled: env.PRINT_LLM_CACHE_ENABLED !== "false",
    schemaVersion: String(env.PRINT_LLM_SCHEMA_VERSION || 1),
    port: Number(env.PRINT_LLM_PORT || 8787),
  };
}
