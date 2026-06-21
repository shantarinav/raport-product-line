import { afterEach, describe, expect, it, vi } from "vitest";

const { createPrintLlmServer } = await import("./server.mjs");

const servers: Array<{ close: (callback?: (err?: Error) => void) => void }> = [];

function config(overrides = {}) {
  return {
    enabled: true,
    model: "qwen3:4b",
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

describe("createPrintLlmServer", () => {
  it("returns safe health information", async () => {
    const server = createPrintLlmServer(config());
    const baseUrl = await listen(server);

    const response = await fetch(`${baseUrl}/health`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, service: "print-llm", model: "qwen3:4b" });
    expect(payload.queue).toMatchObject({ concurrency: 1, active: 0, pending: 0 });
    expect(JSON.stringify(payload)).not.toContain("apiKey");
  });

  it("rejects blocked CORS origins", async () => {
    const server = createPrintLlmServer(config());
    const baseUrl = await listen(server);

    const response = await fetch(`${baseUrl}/health`, { headers: { origin: "https://evil.example" } });

    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("answers preflight for allowed origins", async () => {
    const server = createPrintLlmServer(config());
    const baseUrl = await listen(server);

    const response = await fetch(`${baseUrl}/api/print/classifications/lookup`, {
      method: "OPTIONS",
      headers: { origin: "https://bi.ekb.ru" },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://bi.ekb.ru");
    expect(response.headers.get("access-control-allow-headers")).toContain("x-raport-backend-key");
  });

  it("requires API key when configured", async () => {
    const server = createPrintLlmServer(config({ apiKey: "secret" }));
    const baseUrl = await listen(server);

    const response = await fetch(`${baseUrl}/api/print/classifications/lookup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });

    expect(response.status).toBe(401);
  });

  it("routes lookup endpoint to handler when API key is valid", async () => {
    const lookup = vi.fn().mockResolvedValue({ items: [{ id: "1" }], missing: [] });
    const server = createPrintLlmServer(config({ apiKey: "secret" }), { handlers: { lookup } });
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

  it("returns 413 for oversized request body", async () => {
    const server = createPrintLlmServer(config({ requestBodyLimitBytes: 3 }));
    const baseUrl = await listen(server);

    const response = await fetch(`${baseUrl}/api/print/classifications/lookup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "123456",
    });

    expect(response.status).toBe(413);
  });
});
