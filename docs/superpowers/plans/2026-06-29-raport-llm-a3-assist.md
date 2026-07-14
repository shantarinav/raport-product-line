# Raport LLM A3 Assist Implementation Plan

> **For:** Andrey / Codex  
> **Feature:** Общий optional backend `backend/raport-llm` и универсальный ИИ-помощник для Local A3  
> **Date:** 2026-06-29  
> **Status:** Draft plan, implementation not started

## Goal

Переосмыслить текущую LLM-инфраструктуру как общий optional backend Рапорта, а не как узкий сервис Print.

Целевое состояние:

- фронтенд Рапорта остается полностью работоспособным без backend;
- текущая ИИ-проверка личной печати Print сохраняется;
- backend обособляется и переименовывается в `backend/raport-llm`;
- Print LLM становится одним доменом общего LLM-backend;
- Local A3 получает универсального ИИ-помощника для разбора отклонений;
- A3-помощник работает с ограниченным A3 snapshot, а не с исходными Excel-строками;
- LLM/ИИ-функции остаются выключенными по умолчанию и включаются пользователем явно.

## Non-Goals

Не входит в этот этап:

- обязательный backend для работы Рапорта;
- Team mode;
- пользователи, роли, auth, API для командной работы;
- SQLite для Team;
- PostgreSQL, Redis, очереди, облачные сервисы;
- отправка данных за пределы локальной инфраструктуры;
- хранение исходных Excel/CSV/XLSX-файлов в A3 или LLM;
- автоматическое применение решений, причин или контрмер без подтверждения пользователя;
- использование LLM для пересчета KPI или изменения бизнес-логики дашбордов.

## Architectural Decision

Текущий `backend/print-llm` нужно считать прототипом общего локального ИИ-сервиса и мигрировать в:

```txt
backend/
  raport-llm/
    README.md
    DEPLOYMENT.md
    .env.example
    server.mjs
    config.mjs
    httpUtils.mjs
    ollamaClient.mjs
    taskQueue.mjs
    cache.mjs
    sqliteCache.mjs
    domains/
      print/
        classifier.mjs
        prompt.mjs
        routes.mjs
      a3/
        assist.mjs
        prompt.mjs
        schema.mjs
        routes.mjs
    scripts/
      evaluate-print.mjs
```

Смысл разделения:

- `backend/raport-llm` — общая инфраструктура LLM: HTTP, CORS, Ollama client, очередь, настройки, health;
- `domains/print` — текущая классификация личной печати;
- `domains/a3` — новый помощник A3-разбора;
- frontend работает через настройки "ИИ-возможности Рапорта", а не через "ИИ Print".

## Current State To Preserve

Сохраняем:

- frontend Print должен работать без backend;
- если LLM недоступна, Print остается в словарном режиме;
- пользователь сам включает ИИ-возможности;
- текущие endpoint semantics Print должны быть совместимы или иметь мягкую миграцию;
- существующие Local A3 domain/storage/editor/journal/adapter остаются browser-only;
- A3 продолжает храниться в IndexedDB;
- расчеты дашбордов не меняются.

## Backend API Shape

### Health

```http
GET /health
```

Ответ:

```json
{
  "ok": true,
  "service": "raport-llm",
  "model": "qwen3:4b",
  "domains": ["print", "a3"],
  "queue": {
    "active": 0,
    "pending": 0,
    "concurrency": 1
  },
  "cache": {
    "enabled": true,
    "entries": 50
  }
}
```

### Print Compatibility Endpoints

Сохранить текущие маршруты, чтобы не ломать frontend:

```http
POST /api/print/classifications/lookup
POST /api/print/classifications/classify-missing
POST /api/print/classify-personal
```

Допустимо также добавить версионированные общие маршруты:

```http
POST /api/v1/print/classifications/lookup
POST /api/v1/print/classifications/classify-missing
POST /api/v1/print/classify-personal
```

Но существующий frontend сначала должен продолжать работать со старым путем.

### A3 Assist Endpoint

```http
POST /api/a3/assist
```

Request:

