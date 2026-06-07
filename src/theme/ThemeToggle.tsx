import { Moon, Sun } from "lucide-react";
import { Button } from "../shared/ui/shadcn/button";
import { useTheme } from "./useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-9 shrink-0 rounded-full px-3 text-xs"
      aria-label={isDark ? "Включить светлую тему" : "Включить темную тему"}
      aria-pressed={isDark}
      onClick={toggleTheme}
    >
      {isDark ? <Moon className="h-4 w-4" strokeWidth={2} /> : <Sun className="h-4 w-4" strokeWidth={2} />}
      <span className="hidden sm:inline">{isDark ? "Темная" : "Светлая"}</span>
    </Button>
  );
}
