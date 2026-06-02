# SSZ visual style audit

## 1. Summary

`legacy/ssz` — визуально зрелый, но полностью кастомный CSS-слой без Tailwind/shadcn/ui/lucide-react.  
Стиль: светлый BI-интерфейс с акцентным синим, мягкими карточками, компактной плотной сеткой, статусными цветами и list-based аналитикой (без chart-библиотек и без `<table>`).

Ключевые выводы:

- визуальный язык пригоден как эталон для линейки;
- стиль уже токенизирован через CSS variables;
- основные блоки можно перенести на Tailwind + shadcn/ui без изменения UX/логики;
- иконки нужно мигрировать с PNG (`assets/brand/icons/*.png`) на `lucide-react`.

## 2. Color system

Источник: [`legacy/ssz/src/styles.css`](/C:/codex/raport/legacy/ssz/src/styles.css)

Базовые токены:

- `--raport-bg: #f5f7fa`
- `--raport-surface: #ffffff`
- `--raport-text: #1f2933`
- `--raport-muted: #66788a`
- `--raport-border: #d9e2ec`
- `--raport-primary: #2563eb`
- `--raport-success: #16a34a`
- `--raport-warning: #f59e0b`
- `--raport-danger: #dc2626`
- `--raport-neutral: #64748b`

Паттерны:

- hover/selected для primary: `#eff6ff`, `#dbeafe`, `#bfdbfe`, `#1d4ed8`;
- success/warning/danger зоны через мягкие tint-фоны и насыщенный текст;
- частое использование linear-gradient для прогрессов и KPI-акцентов.

## 3. Typography

Источник: [`legacy/ssz/src/styles.css`](/C:/codex/raport/legacy/ssz/src/styles.css)

- Базовый стек: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Заголовок topbar: `clamp(26px, 3vw, 30px)`, `font-weight: 800`.
- KPI value: `clamp(30px, 2.8vw, 40px)`, плотный line-height `1.05`.
- Основной UI-текст: 12–14px, вторичный 11–13px.
- Акценты/чипы/кнопки: semi-bold/bold (`650–800`), часто uppercase для секций фильтров.

## 4. Tailwind mapping

Рекомендуемая стратегия:

- перенести `--raport-*` в `theme.css` и/или Tailwind theme extension;
- заменить layout-классы на utility-цепочки (`grid`, `gap-*`, `rounded-*`, `shadow-*`, `border-*`, `text-*`);
- заменить state-классы (`.active`, `.drag-active`, `.low/.medium/.high`) на variant-паттерны через `cn()` + data/state props;
- сохранить адаптив через `md/lg/xl` брейкпоинты вместо media-блоков.

Ключевые CSS-паттерны для перевода:

- shell/topbar/card/sidebar/panel layout;
- chip/badge styles;
- segmented switches (`.top-all-switch`, `.technology-status-switch`);
- list rows с тональными статусами;
- dashed empty-state/dropzone.

## 5. shadcn/ui component mapping

| Текущий блок (SSZ) | Базовая замена |
|---|---|
| KPI карточки (`.kpi-card`) | `Card`, `CardHeader`, `CardContent` |
| Кнопка загрузки/сброса | `Button` |
| Поля фильтра | `Input`, `Select` |
| Комбобокс заказа/цеха/мастера | `Popover` + `Command` |
| Активные фильтры (chips) | `Badge` |
| Селектор ТОП/Все и статус-фильтр | `ToggleGroup` (single) |
| Прогресс-дорожки | `Progress` (или кастомная обертка поверх div) |
| Плашка выбранного контекста | `Alert` |
| Разделители секций | `Separator` |
| Псевдо-табличные списки | `Table` (если не ломает текущий UX) или оставить `ol/li` в стилях shadcn |

## 6. lucide-react icon mapping

| Текущий asset | Назначение | lucide-react |
|---|---|---|
| `icon-table.png` | файл/таблица | `FileSpreadsheet` |
| `icon-problem.png` | ошибка импорта | `AlertTriangle` / `CircleX` |
| `icon-filter.png` | фильтры | `Filter` |
| `icon-success.png` | успешная зона | `CheckCircle2` |
| `icon-deviation.png` | зона внимания/риск | `AlertTriangle` |
| `icon-workshop.png` | цех | `Factory` |
| `icon-source.png` | заказы/источник данных | `ClipboardList` / `FileSpreadsheet` |
| `icon-user.png` | мастер | `User` |
| `icon-settings.png` | операции | `Settings` |
| `icon-percent.png` | KPI доли | `Gauge` |
| `icon-kpi.png` | KPI операций | `Gauge` |
| `icon-count.png` | количество ССЗ | `ClipboardList` |

Примечание: `raport-logo-mark.png` — бренд-логотип, не интерфейсная иконка.

## 7. Loading screen

Фактически используется **экран до загрузки файла** (empty upload state), а не спиннер:

- контейнер `.empty-state` с dashed-border;
- drag-over режим `.drag-active` меняет бордер/фон/тень;
- карточка `.empty-card` с заголовком и подсказкой.

