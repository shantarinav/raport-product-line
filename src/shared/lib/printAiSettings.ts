import { useCallback, useSyncExternalStore } from "react";

const PRINT_AI_SETTINGS_KEY = "raport-print-ai-enabled";
const PRINT_AI_SETTINGS_EVENT = "raport-print-ai-enabled-change";

export function isPrintAiEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(PRINT_AI_SETTINGS_KEY) === "true";
}

export function setPrintAiEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PRINT_AI_SETTINGS_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new Event(PRINT_AI_SETTINGS_EVENT));
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === PRINT_AI_SETTINGS_KEY) {
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

export function usePrintAiEnabled(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, isPrintAiEnabled, () => false);
  const update = useCallback((nextEnabled: boolean) => setPrintAiEnabled(nextEnabled), []);

  return [enabled, update];
}
