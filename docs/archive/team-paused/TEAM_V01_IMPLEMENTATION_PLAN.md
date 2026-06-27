# Raport Team 0.1 — последовательность разработки в Codex App

**Назначение:** утверждённая последовательность этапов, контрольные точки и шаблоны промптов.  
**Продуктовая спецификация:** `docs/TEAM_V01.md`  
**Важно:** этот документ не заменяет репозиторий-специфичный execution plan.

После изучения фактической кодовой базы Codex должен создать:

```text
docs/plans/TEAM_V01_EXECUTION_PLAN.md
```

Именно проверенный и утверждённый `TEAM_V01_EXECUTION_PLAN.md` затем исполняется через `$subagent-driven-development`.

---

## 1. Организация работы

### Стабильная линия

```text
main
└── текущая рабочая Local-версия
```

В `main` во время разработки Team попадают только исправления текущего продукта.

### Линия Team

```text
team-v0.1
└── интеграционная ветка новой версии
```

Codex работает в отдельном Worktree от стабильного commit/tag.

### Направление синхронизации

```text
hotfix в main
→ merge/cherry-pick в team-v0.1
```

Team-код не переносится в `main` до release candidate.

### Skills Superpowers

Использовать:

```text
$using-git-worktrees
$writing-plans
$subagent-driven-development
$test-driven-development
$requesting-code-review
$verification-before-completion
$finishing-a-development-branch
```

По ситуации:

```text
$systematic-debugging
$receiving-code-review
```

Не использовать для утверждённого scope:

```text
$brainstorming
$executing-plans
$dispatching-parallel-agents для связанных изменений
```

### Правило итераций

Одна итерация меняет один ограниченный слой. После неё обязательны:

1. tests;
2. typecheck;
3. соответствующий production build;
4. Local regression;
5. review diff;
6. отдельный commit.

Не объединять в одной задаче edition split, backend, auth, reports UI и LLM gateway.

---

# Подготовительный шаг A. Зафиксировать Local baseline

**Изменение продукта:** отсутствует.

## Результат

- чистая стабильная ветка;
- commit и аннотированный tag текущей Local-версии;
- production build;
- список текущих дашбордов и их report type candidates;
- фиксация текущих Local LLM settings;
- фиксация текущего Print LLM transport;
- эталонные файлы и KPI;
- регрессионная матрица;
- фиксация текущего browser storage format.

## Не делать

- Team backend;
- Team UI;
- рефакторинг расчётов;
- изменение Local LLM;
- перестройку репозитория без необходимости.

## Промпт Codex

```text
Прочитай AGENTS.md, docs/TEAM_V01.md и
 docs/TEAM_V01_IMPLEMENTATION_PLAN.md.

Это только фиксация baseline текущей Local-версии.
Не реализуй Team-функции и не меняй поведение приложения.

Используй $verification-before-completion.

Сначала:
1. Проверь git status, текущую ветку и последние коммиты.
2. Изучи package.json и реальные команды build, typecheck и test.
3. Запусти существующие проверки.
4. Проинвентаризируй текущие дашборды, маршруты и входные форматы.
5. Для каждого дашборда зафиксируй ключевые KPI и состояние,
   необходимое для read-only восстановления.
6. Зафиксируй Local storage для адреса, ключа, модели и флага LLM.
7. Зафиксируй текущий маршрут LLM-вызова Print.
8. Найди demo files и fixtures.
9. Составь регрессионную матрицу.

Функциональный код не меняй. Допустимы только минимальные тестовые
или документирующие изменения после объяснения.

В конце покажи:
- состояние репозитория;
- результаты команд;
- inventory дашбордов;
- риски регрессии;
- предлагаемые commit и tag.
```

## Gate

Следующий шаг начинается только из чистого стабильного commit/tag.

---

# Подготовительный шаг B. Создать execution plan

**Изменение продукта:** отсутствует.

## Цель

Привязать утверждённое ТЗ к фактической структуре репозитория.

## Промпт Codex

