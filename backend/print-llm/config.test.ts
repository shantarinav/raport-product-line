import { describe, expect, it } from "vitest";

const { readPrintLlmConfig } = await import("./config.mjs");

describe("readPrintLlmConfig", () => {
  it("uses safe local defaults", () => {
    const config = readPrintLlmConfig({});

    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(8787);
    expect(config.allowedOrigins).toEqual(["http://localhost:5173", "http://127.0.0.1:5173"]);
    expect(config.apiKey).toBe("");
    expect(config.requestBodyLimitBytes).toBe(1_000_000);
    expect(config.httpRequestTimeoutMs).toBe(300_000);
    expect(config.httpHeadersTimeoutMs).toBe(60_000);
    expect(config.httpKeepAliveTimeoutMs).toBe(5_000);
    expect(config.concurrency).toBe(1);
    expect(config.sqliteBusyTimeoutMs).toBe(5_000);
  });

  it("parses network and security settings from env", () => {
    const config = readPrintLlmConfig({
      PRINT_LLM_HOST: "0.0.0.0",
      PRINT_LLM_PORT: "9999",
      PRINT_LLM_ALLOWED_ORIGINS: "https://bi.ekb.ru, http://server:8080 ",
      PRINT_LLM_API_KEY: "secret",
      PRINT_LLM_REQUEST_BODY_LIMIT_BYTES: "2000000",
      PRINT_LLM_HTTP_REQUEST_TIMEOUT_MS: "123000",
      PRINT_LLM_HTTP_HEADERS_TIMEOUT_MS: "45000",
      PRINT_LLM_HTTP_KEEP_ALIVE_TIMEOUT_MS: "7000",
      PRINT_LLM_CONCURRENCY: "2",
      PRINT_LLM_SQLITE_BUSY_TIMEOUT_MS: "8000",
    });

    expect(config.host).toBe("0.0.0.0");
    expect(config.port).toBe(9999);
    expect(config.allowedOrigins).toEqual(["https://bi.ekb.ru", "http://server:8080"]);
    expect(config.apiKey).toBe("secret");
    expect(config.requestBodyLimitBytes).toBe(2_000_000);
    expect(config.httpRequestTimeoutMs).toBe(123_000);
    expect(config.httpHeadersTimeoutMs).toBe(45_000);
    expect(config.httpKeepAliveTimeoutMs).toBe(7_000);
    expect(config.concurrency).toBe(2);
    expect(config.sqliteBusyTimeoutMs).toBe(8_000);
  });

  it("falls back to safe numbers for invalid numeric env values", () => {
    const config = readPrintLlmConfig({
      PRINT_LLM_PORT: "not-a-port",
      PRINT_LLM_BATCH_SIZE: "0",
      PRINT_LLM_REQUEST_BODY_LIMIT_BYTES: "-10",
      PRINT_LLM_CONCURRENCY: "0",
      PRINT_LLM_SQLITE_BUSY_TIMEOUT_MS: "abc",
    });

    expect(config.port).toBe(8787);
    expect(config.batchSize).toBe(20);
    expect(config.requestBodyLimitBytes).toBe(1_000_000);
    expect(config.concurrency).toBe(1);
    expect(config.sqliteBusyTimeoutMs).toBe(5_000);
  });
});
