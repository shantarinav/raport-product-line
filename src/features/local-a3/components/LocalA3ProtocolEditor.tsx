import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, History, MessageSquare, Save } from "lucide-react";
import { createLocalA3ProtocolDraft, addLocalA3Comment, saveLocalA3Protocol, type LocalA3DraftInput, type LocalA3ValidationIssue } from "../localA3Commands";
import { localA3Repository, type LocalA3Repository } from "../localA3Repository";
import type { LocalA3Event, LocalA3Form, LocalA3Protocol, LocalA3Status } from "../localA3Types";
import { SectionCard } from "../../../shared/ui";
import { cn } from "../../../shared/ui/cn";
import { Alert, AlertDescription, AlertTitle } from "../../../shared/ui/shadcn/alert";
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
};

type TextAreaProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  rows?: number;
  onChange: (value: string) => void;
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatDueDateForInput(value?: string): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function parseDueDateInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmed);
  if (!match) return trimmed;
  const [, day, month, year] = match;
  const isoDate = `${year}-${month}-${day}`;
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return trimmed;
  return isoDate;
}

function errorMap(errors: LocalA3ValidationIssue[]): Record<string, string> {
  return errors.reduce<Record<string, string>>((acc, error) => {
    acc[error.path] = error.message;
    return acc;
  }, {});
}

