# Local A3: план реализации локального журнала A3-протоколов

## 1. Контекст и цель

Разработка Raport Team 0.1 с `backend/SQLite/users/auth` поставлена на паузу. Новая работа ведется от стабильной Local-версии Рапорта: тег `raport-local-v1.0.0`, отдельный worktree `C:\codex\raport-local-a3`, ветка `feat/local-a3-protocols`.

Цель ветки — добавить **Local A3**: локальный журнал облегченных A3-протоколов разбора отклонений, который работает полностью в браузере и не требует backend, SQLite, пользователей, ролей, авторизации, сервера или API.

Local-режим Рапорта должен остаться неизменным:

- загрузка отчетов остается через главную страницу `#/`;
- существующие дашборды `#/ssz`, `#/tessa`, `#/print`, `#/support` и их расчеты не меняются;
- optional Print LLM-настройки остаются как есть;
- приложение должно собираться и работать как статический frontend без backend.

## 2. Целевой scope v0.1

В v0.1 реализуется локальная A3-функциональность:

1. Кнопка `Разобрать` рядом с отклонением, KPI или в зоне действий дашборда.
2. Открытие формы облегченного A3-протокола.
3. Предзаполнение протокола контекстом из текущего дашборда:
   - тип дашборда;
   - период;
   - название отклонения;
   - показатель;
   - факт;
   - цель, если известна;
   - масштаб отклонения, если известен;
   - источник/имя файла, если доступно.
4. Ручное заполнение:
   - проблема;
   - причина;
   - решение;
   - исполнитель;
   - срок;
   - ожидаемый результат;
   - критерий проверки.
5. Сохранение A3-протокола в IndexedDB браузера.
6. Журнал A3-протоколов с фильтрами:
   - все;
   - открытые;
   - в работе;
   - ожидают проверки;
   - закрытые.
7. Действия в журнале:
   - открыть протокол;
   - изменить статус;
   - изменить исполнителя;
   - изменить срок;
   - добавить комментарий;
   - закрыть протокол.
8. Экспорт одного протокола в JSON.
9. Экспорт всего A3-журнала в JSON.
10. Импорт A3-журнала из JSON.
11. Предупреждение на экране журнала:

> A3-протоколы хранятся в этом браузере на этом компьютере. Для резервного копирования используйте экспорт.

## 3. Границы Local A3

Local A3 использует только продуктовую идею облегченного A3-разбора: отклонение, причина, решение, исполнитель, срок и проверка результата.

Team mode paused. В активной Local-версии запрещено переносить или добавлять:

- backend;
- Fastify;
- SQLite;
- миграции;
- users;
- auth;
- roles;
- API;
- server-side LLM;
- Docker Team-сборку;
- Team settings;
- BOM Shockwave;
- новые предметные дашборды.

Любые ссылки на `src/team`, `backend/team`, Team API или Team auth в Local A3 считаются ошибкой реализации.

## 4. Архитектура Local A3

Предлагаемая структура:

```txt
src/
  features/
    local-a3/
      localA3Types.ts
      localA3Schemas.ts
      localA3Storage.ts
      localA3Context.ts
      localA3Export.ts
      localA3Filters.ts
      components/
        LocalA3EntryButton.tsx
        LocalA3ProtocolDialog.tsx
        LocalA3ProtocolForm.tsx
        LocalA3ProtocolCard.tsx
        LocalA3Comments.tsx
        LocalA3JournalPage.tsx
        LocalA3JournalFilters.tsx
        LocalA3ImportExport.tsx
  pages/
    local-a3/
      index.tsx
```

Принцип разделения:

- `localA3Types.ts` — TypeScript-типы;
- `localA3Schemas.ts` — Zod-схемы и миграции;
- `localA3Storage.ts` — IndexedDB-операции, без React;
- `localA3Context.ts` — построение предзаполненного A3-контекста из дашбордов;
- `localA3Export.ts` — JSON export/import;
- `localA3Filters.ts` — фильтрация и сортировка журнала;
- `components/*` — UI без прямого доступа к IndexedDB, только через функции storage-слоя.