```json
{
  "protocolId": "optional-local-id",
  "dashboardType": "ssz",
  "dashboardTitle": "ССЗ",
  "periodLabel": "01.06.2026 - 09.06.2026",
  "deviationTitle": "Доля работ по технологии ниже цели",
  "metricName": "Доля работ по технологии",
  "actualValue": "7,2%",
  "targetValue": "70%",
  "deviationScale": "отклонение: 62,8 п.п.",
  "affectedObjectType": "department",
  "affectedObjectName": "400 Цех аппаратов высокого давления № 40",
  "evidenceSummary": "Цех: 4 623 н-ч без технологии, доля 100,0%. Операция: Зачистка швов — 1 102,2 н-ч без технологии.",
  "problem": "optional user text",
  "cause": "optional user text",
  "solution": "optional user text",
  "expectedResult": "optional user text",
  "checkCriteria": "optional user text",
  "mode": "draft_suggestions"
}
```

Response:

```json
{
  "ok": true,
  "suggestions": {
    "problem": "Краткая формулировка проблемы",
    "causeHypotheses": [
      "Гипотеза причины 1",
      "Гипотеза причины 2"
    ],
    "fiveWhys": [
      "Почему 1",
      "Почему 2",
      "Почему 3"
    ],
    "countermeasures": [
      "Контрмера 1",
      "Контрмера 2"
    ],
    "expectedResult": "Ожидаемый результат",
    "checkCriteria": "Как проверить результат"
  },
  "warnings": [
    "ИИ предлагает черновик. Решение принимает пользователь."
  ]
}
```

Fallback при ошибке:

```json
{
  "ok": false,
  "suggestions": null,
  "error": "ИИ-помощник временно недоступен"
}
```

## A3 Prompt Boundaries

Prompt должен прямо запрещать:

- придумывать факты, которых нет в snapshot;
- считать гипотезы доказанными причинами;
- писать решение как уже принятое;
- использовать оценки сотрудников или аттестационные формулировки;
- требовать данные, которых нет в A3 snapshot;
- возвращать markdown вместо JSON.

Prompt должен требовать:

- русский язык;
- деловой стиль;
- короткие формулировки;
- строгий JSON;
- явное разделение "факт", "гипотеза причины", "контрмера", "критерий проверки";
- при недостатке данных писать "нужно уточнить", а не выдумывать.

## Frontend Integration

### Settings

Текущую логику "ИИ для Print" нужно поднять до уровня "ИИ-возможности Рапорта".

Предлагаемая модель настроек:

```ts
type RaportAiSettings = {
  enabled: boolean;
  serviceUrl: string;
  printPersonalCheckEnabled: boolean;
  a3AssistEnabled: boolean;
  lastHealthCheck?: {
    ok: boolean;
    checkedAt: string;
    model?: string;
    service?: string;
  };
};
```

Миграция:

- если у пользователя уже включена Print LLM настройка, перенести ее в `RaportAiSettings`;
- старый ключ настроек не удалять сразу, но больше не использовать как источник правды;
- интерфейс должен говорить "ИИ-возможности", "ИИ для анализа печати", "ИИ-помощник A3", а не "backend".

### A3 Editor UI

В `LocalA3ProtocolEditor` добавить компактный блок:

```txt
ИИ-помощник
Помогает сформулировать проблему, гипотезы причин и контрмеры по данным A3-разбора.

[Предложить формулировки]
```

Показывать блок только если:

- ИИ-возможности включены;
- A3 Assist включен;
- health check успешен или пользователь явно запускает проверку;
- есть хотя бы минимальный A3 context.

Не показывать:

- если ИИ выключен;
- если сервис недоступен;
- если пользователь работает только в чистом Local-режиме без LLM.

### Applying Suggestions

ИИ не должен молча перезаписывать поля.

UX:

- показать предложения в отдельном блоке;
- у каждого предложения действие "Вставить";
- для списка гипотез/контрмер — "Добавить в поле";
- пользователь сам выбирает, что переносить в A3.

## Implementation Plan

### Task 1: Create Shared `backend/raport-llm` Skeleton

Files:

- `backend/raport-llm/server.mjs`
- `backend/raport-llm/config.mjs`
- `backend/raport-llm/httpUtils.mjs`
- `backend/raport-llm/ollamaClient.mjs`
- `backend/raport-llm/taskQueue.mjs`
- `backend/raport-llm/README.md`
- `backend/raport-llm/.env.example`
- `package.json`

Steps:

1. Create new backend directory.
2. Move only shared infrastructure concepts from `backend/print-llm`, not Print-specific logic.
3. Add `GET /health`.
4. Add environment variables with neutral names:
   - `RAPORT_LLM_HOST`
   - `RAPORT_LLM_PORT`
   - `RAPORT_LLM_ALLOWED_ORIGINS`
   - `RAPORT_LLM_MODEL`
   - `RAPORT_LLM_OLLAMA_BASE_URL`
   - `RAPORT_LLM_OLLAMA_CHAT_URL`
   - `RAPORT_LLM_CONCURRENCY`
   - `RAPORT_LLM_CACHE_ENABLED`
5. Keep compatibility aliases for old `PRINT_LLM_*` where practical.
6. Add script:
   - `backend:raport-llm`

Checks:

```bash
npm run typecheck
node backend/raport-llm/server.mjs
```

Acceptance:

- shared backend starts;
- health endpoint works;
- frontend still works without backend.

### Task 2: Migrate Print LLM Into Raport LLM

Files:

- `backend/raport-llm/domains/print/classifier.mjs`
- `backend/raport-llm/domains/print/prompt.mjs`
- `backend/raport-llm/domains/print/routes.mjs`
- `backend/raport-llm/cache.mjs`
- `backend/raport-llm/sqliteCache.mjs`
- `src/features/print/logic/personalPrint/frontendClient.ts`
- `package.json`
- `deploy/raport-llm/*` or new `deploy/raport-llm/*`

Steps:

1. Move Print classifier and prompt into `domains/print`.
2. Preserve existing Print API routes.
3. Update frontend default service naming without breaking stored user settings.
4. Keep `backend:print-llm` script as compatibility alias for one release if useful.
5. Add documentation that `print-llm` is now `raport-llm`.

Checks:

```bash
npm run typecheck
npm test
npm run backend:raport-llm
npm run backend:print-llm:evaluate -- --input <csv>
```

Acceptance:

- Print LLM works through new backend;
- Print still falls back to dictionary mode when backend unavailable;
- no Print business logic changes.

### Task 3: Add A3 Assist Backend Domain

Files:

- `backend/raport-llm/domains/a3/schema.mjs`
- `backend/raport-llm/domains/a3/prompt.mjs`
- `backend/raport-llm/domains/a3/assist.mjs`
- `backend/raport-llm/domains/a3/routes.mjs`
- backend tests, if current test setup supports them

Steps:

1. Define request validator for limited A3 snapshot.
2. Define strict JSON response schema.
3. Build prompt for A3 suggestions.
4. Add `POST /api/a3/assist`.
5. Add safe fallback for invalid JSON/model errors.
6. Add smoke tests for valid request, invalid request, fallback.

Checks:

```bash
npm test
node backend/raport-llm/server.mjs
```

Acceptance:

- endpoint returns strict JSON;
- no raw Excel accepted or required;
- invalid model output does not break caller.

### Task 4: Add Frontend A3 Assist Client

Files:

- `src/features/local-a3/ai/a3AssistTypes.ts`
- `src/features/local-a3/ai/a3AssistClient.ts`
- `src/shared/lib/raportAiSettings.ts` or equivalent existing settings module
- tests for client payload shaping

Steps:

1. Add typed client for `POST /api/a3/assist`.
2. Convert Local A3 draft/protocol to limited assist request.
3. Do not include events, full journal, raw source data, File/Blob or settings.
4. Return safe UI-friendly fallback on errors.

Checks:

```bash
npm run typecheck
npm test
```

Acceptance:

- client compiles;
- request payload is minimal;
- UI can call client without backend breaking the editor.

### Task 5: Add A3 Assist UI To Editor

Files:

- `src/features/local-a3/components/LocalA3ProtocolEditor.tsx`
- `src/features/local-a3/components/A3AssistPanel.tsx`
- component tests if available

Steps:

1. Add compact "ИИ-помощник" panel.
2. Show only when user enabled AI and A3 Assist.
3. Add button "Предложить формулировки".
4. Render suggestions separately from editable fields.
5. Add "Вставить" actions instead of auto-overwrite.
6. Show clear fallback when service unavailable.

Checks:

```bash
npm run typecheck
npm test
npm run build
```

Acceptance:

- A3 editor works without backend;
- A3 editor works with backend;
- no suggestions are applied without user action.

### Task 6: Update Settings UX

Files:

- settings modal/page files under `src/`
- `src/shared/lib/raportAiSettings.ts`
- help page if it references Print-only AI

Steps:

1. Rename visible concept to "ИИ-возможности Рапорта".
2. Split options:
   - "ИИ для анализа печати";
   - "ИИ-помощник A3".
3. Keep user-facing wording non-technical.
4. Hide technical service URL behind admin/advanced section.
5. Migrate old Print AI settings.

Checks:

```bash
npm run typecheck
npm test
npm run build
```

Acceptance:

- settings are understandable for business users;
- old Print users do not lose settings;
- frontend still starts without backend.

### Task 7: Deployment Scripts And Documentation

Files:

- `backend/raport-llm/README.md`
- `backend/raport-llm/DEPLOYMENT.md`
- `backend/raport-llm/.env.example`
- `deploy/raport-llm/*.ps1`
- `deploy/raport-llm/*.cmd`
- `docs/LOCAL_A3_PLAN.md` if architecture notes need update
- `README.md`

Steps:

1. Document local PC and LAN usage.
2. Document Ollama settings.
3. Document CORS / allowed origins.
4. Document that frontend works without backend.
5. Add Russian user-facing messages in scripts.
6. Keep compatibility note for previous `print-llm` naming.

Checks:

```bash
npm run check
```

Acceptance:

- user can start shared backend by script;
- user can see current model/service URL;
- docs do not imply backend is required.

### Task 8: End-To-End Verification

Scenarios:

1. Frontend only:
   - run static frontend;
   - do not start backend;
   - open main page, Print, A3 journal;
   - verify no hard failure.
2. Print LLM:
   - start `backend:raport-llm`;
   - enable AI for Print;
   - load Print file;
   - verify classification/cache/fallback.
3. A3 Assist:
   - start `backend:raport-llm`;
   - enable A3 Assist;
   - create A3 from SSZ/Print/Support/Tessa deviation;
   - request suggestions;
   - insert one suggestion manually;
   - save A3;
   - verify journal.
4. Backend unavailable:
   - stop backend;
   - verify Print and A3 editor remain usable.

Commands:

```bash
npm run typecheck
npm test
npm run build
npm run check
```

## Risks

- **Scope creep:** A3 assistant can easily become auto-analysis. Mitigation: suggestions only, no automatic save.
- **Data leakage:** A3 snapshot must stay minimal. Mitigation: tests for payload fields and no raw rows.
- **Breaking Print:** migration from `print-llm` to `raport-llm` can break existing settings. Mitigation: compatibility routes and settings migration.
- **UI complexity:** AI settings can become technical. Mitigation: business labels, technical settings hidden.
- **Model quality:** local model may hallucinate. Mitigation: prompt boundaries, JSON schema, user confirmation.

## Recommended Branch And Commits

Branch:

```bash
git switch -c codex/raport-llm-a3-assist
```

Commit sequence:

1. `refactor: introduce shared raport llm backend`
2. `refactor: migrate print llm into raport llm`
3. `feat: add a3 assist to raport llm`
4. `feat: add local a3 assist client`
5. `feat: add ai assistant to a3 editor`
6. `refactor: use shared raport ai settings`
7. `docs: document shared raport llm backend`

## Done Criteria

- `backend/raport-llm` exists and starts;
- Print LLM works through shared backend;
- A3 Assist endpoint works through shared backend;
- A3 editor can request suggestions and user can apply them manually;
- frontend works without backend;
- no Team/backend/auth/users roles are introduced;
- no raw Excel rows are sent to or saved by A3 Assist;
- docs and deployment scripts use `raport-llm` terminology;
- `npm run check` passes.