```text
Работай в отдельном Worktree от ветки team-v0.1.

Прочитай:
- AGENTS.md;
- docs/TEAM_V01.md;
- docs/TEAM_V01_IMPLEMENTATION_PLAN.md.

Используй $writing-plans.

Не проводи повторный продуктовый brainstorming и не меняй
утверждённый scope.

Изучи репозиторий и создай:

docs/plans/TEAM_V01_EXECUTION_PLAN.md

План должен:
- указать точные файлы и директории;
- определить две build-time edition: Local и Team;
- исключить runtime-переключатель Local/Team;
- описать команды build:local и build:team;
- перечислить фактические dashboard report types;
- определить strict Zod schema для каждого dashboard snapshot;
- исключить Record<string, unknown> и catch-all package schema;
- предусмотреть CLIENT_CALCULATED trust marker;
- описать Fastify, SQLite, auth, users, reports и events;
- предусмотреть DB triggers для reports/events immutability;
- предусмотреть master secret вне /data и HKDF key separation;
- предусмотреть Origin-check, secure cookie и security headers;
- предусмотреть Team LLM allowlist и SSRF-защиту;
- предусмотреть TDD, security tests и Local regression;
- указать границы коммитов и команды проверки.

Не изменяй программный код.
После создания плана остановись.
```

## Gate

Execution plan вручную проверен и отдельно закоммичен. После утверждения Codex не расширяет его самовольно.

---

# Этап 1. Разделить Local и Team на две сборки

**Цель:** создать две edition из одной кодовой базы без изменения текущего Local поведения.

## Результат

- build-time edition composition;
- `build:local`;
- `build:team`;
- Local static artifact;
- Team frontend artifact;
- отсутствие runtime `RAPORT_MODE`;
- отсутствие UI-переключателя;
- Local не вызывает Team API;
- Team не делает fallback в Local;
- текущие Local LLM settings не изменены.

## Архитектурная граница

Предпочтительный принцип:

```text
src/editions/local.*
src/editions/team.*
```

Точная структура зависит от репозитория. Нельзя добавлять сложный monorepo только ради edition split.

## Промпт Codex

```text
Прочитай AGENTS.md, docs/TEAM_V01.md и утверждённый
TEAM_V01_EXECUTION_PLAN.md.

Используй $subagent-driven-development и $test-driven-development.
Реализуй только этап разделения сборок.

Требуется:
- одна кодовая база;
- отдельная Local build-time edition;
- отдельная Team build-time edition;
- команды build:local и build:team;
- отсутствие runtime RAPORT_MODE;
- отсутствие пользовательского switch;
- Local не импортирует и не вызывает Team API client;
- Team не переходит автоматически в Local при ошибке API;
- текущие Local LLM settings и transport остаются без изменений.

Не добавляй Fastify, SQLite, auth, reports или Team UI.
Не меняй расчёты дашбордов.

После реализации:
- запусти tests и typecheck;
- собери обе edition;
- проверь Local regression;
- используй $requesting-code-review;
- используй $verification-before-completion.
```

## Gate

- Local artifact работает автономно.
- Team frontend artifact собирается отдельно.
- В исходном коде нет runtime выбора edition.

---

# Этап 2. Общий envelope, trust marker и strict schema registry

**Цель:** подготовить безопасный contract публикации без backend.

## Результат

- `ReportEnvelopeV1`;
- обязательный `CLIENT_CALCULATED` marker;
- `clientBuildVersion` и `calculationEngineVersion`;
- schema registry по literal report type;
- unknown report type rejected;
- canonical JSON serialization;
- stable SHA-256 hash;
- запрет generic snapshot;
- contract/security tests.

## Запрещено

```ts
dashboardSnapshot: Record<string, unknown>
```

Нельзя создавать catch-all Zod schema, которая пропускает произвольный snapshot.

## Промпт Codex

