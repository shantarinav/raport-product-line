import { Link } from "react-router-dom";
import {
  BookOpen,
  CircleHelp,
  Compass,
  Filter,
  Gauge,
  ListChecks,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { DashboardHeader, PageShell, SectionCard } from "../../shared/ui";

const HEADER_ACTION_CLASS =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-raport-action-border bg-raport-action-bg text-raport-primary transition-colors hover:bg-raport-action-bg-active";

const EXTRA_FEATURES = [
  {
    title: "ИИ-анализ печати",
    description: "Включает дополнительную проверку личной печати в дашборде «Печать». Если ИИ недоступен, дашборд работает по словарю.",
    Icon: Sparkles,
  },
  {
    title: "Сбор трендов",
    description: "Сохраняет месячные KPI для динамики показателей. Исходные строки отчета при этом не сохраняются.",
    Icon: Gauge,
  },
  {
    title: "История и резервная копия",
    description: "Показывает сохраненные снимки KPI и позволяет сохранить или восстановить журнал разборов.",
    Icon: ShieldCheck,
  },
];

const SITUATION_ACTIONS = [
  {
    situation: "Не понимаю причину проблемы",
    action: "Перейдите в режим аналитика и проверьте срезы, топы и детали.",
  },
  {
    situation: "Нужно разобрать проблему",
    action: "Создайте разбор, зафиксируйте причину, действие и ожидаемый результат.",
  },
  {
    situation: "Нужно проконтролировать поручение",
    action: "Откройте разборы, проверьте исполнителя, срок и статус.",
  },
];

export function HelpPage() {
  return (
    <PageShell>
      <DashboardHeader
        className="mb-3"
        title={
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <CircleHelp className="h-6 w-6" strokeWidth={2.3} />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-2xl font-extrabold text-slate-900 md:text-3xl">Как пользоваться Рапортом</span>
              <span className="mt-1 block text-sm font-bold text-raport-primary">Как Excel докладывает главное</span>
            </div>
          </div>
        }
        description="От загрузки отчета до управленческого разбора отклонения: что смотреть, где уточнять и когда назначать действие."
        actions={(themeToggle) => (
          <div className="flex items-center justify-end gap-2">
            <Link to="/" title="На главную" aria-label="На главную" className={HEADER_ACTION_CLASS}>
              <UploadCloud className="h-4 w-4 shrink-0" strokeWidth={2} />
            </Link>
            <Link to="/a3" title="Открыть журнал A3-разборов" aria-label="Открыть журнал A3-разборов" className={HEADER_ACTION_CLASS}>
              <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2} />
            </Link>
            {themeToggle}
          </div>
        )}
      />

      <div className="grid gap-4">
        <SectionCard title="Если вы впервые здесь" description="Начните с загрузки отчета. Остальное Рапорт подскажет по ходу работы." Icon={Compass}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
            <div className="rounded-control border border-raport-action-border bg-raport-action-bg p-5">
              <p className="text-base font-bold text-raport-text">Просто загрузите отчет.</p>
              <p className="mt-2 text-sm leading-relaxed text-raport-muted">
                Рапорт сам откроет нужный дашборд. Остальные разделы пригодятся, когда появится вопрос.
              </p>
            </div>
            <div className="grid gap-2">
              <Link
                to="/"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-raport-action-border bg-raport-action-bg px-4 py-3 text-sm font-semibold text-raport-primary transition-colors hover:bg-raport-action-bg-active"
              >
                <UploadCloud className="h-4 w-4 shrink-0" strokeWidth={2} />
                Загрузить отчет
              </Link>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Что делать, если…" description="Быстрые подсказки для типовых ситуаций." Icon={ListChecks}>
          <div className="overflow-hidden rounded-control border border-raport-border divide-y divide-raport-border">
            {SITUATION_ACTIONS.map((item) => (
              <div
                key={item.situation}
                className="grid gap-2 border-raport-border bg-raport-surface px-4 py-3 text-sm md:grid-cols-[260px_minmax(0,1fr)] md:items-center"
              >
                <div className="font-bold text-raport-text">{item.situation}</div>
                <div className="leading-relaxed text-raport-muted">{item.action}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Что можно включить дополнительно"
          description="Включается на главной: Дополнительные возможности → Настройки Рапорта."
          Icon={Filter}
        >
          <div className="grid gap-3 md:grid-cols-3">
            {EXTRA_FEATURES.map(({ title, description, Icon }) => (
              <div key={title} className="rounded-control border border-raport-border bg-raport-surface p-4">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-control border border-raport-action-border bg-raport-action-bg text-raport-primary">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-raport-text">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-raport-muted">{description}</p>
              </div>
            ))}
          </div>
        </SectionCard>

      </div>
    </PageShell>
  );
}