## 5. IndexedDB

Текущая Local-версия уже использует IndexedDB для KPI-истории через `src/shared/lib/historyDB.ts`:

- база: `raport_history`;
- store: `snapshots`.

Для Local A3 в этой ветке используется **отдельная Dexie-база**. Причина: текущий этап не должен делать широкий рефакторинг существующей KPI-истории и не должен рисковать уже работающим `historyDB.ts`.

Фактическая целевая структура Local A3:

```txt
DB_NAME: raport_local_a3
Dexie version 1:
  protocols
  events

Dexie version 2:
  protocols
  events
  snapshots
```

Object stores:

```txt
protocols
  keyPath: id
  indexes:
    status
    dashboardType
    updatedAt
    createdAt
    form.dueDate

events
  keyPath: id
  indexes:
    protocolId
    createdAt
    type

snapshots
  keyPath: id
  indexes:
    protocolId
    status
    dashboardType
    updatedAt
    createdAt
    dueDate
```

Правила storage:

1. Dexie используется только как локальная обертка над IndexedDB.
2. Dexie Cloud, sync addons, replication и remote storage запрещены.
3. UI не должен обращаться к Dexie напрямую.
4. Repository должен валидировать входящие данные через Zod перед записью.
5. Orphan events и orphan snapshots запрещены: запись должна ссылаться на существующий protocol.
6. Existing `raport_history` и KPI snapshots не меняются на этом этапе.
7. Local A3 snapshots — lightweight read-model для журнала A3, а не сырые строки отчетов.

Набор операций v0.1:

```ts
listProtocols(): Promise<LocalA3Protocol[]>;
getProtocol(id: string): Promise<LocalA3Protocol | null>;
putProtocol(protocol: LocalA3Protocol): Promise<void>;
deleteProtocol(id: string): Promise<void>;
putEvent(event: LocalA3Event): Promise<void>;
listEvents(protocolId: string): Promise<LocalA3Event[]>;
putSnapshot(snapshot: LocalA3ProtocolSnapshot): Promise<void>;
listSnapshots(): Promise<LocalA3ProtocolSnapshot[]>;
importArchive(archive: LocalA3ArchiveEnvelope): Promise<LocalA3ImportResult>;
exportArchive(): Promise<LocalA3ArchiveEnvelope>;
```

Импорт должен быть безопасным:

- входной JSON валидируется через Zod;
- записи с неизвестной схемой не сохраняются;
- при совпадении `id` побеждает запись с более свежим `updatedAt`;
- при равном `updatedAt` локальная запись сохраняется;
- импорт не удаляет локальные записи, которых нет в файле.

## 6. Zod-схемы и миграции

В стабильной Local-версии `zod` сейчас не установлен. Так как ТЗ прямо требует Zod, отдельным этапом нужно добавить минимальную зависимость:

```bash
npm install zod
```

Схемы v1:

```ts
type LocalA3DashboardType = "ssz" | "tessa" | "print" | "support";

type LocalA3Status =
  | "open"
  | "in_progress"
  | "waiting_review"
  | "cancelled"
  | "closed";

type LocalA3Protocol = {
  schemaVersion: 1;
  id: string;
  status: LocalA3Status;
  dashboardType: LocalA3DashboardType;
  dashboardTitle: string;
  period: {
    from?: string;
    to?: string;
    label: string;
  };
  source: {
    fileName?: string;
  };
  deviation: {
    title: string;
    metricKey?: string;
    metricLabel?: string;
    fact?: string;
    target?: string;
    scale?: string;
    context?: string;
  };
  form: {
    problem: string;
    cause: string;
    solution: string;
    owner: string;
    dueDate?: string;
    expectedResult: string;
    checkCriteria: string;
  };
  comments: LocalA3Comment[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
};

type LocalA3Comment = {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
};
```

Правила миграции:

