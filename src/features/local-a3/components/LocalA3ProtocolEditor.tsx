import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import { ClipboardList, History, Save, WandSparkles } from "lucide-react";
import { requestA3AssistSuggestions, type A3AssistField, type A3AssistSuggestions } from "../ai/a3AssistClient";
import { createLocalA3ProtocolDraft, saveLocalA3Protocol, type LocalA3DraftInput, type LocalA3ValidationIssue } from "../localA3Commands";
import { localA3Repository, type LocalA3Repository } from "../localA3Repository";
import type { LocalA3Event, LocalA3Form, LocalA3Protocol, LocalA3Status } from "../localA3Types";
import { useRaportAiSettings } from "../../../shared/lib/raportAiSettings";
import { SectionCard } from "../../../shared/ui";
import { cn } from "../../../shared/ui/cn";
import { Badge } from "../../../shared/ui/shadcn/badge";
import { Button } from "../../../shared/ui/shadcn/button";
import { Input } from "../../../shared/ui/shadcn/input";
import { Select } from "../../../shared/ui/shadcn/select";

const STATUS_LABEL: Record<LocalA3Status, string> = {
  open: "Открыт",
  in_progress: "В работе",
  waiting_review: "Ожидает проверки",
  closed: "Закрыт",
  cancelled: "Отменен",
};

const STATUS_BADGE_VARIANT: Record<LocalA3Status, "default" | "secondary" | "success" | "warning" | "danger"> = {
  open: "secondary",
  in_progress: "default",
  waiting_review: "warning",
  closed: "success",
  cancelled: "danger",
};

const DASHBOARD_LABEL = {
  ssz: "ССЗ",
  tessa: "Tessa",
  print: "Печать",
  support: "Техподдержка",
} as const;

type LocalA3ProtocolEditorProps = {
  initialDraft?: LocalA3DraftInput;
  initialProtocol?: LocalA3Protocol;
  repository?: LocalA3Repository;
  onSaved?: () => void;
  variant?: "full" | "compact";
  autoFocusFirstField?: boolean;
};

type TextAreaProps = {
  id: string;
  label: string;
  hint?: string;
  value: string;
  error?: string;
  rows?: number;
  assist?: {
    isEnabled: boolean;
    isLoading: boolean;
    isDisabled: boolean;
    title: string;
    disabledTitle?: string;
    qualityIssueLabel?: string;
    suggestion?: string;
    message?: string;
    loadingMessage?: string;
    onCancel?: () => void;
    onRequest: () => void;
    onApply: (value: string) => void;
  };
  inputRef?: Ref<HTMLTextAreaElement>;
  onChange: (value: string) => void;
};

type A3AssistFieldButtonProps = {
  title: string;
  disabledTitle?: string;
  disabled?: boolean;
  onRequest: () => void;
};

export function A3AssistFieldButton({ title, disabledTitle, disabled, onRequest }: A3AssistFieldButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="min-h-7 gap-1.5 px-2 py-1 text-xs text-raport-muted hover:text-raport-primary"
      onClick={(event) => {
        event.preventDefault();
        onRequest();
      }}
      disabled={disabled}
      title={disabledTitle ?? title}
      aria-label={title}
    >
      <WandSparkles className="h-3.5 w-3.5" strokeWidth={2} />
      <span>ИИ</span>
    </Button>
  );
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function listText(items?: string[]): string {
  return Array.isArray(items) ? items.filter(hasText).join("\n") : "";
}

function suggestionForField(suggestions: A3AssistSuggestions, field: A3AssistField): string {
  if (field === "problem") return suggestions.problem?.trim() ?? "";
  if (field === "cause") return listText(suggestions.causeHypotheses);
  if (field === "solution") return listText(suggestions.countermeasures);
  if (field === "expectedResult") return suggestions.expectedResult?.trim() ?? "";
  return suggestions.checkCriteria?.trim() ?? "";
}

