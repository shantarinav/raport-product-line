import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_RAPORT_AI_SERVICE_URL,
  checkRaportAiConnection,
  getRaportAiSettings,
  isA3AssistEnabled,
  isPrintPersonalAiEnabled,
  setRaportAiSettings,
} from "./raportAiSettings";

function installMockWindow(seed: Record<string, string> = {}) {
  const storage = new Map<string, string>(Object.entries(seed));
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

describe("raport AI settings", () => {
  it("is disabled by default and uses the local service URL", () => {
    installMockWindow();

    expect(getRaportAiSettings()).toEqual({
      enabled: false,
      serviceUrl: DEFAULT_RAPORT_AI_SERVICE_URL,
      apiKey: "",
      printPersonalCheckEnabled: false,
      a3AssistEnabled: false,
    });
  });

  it("migrates old Print AI settings into shared Raport AI settings", () => {
    installMockWindow({
      "raport-print-ai-enabled": "true",
      "raport-print-ai-backend-url": "http://print-ai.local:8787/",
      "raport-print-ai-api-key": "secret",
    });

    expect(getRaportAiSettings()).toEqual({
      enabled: true,
      serviceUrl: "http://print-ai.local:8787",
      apiKey: "secret",
      printPersonalCheckEnabled: true,
      a3AssistEnabled: false,
    });
  });

  it("persists shared options independently", () => {
    installMockWindow();

    setRaportAiSettings({
      enabled: true,
      serviceUrl: "http://server:8787/",
      apiKey: "key",
      printPersonalCheckEnabled: true,
      a3AssistEnabled: true,
    });

    expect(isPrintPersonalAiEnabled()).toBe(true);
    expect(isA3AssistEnabled()).toBe(true);
    expect(getRaportAiSettings().serviceUrl).toBe("http://server:8787");
  });

  it("checks shared Raport LLM health endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      response(200, {
        enabled: true,
        service: "raport-llm",
        model: "qwen3:4b",
        domains: ["print", "a3"],
        queue: { concurrency: 1, active: 0, pending: 0 },
      }),
    );

    await expect(checkRaportAiConnection({ ...getRaportAiSettings(), enabled: true, serviceUrl: "http://server:8787", apiKey: "secret" }, fetchImpl)).resolves.toMatchObject({
      status: "available",
      service: "raport-llm",
      model: "qwen3:4b",
      domains: ["print", "a3"],
    });
    expect(fetchImpl).toHaveBeenCalledWith("http://server:8787/health", {
      method: "GET",
      headers: { "x-raport-backend-key": "secret" },
    });
  });
});
