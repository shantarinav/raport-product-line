import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../cn";

type SegmentedControlOption<TValue extends string> = {
  value: TValue;
  label: ReactNode;
  Icon?: LucideIcon;
  badge?: ReactNode;
  title?: string;
};

type SegmentedControlProps<TValue extends string> = {
  value: TValue;
  options: Array<SegmentedControlOption<TValue>>;
  onChange: (value: TValue) => void;
  className?: string;
  ariaLabel?: string;
  size?: "sm" | "md";
};

export function SegmentedControl<TValue extends string>({
  value,
  options,
  onChange,
  className,
  ariaLabel,
  size = "md",
}: SegmentedControlProps<TValue>) {
  const sizeClass = size === "sm" ? "min-h-8 px-3 text-sm" : "min-h-9 px-3 text-sm";

  return (
    <div
      className={cn("inline-flex w-full flex-wrap gap-1 rounded-control border border-raport-border bg-raport-surface-soft p-1 sm:w-fit", className)}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const Icon = option.Icon;
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "inline-flex items-center gap-2 rounded-control font-semibold transition-colors",
              sizeClass,
              isActive
                ? "bg-raport-action-bg-active text-raport-primary shadow-[inset_0_0_0_1px_var(--raport-action-border)]"
                : "text-raport-muted hover:bg-raport-action-bg hover:text-raport-text",
            )}
            title={option.title}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={2} /> : null}
            {option.label ? <span>{option.label}</span> : null}
            {option.badge}
          </button>
        );
      })}
    </div>
  );
}
