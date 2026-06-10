import { useEffect, useRef, useState } from "react";
import { Input } from "../../../shared/ui/shadcn/input";

export function RowNameButton({ text, onClick, className }: { text: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={text}
      className={`block min-w-0 max-w-full cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap border-0 bg-transparent px-0 py-0 text-left text-raport-text hover:text-raport-primary ${className ?? ""}`}
    >
      {text}
    </button>
  );
}

export function RankBadge({ rank, tone }: { rank: number; tone: "support" | "danger" | "warning" }) {
  const toneClass =
    tone === "support"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <span
      className={`inline-flex min-h-4 min-w-8 items-center justify-center rounded-md border px-1.5 py-0 text-[10px] font-semibold leading-4 ${toneClass}`}
      aria-label={`Рейтинг ${rank}`}
    >
      #{rank}
    </span>
  );
}

export function AutocompleteField({
  value,
  onChange,
  placeholder,
  options,
  onCommit,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
  onCommit?: (value: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const blurTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (blurTimerRef.current !== null) {
            window.clearTimeout(blurTimerRef.current);
          }
          blurTimerRef.current = window.setTimeout(() => {
            setOpen(false);
            blurTimerRef.current = null;
          }, 120);
        }}
        onChange={(event) => {
          onChange(event.currentTarget.value);
          setOpen(true);
        }}
      />
      {open && options.length > 0 ? (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-control border border-raport-border bg-white shadow-card">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-raport-text hover:bg-raport-action-bg"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(option);
                onCommit?.(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TargetControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  function applyValue(nextValue: number) {
    onChange(Math.max(0, Math.min(100, Math.round(nextValue))));
  }

  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3">
      <Input
        type="number"
        min={0}
        max={100}
        value={value}
        className="min-h-10 !w-14 px-1 text-center text-base font-semibold"
        aria-label="Целевая доля по технологии в процентах"
        onChange={(event) => applyValue(Number(event.currentTarget.value))}
      />
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        className="h-2 w-full min-w-0 cursor-pointer accent-raport-primary"
        aria-label="Целевая доля по технологии"
        onChange={(event) => applyValue(Number(event.currentTarget.value))}
      />
    </div>
  );
}