```text
Реализуй только общий envelope, trust marker и strict schema registry.

Используй $test-driven-development.

Требуется:
- общий ReportEnvelopeV1;
- verification.status = CLIENT_CALCULATED;
- clientBuildVersion;
- calculationEngineVersion;
- calculatedAt;
- registry literal reportType → dashboard-specific Zod schema;
- unknown reportType rejected;
- strict schemas без passthrough;
- canonical serialization;
- stable hash;
- лимиты строк, массивов и payload structures.

Пока можно зарегистрировать только placeholder interfaces из inventory,
но catch-all schema запрещена.

Не добавляй backend, Team UI или adapters с изменением расчётов.
Добавь tests на unknown type, unknown fields, oversized fields,
secret-like fields и stable hash.
```

## Gate

Contract не может принять произвольный объект snapshot.

---

# Этап 3. Snapshot adapters всех текущих дашбордов

**Цель:** сериализовать текущие результаты без изменения формул.

## Порядок

1. Print — первый adapter.
2. Остальные текущие дашборды — по одному adapter на задачу.
3. Каждый adapter имеет literal report type и отдельную Zod schema.

## Результат каждого adapter

- минимальный typed snapshot;
- `createSnapshot`;
- `restoreReadOnlyView` либо эквивалент;
- round-trip test;
- KPI regression;
- forbidden fields test;
- no raw input rows unless explicitly approved;
- AI metadata без ключа.

## Промпт первого adapter

```text
Реализуй только strict ReportPackage adapter текущего Print dashboard.

Используй $test-driven-development.

Сначала определи:
- минимальные поля для read-only восстановления;
- поля, содержащие raw rows или персональные данные;
- поля, которые запрещено сохранять;
- AI metadata без API key и prompt contents.

Требуется:
- literal reportType PRINT или фактический существующий identifier;
- PrintSnapshotV1 strict Zod schema;
- createSnapshot/restore contract;
- CLIENT_CALCULATED metadata;
- round-trip tests;
- baseline KPI tests;
- unknown field and secret leakage tests.

Не добавляй backend, Team UI и сетевые вызовы.
Не меняй расчёты Print или Local LLM transport.
```

## Промпт следующих adapters

```text
Добавь strict ReportPackage adapter только для <dashboard>.

Не меняй расчёты, UI, Local LLM и adapters других дашбордов.
Добавь:
- literal reportType;
- strict snapshot schema;
- round-trip test;
- KPI regression test;
- forbidden/unknown fields test.
```

## Gate

Все действующие дашборды имеют strict adapter либо явно исключены отдельным решением.

---

# Этап 4. Минимальный Team server shell и web hardening

**Цель:** один Node-процесс обслуживает Team frontend и API shell.

## Результат

- Fastify 5 на Node 24 LTS;
- `GET /healthz`;
- раздача только Team bundle;
- SPA fallback;
- graceful shutdown;
- `@fastify/helmet`;
- CSP;
- request ID;
- request body limit;
- error redaction;
- no CORS;
- без SQLite и auth.

## Не создавать

- `/api/runtime-config` для выбора edition;
- Local fallback;
- database;
- users;
- report endpoints.

## Промпт Codex

```text
Реализуй только Team server shell и базовый web hardening.

Требуется:
- Fastify 5;
- Node 24 LTS target;
- GET /healthz;
- раздача Team production bundle;
- SPA fallback;
- graceful shutdown;
- @fastify/helmet;
- CSP без CDN/external scripts/fonts;
- no CORS;
- request body limit;
- request IDs;
- безопасный error handler без stack/internal secrets в response;
- tests.

Не добавляй runtime mode endpoint, Local fallback, SQLite,
auth, reports или LLM gateway.

Проверь отдельно:
- Local static artifact;
- Team server build;
- Team server не обслуживает Local bundle.
```

## Gate

Team server обслуживает Team frontend; Local остаётся отдельным artifact.

---

# Этап 5. SQLite, migrations, immutability и secret boundary

**Цель:** создать минимальное надёжное хранилище и правильную границу секретов.

## Результат

- `better-sqlite3`;
- SQL migrations через `PRAGMA user_version`;
- `users`, `reports`, `events`, `settings`;
- prepared statements;
- SQLite только на local disk;
- triggers no-update/no-delete для reports/events;
- `/data/raport.db`;
- `/run/secrets/raport-master.key` read-only;
- helper генерации master key;
- fail-closed без ключа;
- HKDF derived keys;
- AES-GCM helper для Team AI credentials;
- repository tests.

