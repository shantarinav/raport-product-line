import { cn } from "../cn";

type ToggleOption = {
  value: string;
  label: string;
};

type ToggleGroupProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: ToggleOption[];
  className?: string;
};

export function ToggleGroup({ value, onValueChange, options, className }: ToggleGroupProps) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border border-[var(--raport-border)] bg-slate-50 p-1",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onValueChange(option.value)}
            className={cn(
              "min-h-7 rounded-full px-3 py-1 text-xs font-semibold text-slate-600",
              isActive && "bg-[var(--raport-action-bg-active)] text-[var(--raport-primary)] shadow-[inset_0_0_0_1px_var(--raport-action-border)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
