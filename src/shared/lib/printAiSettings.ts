import { useCallback, useSyncExternalStore } from "react";

export const DEFAULT_PRINT_AI_BACKEND_URL = "http://127.0.0.1:8787";

const PRINT_AI_ENABLED_KEY = "raport-print-ai-enabled";
const PRINT_AI_BACKEND_URL_KEY = "raport-print-ai-backend-url";
const PRINT_AI_API_KEY_KEY = "raport-print-ai-api-key";
const PRINT_AI_SETTINGS_EVENT = "raport-print-ai-settings-change";

export type PrintAiSettings = {
  enabled: boolean;
  backendUrl: string;
  apiKey: string;
};

export type PrintAiHealthStatus = "available" | "disabled" | "unauthorized" | "unavailable";

export type PrintAiHealthResult = {
  status: PrintAiHealthStatus;
  message: string;
  model?: string;
  cacheEnabled?: boolean;
};

function normalizeBackendUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed || DEFAULT_PRINT_AI_BACKEND_URL;
}

function readStorageValue(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Settings are optional convenience. The app must keep working without persistence.
  }
}

function dispatchSettingsChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PRINT_AI_SETTINGS_EVENT));
}

export function getPrintAiSettings(): PrintAiSettings {
  return {
    enabled: readStorageValue(PRINT_AI_ENABLED_KEY) === "true",
    backendUrl: normalizeBackendUrl(readStorageValue(PRINT_AI_BACKEND_URL_KEY) ?? DEFAULT_PRINT_AI_BACKEND_URL),
    apiKey: readStorageValue(PRINT_AI_API_KEY_KEY) ?? "",
  };
}

export function setPrintAiSettings(nextSettings: Partial<PrintAiSettings>): void {
  const current = getPrintAiSettings();
  const next: PrintAiSettings = {
    enabled: nextSettings.enabled ?? current.enabled,
    backendUrl: normalizeBackendUrl(nextSettings.backendUrl ?? current.backendUrl),
    apiKey: nextSettings.apiKey ?? current.apiKey,
  };

  writeStorageValue(PRINT_AI_ENABLED_KEY, next.enabled ? "true" : "false");
  writeStorageValue(PRINT_AI_BACKEND_URL_KEY, next.backendUrl);
  writeStorageValue(PRINT_AI_API_KEY_KEY, next.apiKey);
  dispatchSettingsChange();
}

export function isPrintAiEnabled(): boolean {
  return getPrintAiSettings().enabled;
}

export function setPrintAiEnabled(enabled: boolean): void {
  setPrintAiSettings({ enabled });
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  function handleStorage(event: StorageEvent) {
    if ([PRINT_AI_ENABLED_KEY, PRINT_AI_BACKEND_URL_KEY, PRINT_AI_API_KEY_KEY].includes(String(event.key))) {
      callback();
    }
  }

  window.addEventListener(PRINT_AI_SETTINGS_EVENT, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(PRINT_AI_SETTINGS_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function usePrintAiSettings(): [PrintAiSettings, (nextSettings: Partial<PrintAiSettings>) => void] {
  const settings = useSyncExternalStore(subscribe, getPrintAiSettings, () => ({
    enabled: false,
    backendUrl: DEFAULT_PRINT_AI_BACKEND_URL,
    apiKey: "",
  }));
  const update = useCallback((nextSettings: Partial<PrintAiSettings>) => setPrintAiSettings(nextSettings), []);

  return [settings, update];
}

export function usePrintAiEnabled(): [boolean, (enabled: boolean) => void] {
  const [settings, setSettings] = usePrintAiSettings();
  const update = useCallback((nextEnabled: boolean) => setSettings({ enabled: nextEnabled }), [setSettings]);

  return [settings.enabled, update];
}

export async function checkPrintAiConnection(settings: PrintAiSettings, fetchImpl = fetch): Promise<PrintAiHealthResult> {
  const healthUrl = `${normalizeBackendUrl(settings.backendUrl)}/health`;
  const headers: Record<string, string> = {};
  if (settings.apiKey) headers["x-raport-backend-key"] = settings.apiKey;

  try {
    const response = await fetchImpl(healthUrl, { method: "GET", headers });
    if (response.status === 401) {
      return { status: "unauthorized", message: "Backend найден, но API-ключ не принят." };
    }
    if (!response.ok) {
      return { status: "unavailable", message: `Backend ответил с ошибкой ${response.status}.` };
    }

    const payload = (await response.json()) as { enabled?: boolean; model?: string; cacheEnabled?: boolean };
    if (payload.enabled === false) {
      return {
        status: "disabled",
        message: "Backend доступен, но ИИ-классификация выключена на сервере.",
        model: payload.model,
        cacheEnabled: payload.cacheEnabled,
      };
    }

    return {
      status: "available",
      message: `Backend доступен${payload.model ? ` · модель ${payload.model}` : ""}.`,
      model: payload.model,
      cacheEnabled: payload.cacheEnabled,
    };
  } catch {
    return { status: "unavailable", message: "Нет подключения к backend. Проверьте адрес и запущен ли сервис." };
  }
}