## Ограничения

- без ORM;
- без master key в `/data`;
- без совместного backup DB+key;
- без WAL по умолчанию, пока нет измеренной необходимости;
- без auth routes и UI.

## Промпт Codex

```text
Реализуй только SQLite foundation, DB immutability и secret boundary.

Используй $test-driven-development.

Требуется:
- better-sqlite3;
- migrations через PRAGMA user_version;
- STRICT tables из TEAM_V01.md;
- prepared statements;
- foreign_keys ON, synchronous FULL, busy_timeout;
- DB только в RAPORT_DATA_DIR;
- update/delete triggers для reports и events;
- master key только из RAPORT_MASTER_KEY_FILE;
- fail closed при отсутствии/неверном ключе;
- helper command для генерации 32+ random bytes с 0600 permissions;
- HKDF contexts session и team-ai-credentials;
- AES-GCM encrypt/decrypt helper;
- tests migrations, repeated startup, triggers, key separation,
  encryption round-trip and missing key failure.

Не добавляй auth routes, user UI, reports API или LLM calls.
Не генерируй master key внутрь /data.
```

## Gate

- DB и master key находятся в разных mount/path.
- Reports/events нельзя изменить или удалить даже через repository SQL.

---

# Этап 6. First-run setup, auth, sessions и CSRF protection

**Цель:** пользователь создаёт первого ADMIN и безопасно входит.

## Результат

- setup status/initialize;
- setup token flow;
- Argon2id;
- `__Host-raport-session`;
- login/logout/change-password/me;
- `session_version`;
- forced password change;
- rate limit;
- exact Origin/Referer check;
- first-run UI;
- login UI;
- change password UI;
- auth/security tests.

## Промпт Codex

```text
Реализуй только first-run setup и локальную auth Team.

Используй $test-driven-development.

Backend:
- GET /api/setup/status;
- POST /api/setup/initialize;
- POST /api/auth/login;
- POST /api/auth/logout;
- POST /api/auth/change-password;
- GET /api/me;
- Argon2id;
- secure session через derived session key;
- cookie __Host-raport-session;
- HttpOnly, Secure production, SameSite Strict, Path=/, no Domain;
- session_version;
- identical invalid credential response;
- rate limit login/setup;
- exact Origin check against RAPORT_PUBLIC_ORIGIN;
- strict Referer fallback;
- no CORS.

Setup token:
- env token preferred;
- optional ephemeral token logged once if env absent;
- never store token in /data;
- setup disabled after first user.

Frontend:
- setup wizard;
- login form;
- forced password change flow;
- clear unauthorized/forbidden states.

Не добавляй user admin, reports API или AI settings.
Добавь security tests cookie attributes, origin rejection,
session invalidation and last setup closure.
```

## Gate

- First ADMIN создаётся через UI.
- Cross-origin state-changing requests rejected.
- Cookie отвечает утверждённому контракту.

---

# Этап 7. User administration UI

**Цель:** ADMIN управляет 2–10 пользователями без CLI.

## Результат

- users API;
- users page;
- create/change role/block/unblock/reset password;
- temporary password shown once;
- last active ADMIN protection;
- events;
- permission tests.

## Промпт Codex

```text
Реализуй только Team user administration.

Backend:
- GET /api/admin/users;
- POST /api/admin/users;
- PATCH /api/admin/users/:id;
- POST /api/admin/users/:id/reset-password;
- ADMIN-only;
- temporary password returned once;
- session_version increment on password/role/status changes;
- last active ADMIN cannot be disabled or downgraded;
- append event for admin actions.

Frontend:
- Настройки → Пользователи;
- list/create/edit/block/reset dialogs;
- clear validation messages;
- temporary password one-time display.

READER и EDITOR получают 403 от API.
Local artifact не изменяется.
```

## Gate

Вся пользовательская настройка выполняется через браузер.

---

# Этап 8. Reports/events persistence и API

