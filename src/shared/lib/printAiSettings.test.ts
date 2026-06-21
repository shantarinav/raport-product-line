import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PRINT_AI_BACKEND_URL,
  checkPrintAiConnection,
  getPrintAiSettings,
  isPrintAiEnabled,
  setPrintAiEnabled,
  setPrintAiSettings,
} from "./printAiSettings";

function installMockWindow() {
  const storage = new Map<string, string>();
  const events = new EventTarget();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events),
    },
  });
}

function response(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

describe("print AI settings", () => {
  it("is disabled by default and uses local backend URL", () => {
    installMockWindow();

    expect(isPrintAiEnabled()).toBe(false);
    expect(getPrintAiSettings()).toEqual({
      enabled: false,
      backendUrl: DEFAULT_PRINT_AI_BACKEND_URL,
      apiKey: "",
    });
  });

  it("persists enabled flag locally", () => {
    installMockWindow();

    setPrintAiEnabled(true);
    expect(isPrintAiEnabled()).toBe(true);

    setPrintAiEnabled(false);
    expect(isPrintAiEnabled()).toBe(false);
  });

  it("persists backend URL and API key locally", () => {
    installMockWindow();

    setPrintAiSettings({ enabled: true, backendUrl: "http://server:8787/", apiKey: "secret" });

    expect(getPrintAiSettings()).toEqual({
      enabled: true,
      backendUrl: "http://server:8787",
      apiKey: "secret",
    });
  });

  it("is safe without browser window", () => {
    expect(isPrintAiEnabled()).toBe(false);
    expect(getPrintAiSettings()).toEqual({ enabled: false, backendUrl: DEFAULT_PRINT_AI_BACKEND_URL, apiKey: "" });
    expect(() => setPrintAiEnabled(true)).not.toThrow();
  });

  it("checks available backend connection", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { enabled: true, model: "qwen3:4b", cacheEnabled: true }));

    await expect(checkPrintAiConnection({ enabled: true, backendUrl: "http://server:8787", apiKey: "secret" }, fetchImpl)).resolves.toMatchObject({
      status: "available",
      model: "qwen3:4b",
      cacheEnabled: true,
    });
    expect(fetchImpl).toHaveBeenCalledWith("http://server:8787/health", {
      method: "GET",
      headers: { "x-raport-backend-key": "secret" },
    });
  });

  it("maps health check responses to user-facing statuses", async () => {
    await expect(checkPrintAiConnection({ enabled: true, backendUrl: "http://server:8787", apiKey: "" }, vi.fn().mockResolvedValue(response(200, { enabled: false })))).resolves.toMatchObject({ status: "disabled" });
    await expect(checkPrintAiConnection({ enabled: true, backendUrl: "http://server:8787", apiKey: "bad" }, vi.fn().mockResolvedValue(response(401, {})))).resolves.toMatchObject({ status: "unauthorized" });
    await expect(checkPrintAiConnection({ enabled: true, backendUrl: "http://server:8787", apiKey: "" }, vi.fn().mockRejectedValue(new Error("network")))).resolves.toMatchObject({ status: "unavailable" });
  });
});