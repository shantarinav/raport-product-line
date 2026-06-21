import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { DashboardSwitch } from "../../../shared/ui";
import { Input } from "../../../shared/ui/shadcn/input";
import type { PrintFilters, PrintUserAggregate } from "../types";

export type UserSort = keyof Pick<PrintUserAggregate, "pages" | "cost" | "noDuplexPages" | "colorPages" | "bigJobs">;
export type PrintQuickFocus = "all" | "simplex" | "color" | "bigJobs" | "pdfIncluded" | "pdfExcluded";

type QuickFocusTone = "neutral" | "warning" | "danger" | "success";

const QUICK_FOCUS_OPTIONS: Array<{ value: PrintQuickFocus; label: string; tone?: QuickFocusTone }> = [
  { value: "all", label: "Все" },
  { value: "simplex", label: "Односторонняя", tone: "warning" },
  { value: "color", label: "Цветная", tone: "warning" },
  { value: "bigJobs", label: "100+ стр.", tone: "danger" },
  { value: "pdfIncluded", label: "PDF включен" },
  { value: "pdfExcluded", label: "PDF исключен", tone: "success" },
];

export const USER_SORT_OPTIONS: Array<{ value: UserSort; label: string }> = [
  { value: "pages", label: "Страницы" },
  { value: "cost", label: "Оценка" },
  { value: "noDuplexPages", label: "Без двуст." },
  { value: "colorPages", label: "Цвет" },
  { value: "bigJobs", label: "100+" },
];

export function quickFocusLabel(value: PrintQuickFocus): string {
  return QUICK_FOCUS_OPTIONS.find((option) => option.value === value)?.label ?? "Все";
}

export function quickFocusFromFilters(filters: PrintFilters): PrintQuickFocus {
  if (filters.riskReason === "big-job") return "bigJobs";
  if (filters.color === "NOT GRAYSCALE") return "color";
  if (filters.duplex === "NOT DUPLEX") return "simplex";
  if (!filters.excludePdfPrinter) return "pdfIncluded";
  return "all";
}

function quickFocusButtonClass(active: boolean, tone: QuickFocusTone = "neutral") {
  if (!active) return "border-raport-border bg-white text-raport-text hover:bg-raport-action-bg";
  if (tone === "danger") return "border-rose-300 bg-rose-50 text-rose-700 shadow-[inset_0_0_0_1px_rgb(254_205_211)]";
  if (tone === "warning") return "border-amber-300 bg-amber-50 text-amber-900 shadow-[inset_0_0_0_1px_rgb(253_230_138)]";
  if (tone === "success") return "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-[inset_0_0_0_1px_rgb(167_243_208)]";
  return "border-raport-action-border bg-raport-action-bg-active text-raport-primary shadow-[inset_0_0_0_1px_var(--raport-action-border)]";
}

export function AutocompleteField({
  value,
  onChange,
  placeholder,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const blurTimerRef = useRef<number | null>(null);
  const visibleOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    const matched = query.length === 0 ? options : options.filter((option) => option.toLowerCase().includes(query));
    return matched.slice(0, 80);
  }, [options, value]);

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
        autoComplete="off"
        className="pr-9"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
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
      />
      <button
        type="button"
        className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-control text-raport-muted hover:bg-raport-action-bg"
        aria-label="Показать список"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </button>
      {open && visibleOptions.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-control border border-raport-border bg-white py-1 shadow-card">
          {visibleOptions.map((option) => (
            <button
              key={option}
              type="button"
              className="block w-full truncate px-3 py-2 text-left text-sm text-raport-text hover:bg-raport-action-bg"
              title={option}
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(option);
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

export function QuickFocusPanel({ value, onChange }: { value: PrintQuickFocus; onChange: (value: PrintQuickFocus) => void }) {
  return (
    <div className="rounded-control border border-raport-border bg-raport-surface-soft p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-raport-muted">Быстрый фокус</span>
        <span className="rounded-full border border-raport-action-border bg-raport-action-bg px-2 py-0.5 text-[10px] font-bold text-raport-primary">
          {quickFocusLabel(value)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {QUICK_FOCUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`min-h-8 rounded-control border px-2 py-1 text-xs font-semibold transition-colors ${quickFocusButtonClass(value === option.value, option.tone)}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SortToolbar({
  sortLabel = "Сортировка",
  sortValue,
  sortOptions,
  onSortChange,
  limitValue,
  onLimitChange,
}: {
  sortLabel?: string;
  sortValue: string;
  sortOptions: Array<{ value: string; label: string }>;
  onSortChange: (value: string) => void;
  limitValue: string;
  onLimitChange: (value: string) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2">
      <DashboardSwitch label={sortLabel} value={sortValue} onChange={onSortChange} options={sortOptions} />
      <DashboardSwitch
        label="Показать"
        value={limitValue}
        onChange={onLimitChange}
        options={[
          { value: "10", label: "10" },
          { value: "50", label: "50" },
        ]}
      />
    </div>
  );
}