**Цель:** сохранять strict immutable packages и append-only решения.

## Результат

- reports/events repositories;
- strict schema registry on backend;
- list/create/get/event endpoints;
- duplicate 409;
- permissions;
- server author/time;
- payload size limit;
- `CLIENT_CALCULATED` required;
- update/delete blocked by triggers;
- API tests.

## Промпт Codex

```text
Реализуй только reports/events persistence и API.

Требуется:
- GET /api/reports;
- POST /api/reports;
- GET /api/reports/:id;
- POST /api/reports/:id/events;
- backend dashboard-specific schema registry;
- reject unknown reportType;
- reject unknown fields;
- require CLIENT_CALCULATED metadata;
- canonical payload hash;
- 409 duplicate with existingReportId;
- READER read;
- EDITOR/ADMIN publish and record decisions;
- server author and timestamp;
- body size limit;
- prepared statements;
- DB triggers verified by tests.

Не добавляй raw Excel storage, update/delete API или Team UI.
Не называй результат server-verified.
```

## Gate

API не принимает generic snapshots и не может изменить опубликованные records.

---

# Этап 9. Team UI: публикация, история, просмотр и решения

**Цель:** завершить основной Team flow.

## Результат

- publish button;
- history list/filter;
- typed saved report view;
- event timeline;
- decision form;
- superseded flow;
- `CLIENT_CALCULATED` badge and explanation;
- role-aware UI;
- explicit backend unavailable state;
- Local artifact unchanged.

## Промпт Codex

```text
Реализуй только Team UI reports and decisions.

Требуется:
- publish button для EDITOR/ADMIN после успешного расчёта;
- typed adapter → package publication;
- history list and filters;
- saved read-only view through the matching dashboard adapter;
- event timeline;
- record decision form;
- optional REPORT_SUPERSEDED flow;
- CLIENT_CALCULATED badge with trust explanation;
- loading/empty/error/duplicate states;
- role guards;
- explicit API unavailable page without Local fallback.

Local build:
- не показывает Team UI;
- не импортирует Team API client;
- не меняет текущие dashboards or Local LLM settings.

Добавь integration tests main Team flow and Local regression.
```

## Gate

EDITOR публикует рапорт, READER открывает его в другом browser profile, trust boundary видна пользователю.

---

# Этап 10. Team AI settings и безопасный Print gateway

**Цель:** сохранить Local AI и добавить централизованный Team AI без SSRF/generic proxy.

## Результат

- Local LLM UI/transport unchanged;
- Team AI settings API/UI;
- encrypted key storage;
- allowlist validation;
- test connection;
- Print capability endpoint;
- no redirects;
- request/response limits;
- structured output validation;
- manual override priority;
- AI metadata.

## Промпт Codex

```text
Реализуй только Team AI settings и Print LLM gateway.

Критическая совместимость:
- Local settings UI, storage and direct transport remain unchanged;
- Local works without backend.

Team backend:
- GET /api/admin/ai-settings;
- PUT /api/admin/ai-settings;
- POST /api/admin/ai-settings/test;
- GET /api/ai/status;
- POST /api/ai/print/classify-filenames;
- ADMIN-only configuration;
- API key encrypted with derived team-ai key;
- key never returned;
- no universal proxy;
- strict Zod input/output.

SSRF controls:
- base URL origin must exactly match RAPORT_AI_ALLOWED_ORIGINS;
- http/https only;
- credentials in URL rejected;
- wildcard disallowed in production;
- redirects disabled;
- timeout and request/response limits;
- sensitive headers and keys redacted from logs;
- empty allowlist means AI cannot be enabled.

Team frontend:
- Настройки → AI only ADMIN;
- enabled/base URL/model/key/timeout within allowed ranges;
- configured indicator;
- replace/clear key;
- test connection;
- Print uses TeamAiClient via backend.

Data controls:
- only filenames and minimal metadata;
- no file contents;
- invalid output rejected;
- UNKNOWN supported;
- manual correction wins;
- model/prompt version in aiMetadata.

Добавь tests Local unchanged, key secrecy, allowlist,
redirect rejection, timeout, response limit and invalid output.
```

