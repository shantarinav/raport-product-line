import { useCallback, useSyncExternalStore } from "react";

export const DEFAULT_RAPORT_AI_SERVICE_URL = "http://127.0.0.1:8787";

const RAPORT_AI_ENABLED_KEY = "raport-ai-enabled";
const RAPORT_AI_SERVICE_URL_KEY = "raport-ai-service-url";
const RAPORT_AI_API_KEY_KEY = "raport-ai-api-key";
const RAPORT_AI_PRINT_PERSONAL_KEY = "raport-ai-print-personal-enabled";
const RAPORT_AI_A3_ASSIST_KEY = "raport-ai-a3-assist-enabled";
const RAPORT_AI_SETTINGS_EVENT = "raport-ai-settings-change";

const LEGACY_PRINT_AI_ENABLED_KEY = "raport-print-ai-enabled";
const LEGACY_PRINT_AI_BACKEND_URL_KEY = "raport-print-ai-backend-url";
const LEGACY_PRINT_AI_API_KEY_KEY = "raport-print-ai-api-key";

export type RaportAiSettings = {
  enabled: boolean;
  serviceUrl: string;
  apiKey: string;
  printPersonalCheckEnabled: boolean;
  a3AssistEnabled: boolean;
};

export type RaportAiHealthStatus = "available" | "disabled" | "unauthorized" | "unavailable";

export type RaportAiHealthResult = {
  status: RaportAiHealthStatus;
  message: string;
  service?: string;
  model?: string;
  domains?: string[];
  cacheEnabled?: boolean;
  cacheClassifications?: number;
  cacheStatus?: string;
  queue?: {
    concurrency: number;
    active: number;
    pending: number;
  };
};

let cachedSettings: RaportAiSettings | null = null;

function normalizeServiceUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed || DEFAULT_RAPORT_AI_SERVICE_URL;
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
    // Optional settings must not break the static frontend.
  }
}

function dispatchSettingsChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(RAPORT_AI_SETTINGS_EVENT));
}

function sameSettings(left: RaportAiSettings | null, right: RaportAiSettings): boolean {
  return Boolean(
    left &&
      left.enabled === right.enabled &&
      left.serviceUrl === right.serviceUrl &&
      left.apiKey === right.apiKey &&
      left.printPersonalCheckEnabled === right.printPersonalCheckEnabled &&
      left.a3AssistEnabled === right.a3AssistEnabled,
  );
}

function readBoolean(primaryKey: string, legacyKey?: string): boolean {
  const primary = readStorageValue(primaryKey);
  if (primary !== null) return primary === "true";
  return legacyKey ? readStorageValue(legacyKey) === "true" : false;
}

export function getRaportAiSettings(): RaportAiSettings {
  const hasSharedSettings = readStorageValue(RAPORT_AI_ENABLED_KEY) !== null || readStorageValue(RAPORT_AI_SERVICE_URL_KEY) !== null;
  const legacyPrintEnabled = readStorageValue(LEGACY_PRINT_AI_ENABLED_KEY) === "true";

  const next: RaportAiSettings = {
    enabled: readBoolean(RAPORT_AI_ENABLED_KEY, LEGACY_PRINT_AI_ENABLED_KEY),
    serviceUrl: normalizeServiceUrl(
      readStorageValue(RAPORT_AI_SERVICE_URL_KEY) ??
        readStorageValue(LEGACY_PRINT_AI_BACKEND_URL_KEY) ??
        DEFAULT_RAPORT_AI_SERVICE_URL,
    ),
    apiKey: readStorageValue(RAPORT_AI_API_KEY_KEY) ?? readStorageValue(LEGACY_PRINT_AI_API_KEY_KEY) ?? "",
    printPersonalCheckEnabled: readBoolean(RAPORT_AI_PRINT_PERSONAL_KEY) || (!hasSharedSettings && legacyPrintEnabled),
    a3AssistEnabled: readBoolean(RAPORT_AI_A3_ASSIST_KEY),
  };

  if (sameSettings(cachedSettings, next)) return cachedSettings as RaportAiSettings;
  cachedSettings = next;
  return next;
}

