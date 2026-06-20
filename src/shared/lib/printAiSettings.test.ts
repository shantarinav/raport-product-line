import { afterEach, describe, expect, it } from "vitest";
import { isPrintAiEnabled, setPrintAiEnabled } from "./printAiSettings";

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

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

describe("print AI settings", () => {
  it("is disabled by default", () => {
    installMockWindow();

    expect(isPrintAiEnabled()).toBe(false);
  });

  it("persists enabled flag locally", () => {
    installMockWindow();

    setPrintAiEnabled(true);
    expect(isPrintAiEnabled()).toBe(true);

    setPrintAiEnabled(false);
    expect(isPrintAiEnabled()).toBe(false);
  });

  it("is safe without browser window", () => {
    expect(isPrintAiEnabled()).toBe(false);
    expect(() => setPrintAiEnabled(true)).not.toThrow();
  });
});