## Gate

Team AI не может использовать backend как произвольный network proxy.

---

# Этап 11. Packaging, secrets, backup и deployment

**Цель:** выпустить два независимых artifacts и простую on-prem Team-поставку.

## Результат

- `raport-local-<version>.zip`;
- `raport-team:<version>`;
- multi-stage Dockerfile;
- non-root runtime;
- read-only root filesystem guidance;
- `/data` writable volume;
- `/run/secrets` read-only mount;
- helper генерации master key;
- healthcheck;
- SQLite backup command;
- separate secret backup guide;
- restore guide;
- first-run guide;
- no mandatory outbound dependencies.

## Промпт Codex

```text
Реализуй только packaging и эксплуатационную документацию.

Требуется:
- separate Local static artifact;
- separate Team Docker image;
- one Fastify Node process in Team;
- multi-stage build;
- Node 24 LTS production runtime;
- non-root user;
- production layer without build tools;
- /data persistent writable volume;
- /run/secrets read-only master key mount;
- helper command to generate master key with 0600 permissions;
- healthcheck;
- SQLite backup via Backup API or VACUUM INTO;
- DB backup and master key backup documented separately;
- restore procedure requiring both;
- first ADMIN setup guide;
- Team AI allowlist guide;
- reverse proxy/HTTPS assumptions;
- no CDN, SaaS telemetry or cloud dependency.

Проверь:
- Local artifact without backend;
- empty Team install;
- restart existing install;
- fail closed without master key;
- backup/restore;
- AI disabled;
- mock allowlisted local LLM;
- non-root container;
- read-only root filesystem where practical.
```

## Gate

Local и Team могут быть установлены независимо из одного release version.

---

# Этап 12. Security, regression и release candidate

## Проверки Local

- все routes;
- все fixtures;
- KPI baseline;
- Local browser settings preserved;
- Local LLM on/off;
- no Team API calls;
- no Team UI;
- Local production build.

## Проверки Team

- separate Team frontend artifact;
- no Local fallback;
- empty setup;
- auth/session/origin protection;
- user admin and last ADMIN;
- strict report schemas;
- unknown report type/fields rejected;
- `CLIENT_CALCULATED` displayed;
- immutable reports/events triggers;
- publication/history/decisions;
- AI key secrecy;
- AI allowlist/redirect/timeout limits;
- backup/restore;
- separate secret mount;
- non-root image;
- no external calls except allowlisted LLM.

## Финальный промпт Codex

```text
Прочитай AGENTS.md, docs/TEAM_V01.md и утверждённый execution plan.

Проведи финальную проверку Raport Team 0.1.

Используй:
- $requesting-code-review;
- $verification-before-completion;
- $systematic-debugging только при найденном сбое;
- $finishing-a-development-branch после успешной проверки.

Не добавляй новые функции.

Проверь полный diff относительно stable Local tag:
- two-build architecture and no runtime edition switch;
- Local regression and no Team API calls;
- strict dashboard package schemas;
- CLIENT_CALCULATED trust boundary;
- auth, cookie and Origin protection;
- user permissions;
- SQLite migrations and prepared statements;
- DB triggers immutability;
- no raw Excel storage;
- Local LLM unchanged;
- Team LLM key secrecy;
- Team AI allowlist and SSRF controls;
- master key separated from /data;
- security headers and log redaction;
- backup/restore;
- Local artifact and Team image;
- documentation.

Запусти реальные tests, typecheck, build:local и build:team.
Подготовь release report:
- реализованный scope;
- commands/results;
- security checks;
- known limitations;
- migration/rollback;
- merge recommendation or blockers.
```

---

## 2. Рекомендуемый порядок веток

```text
team-v0.1
├── feat/edition-builds
├── feat/report-contracts
├── feat/dashboard-adapters
├── feat/team-server-shell
├── feat/sqlite-security-foundation
├── feat/local-auth-setup
├── feat/user-admin-ui
├── feat/reports-events
├── feat/team-ui
├── feat/team-ai-gateway
└── feat/release-packaging
```

