import { Moon, Sun } from "lucide-react";
import { cn } from "../shared/ui/cn";
import { useTheme } from "./useTheme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--raport-border)] bg-[var(--raport-surface-soft)] p-1"
      role="group"
      aria-label="Переключатель темы"
      title={isDark ? "Сейчас включена темная тема" : "Сейчас включена светлая тема"}
    >
      <button
        type="button"
        className={cn(
          "inline-flex h-7 w-8 items-center justify-center rounded-full text-[var(--raport-muted)] transition-colors hover:bg-[var(--raport-surface-elevated)] hover:text-[var(--raport-text)]",
          !isDark && "bg-[var(--raport-action-bg-active)] text-[var(--raport-primary)] shadow-[inset_0_0_0_1px_var(--raport-action-border)]",
        )}
        aria-label="Включить светлую тему"
        aria-pressed={!isDark}
        title="Включить светлую тему"
        onClick={() => setTheme("light")}
      >
        <Sun className="h-4 w-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        className={cn(
          "inline-flex h-7 w-8 items-center justify-center rounded-full text-[var(--raport-muted)] transition-colors hover:bg-[var(--raport-surface-elevated)] hover:text-[var(--raport-text)]",
          isDark && "bg-[var(--raport-action-bg-active)] text-[var(--raport-primary)] shadow-[inset_0_0_0_1px_var(--raport-action-border)]",
        )}
        aria-label="Включить темную тему"
        aria-pressed={isDark}
        title="Включить темную тему"
        onClick={() => setTheme("dark")}
      >
        <Moon className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