Источник: [`legacy/ssz/src/App.tsx`](/C:/codex/raport/legacy/ssz/src/App.tsx), [`legacy/ssz/src/styles.css`](/C:/codex/raport/legacy/ssz/src/styles.css)

## 8. Dashboard header

Шапка (`.topbar`) содержит:

- бренд-блок (логотип, title, slogan, description);
- импорт-панель справа;
- surface-card стиль: border + radius + мягкая тень.

Источник: [`legacy/ssz/src/App.tsx`](/C:/codex/raport/legacy/ssz/src/App.tsx), [`legacy/ssz/src/features/import/ImportPanel.tsx`](/C:/codex/raport/legacy/ssz/src/features/import/ImportPanel.tsx)

## 9. Switches

Используются сегментированные переключатели-кнопки:

- `ТОП / Все` (`TopAllSwitch`);
- `Все / Цель достигнута / Ниже цели` (`TechnologyStatusSwitch`).

Визуальный паттерн:

- общий контейнер с фоном `slate-50`;
- активная кнопка: `blue-100 + inset border`.

Источник: [`legacy/ssz/src/features/dashboard/RankingWidgets.tsx`](/C:/codex/raport/legacy/ssz/src/features/dashboard/RankingWidgets.tsx), [`legacy/ssz/src/styles.css`](/C:/codex/raport/legacy/ssz/src/styles.css)

## 10. Filter status bar

`ActiveFilterSummary`:

- строка "Активные фильтры";
- набор чипов (цель + выбранные фильтры/период);
- tonal-модификаторы: `neutral`, `selected`, `target`.

Визуально: тонкая карточка с border/radius и chip-pill внутри.

## 11. Icons

Текущий подход:

- интерфейс использует PNG-иконки из `public/assets/brand/icons`;
- вставка через `<img>` (`BrandIcon`, inline icons).

Для миграции:

- заменить все смысловые PNG-иконки на `lucide-react`;
- сохранить лого как есть;
- унифицировать размер 16–24 и strokeWidth=2.

## 12. Cards

Основные card-паттерны:

- KPI card с верхним акцентным border (low/medium/high);
- insight cards с левым статусным border;
- board cards (`pareto-board`) как основная аналитическая поверхность.

Общий стиль:

- `border + rounded(10/16) + light shadow + white surface`.

## 13. Charts

Chart library отсутствует.  
Вместо графиков используются:

- maturity-track (горизонтальные прогресс-дорожки);
- мини-бары в leaderboard;
- цветовые статусы и ранжированные списки как chart-like визуализация.

Это нужно сохранить как UX-паттерн при миграции (без обязательного внедрения chart-библиотек).

## 14. Tables

Классических `<table>` нет.  
Используется pseudo-table через:

- `.support-leaderboard-head` (шапка колонок);
- `.support-leaderboard li` (строки сеткой).

Колонки: rank, мастер, %, часы, операции.  
На mobile шапка скрывается, строки переходят в 1 колонку.

## 15. States

Наблюдаемые состояния:

- empty upload state;
- drag-active для upload зон;
- import error (`.error-text`);
- empty data в виджетах (`.pareto-empty`, тексты "Нет данных...");
- selected row/filter state;
- status tones (`low`, `medium`, `high`, growth severity).

## 16. Spacing and layout

Ключевые правила компоновки:

- shell: `max-width: 1440px`, центрирование;
- крупные gap: 10/12/16/18px;
- sidebar + main: `280px + fluid`;
- sticky sidebar (`top: 12px`) на desktop;
- responsive breakpoints: `1180px` и `640px`.

## 17. Reusable tokens

Рекомендуемые переносимые токены:

- color tokens `--raport-*` (bg, surface, text, muted, border, primary, success, warning, danger, neutral);
- radii: card `16px`, control `10px`;
- shadow: card soft (`0 8px 24px rgba(15, 23, 42, 0.08)`);
- typography scale: title/kpi/body/caption;
- semantic statuses: `low`, `medium`, `high`.

## 18. Reusable components

Компоненты-кандидаты для `shared/ui`:

- `DashboardTopBar`
- `FileImportPanel`
- `EmptyUploadState`
- `FilterSidebar`
- `ActiveFilterSummaryBar`
- `KpiCard`
- `SegmentedSwitch`
- `TechnologyBoard`
- `InsightLeaderboardCard`
- `MaturityProgressRow`
- `StateMessage` (error/empty/info)

## 19. Risks

- Риск визуального расхождения при прямом переносе без токенов (особенно secondary blue/shadow/radius).
- В SSZ нет Tailwind/shadcn/ui/lucide-react; миграция потребует аккуратной декомпозиции CSS-классов без изменения поведения.
- Текущие виджеты опираются на list-based layout и состояния; при замене на `Table`/другие primitives можно случайно изменить UX.
- Используются inline width/left для прогрессов в JSX; их нужно перенести в безопасный pattern (CSS vars/data attrs), сохранив ту же логику отображения.
- Иконки в PNG могут иметь отличающуюся визуальную метафору; замены в `lucide-react` нужно утвердить единообразно для всей линейки.
