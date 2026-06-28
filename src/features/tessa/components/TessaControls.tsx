import { useEffect, useMemo, useRef, useState } from "react";

import { FilterPanel, QuickFocusGroup } from "../../../shared/ui";
import { Input } from "../../../shared/ui/shadcn/input";
import { formatInteger } from "../logic/dashboard";
import type { AgreementFilters, DeadlineMode } from "../types";

export type TessaFilterOptions = {
  contractNumbers: string[];
  documentTypes: string[];
  subjects: string[];
  responsibles: string[];
  authors: string[];
  legalEntities: string[];
};

export type DeadlineCounts = Record<DeadlineMode, number>;

export function quickFocusChipLabel(deadlineMode: DeadlineMode, label: string): string {
  if (deadlineMode === "all") return "Все задания";
  if (deadlineMode === "today" || deadlineMode === "week") return `Дедлайн: ${label}`;
  return `Просрочка: ${label}`;
}

function AutocompleteField({
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

  useEffect(() => {
    return () => {
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  const visibleOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    const matched = query.length === 0 ? options : options.filter((option) => option.toLowerCase().includes(query));
    return matched.slice(0, 80);
  }, [options, value]);

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
      {open ? (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-control border border-raport-border bg-raport-surface shadow-card">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-raport-text hover:bg-raport-action-bg"
            onMouseDown={(event) => {
              event.preventDefault();
              onChange("");
              setOpen(false);
            }}
          >
            Все задания
          </button>
          {visibleOptions.map((option) => (
            <button
              key={option}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-raport-text hover:bg-raport-action-bg"
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

function DeadlineFocusControl({
  value,
  counts,
  onChange,
}: {
  value: DeadlineMode;
  counts: DeadlineCounts;
  onChange: (value: DeadlineMode) => void;
}) {
  const overdueOptions: Array<{ value: DeadlineMode; label: string; tone: "danger" | "warning" }> = [
    { value: "over30", label: ">30 дн.", tone: "danger" },
    { value: "days8to30", label: "8-30 дн.", tone: "warning" },
    { value: "days1to7", label: "1-7 дн.", tone: "warning" },
  ];
  const deadlineOptions: Array<{ value: DeadlineMode; label: string; tone: "primary" | "warning" }> = [
    { value: "today", label: "Сегодня", tone: "warning" },
    { value: "week", label: "7 дней", tone: "primary" },
  ];

  return (
    <div className="rounded-control border border-raport-border bg-raport-surface-soft p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-raport-muted">Быстрый фокус</span>
        <QuickFocusGroup
          value={value}
          options={[{ value: "all", label: "Все задания", count: formatInteger(counts.all) }]}
          onChange={onChange}
          variant="plain"
        />
      </div>
      <div className="grid gap-2">
        <div className="grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-raport-muted">Просрочка</span>
          <QuickFocusGroup
            value={value}
            options={overdueOptions.map((option) => ({ ...option, count: formatInteger(counts[option.value]) }))}
            onChange={onChange}
            columnsClassName="grid-cols-3"
            variant="plain"
          />
        </div>
        <div className="grid gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-raport-muted">Дедлайн</span>
          <QuickFocusGroup
            value={value}
            options={deadlineOptions.map((option) => ({ ...option, count: formatInteger(counts[option.value]) }))}
            onChange={onChange}
            columnsClassName="grid-cols-2"
            variant="plain"
          />
        </div>
      </div>
    </div>
  );
}

export function TessaFilterSidebar({
  filters,
  options,
  deadlineCounts,
  onChange,
  onReset,
}: {
  filters: AgreementFilters;
  options: TessaFilterOptions;
  deadlineCounts: DeadlineCounts;
  onChange: (next: Partial<AgreementFilters>) => void;
  onReset: () => void;
}) {
  function changeDeadlineMode(deadlineMode: DeadlineMode) {
    onChange({
      deadlineMode,
      focusMode: deadlineMode === "all" || deadlineMode === "today" || deadlineMode === "week" ? "allOpen" : "stuck",
    });
  }

  return (
    <FilterPanel onReset={onReset}>
      <div className="grid gap-3">
        <DeadlineFocusControl value={filters.deadlineMode} counts={deadlineCounts} onChange={changeDeadlineMode} />

        <label className="grid gap-1">
          <span className="text-xs text-raport-muted">Договор</span>
          <AutocompleteField
            value={filters.contractNumber}
            onChange={(value) => onChange({ contractNumber: value })}
            placeholder="Все"
            options={options.contractNumbers}
            ariaLabel="Фильтр по договору"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-raport-muted">Ответственный</span>
          <AutocompleteField
            value={filters.responsible}
            onChange={(value) => onChange({ responsible: value })}
            placeholder="Все"
            options={options.responsibles}
            ariaLabel="Фильтр по ответственному"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-raport-muted">Вид</span>
          <AutocompleteField
            value={filters.subject}
            onChange={(value) => onChange({ subject: value })}
            placeholder="Все"
            options={options.subjects}
            ariaLabel="Фильтр по виду"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-raport-muted">Автор</span>
          <AutocompleteField
            value={filters.author}
            onChange={(value) => onChange({ author: value })}
            placeholder="Все"
            options={options.authors}
            ariaLabel="Фильтр по автору"
          />
        </label>

        <details className="rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-raport-muted">Дополнительно</summary>
          <div className="mt-2 grid gap-2">
            <label className="grid gap-1">
              <span className="text-xs text-raport-muted">Тип документа</span>
              <AutocompleteField
                value={filters.documentType}
                onChange={(value) => onChange({ documentType: value })}
                placeholder="Все"
                options={options.documentTypes}
                ariaLabel="Фильтр по типу документа"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-raport-muted">Юр. лицо</span>
              <AutocompleteField
                value={filters.legalEntity}
                onChange={(value) => onChange({ legalEntity: value })}
                placeholder="Все"
                options={options.legalEntities}
                ariaLabel="Фильтр по юр. лицу"
              />
            </label>
          </div>
        </details>
      </div>
    </FilterPanel>
  );
}
