import { useId } from "react";
import { cn } from "../cn";
import { motion } from "motion/react";

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
  const switchId = useId();
  return (
    <motion.div
      layout
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border border-raport-border bg-raport-surface-soft p-1",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <motion.button
            layout
            key={option.value}
            type="button"
            onClick={() => onValueChange(option.value)}
            className={cn(
              "relative min-h-7 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              isActive ? "text-raport-primary" : "text-raport-muted hover:text-raport-text hover:bg-black/5 dark:hover:bg-white/5",
            )}
          >
            {isActive && (
              <motion.div
                layoutId={`toggleHighlight-${switchId}`}
                className="absolute inset-0 rounded-full bg-raport-action-bg-active shadow-[inset_0_0_0_1px_var(--raport-action-border)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
