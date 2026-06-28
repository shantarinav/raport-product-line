import { cn } from "../cn";

type QuickFocusTone = "neutral" | "primary" | "success" | "warning" | "danger";

export type QuickFocusOption<TValue extends string> = {
  value: TValue;
  label: string;
  count?: string | number;
  tone?: QuickFocusTone;
};

type QuickFocusGroupProps<TValue extends string> = {
  label?: string;
  value: TValue;
  options: Array<QuickFocusOption<TValue>>;
  onChange: (value: TValue) => void;
  columnsClassName?: string;
  className?: string;
  showCurrent?: boolean;
  currentLabel?: string;
  variant?: "panel" | "plain";
};

const activeToneClass: Record<QuickFocusTone, string> = {
  neutral: "border-raport-action-border bg-raport-action-bg-active text-raport-primary shadow-[inset_0_0_0_1px_var(--raport-action-border)]",
  primary: "border-raport-action-border bg-raport-action-bg-active text-raport-primary shadow-[inset_0_0_0_1px_var(--raport-action-border)]",
  success: "border-raport-success-border bg-raport-success-muted text-raport-success shadow-[inset_0_0_0_1px_var(--raport-success-border)]",
  warning: "border-raport-warning-border bg-raport-warning-muted text-raport-warning shadow-[inset_0_0_0_1px_var(--raport-warning-border)]",
  danger: "border-raport-danger-border bg-raport-danger-muted text-raport-danger shadow-[inset_0_0_0_1px_var(--raport-danger-border)]",
};

export function QuickFocusGroup<TValue extends string>({
  label,
  value,
  options,
  onChange,
  columnsClassName,
  className,
  showCurrent = false,
  currentLabel,
  variant = "panel",
}: QuickFocusGroupProps<TValue>) {
  const current = options.find((option) => option.value === value);

  return (
    <div className={cn(variant === "panel" && "rounded-control border border-raport-border bg-raport-surface-soft p-2", className)}>
      {label || showCurrent ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          {label ? <span className="text-xs font-semibold text-raport-muted">{label}</span> : <span />}
          {showCurrent && current ? (
            <span className="rounded-full border border-raport-border bg-raport-surface px-2 py-0.5 text-[10px] font-bold text-raport-muted">
              {currentLabel ?? current.label}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className={cn("grid gap-1", columnsClassName)}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                "flex min-h-8 items-center justify-between gap-2 rounded-control border px-2 py-1 text-xs font-semibold transition-colors",
                active
                  ? activeToneClass[option.tone ?? "neutral"]
                  : "border-raport-border bg-raport-surface text-raport-text hover:bg-raport-action-bg",
              )}
              onClick={() => onChange(option.value)}
            >
              <span>{option.label}</span>
              {option.count !== undefined ? <span className="tabular-nums opacity-75">{option.count}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