После каждого этапа:

```text
feature branch
→ tests/review/verification
→ merge into team-v0.1
```

---

## 3. Исправления текущего Local во время разработки

```text
main
→ hotfix/*
→ tests and tag
→ merge/cherry-pick into team-v0.1
```

Направление синхронизации до релиза:

```text
main → team-v0.1
```

Team-функции обратно в `main` частями не переносятся.

---

## 4. Правила промптов Codex

Каждый промпт содержит:

- ссылки на `AGENTS.md`, `TEAM_V01.md`, execution plan;
- один ограниченный результат;
- явные запреты;
- acceptance criteria этапа;
- команды проверки;
- Local regression;
- security checks, если затрагивается trust boundary.

Не использовать:

> Сделай Team-версию полностью.

Использовать:

> Реализуй только этап N по утверждённому плану. Не переходи к следующему этапу.

---

## 5. Release checklist

### Artifacts

- [ ] Local и Team — две отдельные сборки.
- [ ] Нет runtime Local/Team switch.
- [ ] Local artifact работает без backend.
- [ ] Team не делает fallback в Local.
- [ ] Оба artifacts собраны из одного commit/version.

### Product regression

- [ ] Все текущие дашборды сохранены.
- [ ] BOM Shockwave и новые модули отсутствуют.
- [ ] Baseline KPI совпадают.
- [ ] Local LLM settings и transport сохранены.

### Contracts and trust

- [ ] Каждый dashboard имеет literal reportType.
- [ ] Каждый dashboard имеет strict snapshot schema.
- [ ] Generic Record<string, unknown> отсутствует.
- [ ] Unknown reportType rejected.
- [ ] Unknown fields rejected.
- [ ] CLIENT_CALCULATED обязателен и отображается.
- [ ] Backend не заявляет server verification.

### Setup/auth/users

- [ ] Empty install показывает setup wizard.
- [ ] Первый ADMIN создаётся один раз.
- [ ] Setup token не хранится в /data.
- [ ] Cookie `__Host-raport-session`.
- [ ] Secure/HttpOnly/SameSite/Path/no Domain проверены.
- [ ] Origin/Referer protection проверена.
- [ ] Temporary password flow работает.
- [ ] Last active ADMIN защищён.
- [ ] Permission matrix проверена.

### Reports/events

- [ ] Reports immutable API-side.
- [ ] Reports update/delete blocked by DB triggers.
- [ ] Events append-only API-side.
- [ ] Events update/delete blocked by DB triggers.
- [ ] Duplicate payload policy работает.
- [ ] Saved report открывается без source file.

### LLM

- [ ] Local direct transport работает как раньше.
- [ ] Team LLM настраивает ADMIN.
- [ ] Team key encrypted and write-only.
- [ ] Browser не получает Team key.
- [ ] Allowed origins enforced.
- [ ] Credentials in URL rejected.
- [ ] Redirects not followed.
- [ ] Timeout and response limits enforced.
- [ ] Generic LLM proxy отсутствует.
- [ ] File contents не отправляются.
- [ ] AI disabled fallback работает.

### Secrets/storage

- [ ] SQLite в `/data`.
- [ ] Master key в отдельном read-only secret mount.
- [ ] Missing key → fail closed.
- [ ] HKDF key separation проверена.
- [ ] DB and key backups separated.
- [ ] Restore verified.

### Web/container security

- [ ] Helmet/CSP configured.
- [ ] CORS disabled.
- [ ] Request limits configured.
- [ ] Logs redact secrets.
- [ ] Spreadsheet export formula injection neutralized.
- [ ] Team container runs non-root.
- [ ] Multi-stage build.
- [ ] No build tools in production layer.
- [ ] No mandatory cloud/telemetry.

### Verification

- [ ] Tests pass.
- [ ] Typecheck passes.
- [ ] `build:local` passes.
- [ ] `build:team` passes.
- [ ] Local regression matrix passes.
- [ ] Security review passes.
- [ ] Backup/restore passes.
- [ ] Rollback to stable tag verified.
