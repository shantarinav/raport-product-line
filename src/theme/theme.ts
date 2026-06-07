export const THEME_STORAGE_KEY = "raport-theme";

export type ThemeName = "light" | "dark";

export function isThemeName(value: unknown): value is ThemeName {
  return value === "light" || value === "dark";
}

export function readStoredTheme(): ThemeName {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeName(storedTheme) ? storedTheme : "light";
}

export function applyTheme(theme: ThemeName) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
}

export function saveTheme(theme: ThemeName) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}
