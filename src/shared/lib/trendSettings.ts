import { useCallback, useSyncExternalStore } from "react";

const TREND_SETTINGS_KEY = "raport-trends-enabled";
const TREND_SETTINGS_EVENT = "raport-trends-enabled-change";

export function areTrendsEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(TREND_SETTINGS_KEY) === "true";
}

export function setTrendsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TREND_SETTINGS_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new Event(TREND_SETTINGS_EVENT));
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === TREND_SETTINGS_KEY) {
      callback();
    }
  }

  window.addEventListener(TREND_SETTINGS_EVENT, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(TREND_SETTINGS_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useTrendsEnabled(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, areTrendsEnabled, () => false);
  const update = useCallback((nextEnabled: boolean) => setTrendsEnabled(nextEnabled), []);

  return [enabled, update];
}