const A3_ASSIST_TITLE: Record<A3AssistField, string> = {
  problem: "Предложить формулировку проблемы",
  cause: "Предложить гипотезы причин",
  solution: "Предложить контрмеры",
  expectedResult: "Предложить ожидаемый результат",
  checkCriteria: "Предложить критерий проверки",
};

export function formatA3AssistWaitingMessage(field: A3AssistField, elapsedSeconds: number, qualityIssueLabel?: string): string {
  if (elapsedSeconds >= 60) return "Ответ всё ещё готовится. Проверьте сервис ИИ/Ollama, если это повторяется.";
  if (elapsedSeconds >= 10) return "Модель отвечает дольше обычного. Можно продолжать заполнять A3.";
  if (qualityIssueLabel) {
    if (field === "cause") return "Уточняется гипотеза причины...";
    if (field === "solution") return "Уточняется действие...";
    if (field === "expectedResult") return "Уточняется ожидаемый результат...";
    if (field === "checkCriteria") return "Уточняется критерий проверки...";
  }
  if (field === "problem") return "Готовится формулировка проблемы...";
  if (field === "cause") return "Готовятся гипотезы причин...";
  if (field === "solution") return "Готовятся контрмеры...";
  if (field === "expectedResult") return "Готовится ожидаемый результат...";
  return "Готовится критерий проверки...";
}

export function shouldDisableA3AssistButton(_field: A3AssistField, loadingField: A3AssistField | null): boolean {
  return loadingField !== null;
}

type A3QualityRecommendation = {
  field: A3AssistField;
  issue: string;
  message: string;
  assistTitle: string;
};

