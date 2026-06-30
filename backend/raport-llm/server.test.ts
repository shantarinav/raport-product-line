import { afterEach, describe, expect, it, vi } from "vitest";

const { createRaportLlmServer } = await import("./server.mjs");

const servers: Array<{ close: (callback?: (err?: Error) => void) => void }> = [];

function config(overrides = {}) {
  return {
    enabled: true,
    model: "qwen3:1.7b",
    a3Model: "qwen3:4b",
    cacheEnabled: false,
    cacheDbPath: ":memory:",
    sqliteBusyTimeoutMs: 5000,
    host: "127.0.0.1",
    port: 8787,
    allowedOrigins: ["https://bi.ekb.ru", "http://localhost:5173"],
    apiKey: "",
    requestBodyLimitBytes: 1_000_000,
    httpRequestTimeoutMs: 300_000,
    httpHeadersTimeoutMs: 60_000,
    httpKeepAliveTimeoutMs: 5_000,
    concurrency: 1,
    ...overrides,
  };
}

function listen(server) {
  servers.push(server);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(() => resolve(undefined));
        }),
    ),
  );
});

describe("createRaportLlmServer", () => {
  it("returns safe health information", async () => {
    const server = createRaportLlmServer(config());
    const baseUrl = await listen(server);

    const response = await fetch(`${baseUrl}/health`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, service: "raport-llm", model: "qwen3:1.7b", a3Model: "qwen3:4b" });
    expect(payload.queue).toMatchObject({ concurrency: 1, active: 0, pending: 0 });
    expect(JSON.stringify(payload)).not.toContain("apiKey");
  });

  it("rejects blocked CORS origins", async () => {
    const server = createRaportLlmServer(config());
    const baseUrl = await listen(server);

    const response = await fetch(`${baseUrl}/health`, { headers: { origin: "https://evil.example" } });

    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("answers preflight for allowed origins", async () => {
    const server = createRaportLlmServer(config());
    const baseUrl = await listen(server);

    const response = await fetch(`${baseUrl}/api/print/classifications/lookup`, {
      method: "OPTIONS",
      headers: { origin: "https://bi.ekb.ru" },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://bi.ekb.ru");
    expect(response.headers.get("access-control-allow-headers")).toContain("x-raport-backend-key");
  });

  it("requires API key for health checks when configured", async () => {
    const server = createRaportLlmServer(config({ apiKey: "secret" }));
    const baseUrl = await listen(server);

    const unauthorized = await fetch(baseUrl + "/health");
    const authorized = await fetch(baseUrl + "/health", { headers: { "x-raport-backend-key": "secret" } });

    expect(unauthorized.status).toBe(401);
    expect(authorized.status).toBe(200);
  });

  it("requires API key when configured", async () => {
    const server = createRaportLlmServer(config({ apiKey: "secret" }));
    const baseUrl = await listen(server);

    const response = await fetch(baseUrl + "/api/print/classifications/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });

    expect(response.status).toBe(401);
  });

  it("routes lookup endpoint to handler when API key is valid", async () => {
    const lookup = vi.fn().mockResolvedValue({ items: [{ id: "1" }], missing: [] });
    const server = createRaportLlmServer(config({ apiKey: "secret" }), { handlers: { lookup } });
    const baseUrl = await listen(server);

    const response = await fetch(`${baseUrl}/api/print/classifications/lookup`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-raport-backend-key": "secret" },
      body: JSON.stringify({ items: [{ id: "1" }] }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.items).toEqual([{ id: "1" }]);
    expect(lookup).toHaveBeenCalledWith([{ id: "1" }], expect.objectContaining({ apiKey: "secret" }));
  });

  it("uses the migrated Print domain handlers by default", async () => {
    const server = createRaportLlmServer(config({ enabled: false }));
    const baseUrl = await listen(server);

    const response = await fetch(`${baseUrl}/api/print/classify-personal`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [{ id: "diploma", document_title: "диплом.pdf" }] }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.items[0]).toMatchObject({
      id: "diploma",
      source: "disabled",
      primary_category: "unknown",
    });
  });

  it("routes A3 assist endpoint to handler", async () => {
    const assistA3 = vi.fn().mockResolvedValue({
      ok: true,
      suggestions: {
        problem: "Проблема",
        causeHypotheses: ["Причина"],
        fiveWhys: ["Почему?"],
        countermeasures: ["Действие"],
        expectedResult: "Результат",
        checkCriteria: "Проверка",
      },
      warnings: [],
    });
    const server = createRaportLlmServer(config(), { handlers: { assistA3 } });
    const baseUrl = await listen(server);
    const body = {
      dashboardType: "ssz",
      dashboardTitle: "ССЗ",
      periodLabel: "01.06.2026 - 09.06.2026",
      deviationTitle: "Доля работ по технологии ниже цели",
      metricName: "Доля работ по технологии",
    };

    const response = await fetch(`${baseUrl}/api/a3/assist`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(assistA3).toHaveBeenCalledWith(body, expect.objectContaining({ model: "qwen3:1.7b", a3Model: "qwen3:4b" }));
  });

  it("returns 413 for oversized request body", async () => {
    const server = createRaportLlmServer(config({ requestBodyLimitBytes: 3 }));
    const baseUrl = await listen(server);

    const response = await fetch(`${baseUrl}/api/print/classifications/lookup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "123456",
    });

    expect(response.status).toBe(413);
  });
});