export function setRaportAiSettings(nextSettings: Partial<RaportAiSettings>): void {
  const current = getRaportAiSettings();
  const next: RaportAiSettings = {
    enabled: nextSettings.enabled ?? current.enabled,
    serviceUrl: normalizeServiceUrl(nextSettings.serviceUrl ?? current.serviceUrl),
    apiKey: nextSettings.apiKey ?? current.apiKey,
    printPersonalCheckEnabled: nextSettings.printPersonalCheckEnabled ?? current.printPersonalCheckEnabled,
    a3AssistEnabled: nextSettings.a3AssistEnabled ?? current.a3AssistEnabled,
  };

  writeStorageValue(RAPORT_AI_ENABLED_KEY, next.enabled ? "true" : "false");
  writeStorageValue(RAPORT_AI_SERVICE_URL_KEY, next.serviceUrl);
  writeStorageValue(RAPORT_AI_API_KEY_KEY, next.apiKey);
  writeStorageValue(RAPORT_AI_PRINT_PERSONAL_KEY, next.printPersonalCheckEnabled ? "true" : "false");
  writeStorageValue(RAPORT_AI_A3_ASSIST_KEY, next.a3AssistEnabled ? "true" : "false");
  cachedSettings = next;
  dispatchSettingsChange();
}

export function isPrintPersonalAiEnabled(): boolean {
  const settings = getRaportAiSettings();
  return settings.enabled && settings.printPersonalCheckEnabled;
}

export function isA3AssistEnabled(): boolean {
  const settings = getRaportAiSettings();
  return settings.enabled && settings.a3AssistEnabled;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  function handleStorage(event: StorageEvent) {
    if (
      [
        RAPORT_AI_ENABLED_KEY,
        RAPORT_AI_SERVICE_URL_KEY,
        RAPORT_AI_API_KEY_KEY,
        RAPORT_AI_PRINT_PERSONAL_KEY,
        RAPORT_AI_A3_ASSIST_KEY,
        LEGACY_PRINT_AI_ENABLED_KEY,
        LEGACY_PRINT_AI_BACKEND_URL_KEY,
        LEGACY_PRINT_AI_API_KEY_KEY,
      ].includes(String(event.key))
    ) {
      cachedSettings = null;
      callback();
    }
  }

  window.addEventListener(RAPORT_AI_SETTINGS_EVENT, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(RAPORT_AI_SETTINGS_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useRaportAiSettings(): [RaportAiSettings, (nextSettings: Partial<RaportAiSettings>) => void] {
  const settings = useSyncExternalStore(subscribe, getRaportAiSettings, () => ({
    enabled: false,
    serviceUrl: DEFAULT_RAPORT_AI_SERVICE_URL,
    apiKey: "",
    printPersonalCheckEnabled: false,
    a3AssistEnabled: false,
  }));
  const update = useCallback((nextSettings: Partial<RaportAiSettings>) => setRaportAiSettings(nextSettings), []);

  return [settings, update];
}

export async function checkRaportAiConnection(settings: RaportAiSettings, fetchImpl = fetch): Promise<RaportAiHealthResult> {
  const healthUrl = `${normalizeServiceUrl(settings.serviceUrl)}/health`;
  const headers: Record<string, string> = {};
  if (settings.apiKey) headers["x-raport-backend-key"] = settings.apiKey;

  try {
    const response = await fetchImpl(healthUrl, { method: "GET", headers });
    if (response.status === 401) {
      return { status: "unauthorized", message: "Сервис найден, но ключ доступа не принят." };
    }
    if (!response.ok) {
      return { status: "unavailable", message: `Сервис ИИ ответил с ошибкой ${response.status}.` };
    }

    const payload = (await response.json()) as {
      enabled?: boolean;
      service?: string;
      model?: string;
      domains?: string[];
      cacheEnabled?: boolean;
      cacheClassifications?: number;
      cacheStatus?: string;
      queue?: {
        concurrency?: number;
        active?: number;
        pending?: number;
      };
    };
    const details = {
      service: payload.service,
      model: payload.model,
      domains: Array.isArray(payload.domains) ? payload.domains : undefined,
      cacheEnabled: payload.cacheEnabled,
      cacheClassifications: payload.cacheClassifications,
      cacheStatus: payload.cacheStatus,
      queue:
        payload.queue &&
        typeof payload.queue.concurrency === "number" &&
        typeof payload.queue.active === "number" &&
        typeof payload.queue.pending === "number"
          ? {
              concurrency: payload.queue.concurrency,
              active: payload.queue.active,
              pending: payload.queue.pending,
            }
          : undefined,
    };

    if (payload.enabled === false) {
      return {
        status: "disabled",
        message: "Сервис доступен, но ИИ-возможности выключены.",
        ...details,
      };
    }

    return {
      status: "available",
      message: `ИИ-сервис подключен${payload.model ? ` · модель ${payload.model}` : ""}.`,
      ...details,
    };
  } catch {
    return {
      status: "unavailable",
      message: "Не удалось подключиться к ИИ-сервису. Проверьте адрес и что сервис запущен.",
    };
  }
}