function protocolSignature(protocol: LocalA3Protocol): string {
  return JSON.stringify({
    status: protocol.status,
    deviation: protocol.deviation,
    form: protocol.form,
    period: protocol.period,
    source: protocol.source,
  });
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function errorMap(errors: LocalA3ValidationIssue[]): Record<string, string> {
  return errors.reduce<Record<string, string>>((acc, error) => {
    acc[error.path] = error.message;
    return acc;
  }, {});
}

function normalizedQualityText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isRepeatedProblem(problem: string, cause: string): boolean {
  const normalizedProblem = normalizedQualityText(problem);
  const normalizedCause = normalizedQualityText(cause);
  if (!normalizedProblem || !normalizedCause) return false;
  if (normalizedProblem === normalizedCause) return true;
  return normalizedProblem.length > 14 && normalizedCause.length > 14
    ? normalizedProblem.includes(normalizedCause) || normalizedCause.includes(normalizedProblem)
    : false;
}

function hasVagueAction(value: string): boolean {
  const normalized = normalizedQualityText(value);
  return [
    "усилить контроль",
    "разобраться",
    "провести работу",
    "проработать вопрос",
    "взять на контроль",
  ].some((phrase) => normalized.includes(phrase));
}

function hasMeasurableResult(value: string): boolean {
  return /(\d|%|п\.п\.|час|дн|заяв|страниц|н-ч|sla|доля|количество|срок|стоимость)/i.test(value);
}

function hasCheckAnchor(value: string): boolean {
  return /(\d|отчет|следующ|ежеднев|еженед|месяц|квартал|дата|срок|период)/i.test(value);
}

function getA3QualityRecommendations(form: LocalA3Form): A3QualityRecommendation[] {
  const recommendations: A3QualityRecommendation[] = [];
  if (isRepeatedProblem(form.problem, form.cause)) {
    recommendations.push({
      field: "cause",
      issue: "причина повторяет проблему",
      message: "Причина повторяет проблему. Лучше указать гипотезу причины, а не сам факт отклонения.",
      assistTitle: "Уточнить причину",
    });
  }
  if (form.solution.trim() && hasVagueAction(form.solution)) {
    recommendations.push({
      field: "solution",
      issue: "действие слишком общее",
      message: "Действие звучит слишком общо. Укажите конкретную контрмеру или управленческий шаг.",
      assistTitle: "Сделать действие конкретнее",
    });
  }
  if (form.expectedResult.trim() && !hasMeasurableResult(form.expectedResult)) {
    recommendations.push({
      field: "expectedResult",
      issue: "результат без измеримого признака",
      message: "Результат лучше связать с измеримым показателем.",
      assistTitle: "Добавить измеримость",
    });
  }
  if (form.checkCriteria.trim() && !hasCheckAnchor(form.checkCriteria)) {
    recommendations.push({
      field: "checkCriteria",
      issue: "проверка без срока или отчета",
      message: "Проверка должна указывать срок или отчет.",
      assistTitle: "Уточнить способ проверки",
    });
  }
  return recommendations;
}

function focusFirstValidationIssue(errors: LocalA3ValidationIssue[]) {
  if (typeof document === "undefined") return;
  const idByPath: Record<string, string> = {
    "deviation.title": "a3-deviation-title",
    "form.problem": "a3-problem",
    "form.cause": "a3-cause",
    "form.solution": "a3-solution",
    "form.expectedResult": "a3-expected",
    "form.checkCriteria": "a3-check",
    "form.owner": "a3-owner",
    "form.dueDate": "a3-due-date",
  };
  const fieldId = errors.map((error) => idByPath[error.path]).find(Boolean);
  if (!fieldId) return;
  window.setTimeout(() => {
    const element = document.getElementById(fieldId);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus({ preventScroll: true });
  }, 0);
}

function TextAreaField({ id, label, hint, value, error, rows = 4, assist, inputRef, onChange }: TextAreaProps) {
  const assistSuggestion = assist?.suggestion;

  return (
    <div className="block space-y-1.5">
      <span className="flex min-h-8 items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted" htmlFor={id}>{label}</label>
        {assist?.isEnabled ? (
          <A3AssistFieldButton
            title={assist.title}
            disabledTitle={assist.disabledTitle}
            disabled={assist.isDisabled}
            onRequest={assist.onRequest}
          />
        ) : null}
      </span>
      {hint ? <span className="block text-xs leading-relaxed text-raport-muted">{hint}</span> : null}
      <textarea
        id={id}
        ref={inputRef}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "w-full rounded-control border border-raport-border bg-raport-surface px-3 py-2 text-sm leading-relaxed text-raport-text placeholder:text-raport-muted focus:border-raport-action-border focus:outline-none focus:ring-2 focus:ring-raport-action-bg-active",
          error && "border-raport-danger-border focus:border-raport-danger-border focus:ring-raport-danger-muted",
        )}
      />
      {assist?.qualityIssueLabel ? (
        <span className="block rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2 text-xs leading-relaxed text-raport-muted">
          <span className="font-semibold text-raport-warning">Можно уточнить: {assist.qualityIssueLabel}.</span>{" "}
          <span>{assist.isEnabled ? "Исправьте вручную или используйте ИИ." : "Исправьте формулировку вручную."}</span>
        </span>
      ) : null}
      {error ? <span className="text-xs font-semibold text-raport-danger">{error}</span> : null}
      {assist?.isLoading && assist.loadingMessage ? (
        <span className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2 text-xs font-semibold text-raport-muted">
          <span>{assist.loadingMessage}</span>
          {assist.onCancel ? (
            <Button
              type="button"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={(event) => {
                event.preventDefault();
                assist.onCancel?.();
              }}
            >
              Отменить
            </Button>
          ) : null}
        </span>
      ) : null}
      {assist?.message ? <span className="text-xs font-semibold text-raport-muted">{assist.message}</span> : null}
      {assistSuggestion ? (
        <span className="block rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2">
          {assist?.qualityIssueLabel ? (
            <span className="mb-1 block text-xs font-semibold text-raport-warning">
              Уточняется: {assist.qualityIssueLabel}.
            </span>
          ) : null}
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-raport-muted">Предложение ИИ</span>
          <span className="mt-1 block whitespace-pre-line text-sm leading-relaxed text-raport-text">{assistSuggestion}</span>
          <Button
            type="button"
            variant="outline"
            className="mt-2 h-8 px-3"
            onClick={(event) => {
              event.preventDefault();
              assist.onApply(assistSuggestion);
            }}
          >
            Вставить
          </Button>
        </span>
      ) : null}
    </div>
  );
}