- все записи имеют `schemaVersion`;
- импорт v1 валидируется напрямую;
- будущие версии проходят через `migrateLocalA3Protocol(input)`;
- неизвестная версия отклоняется с понятным сообщением в UI импорта.

## 7. UI-изменения

### 8.1. Журнал A3

Добавить lazy-route:

```txt
#/a3
```

Страница должна использовать общий визуальный язык Рапорта:

- `PageShell`;
- `DashboardHeader`;
- `SectionCard`;
- `DashboardSwitch` для статусов;
- `DataTable` или карточный список, если таблица будет перегружать экран;
- `Button`, `Input`, `Select`, `Badge` из `src/shared/ui/shadcn`;
- иконки только из `lucide-react`.

Основной экран:

- заголовок: `A3-журнал`;
- подзаголовок: `Локальные протоколы разбора отклонений`;
- предупреждение о локальном хранении;
- фильтры статусов;
- список протоколов;
- импорт/экспорт JSON;
- пустое состояние: `Протоколов пока нет. Откройте дашборд и нажмите «Разобрать» рядом с отклонением.`

### 8.2. Форма протокола

Форма открывается из дашборда в диалоге или отдельной странице. Для v0.1 предпочтителен диалог:

- пользователь остается в контексте дашборда;
- меньше изменений маршрутизации;
- легче предзаполнить форму текущими данными.

Поля:

- `Проблема`;
- `Причина`;
- `Решение`;
- `Исполнитель`;
- `Срок`;
- `Ожидаемый результат`;
- `Критерий проверки`.

Решение по комментариям для Local A3 v0.1:

- комментарии не являются частью пользовательского UX редактора и журнала;
- история изменений остается свернутой и показывает только служебные события без отдельной работы с комментариями;
- storage, импорт и экспорт сохраняют поддержку старых `comment_added` events для совместимости резервных копий и будущего расширения;
- новые сценарии v0.1 не должны требовать комментариев для создания, закрытия или экспорта A3-разбора.

Предзаполненный блок контекста должен быть компактным и read-only:

- дашборд;
- период;
- отклонение;
- факт / цель / масштаб;
- источник.

### 8.3. Точки входа «Разобрать»

Не менять расчеты и порядок виджетов. Добавлять только action-кнопку.

Приоритет v0.1:

1. **Print**:
   - в блоке `Топ заданий с отклонениями`;
   - в блоке `Главный вывод`, если есть агрегированная проблема.
2. **ССЗ**:
   - в блоке `Главный вывод`;
   - рядом с ключевыми зонами внимания: заказ / цех / операция.
3. **Support**:
   - в блоке `Главный вывод`;
   - в виджете `SLA по темам`, рядом с проблемной темой.
4. **Tessa**:
   - в блоках просрочек и застрявших согласований.

Если на первом техническом этапе нужно снизить риск, допускается начать с универсальной кнопки `Разобрать` в `Главном выводе` каждого дашборда, а затем добавить строковые actions в конкретных виджетах.

## 8. Экспорт и импорт

### Экспорт одного протокола

- кнопка в карточке протокола;
- файл: `raport-a3-<dashboard>-<date>-<id>.json`;
- экспортирует один объект с `schemaVersion`.

### Экспорт журнала

- кнопка на странице `#/a3`;
- файл: `raport-a3-journal-YYYY-MM-DD.json`;
- экспортирует envelope:

```ts
{
  kind: "raport-local-a3-archive";
  exportedAt: string;
  schemaVersion: 1;
  app: { name: "raport"; feature: "local-a3" };
  protocols: LocalA3Protocol[];
  events: LocalA3Event[];
  snapshots: LocalA3ProtocolSnapshot[];
}
```

### Импорт журнала

- input file JSON;
- Zod validation;
- результат импорта показывать человеку:
  - добавлено;
  - обновлено;
  - пропущено;
  - ошибки.

## 9. Этапы реализации

### Этап 0. Подготовка

Файлы:

- `docs/LOCAL_A3_PLAN.md`.

Действия:

- зафиксировать план;
- программный код не менять.

Проверка:

```bash
git status --short --branch
```