function TextAreaField({ id, label, value, error, rows = 4, onChange }: TextAreaProps) {
  return (
    <label className="block space-y-1.5" htmlFor={id}>
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">{label}</span>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "w-full rounded-control border border-raport-border bg-raport-surface px-3 py-2 text-sm leading-relaxed text-raport-text placeholder:text-raport-muted focus:border-raport-action-border focus:outline-none focus:ring-2 focus:ring-raport-action-bg-active",
          error && "border-raport-danger-border focus:border-raport-danger-border focus:ring-raport-danger-muted",
        )}
      />
      {error ? <span className="text-xs font-semibold text-raport-danger">{error}</span> : null}
    </label>
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

  return (
    <SectionCard title="Контекст разбора" description="Данные из дашборда зафиксированы как основание A3 и не редактируются здесь." Icon={ClipboardList}>
      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-raport-muted">
          <span className="rounded-full border border-raport-border bg-raport-surface-soft px-2 py-1">{DASHBOARD_LABEL[protocol.dashboardType]}</span>
          <span className="rounded-full border border-raport-border bg-raport-surface-soft px-2 py-1">{protocol.period.label}</span>
          <Badge variant={STATUS_BADGE_VARIANT[protocol.status]}>{STATUS_LABEL[protocol.status]}</Badge>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Отклонение</p>
          <p className="mt-1 text-base font-semibold text-raport-text">{protocol.deviation.title}</p>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <ReadonlyMetric label="Показатель" value={protocol.deviation.metricLabel} />
          <ReadonlyMetric label="Факт" value={protocol.deviation.fact} />
          <ReadonlyMetric label="Цель" value={protocol.deviation.target} />
          <ReadonlyMetric label="Отклонение" value={protocol.deviation.scale} />
        </div>
        {contextLines.length > 0 ? (
          <div className="rounded-control border border-raport-border bg-raport-surface-soft px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-raport-muted">Фильтры и зона внимания</p>
            <ul className="mt-2 grid gap-1.5 text-sm text-raport-text">
              {contextLines.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-raport-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

function EventLine({ event }: { event: LocalA3Event }) {
  const text = (() => {
    if (event.type === "created") return "Создан A3-разбор";
    if (event.type === "status_changed" && event.payload.type === "status_changed") {
      return `Статус: ${STATUS_LABEL[event.payload.from]} -> ${STATUS_LABEL[event.payload.to]}`;
    }
    if (event.type === "form_updated" && event.payload.type === "form_updated") return "Обновлены поля A3";
    if (event.type === "comment_added" && event.payload.type === "comment_added") return `Комментарий: ${event.payload.comment.text}`;
    return "Событие A3";
  })();

  return (
    <li className="rounded-card border border-raport-border bg-raport-surface-soft px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-raport-muted">
        <span>{formatDateTime(event.createdAt)}</span>
        {event.actorName ? <span>{event.actorName}</span> : null}
      </div>
      <p className="mt-1 text-sm text-raport-text">{text}</p>
    </li>
  );
}

export function LocalA3ProtocolEditor({ initialDraft, initialProtocol, repository = localA3Repository, onSaved, variant = "full" }: LocalA3ProtocolEditorProps) {
  const [protocol, setProtocol] = useState<LocalA3Protocol>(() => initialProtocol ?? createLocalA3ProtocolDraft(initialDraft));
  const [events, setEvents] = useState<LocalA3Event[]>([]);
  const [validationErrors, setValidationErrors] = useState<LocalA3ValidationIssue[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");
  const [compactDueDateText, setCompactDueDateText] = useState(() => formatDueDateForInput(initialProtocol?.form.dueDate));

  const errors = useMemo(() => errorMap(validationErrors), [validationErrors]);
  const isCompact = variant === "compact";
  const dueDateError =
    isCompact && errors["form.dueDate"] && protocol.form.dueDate
      ? "Укажите дату в формате дд.мм.гггг"
      : errors["form.dueDate"];
  const compactSaveStatus = saveError ?? saveMessage;

  useEffect(() => {
    if (!initialProtocol) return;
    setProtocol(initialProtocol);
    setCompactDueDateText(formatDueDateForInput(initialProtocol.form.dueDate));
    repository.listEvents(initialProtocol.id).then(setEvents).catch(() => setEvents([]));
  }, [initialProtocol, repository]);

  function updateForm(field: keyof LocalA3Form, value: string) {
    setProtocol((current) => {
      const nextForm = { ...current.form, [field]: value };
      if (field === "dueDate" && !value) delete nextForm.dueDate;
      return { ...current, form: nextForm };
    });
  }

  function updateCompactDueDate(value: string) {
    setCompactDueDateText(value);
    updateForm("dueDate", parseDueDateInput(value));
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
        return;
      }
      setProtocol(result.protocol);
      setCompactDueDateText(formatDueDateForInput(result.protocol.form.dueDate));
      await reloadEvents(result.protocol.id);
      onSaved?.();
      setSaveMessage("Сохранено.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Не удалось сохранить A3-разбор.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddComment() {
    setSaveMessage(null);
    setSaveError(null);
    if (!commentText.trim()) {
      setSaveError("Введите текст комментария.");
      return;
    }
    const current = await repository.getProtocol(protocol.id);
    if (!current) {
      setSaveError("Сначала сохраните A3-разбор, затем добавьте комментарий.");
      return;
    }
    const result = await addLocalA3Comment(protocol.id, commentText, { repository, actorName: commentAuthor.trim() || undefined });
    if (!result.success) {
      setValidationErrors(result.errors);
      setSaveError("Комментарий не сохранен: проверьте данные протокола.");
      return;
    }
    setProtocol(result.protocol);
    setCommentText("");
    await reloadEvents(protocol.id);
    onSaved?.();
    setSaveMessage("Комментарий добавлен.");
  }

  return (
    <div className="space-y-4">
      {!isCompact ? (
        <Alert className="border-raport-warning-border bg-raport-warning-muted">
          <AlertTitle className="flex items-center gap-2 text-raport-text">
            <AlertTriangle className="h-4 w-4 text-raport-warning" strokeWidth={2} />
            A3-протокол хранится в этом браузере на этом компьютере
          </AlertTitle>
          <AlertDescription>Для резервного копирования используйте экспорт журнала на следующем этапе.</AlertDescription>
        </Alert>
      ) : null}

      {saveError && !isCompact ? (
        <Alert className="border-raport-danger-border bg-raport-danger-muted">
          <AlertTitle className="text-raport-danger">Не удалось сохранить</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      ) : null}
      {saveMessage && !isCompact ? (
        <Alert className="border-raport-success-border bg-raport-success-muted">
          <AlertTitle className="flex items-center gap-2 text-raport-success">
            <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
            Сохранено
          </AlertTitle>
          <AlertDescription>{saveMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className={`grid gap-4 ${isCompact ? "" : "xl:grid-cols-[minmax(0,1fr)_360px]"}`}>
        <div className="space-y-4">
          {isCompact ? (
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
                  <Input value={protocol.deviation.title} onChange={(event) => setProtocol({ ...protocol, deviation: { ...protocol.deviation, title: event.target.value } })} />
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

          <SectionCard title="Причина" description="Коротко сформулируйте проблему и предполагаемую корневую причину.">
            <div className="grid gap-3 md:grid-cols-2">
              <TextAreaField id="a3-problem" label={isCompact ? "Что не так" : "Проблема / отклонение"} value={protocol.form.problem} error={errors["form.problem"]} onChange={(value) => updateForm("problem", value)} />
              <TextAreaField id="a3-cause" label={isCompact ? "Почему возникло" : "Предполагаемая причина"} value={protocol.form.cause} error={errors["form.cause"]} onChange={(value) => updateForm("cause", value)} />
            </div>
          </SectionCard>

          <SectionCard title="Решение" description="Опишите контрмеру и как будет проверен эффект.">
            <div className="grid gap-3 md:grid-cols-3">
              <TextAreaField id="a3-solution" label={isCompact ? "Что делаем" : "Решение / контрмера"} value={protocol.form.solution} error={errors["form.solution"]} onChange={(value) => updateForm("solution", value)} />
              <TextAreaField id="a3-expected" label={isCompact ? "Какой результат ожидаем" : "Ожидаемый результат"} value={protocol.form.expectedResult} error={errors["form.expectedResult"]} onChange={(value) => updateForm("expectedResult", value)} />
              <TextAreaField id="a3-check" label={isCompact ? "Как проверим" : "Критерий проверки"} value={protocol.form.checkCriteria} error={errors["form.checkCriteria"]} onChange={(value) => updateForm("checkCriteria", value)} />
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-4">
          <SectionCard title="Исполнение" description="Кто отвечает, к какому сроку и в каком статусе находится разбор.">
            <div className={isCompact ? "grid gap-x-3 gap-y-1 md:grid-cols-[minmax(260px,1fr)_150px_auto] md:items-end" : "space-y-3"}>
              {!isCompact ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-raport-muted">Текущий статус</span>
                  <Badge variant={STATUS_BADGE_VARIANT[protocol.status]}>{STATUS_LABEL[protocol.status]}</Badge>
                </div>
              ) : null}
              {!isCompact ? (
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Статус</span>
                  <Select value={protocol.status} onChange={(event) => setProtocol({ ...protocol, status: event.target.value as LocalA3Status })}>
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </label>
              ) : null}
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Исполнитель</span>
                <Input
                  value={protocol.form.owner}
                  className={errors["form.owner"] ? "border-raport-danger-border focus:border-raport-danger-border focus:ring-raport-danger-muted" : undefined}
                  onChange={(event) => updateForm("owner", event.target.value)}
                />
                {!isCompact && errors["form.owner"] ? <span className="text-xs font-semibold text-raport-danger">{errors["form.owner"]}</span> : null}
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Срок</span>
                {isCompact ? (
                  <Input
                    value={compactDueDateText}
                    inputMode="numeric"
                    placeholder="дд.мм.гггг"
                    className={dueDateError ? "border-raport-danger-border focus:border-raport-danger-border focus:ring-raport-danger-muted" : undefined}
                    onChange={(event) => updateCompactDueDate(event.target.value)}
                  />
                ) : (
                  <Input
                    type="date"
                    value={protocol.form.dueDate ?? ""}
                    className={dueDateError ? "border-raport-danger-border focus:border-raport-danger-border focus:ring-raport-danger-muted" : undefined}
                    onChange={(event) => updateForm("dueDate", event.target.value)}
                  />
                )}
                {!isCompact && dueDateError ? <span className="text-xs font-semibold text-raport-danger">{dueDateError}</span> : null}
              </label>
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
              ) : null}
            </div>
          </SectionCard>

          {!isCompact ? (
            <SectionCard title="Комментарии и история" description="Короткая локальная история действий по этому A3-разбору." Icon={History}>
              <div className="space-y-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-raport-muted">Автор комментария</span>
                  <Input value={commentAuthor} onChange={(event) => setCommentAuthor(event.target.value)} placeholder="Например: Андрей" />
                </label>
                <TextAreaField id="a3-comment" label="Комментарий" value={commentText} rows={3} onChange={setCommentText} />
                <Button variant="outline" className="w-full" onClick={handleAddComment}>
                  <MessageSquare className="h-4 w-4" strokeWidth={2} />
                  Добавить комментарий
                </Button>
                <ul className="space-y-2">
                  {events.length > 0 ? events.map((event) => <EventLine key={event.id} event={event} />) : <li className="text-sm text-raport-muted">История появится после первого сохранения.</li>}
                </ul>
              </div>
            </SectionCard>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