function ReadonlyMetric({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-raport-muted">{label}</span>
      <span className="mt-1 block text-sm font-semibold text-raport-text">{value}</span>
    </div>
  );
}

function ContextSummary({ protocol }: { protocol: LocalA3Protocol }) {
  const contextLines =
    protocol.deviation.context
      ?.split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("Объект:")) ?? [];
  const summaryParts = [
    protocol.deviation.title,
    protocol.deviation.fact ? `факт ${protocol.deviation.fact}` : undefined,
    protocol.deviation.target ? `цель ${protocol.deviation.target}` : undefined,
    protocol.deviation.scale,
  ].filter(hasText);

  return (
    <div className="rounded-card border border-raport-border bg-raport-surface px-4 py-3 shadow-card">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-raport-muted">
        <span className="inline-flex items-center gap-1.5 text-raport-text">
          <ClipboardList className="h-4 w-4 text-raport-primary" strokeWidth={2} />
          Основание разбора
        </span>
        <Badge variant="secondary">{DASHBOARD_LABEL[protocol.dashboardType]}</Badge>
        <Badge variant="secondary">{protocol.period.label}</Badge>
        {protocol.source.fileName ? <Badge variant="secondary">{protocol.source.fileName}</Badge> : null}
        <Badge variant={STATUS_BADGE_VARIANT[protocol.status]}>{STATUS_LABEL[protocol.status]}</Badge>
      </div>
      <p className="mt-2 text-sm font-semibold text-raport-text">{summaryParts.join(" · ")}</p>
      <details className="mt-2">
        <summary className="inline-flex cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.08em] text-raport-muted hover:text-raport-primary">
          Показать детали
        </summary>
        <div className="mt-2 rounded-control border border-raport-border bg-raport-surface-soft p-3">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <ReadonlyMetric label="Показатель" value={protocol.deviation.metricLabel} />
            <ReadonlyMetric label="Факт" value={protocol.deviation.fact} />
            <ReadonlyMetric label="Цель" value={protocol.deviation.target} />
            <ReadonlyMetric label="Отклонение" value={protocol.deviation.scale} />
          </div>
          {protocol.dashboardTitle ? <p className="mt-2 text-sm text-raport-muted">{protocol.dashboardTitle}</p> : null}
          {contextLines.length > 0 ? (
            <ul className="mt-2 grid gap-1.5 text-sm text-raport-text">
              {contextLines.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-raport-border" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function HistoryLine({ event }: { event: LocalA3Event }) {
  const text = (() => {
    if (event.type === "created") return "Создан A3-разбор";
    if (event.type === "status_changed" && event.payload.type === "status_changed") {
      return `Статус: ${STATUS_LABEL[event.payload.from]} -> ${STATUS_LABEL[event.payload.to]}`;
    }
    if (event.type === "form_updated" && event.payload.type === "form_updated") return "Обновлены поля A3";
    return "Событие A3";
  })();

  return (
    <li className="rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-raport-muted">
        <span>{formatDateTime(event.createdAt)}</span>
        {event.actorName ? <span>· {event.actorName}</span> : null}
      </div>
      <p className="mt-1 text-sm text-raport-text">{text}</p>
    </li>
  );
}

export function LocalA3ProtocolEditor({
  initialDraft,
  initialProtocol,
  repository = localA3Repository,
  onSaved,
  variant = "full",
  autoFocusFirstField = false,
}: LocalA3ProtocolEditorProps) {
  const [aiSettings] = useRaportAiSettings();
  const [protocol, setProtocol] = useState<LocalA3Protocol>(() => initialProtocol ?? createLocalA3ProtocolDraft(initialDraft));
  const [lastSavedSignature, setLastSavedSignature] = useState<string | null>(() => initialProtocol ? protocolSignature(initialProtocol) : null);
  const [events, setEvents] = useState<LocalA3Event[]>([]);
  const [validationErrors, setValidationErrors] = useState<LocalA3ValidationIssue[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [assistDrafts, setAssistDrafts] = useState<Partial<Record<A3AssistField, string>>>({});
  const [assistMessages, setAssistMessages] = useState<Partial<Record<A3AssistField, string>>>({});
  const [loadingAssistField, setLoadingAssistField] = useState<A3AssistField | null>(null);
  const [assistElapsedSeconds, setAssistElapsedSeconds] = useState(0);
  const assistAbortControllerRef = useRef<AbortController | null>(null);
  const problemRef = useRef<HTMLTextAreaElement | null>(null);
  const causeRef = useRef<HTMLTextAreaElement | null>(null);
  const solutionRef = useRef<HTMLTextAreaElement | null>(null);
  const expectedResultRef = useRef<HTMLTextAreaElement | null>(null);
  const checkCriteriaRef = useRef<HTMLTextAreaElement | null>(null);

  const errors = useMemo(() => errorMap(validationErrors), [validationErrors]);
  const historyEvents = useMemo(() => events.filter((event) => event.type !== "comment_added"), [events]);
  const isCompact = variant === "compact";
  const showEditableContext = !isCompact && !initialDraft && !initialProtocol;
  const dueDateError = errors["form.dueDate"];
  const compactSaveStatus = saveError ?? saveMessage;
  const isAiAssistEnabled = aiSettings.enabled && aiSettings.a3AssistEnabled;
  const hasUnsavedChanges = protocolSignature(protocol) !== lastSavedSignature;
  const qualityRecommendations = useMemo(() => getA3QualityRecommendations(protocol.form), [protocol.form]);
  const qualityRecommendationByField = useMemo(() => {
    return qualityRecommendations.reduce<Partial<Record<A3AssistField, A3QualityRecommendation>>>((acc, recommendation) => {
      acc[recommendation.field] = recommendation;
      return acc;
    }, {});
  }, [qualityRecommendations]);
  useEffect(() => {
    if (!initialProtocol) return;
    setProtocol(initialProtocol);
    setLastSavedSignature(protocolSignature(initialProtocol));
    repository.listEvents(initialProtocol.id).then(setEvents).catch(() => setEvents([]));
  }, [initialProtocol, repository]);

  useEffect(() => {
    if (!autoFocusFirstField) return;
    const timeoutId = window.setTimeout(() => {
      const target =
        !protocol.form.problem.trim() ? problemRef.current :
        !protocol.form.cause.trim() ? causeRef.current :
        !protocol.form.solution.trim() ? solutionRef.current :
        !protocol.form.expectedResult.trim() ? expectedResultRef.current :
        !protocol.form.checkCriteria.trim() ? checkCriteriaRef.current :
        problemRef.current;
      target?.focus({ preventScroll: true });
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [autoFocusFirstField, protocol.id]);

  useEffect(() => {
    if (!loadingAssistField) {
      setAssistElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setAssistElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [loadingAssistField]);

  function updateForm(field: keyof LocalA3Form, value: string) {
    setSaveMessage(null);
    setSaveError(null);
    setProtocol((current) => {
      const nextForm = { ...current.form, [field]: value };
      if (field === "dueDate" && !value) delete nextForm.dueDate;
      return { ...current, form: nextForm };
    });
  }

  function assistProps(field: A3AssistField) {
    const qualityRecommendation = qualityRecommendationByField[field];
    const isLoading = loadingAssistField === field;
    const isDisabled = shouldDisableA3AssistButton(field, loadingAssistField);
    return {
      isEnabled: isAiAssistEnabled,
      isLoading,
      isDisabled,
      title: qualityRecommendation?.assistTitle ?? A3_ASSIST_TITLE[field],
      disabledTitle: isDisabled && !isLoading ? "Дождитесь ответа ИИ по текущему полю или отмените запрос." : undefined,
      qualityIssueLabel: qualityRecommendation?.issue,
      suggestion: assistDrafts[field],
      message: assistMessages[field],
      loadingMessage: isLoading ? formatA3AssistWaitingMessage(field, assistElapsedSeconds, qualityRecommendation?.issue) : undefined,
      onCancel: isLoading ? () => cancelAssistRequest(field) : undefined,
      onRequest: () => requestAssistForField(field),
      onApply: (value: string) => {
        updateForm(field, value);
        setAssistDrafts((current) => ({ ...current, [field]: undefined }));
        setAssistMessages((current) => ({ ...current, [field]: undefined }));
      },
    };
  }

  function cancelAssistRequest(field: A3AssistField) {
    assistAbortControllerRef.current?.abort();
    assistAbortControllerRef.current = null;
    setLoadingAssistField(null);
    setAssistElapsedSeconds(0);
    setAssistMessages((current) => ({ ...current, [field]: "Запрос ИИ отменен." }));
  }

  async function requestAssistForField(field: A3AssistField) {
    if (loadingAssistField) return;
    assistAbortControllerRef.current?.abort();
    const controller = new AbortController();
    assistAbortControllerRef.current = controller;
    setLoadingAssistField(field);
    setAssistElapsedSeconds(0);
    setAssistMessages((current) => ({ ...current, [field]: undefined }));
    setAssistDrafts((current) => ({ ...current, [field]: undefined }));
    try {
      const result = await requestA3AssistSuggestions(protocol, {
        serviceUrl: aiSettings.serviceUrl,
        apiKey: aiSettings.apiKey,
        field,
        qualityIssue: qualityRecommendationByField[field]?.message,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!result.ok) {
        setAssistMessages((current) => ({ ...current, [field]: result.error }));
        return;
      }
      const suggestion = suggestionForField(result.suggestions, field);
      if (!suggestion) {
        setAssistMessages((current) => ({ ...current, [field]: "ИИ не предложил формулировку для этого поля." }));
        return;
      }
      setAssistDrafts((current) => ({ ...current, [field]: suggestion }));
      setAssistMessages((current) => ({ ...current, [field]: undefined }));
    } finally {
      if (assistAbortControllerRef.current === controller) {
        assistAbortControllerRef.current = null;
        setLoadingAssistField(null);
        setAssistElapsedSeconds(0);
      }
    }
  }

  async function reloadEvents(protocolId: string) {
    setEvents(await repository.listEvents(protocolId));
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    setValidationErrors([]);
    try {
      const result = await saveLocalA3Protocol(protocol, { repository });
      if (!result.success) {
        setValidationErrors(result.errors);
        setSaveError("Проверьте обязательные поля A3-разбора.");
        focusFirstValidationIssue(result.errors);
        return;
      }
      setProtocol(result.protocol);
      setLastSavedSignature(protocolSignature(result.protocol));
      await reloadEvents(result.protocol.id);
      onSaved?.();
      setSaveMessage("Сохранено.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Не удалось сохранить A3-разбор.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
          {isCompact || !showEditableContext ? (
            <ContextSummary protocol={protocol} />
          ) : (
            <SectionCard title="Отклонение" description="Контекст разбора: откуда взята проблема и какой показатель требует внимания." Icon={ClipboardList}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Дашборд</span>
                  <Select value={protocol.dashboardType} onChange={(event) => setProtocol({ ...protocol, dashboardType: event.target.value as LocalA3Protocol["dashboardType"] })}>
                    {Object.entries(DASHBOARD_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Название источника</span>
                  <Input value={protocol.dashboardTitle} onChange={(event) => setProtocol({ ...protocol, dashboardTitle: event.target.value })} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Период</span>
                  <Input value={protocol.period.label} onChange={(event) => setProtocol({ ...protocol, period: { ...protocol.period, label: event.target.value } })} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Файл-источник</span>
                  <Input value={protocol.source.fileName ?? ""} onChange={(event) => setProtocol({ ...protocol, source: { ...protocol.source, fileName: event.target.value || undefined } })} />
                </label>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Название отклонения</span>
                  <Input id="a3-deviation-title" value={protocol.deviation.title} onChange={(event) => setProtocol({ ...protocol, deviation: { ...protocol.deviation, title: event.target.value } })} />
                  {errors["deviation.title"] ? <span className="text-xs font-semibold text-raport-danger">{errors["deviation.title"]}</span> : null}
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Показатель</span>
                  <Input value={protocol.deviation.metricLabel ?? ""} onChange={(event) => setProtocol({ ...protocol, deviation: { ...protocol.deviation, metricLabel: event.target.value || undefined } })} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Факт</span>
                  <Input value={protocol.deviation.fact ?? ""} onChange={(event) => setProtocol({ ...protocol, deviation: { ...protocol.deviation, fact: event.target.value || undefined } })} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Цель</span>
                  <Input value={protocol.deviation.target ?? ""} onChange={(event) => setProtocol({ ...protocol, deviation: { ...protocol.deviation, target: event.target.value || undefined } })} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Масштаб отклонения</span>
                  <Input value={protocol.deviation.scale ?? ""} onChange={(event) => setProtocol({ ...protocol, deviation: { ...protocol.deviation, scale: event.target.value || undefined } })} />
                </label>
              </div>
            </SectionCard>
          )}

          <SectionCard title="Причина" description="Зафиксируйте суть проблемы и рабочую гипотезу причины.">
            <div className="grid gap-3 md:grid-cols-2">
              <TextAreaField id="a3-problem" label="1. Проблема" hint="Что отклонилось от цели, без объяснения причин." value={protocol.form.problem} error={errors["form.problem"]} assist={assistProps("problem")} inputRef={problemRef} onChange={(value) => updateForm("problem", value)} />
              <TextAreaField id="a3-cause" label="2. Причина" hint="Почему это могло произойти. Лучше гипотеза, чем пересказ факта." value={protocol.form.cause} error={errors["form.cause"]} assist={assistProps("cause")} inputRef={causeRef} onChange={(value) => updateForm("cause", value)} />
            </div>
          </SectionCard>

          <SectionCard title="Решение" description="Опишите контрмеру, ожидаемый эффект и способ проверки.">
            <div className="grid gap-3 md:grid-cols-3">
              <TextAreaField id="a3-solution" label="3. Действие" hint="Что конкретно сделать и кто может повлиять на результат." value={protocol.form.solution} error={errors["form.solution"]} assist={assistProps("solution")} inputRef={solutionRef} onChange={(value) => updateForm("solution", value)} />
              <TextAreaField id="a3-expected" label="4. Результат" hint="Какой показатель должен измениться." value={protocol.form.expectedResult} error={errors["form.expectedResult"]} assist={assistProps("expectedResult")} inputRef={expectedResultRef} onChange={(value) => updateForm("expectedResult", value)} />
              <TextAreaField id="a3-check" label="5. Проверка" hint="Когда и по какому отчету проверить результат." value={protocol.form.checkCriteria} error={errors["form.checkCriteria"]} assist={assistProps("checkCriteria")} inputRef={checkCriteriaRef} onChange={(value) => updateForm("checkCriteria", value)} />
            </div>
          </SectionCard>

          <SectionCard title="Исполнение" description={initialProtocol ? "Кто отвечает, к какому сроку и в каком статусе находится разбор." : "Кто отвечает и к какому сроку нужно подготовить действие."}>
            <div
              className={
                initialProtocol && !isCompact
                  ? "grid gap-x-3 gap-y-1 md:grid-cols-[minmax(260px,1fr)_150px_190px_auto] md:items-end"
                  : "grid gap-x-3 gap-y-1 md:grid-cols-[minmax(320px,1fr)_132px_auto] md:items-end"
              }
            >
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Исполнитель</span>
                <Input
                  id="a3-owner"
                  value={protocol.form.owner}
                  className={errors["form.owner"] ? "border-raport-danger-border focus:border-raport-danger-border focus:ring-raport-danger-muted" : undefined}
                  onChange={(event) => updateForm("owner", event.target.value)}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Срок</span>
                {isCompact ? (
                  <Input
                    id="a3-due-date"
                    type="date"
                    value={protocol.form.dueDate ?? ""}
                    className={cn(
                      "font-medium tabular-nums",
                      dueDateError ? "border-raport-danger-border focus:border-raport-danger-border focus:ring-raport-danger-muted" : undefined,
                    )}
                    onChange={(event) => updateForm("dueDate", event.target.value)}
                  />
                ) : (
                  <Input
                    id="a3-due-date"
                    type="date"
                    value={protocol.form.dueDate ?? ""}
                    className={dueDateError ? "border-raport-danger-border focus:border-raport-danger-border focus:ring-raport-danger-muted" : undefined}
                    onChange={(event) => updateForm("dueDate", event.target.value)}
                  />
                )}
              </label>
              {initialProtocol && !isCompact ? (
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Статус</span>
                  <Select value={protocol.status} onChange={(event) => setProtocol({ ...protocol, status: event.target.value as LocalA3Status })}>
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </label>
              ) : null}
              <Button
                className={isCompact ? "h-9 shrink-0 px-3 py-2 whitespace-nowrap" : "w-full"}
                disabled={isSaving}
                onClick={handleSave}
              >
                <Save className="h-4 w-4" strokeWidth={2} />
                {isSaving ? "Сохраняем..." : "Сохранить A3"}
              </Button>
              {isCompact ? (
                <>
                  <span className="min-h-4 text-xs font-semibold text-raport-danger">{errors["form.owner"] ?? ""}</span>
                  <span className="min-h-4 text-xs font-semibold text-raport-danger">{dueDateError ?? ""}</span>
                  <span aria-hidden="true" />
                  {hasUnsavedChanges && !compactSaveStatus ? (
                    <span className="md:col-span-3 rounded-control border border-raport-warning-border bg-raport-warning-muted px-3 py-2 text-sm font-semibold text-raport-warning">
                      Изменения не сохранены.
                    </span>
                  ) : null}
                  {compactSaveStatus ? (
                    <span
                      className={cn(
                        "md:col-span-3 rounded-control border px-3 py-2 text-sm font-semibold",
                        saveError
                          ? "border-raport-danger-border bg-raport-danger-muted text-raport-danger"
                          : "border-raport-success-border bg-raport-success-muted text-raport-success",
                      )}
                    >
                      {compactSaveStatus}
                    </span>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="min-h-4 text-xs font-semibold text-raport-danger">{errors["form.owner"] ?? ""}</span>
                  <span className="min-h-4 text-xs font-semibold text-raport-danger">{dueDateError ?? ""}</span>
                  {initialProtocol && !isCompact ? <span aria-hidden="true" /> : null}
                  <span aria-hidden="true" />
                  {hasUnsavedChanges && !compactSaveStatus ? (
                    <span className={cn("rounded-control border border-raport-warning-border bg-raport-warning-muted px-3 py-2 text-sm font-semibold text-raport-warning", initialProtocol && !isCompact ? "md:col-span-4" : "md:col-span-3")}>
                      Изменения не сохранены.
                    </span>
                  ) : null}
                  {compactSaveStatus ? (
                    <span
                      className={cn(
                        "rounded-control border px-3 py-2 text-sm font-semibold",
                        initialProtocol && !isCompact ? "md:col-span-4" : "md:col-span-3",
                        saveError
                          ? "border-raport-danger-border bg-raport-danger-muted text-raport-danger"
                          : "border-raport-success-border bg-raport-success-muted text-raport-success",
                      )}
                    >
                      {compactSaveStatus}
                    </span>
                  ) : null}
                </>
              )}
            </div>
          </SectionCard>

          {!isCompact ? (
            <details className="rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2 text-sm text-raport-muted">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
                <History className="h-4 w-4 text-raport-muted" strokeWidth={2} />
                <span>История изменений · {historyEvents.length}</span>
              </summary>
              <ul className="mt-2 space-y-1 border-t border-raport-border pt-2">
                {historyEvents.length > 0
                  ? historyEvents.map((event) => <HistoryLine key={event.id} event={event} />)
                  : <li className="text-sm text-raport-muted">Изменений пока нет.</li>}
              </ul>
            </details>
          ) : null}
      </div>
    </div>
  );
}