Коммит после подтверждения:

```bash
git add docs/LOCAL_A3_PLAN.md
git commit -m "docs: plan local A3 protocols"
```

### Этап 1. Zod и доменная модель Local A3

Файлы:

- `package.json`;
- `package-lock.json`;
- `src/features/local-a3/localA3Types.ts`;
- `src/features/local-a3/localA3Schemas.ts`;
- `src/features/local-a3/localA3Schemas.test.ts`;
- `src/features/local-a3/localA3Filters.ts`;
- `src/features/local-a3/localA3Filters.test.ts`.

Действия:

- добавить `zod`;
- описать статусы, типы, схемы;
- реализовать миграцию v1;
- реализовать фильтры журнала и сортировку по `updatedAt desc`.

Проверки:

```bash
npm run typecheck
npm test -- src/features/local-a3/localA3Schemas.test.ts src/features/local-a3/localA3Filters.test.ts
```

Коммит:

```bash
git commit -m "feat(local-a3): add protocol domain model"
```

### Этап 2. IndexedDB storage и import/export

Файлы:

- `src/features/local-a3/localA3Repository.ts`;
- `src/features/local-a3/localA3Export.ts`;
- `src/features/local-a3/localA3Repository.test.ts`;
- `src/features/local-a3/localA3Export.test.ts`.

Действия:

- создать отдельную локальную Dexie-базу `raport_local_a3`, не меняя существующий `historyDB.ts`;
- завести versioned schema: v1 — `protocols` и `events`, v2 — добавление lightweight `snapshots`;
- реализовать CRUD для A3-протоколов, событий и снимков;
- валидировать все входящие данные через Zod перед записью;
- не допускать событий и snapshots без существующего протокола;
- реализовать export/import JSON-архива A3;
- при импорте пересобирать lightweight snapshots из протоколов и событий;
- не трогать существующую локальную историю KPI и текущую snapshot-логику дашбордов.

Проверки:

```bash
npm run typecheck
npm test -- src/features/local-a3/localA3Repository.test.ts src/features/local-a3/localA3Export.test.ts
npm run check
```

Manual smoke:

- загрузить Рапорт без backend;
- убедиться, что существующая локальная история KPI не ломается.

Коммит:

```bash
git commit -m "feat(local-a3): persist protocols in IndexedDB"
```

### Этап 3. UI журнала A3

Файлы:

- `src/pages/local-a3/index.tsx`;
- `src/App.tsx`;
- `src/features/local-a3/components/LocalA3JournalPage.tsx`;
- `src/features/local-a3/components/LocalA3JournalFilters.tsx`;
- `src/features/local-a3/components/LocalA3ProtocolCard.tsx`;
- `src/features/local-a3/components/LocalA3Comments.tsx`;
- `src/features/local-a3/components/LocalA3ImportExport.tsx`.

Действия:

- добавить route-level lazy loading для `#/a3`;
- сделать журнал;
- добавить фильтры статусов;
- добавить действия изменения статуса, исполнителя, срока, комментариев;
- добавить предупреждение о локальном хранении;
- добавить import/export.

Проверки:

```bash
npm run typecheck
npm run build
```

Manual smoke:

- открыть `#/a3`;
- проверить пустое состояние;
- импортировать валидный JSON;
- экспортировать журнал.

Коммит:

```bash
git commit -m "feat(local-a3): add local protocol journal"
```

### Этап 4. Форма A3 и создание протокола из дашборда

Файлы:

- `src/features/local-a3/localA3Context.ts`;
- `src/features/local-a3/components/LocalA3EntryButton.tsx`;
- `src/features/local-a3/components/LocalA3ProtocolDialog.tsx`;
- `src/features/local-a3/components/LocalA3ProtocolForm.tsx`;
- точечные файлы дашбордов:
  - `src/features/print/components/*`;
  - `src/features/ssz/components/*`;
  - `src/features/support/components/*`;
  - `src/features/tessa/components/*`.

Действия:

- реализовать универсальный контекст `LocalA3Prefill`;
- добавить кнопку `Разобрать` без изменения расчетов;
- сохранять протокол в IndexedDB;
- после сохранения показать ссылку `Открыть в A3-журнале`.

Проверки:

```bash
npm run typecheck
npm run build
```

Manual smoke:

- создать протокол из Print;
- создать протокол из ССЗ;
- открыть журнал и убедиться, что записи видны;
- изменить статус, исполнителя, срок;
- добавить комментарий;
- закрыть протокол.

Коммит:

```bash
git commit -m "feat(local-a3): create protocols from dashboards"
```

### Этап 5. Полная проверка и документация

Файлы:

- `AGENTS.md` при необходимости минимально добавить правило Local A3;
- `docs/LOCAL_A3.md` или раздел в существующей документации;
- `docs/LOCAL_A3_PLAN.md` при необходимости обновить статусом выполнения.

Действия:

- описать сценарии использования;
- описать локальное хранение и резервное копирование;
- зафиксировать, что backend не нужен.

Проверки:

```bash
npm run check
git status --short --branch
```

Manual regression:

- загрузка всех текущих отчетов через главную;
- открытие `#/ssz`, `#/tessa`, `#/print`, `#/support` без backend;
- работа существующих фильтров;
- отсутствие Team/backend/API импортов в `src/features/local-a3`.

Коммит:

```bash
git commit -m "docs: document local A3 protocols"
```

## 10. Тестовая стратегия

Автоматические тесты:

- Zod-схемы принимают валидный v1-протокол;
- Zod-схемы отклоняют неизвестный статус;
- миграция отклоняет неизвестную `schemaVersion`;
- фильтр журнала корректно выбирает статусы;
- сортировка журнала идет по `updatedAt desc`;
- export/import сохраняет структуру envelope;
- import merge обновляет запись только если импортная версия новее.

Ручные проверки:

- IndexedDB upgrade не ломает `snapshots`;
- A3-журнал работает после перезагрузки страницы;
- экспортированный журнал можно импортировать обратно;
- приложение работает без backend;
- недоступность Print LLM backend не влияет на A3.

## 11. Риски

1. **IndexedDB upgrade**
   Риск: при ошибке версии можно сломать локальную историю KPI.
   Мера: не переписывать store `snapshots`, добавить только новый store, проверить историю KPI вручную.

2. **Разрастание UI в дашбордах**
   Риск: кнопки `Разобрать` могут перегрузить интерфейс.
   Мера: добавлять их как `actions` в существующие карточки и не менять порядок виджетов.

3. **Смешение Local и Team**
   Риск: случайно перенести API/auth/server concepts.
   Мера: запретить импорты из `src/team`, `backend/team`; финальный поиск по `teamApi`, `AuthProvider`, `Fastify`, `SQLite`.

4. **Персональные/чувствительные данные в A3**
   Риск: пользователь сам может записать чувствительные данные в проблему или комментарий.
   Мера: явно показать предупреждение о локальном хранении и экспорте; не сохранять сырые строки отчета автоматически.

5. **Zod как новая зависимость**
   Риск: изменение lock-файла и увеличение bundle.
   Мера: использовать Zod только в Local A3 schemas/import; route-level lazy loading для `#/a3`.

6. **Кодировка Team-наработок**
   Риск: прямой перенос текстов принесет битую кириллицу.
   Мера: Team-код использовать как архитектурную подсказку, тексты переписать заново в UTF-8.

## 12. Критерии готовности v0.1

- Local A3 работает без backend.
- В `src/` нет зависимостей от Team API/auth/users/roles.
- Существующие дашборды и расчеты не изменены.
- A3-протокол можно создать из дашборда.
- Протокол сохраняется после перезагрузки страницы.
- Журнал показывает статусы и позволяет редактировать исполнитель/срок/статус/комментарий.
- Работает экспорт одного протокола и всего журнала.
- Работает импорт журнала.
- На странице журнала есть предупреждение о локальном хранении.
- `npm run check` проходит.

