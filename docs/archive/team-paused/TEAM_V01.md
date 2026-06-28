# Raport Team 0.1

**Статус:** утверждённая продуктовая и техническая спецификация  
**Дата:** 23 июня 2026  
**Основа:** существующая кодовая база «Рапорта»  
**Уровень решения:** небольшой on-prem modular monolith для 2–10 пользователей  
**Принцип версии:** развитие текущего функционала без новых предметных дашбордов

> Raport Team 0.1 добавляет к существующему автономному «Рапорту» локальную командную память: пользователей, публикацию рапортов, общую историю и фиксацию управленческих решений. Текущий автономный продукт сохраняется отдельной Local-сборкой.

---

## 1. Цель версии

Создать **две поставки из одной кодовой базы**.

### Raport Local

Текущий автономный продукт:

```text
Excel/CSV
→ браузер
→ существующие расчёты
→ дашборд
→ экспорт
```

Local распространяется как отдельная статическая сборка и не требует backend.

### Raport Team

Командная on-prem поставка:

```text
Excel/CSV
→ расчёт в браузере
→ публикация клиентского результата
→ общая история
→ управленческое решение
```

Team распространяется как отдельный контейнер, содержащий Team frontend, Fastify API и SQLite-доступ.

### Главный пользовательский цикл Team

```text
Первый запуск → создать ADMIN
→ войти
→ загрузить Excel/CSV
→ получить существующий дашборд
→ проверить результат
→ опубликовать рапорт
→ открыть его с другого рабочего места
→ зафиксировать решение
```

### Продуктовая граница

Local отвечает:

> Что показывает файл сейчас?

Team добавляет:

> Что организация опубликовала, кто это сделал и какое решение было принято?

Team 0.1 является совместной управленческой памятью. Он не является системой финансового учёта, аудиторской системой, BI-конструктором, таск-трекером или хранилищем исходных Excel-файлов.

---

## 2. Утверждённые принципы

1. **Одна кодовая база, две сборки.** Local и Team — два release artifact, а не runtime-переключатель и не два репозитория.
2. **Local — самостоятельная статическая сборка.** Она не обращается к Team API и не требует запущенного backend.
3. **Team — отдельная сборка.** Team frontend обслуживается Team backend и не переключается автоматически в Local при недоступности API.
4. **Режим не выбирается пользователем в интерфейсе.** В релизе отсутствует переключатель Local/Team.
5. **Существующие дашборды и формулы не меняются без отдельной задачи.**
6. **Расчёты остаются во frontend в 0.1.** Backend не пересчитывает KPI и не подтверждает их правильность.
7. **Опубликованный рапорт маркируется `CLIENT_CALCULATED`.** Это клиентский расчёт, принятый сервером на хранение, а не server-verified результат.
8. **Исходные Excel/CSV по умолчанию не сохраняются.** На сервер передаётся строго типизированный снимок результата.
9. **Опубликованный рапорт неизменяем.** Исправление создаёт новый рапорт; связь фиксируется событием.
10. **Team работает полностью внутри корпоративной инфраструктуры.** Обязательных облачных сервисов нет.
11. **LLM опциональна в обеих сборках.** Приложение сохраняет основную функциональность при отключённой модели.
12. **LLM не рассчитывает KPI.** В 0.1 поддерживается текущий сценарий Print: анализ названий файлов.
13. **Local сохраняет текущие персональные LLM-настройки.** Адрес, ключ, модель и включение продолжают управляться текущим интерфейсом Local.
14. **Team использует централизованные LLM-настройки.** Их меняет ADMIN; Team API key не передаётся браузеру.
15. **Никаких новых предметных модулей.** BOM Shockwave и другие новые продукты не входят в scope.
16. **Минимальная эксплуатационная сложность.** Один Team-контейнер, один Node-процесс, один файл SQLite, отдельный secret mount.
17. **AD, LDAP, Windows SSO и OIDC не входят в 0.1.** Используются локальные учётные записи.
18. **Безопасность реализуется на backend.** Скрытие элементов UI не является контролем доступа.

---

## 3. Две сборки

### 3.1. Local artifact

Целевой артефакт:

```text
raport-local-<version>.zip
└── статическая Vite-сборка
```

Целевая команда, адаптируемая к текущему репозиторию:

```bash
npm run build:local
```

Свойства:

- содержит только Local entry/capabilities;
- не требует `/api/*`;
- не показывает Team-экраны;
- сохраняет текущие настройки и транспорт LLM;
- может размещаться на статическом внутреннем web-сервере;
- не выполняет автоматический fallback из Team.

### 3.2. Team artifact

Целевой артефакт:

```text
raport-team:<version>
└── Team frontend bundle + Fastify API
```

Целевые команды:

```bash
npm run build:team
docker build -t raport-team:<version> .
```

Свойства:

- Team frontend компилируется отдельно;
- Fastify обслуживает только Team bundle;
- Team предполагает доступность Team API;
- при недоступном API показывается явная ошибка, а не переход в Local;
- версия frontend и backend поставляется совместно.

### 3.3. Build-time editions

Вместо `RAPORT_MODE` используется build-time edition, например:

```text
VITE_RAPORT_EDITION=local
VITE_RAPORT_EDITION=team
```

Точная реализация определяется execution plan после изучения репозитория. Допустимы отдельные entry-модули:

```text
src/editions/local.ts
src/editions/team.ts
```

Компоненты не должны читать environment variables напрямую. Edition и capabilities формируются в одном модуле композиции приложения.

---

## 4. Raport Local

Local должен сохранить текущее поведение.

### Обязательные свойства

- backend не требуется;
- учётные записи отсутствуют;
- текущие дашборды работают как сейчас;
- текущая локальная история сохраняется;
- Team-кнопки, Team-маршруты и Team API client отсутствуют либо недоступны в Local bundle;
- расчётные алгоритмы не меняются;
- исходные данные остаются в браузере пользователя.

### LLM в Local

Сохраняется существующий интерфейс:

- включение и выключение LLM;
- адрес API;
- ключ доступа;
- модель, если уже поддерживается;
- остальные существующие параметры;
- текущий прямой вызов из браузера.

Требования совместимости:

- сохранённые настройки не сбрасываются;
- формат настроек не меняется без миграции;
- Local работает при отключённой или недоступной LLM;
- нераспознанные названия переходят в текущий fallback или ручную проверку;
- Local-настройки не синхронизируются с Team.

---

## 5. Raport Team

Team добавляет:

- локальные учётные записи;
- роли;
- публикацию рапортов;
- общую историю;
- сохранённые управленческие решения;
- централизованные настройки LLM;
- backend LLM-шлюз для Print;
- application event history.

### Team не делает в 0.1

- не хранит исходный Excel/CSV;
- не пересчитывает дашборды на сервере;
- не утверждает истинность KPI;
- не заменяет существующие системы поручений;
- не отправляет данные в облако автоматически;
- не подключается к AD;
- не выполняет фоновые интеграции;
- не предоставляет универсальный LLM proxy.

---

## 6. Первый запуск Team

После миграции SQLite backend проверяет количество пользователей.

### Если пользователей нет

Состояние:

```text
INITIAL_SETUP_REQUIRED
```

Team frontend показывает мастер:

```text
Первоначальная настройка Raport Team

Имя администратора
Логин
Пароль
Повтор пароля
Одноразовый код установки

[Создать администратора]
```

### Setup token

Предпочтительный способ:

```env
RAPORT_SETUP_TOKEN=<одноразовый секрет>
```

Если переменная не задана, сервер может сгенерировать временный токен в памяти и вывести его один раз в startup log. Токен не сохраняется в `/data`. При перезапуске до завершения setup генерируется новый токен.

После создания первого `ADMIN`:

- `/api/setup/initialize` больше не принимает запросы;
- мастер setup недоступен;
- setup-token игнорируется;
- открывается обычная страница входа.

Критерий закрытия setup — наличие хотя бы одного пользователя в таблице `users`.

---

## 7. Аутентификация и сессии

Team 0.1 использует локальные логины и пароли.

### Требования

- пароли хранятся только как Argon2id hash;
- сообщения при неверном логине и пароле одинаковы;
- login endpoint защищён rate limit;
- отдельная таблица сессий не требуется;
- изменение пароля, роли или статуса увеличивает `session_version`;
- отключённый пользователь не может войти;
- временный пароль требует смены до доступа к остальным Team-функциям;
- logout очищает cookie;
- backend проверяет роль на каждом защищённом endpoint.

### Cookie

Имя:

```text
__Host-raport-session
```

Свойства production cookie:

```text
HttpOnly
Secure
SameSite=Strict
Path=/
без Domain
```

### CSRF / origin protection

Для всех изменяющих запросов (`POST`, `PUT`, `PATCH`, `DELETE`) backend проверяет:

1. `Origin` точно совпадает с `RAPORT_PUBLIC_ORIGIN`;
2. при отсутствии `Origin` используется строгая проверка `Referer`;
3. запросы с чужим origin отклоняются;
4. CORS по умолчанию выключен;
5. API принимает ожидаемый `Content-Type`.

SameSite cookie является дополнительной защитой, а не единственным CSRF-контролем.

---

## 8. Пользователи и роли

### Роли

| Роль | Возможности |
|---|---|
| `READER` | Просматривать опубликованные рапорты и решения |
| `EDITOR` | Всё из `READER`, а также публиковать рапорты и фиксировать решения |
| `ADMIN` | Всё из `EDITOR`, а также управлять пользователями и Team-настройками LLM |

Текущие дашборды доступны аутентифицированным Team-пользователям. Дальнейшее ограничение по дашбордам и подразделениям не входит в 0.1.

### Админка пользователей

Маршрут:

```text
Настройки → Пользователи
```

ADMIN может:

- создать пользователя;
- изменить отображаемое имя;
- изменить роль;
- заблокировать или разблокировать пользователя;
- сбросить пароль;
- увидеть дату последнего входа.

Удаление пользователей не поддерживается.

### Создание пользователя

ADMIN задаёт имя, логин и роль. Сервер генерирует временный пароль и показывает его только один раз. Пользователь меняет его при первом входе.

### Защитные правила

- логин уникален без учёта регистра;
- нельзя деактивировать или понизить последнего активного ADMIN;
- пользователь не может сам повысить свою роль;
- reset password, change role и disable увеличивают `session_version`;
- действия администрирования записываются в `events`.

---

## 9. Граница доверия опубликованного рапорта

### 9.1. Что делает backend

Backend:

- аутентифицирует автора;
- проверяет права;
- валидирует пакет по **конкретной схеме дашборда**;
- применяет size limits;
- рассчитывает canonical payload hash;
- добавляет server timestamp;
- сохраняет пакет неизменяемо.

### 9.2. Чего backend не делает

Backend не воспроизводит расчёт по исходному Excel и не подтверждает корректность KPI.

Каждый пакет содержит:

```ts
verification: {
  status: "CLIENT_CALCULATED";
  clientBuildVersion: string;
  calculationEngineVersion: string;
  calculatedAt: string;
}
```

В saved report UI отображается метка:

```text
Расчёт выполнен клиентским приложением.
Сервер проверил структуру и сохранил результат,
но не воспроизводил расчёт по исходным данным.
```

Запрещено использовать обозначения `SERVER_VERIFIED`, «аудировано» или «подтверждено сервером» в версии 0.1.

---

## 10. Строгие ReportPackage-контракты

### 10.1. Общий envelope

Общие поля допускаются в базовом envelope:

```ts
interface ReportEnvelopeV1 {
  schemaVersion: "1.0";
  reportType: string;
  reportTitle: string;

  period?: {
    start?: string;
    end?: string;
    label?: string;
  };

  source: {
    fileHash: string;
    fileName?: string;
    rowCount?: number;
  };

  verification: {
    status: "CLIENT_CALCULATED";
    clientBuildVersion: string;
    calculationEngineVersion: string;
    calculatedAt: string;
  };

  summary: {
    headline?: string;
    metrics: Array<{
      id: string;
      label: string;
      value: string | number | boolean | null;
      unit?: string;
    }>;
  };

  dataQuality?: {
    status: "OK" | "WARNING" | "ERROR";
    warnings?: string[];
  };

  aiMetadata?: {
    used: boolean;
    capability?: string;
    model?: string;
    promptVersion?: string;
    humanReviewed?: boolean;
  };

  assumptions?: string[];
}
```

### 10.2. Никакого generic snapshot

Запрещено:

```ts
dashboardSnapshot: Record<string, unknown>
```

Каждый действующий дашборд получает собственный literal `reportType` и собственную Zod-схему snapshot.

Принцип:

```ts
type ReportPackageV1 =
  | PrintReportPackageV1
  | CurrentDashboardAReportPackageV1
  | CurrentDashboardBReportPackageV1;
```

Реестр backend:

```ts
const reportPackageSchemas = {
  PRINT: PrintReportPackageSchema,
  // остальные фактические reportType после инвентаризации репозитория
} as const;
```

Backend сначала извлекает ограниченный `reportType`, затем выбирает схему из registry. Неизвестный `reportType` отклоняется. Catch-all schema отсутствует.

### 10.3. Требования к snapshot-схемам

Каждая schema:

- содержит только поля, необходимые для read-only восстановления;
- запрещает неизвестные поля (`strict`);
- не содержит raw rows, если они отдельно не одобрены;
- не содержит API keys, prompts, React state или произвольные objects;
- имеет лимиты массивов и строк;
- допускает только согласованный набор персональных данных;
- проходит round-trip test;
- имеет regression test ключевых KPI.

### 10.4. Общие требования к пакету

- canonical JSON serialization;
- стабильный SHA-256 hash;
- общий лимит payload задаётся server config;
- автор и server timestamp добавляются backend;
- пакет хранится без изменения;
- AI metadata не содержит секретов;
- raw Excel не включается;
- provenance ограничивается разрешёнными идентификаторами и агрегатами.

---

## 11. Публикация, история и решения

### Публикация

Доступ: `EDITOR`, `ADMIN`.

```text
Локальный расчёт
→ проверка пользователем
→ Опубликовать в Team
→ dashboard-specific Zod validation
→ canonical hash
→ duplicate check
→ immutable insert
```

Duplicate policy:

```text
409 Conflict + existingReportId
```

### История

Доступ: все аутентифицированные пользователи.

Поля списка:

- заголовок;
- тип рапорта;
- период;
- дата публикации;
- автор;
- client build version;
- calculation engine version;
- verification status;
- наличие решения;
- связь superseded.

### Просмотр

Сохранённый рапорт открывается без исходного файла. Team UI использует только конкретный typed package и события.

### Решения

Доступ: `EDITOR`, `ADMIN`.

Решение хранится append-only событием:

```ts
interface DecisionRecordedEvent {
  type: "DECISION_RECORDED";
  payload: {
    text: string;
    selectedScenarioId?: string;
    target?: {
      metric: string;
      value: string | number;
    };
    reviewDate?: string;
  };
}
```

Разрешённые report event types:

```text
DECISION_RECORDED
DECISION_REVISED
RESULT_REVIEWED
REPORT_SUPERSEDED
```

Старое событие не изменяется. Исправление создаёт новое событие.

---

## 12. LLM в Team

### 12.1. Назначение 0.1

Поддерживается существующая функция Print:

> классификация и анализ неструктурированных названий файлов.

LLM не используется для расчёта KPI, денег, причинности или сценариев.

### 12.2. Маршрут

```text
Print Team frontend
→ POST /api/ai/print/classify-filenames
→ Fastify
→ разрешённый корпоративный/local LLM endpoint
```

### 12.3. Team-настройки LLM

Маршрут:

```text
Настройки → AI
```

Доступ: только `ADMIN`.

Поля:

- включено/выключено;
- base URL;
- модель;
- API key — опционально;
- timeout в разрешённом диапазоне;
- статус последней проверки.

Требования:

- API key хранится server-side в зашифрованном виде;
- key никогда не возвращается frontend;
- UI показывает только `configured / not configured`;
- ADMIN может заменить или очистить key;
- Team setting общая для установки;
- при отключённой модели Print работает без AI;
- Team не использует browser Local-настройки;
- Team frontend никогда не обращается к LLM напрямую.

### 12.4. Allowlist и SSRF-защита

Deployment задаёт точный allowlist:

```env
RAPORT_AI_ALLOWED_ORIGINS=https://llm.company.local:8443
```

Допускается список origins через запятую. Правила:

- только `http:` или `https:`;
- origin должен точно входить в allowlist;
- wildcard запрещён в production;
- credentials в URL запрещены;
- redirects отключены;
- после redirect response запрос не продолжается;
- timeout обязателен;
- ограничены request и response bytes;
- DNS/connection errors обрабатываются без утечки внутренних деталей;
- API key и Authorization headers редактируются в логах;
- UI-проверка URL не заменяет backend validation.

ADMIN может менять адрес только в пределах deployment allowlist. Если allowlist пуст, Team AI нельзя включить.

### 12.5. Capability endpoint

Нет универсального `/api/llm`.

```text
POST /api/ai/print/classify-filenames
```

Endpoint:

- принимает только Zod-схему;
- отправляет только filenames и минимальные метаданные;
- не отправляет содержимое файлов;
- требует structured JSON output;
- отклоняет неизвестные категории;
- допускает `UNKNOWN`;
- сохраняет model/prompt metadata;
- признаёт ручную корректировку приоритетной.

---

## 13. Целевая архитектура

### Local artifact

```text
raport-local.zip
└── статический React/Vite bundle
    ├── Excel/CSV parser
    ├── dashboard calculations
    ├── current Local settings
    └── current Local LLM transport
```

### Team artifact

```text
raport-team container
├── Fastify
│   ├── Team SPA static files
│   ├── Auth API
│   ├── Users API
│   ├── Reports/events API
│   └── Print AI gateway
│
├── SQLite driver
│
├── /data/raport.db
└── /run/secrets/raport-master.key (read-only mount)
```

### Frontend responsibility

- parsing Excel/CSV;
- existing calculations;
- typed snapshot creation;
- scenario/UI rendering;
- Local LLM direct transport только в Local build;
- Team API client только в Team build.

### Backend responsibility

- setup, auth и users;
- permissions;
- dashboard-specific package validation;
- immutable reports;
- append-only events;
- Team LLM settings and gateway;
- audit/application events;
- backup command;
- security controls.

### Backend does not

- parse raw Excel;
- recalculate KPIs;
- infer report truth;
- store raw source data;
- provide generic LLM proxy.

---

## 14. Технический стек

### Shared / frontend

- существующие React, TypeScript и Vite;
- Zod для contracts;
- текущие библиотеки визуализации и Excel parsing;
- Web Crypto API или существующий browser hash helper для source hash.

### Team backend

- Node.js 24 LTS;
- Fastify 5;
- `@fastify/static`;
- `@fastify/secure-session`;
- `@fastify/rate-limit`;
- `@fastify/helmet`;
- `better-sqlite3`;
- Argon2id implementation;
- Zod;
- встроенный `crypto` для AES-GCM/HKDF/SHA-256.

### Не использовать в 0.1

- NestJS;
- ORM;
- PostgreSQL;
- Redis;
- queue/workers;
- WebSocket;
- microservices;
- cloud BaaS;
- vector database;
- agent frameworks.

---

## 15. SQLite

SQLite размещается только на локальном диске одного Team-host. SMB/NFS для рабочего `.db` не поддерживаются.

Startup pragmas:

```sql
PRAGMA foreign_keys = ON;
PRAGMA synchronous = FULL;
PRAGMA busy_timeout = 5000;
```

`journal_mode` начинается со стандартного режима. WAL может быть включён позднее только после измеренного concurrency-теста и при локальном filesystem.

### Таблица `users`

```sql
CREATE TABLE users (
  id                    TEXT PRIMARY KEY,
  login                 TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name          TEXT NOT NULL,
  password_hash         TEXT NOT NULL,
  role                  TEXT NOT NULL CHECK (role IN ('READER','EDITOR','ADMIN')),
  is_active             INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  must_change_password  INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0,1)),
  session_version       INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  last_login_at         TEXT
) STRICT;
```

### Таблица `reports`

```sql
CREATE TABLE reports (
  id                       TEXT PRIMARY KEY,
  report_type              TEXT NOT NULL,
  report_title             TEXT NOT NULL,
  period_start             TEXT,
  period_end               TEXT,
  source_hash              TEXT NOT NULL,
  package_schema_version   TEXT NOT NULL,
  client_build_version     TEXT NOT NULL,
  calculation_version      TEXT NOT NULL,
  verification_status      TEXT NOT NULL CHECK (verification_status = 'CLIENT_CALCULATED'),
  payload_json             TEXT NOT NULL,
  payload_hash             TEXT NOT NULL UNIQUE,
  created_by_user_id       TEXT NOT NULL REFERENCES users(id),
  created_by_login         TEXT NOT NULL,
  created_by_name          TEXT NOT NULL,
  created_at               TEXT NOT NULL
) STRICT;
```

### Таблица `events`

```sql
CREATE TABLE events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type      TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  payload_json    TEXT NOT NULL,
  actor_user_id   TEXT REFERENCES users(id),
  actor_login     TEXT,
  created_at      TEXT NOT NULL
) STRICT;
```

### Таблица `settings`

```sql
CREATE TABLE settings (
  key                 TEXT PRIMARY KEY,
  value_json          TEXT NOT NULL,
  secret_ciphertext   TEXT,
  updated_by_user_id  TEXT REFERENCES users(id),
  updated_at           TEXT NOT NULL
) STRICT;
```

Используемый ключ 0.1:

```text
team_ai
```

### DB-level immutability

Помимо отсутствия update/delete API, миграция создаёт triggers:

```sql
CREATE TRIGGER reports_no_update
BEFORE UPDATE ON reports
BEGIN
  SELECT RAISE(ABORT, 'reports are immutable');
END;

CREATE TRIGGER reports_no_delete
BEFORE DELETE ON reports
BEGIN
  SELECT RAISE(ABORT, 'reports are immutable');
END;

CREATE TRIGGER events_no_update
BEFORE UPDATE ON events
BEGIN
  SELECT RAISE(ABORT, 'events are append-only');
END;

CREATE TRIGGER events_no_delete
BEFORE DELETE ON events
BEGIN
  SELECT RAISE(ABORT, 'events are append-only');
END;
```

Это application event history, а не tamper-proof compliance audit: администратор host с прямым доступом к файлу SQLite остаётся в trust boundary.

### Миграции

- обычные `.sql` файлы;
- `PRAGMA user_version`;
- последовательное выполнение в транзакции;
- без ORM и migration framework;
- повторный запуск на актуальной схеме безопасен.

---

## 16. Secrets и криптография

### Master secret

Team не хранит master key в `/data`.

Конфигурация:

```env
RAPORT_MASTER_KEY_FILE=/run/secrets/raport-master.key
```

Требования:

- read-only mount;
- отдельные ACL от SQLite volume;
- минимум 32 случайных bytes;
- отсутствует в Git, image и logs;
- Team fail-closed при отсутствии или неверном ключе;
- установка предоставляет helper-команду для генерации файла с правами `0600`.

### Key separation

Из master secret через HKDF выводятся отдельные ключи с разными context labels:

```text
raport/session/v1
raport/team-ai-credentials/v1
```

Один derived key не используется для двух целей.

### Team AI key

- шифруется AES-GCM;
- nonce уникален для каждой записи;
- ciphertext хранится в `settings.secret_ciphertext`;
- key не выводится в API, UI или logs;
- замена master key требует отдельной процедуры re-encryption и не входит в обычный runtime.

---

## 17. API 0.1

### System

```text
GET /healthz
```

### Setup

```text
GET  /api/setup/status
POST /api/setup/initialize
```

### Auth

```text
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/change-password
GET  /api/me
```

### Admin users

```text
GET   /api/admin/users
POST  /api/admin/users
PATCH /api/admin/users/:id
POST  /api/admin/users/:id/reset-password
```

### Admin AI settings

```text
GET  /api/admin/ai-settings
PUT  /api/admin/ai-settings
POST /api/admin/ai-settings/test
```

`GET` возвращает только `apiKeyConfigured: true|false`.

### Reports

```text
GET  /api/reports
POST /api/reports
GET  /api/reports/:id
POST /api/reports/:id/events
```

### AI capability

```text
GET  /api/ai/status
POST /api/ai/print/classify-filenames
```

### Не создавать

```text
DELETE/PATCH report
universal /api/llm
file upload API
registration API
forgot-password API
runtime Local/Team switch API
```

---

## 18. Team configuration

Минимальные server settings:

```env
PORT=3000
RAPORT_PUBLIC_ORIGIN=https://raport.company.local
RAPORT_DATA_DIR=/data
RAPORT_MASTER_KEY_FILE=/run/secrets/raport-master.key
RAPORT_SETUP_TOKEN=
RAPORT_SECURE_COOKIES=true
RAPORT_MAX_REPORT_BYTES=5242880
RAPORT_AI_ALLOWED_ORIGINS=https://llm.company.local:8443
RAPORT_LOG_LEVEL=info
```

Team AI base URL, model and API key настраиваются ADMIN через UI, но URL обязан проходить deployment allowlist.

Local имеет отдельную build-time конфигурацию и продолжает использовать browser settings.

---

## 19. Web security и hardening

### HTTP security

- `@fastify/helmet`;
- CSP без внешних scripts/fonts/CDN;
- `default-src 'self'`;
- `frame-ancestors 'none'`;
- `object-src 'none'`;
- `base-uri 'self'`;
- `X-Content-Type-Options: nosniff`;
- HTTPS в production;
- HSTS на reverse proxy или приложении по корпоративной политике;
- CORS disabled by default;
- request body limits;
- response size limits для LLM;
- graceful timeout handling.

### Application security

- Zod strict validation для всех внешних payload;
- prepared SQL statements;
- role checks backend-side;
- Origin/Referer check;
- rate limit для login/setup/AI test;
- no `dangerouslySetInnerHTML` без отдельного review;
- user-controlled text выводится как text, не HTML;
- spreadsheet export neutralizes formula injection для значений, начинающихся с `=`, `+`, `-`, `@`;
- errors не раскрывают SQL, stack trace, internal URLs или secrets;
- logs имеют request ID;
- Authorization/API key/cookie/password поля редактируются;
- исходный Excel не логируется.

### Deployment hardening

- multi-stage Docker build;
- production image без build tools;
- non-root user;
- fixed dependency versions and lockfile;
- root filesystem read-only, кроме явно необходимых temp/data paths;
- `/run/secrets` read-only;
- `/data` — единственный persistent writable volume;
- нет внешней telemetry по умолчанию;
- нет обязательного outbound network, кроме разрешённого Team LLM endpoint.

---

## 20. Backup и restore

### SQLite backup

Приложение предоставляет команду согласованного snapshot через SQLite Backup API или `VACUUM INTO`:

```text
/backups/raport-YYYY-MM-DDTHHMMSS.db
```

Нельзя копировать открытый `.db` обычной файловой копией как единственный официальный способ backup.

### Separate secret backup

SQLite backup и master secret хранятся отдельно:

```text
Backup A: raport.db snapshot
Backup B: raport-master.key
```

Требования:

- разные ACL;
- желательно разные backup location/policy;
- инструкции restore явно требуют оба компонента;
- master key не помещается в один архив с DB по умолчанию;
- setup token не резервируется;
- restore проверяется до релиза.

---

## 21. Нефункциональные требования

- 2–10 пользователей;
- один Team backend instance;
- одна компания на одну установку;
- сервер работает без доступа в интернет;
- Local работает без Team backend;
- Team запускается одним контейнером;
- SQLite находится на local persistent disk;
- список истории рассчитан на тысячи, а не миллионы рапортов;
- publication не должна заметно блокировать UI;
- ошибки Team не меняют уже рассчитанные KPI;
- все timestamps хранятся UTC ISO 8601;
- backend не преобразует money/KPI values;
- обновление выполняет автоматические versioned migrations;
- Team frontend/backend version mismatch не поддерживается;
- Local и Team artifacts собираются из одного commit и имеют один product version.

---

## 22. Scope Team 0.1

### Must have

- одна кодовая база;
- две отдельные сборки: Local static и Team image;
- регрессионная совместимость текущих дашбордов;
- сохранение текущего Local LLM UI и transport;
- strict report schema registry по каждому dashboard;
- `CLIENT_CALCULATED` trust marker;
- Fastify + SQLite без ORM;
- first-run ADMIN setup через UI;
- локальный login/logout/change password;
- роли `READER`, `EDITOR`, `ADMIN`;
- UI управления пользователями;
- immutable reports + DB triggers;
- append-only events + DB triggers;
- публикация, история, saved view, решения;
- Team AI admin UI;
- encrypted Team API key;
- separate master secret mount;
- AI origin allowlist и SSRF-защита;
- Print AI gateway;
- работа без LLM;
- CSRF/origin protection;
- security headers;
- backup/restore;
- one Team Docker image;
- no cloud dependency.

### Should have

- connection test для Team AI;
- `REPORT_SUPERSEDED`;
- duplicate report detection;
- фильтр истории по типу и периоду;
- AI metadata;
- понятный backend unavailable state;
- export saved report в текущем формате.

### Explicitly out of scope

- BOM Shockwave;
- новые дашборды;
- server-side KPI recomputation;
- raw Excel storage;
- full drill-down after publication;
- tasks/comments/notifications;
- email;
- background jobs;
- realtime;
- generic AI chat;
- RAG/embeddings/agents;
- AD/LDAP/OIDC/Keycloak;
- registration/password recovery/MFA;
- per-dashboard or department permissions;
- PostgreSQL/ORM/Redis/queues;
- microservices/Kubernetes;
- multi-tenancy;
- write-back.

---

## 23. Тестирование

### 23.1. Baseline

Для каждого текущего дашборда:

- эталонный input;
- ключевые KPI;
- основные UI states;
- Print with AI on/off;
- Local build regression.

### 23.2. Editions

- `build:local` создаёт статический artifact;
- Local bundle не обращается к `/api/*`;
- Local bundle не содержит Team navigation;
- `build:team` создаёт Team bundle;
- Team server отдаёт только Team bundle;
- Team при API failure показывает error, не Local fallback;
- оба artifact имеют одинаковую product version.

### 23.3. Report contracts

- dashboard-specific Zod validation;
- unknown reportType rejected;
- unknown snapshot fields rejected;
- raw rows/secrets rejected or absent;
- max lengths/counts enforced;
- canonical hash stable;
- adapter round-trip;
- KPI regression;
- `CLIENT_CALCULATED` required and displayed.

### 23.4. Setup/auth/users

- empty DB → setup required;
- invalid setup token rejected;
- first ADMIN once only;
- secure cookie attributes;
- origin check;
- login/logout/change password;
- equal invalid credential errors;
- temporary password flow;
- session invalidation;
- last ADMIN protection;
- permissions matrix;
- rate limits.

### 23.5. Reports/events

- create/list/get;
- duplicate 409;
- DB trigger blocks report update/delete;
- DB trigger blocks event update/delete;
- event append;
- permission checks;
- author/server timestamp;
- superseded link.

### 23.6. Team LLM

- Local LLM unchanged;
- Team key never returned;
- AI disabled fallback;
- allowlisted origin accepted;
- non-allowlisted origin rejected;
- credentials in URL rejected;
- redirect not followed;
- timeout and response-size limit;
- invalid output rejected;
- only filenames sent;
- `UNKNOWN` supported;
- manual override wins;
- logs redact key/header.

### 23.7. Secrets/backup/packaging

- missing master secret → fail closed;
- derived keys differ by purpose;
- AI key encryption round-trip;
- DB and secret use separate mounts;
- backup and restore tested;
- non-root container;
- read-only root filesystem test;
- no outbound calls except allowlisted LLM;
- Local static artifact test;
- Team image test.

---

## 24. Acceptance criteria

Team 0.1 принимается, когда:

1. Local и Team собираются как два отдельных artifacts из одной кодовой базы.
2. В приложении нет runtime-переключателя Local/Team.
3. Local работает без backend и не вызывает Team API.
4. Все baseline KPI совпадают.
5. Local LLM settings и transport сохранены.
6. Team empty install открывает setup wizard.
7. Первый ADMIN создаётся один раз.
8. ADMIN управляет пользователями через UI.
9. Роли проверяются backend-side.
10. Team session использует `__Host-raport-session` и Origin-check.
11. Каждый dashboard имеет strict package schema; generic snapshot отсутствует.
12. Неизвестный report type и лишние snapshot fields отклоняются.
13. Каждый saved report отмечен `CLIENT_CALCULATED`.
14. EDITOR может опубликовать рапорт.
15. READER открывает его на другом рабочем месте без source file.
16. Report update/delete блокируется API и SQLite trigger.
17. Event update/delete блокируется SQLite trigger.
18. EDITOR может записать append-only decision.
19. Team AI настраивается ADMIN.
20. Team AI URL обязан входить в deployment allowlist.
21. Team browser не получает AI key.
22. Team Print вызывает LLM только через backend.
23. AI disabled не ломает Print.
24. Master secret хранится отдельно от `/data`.
25. SQLite и master secret резервируются раздельно.
26. Backup и restore проверены.
27. Team image запускается non-root и без обязательного internet access.
28. Security, typecheck, tests и обе production builds проходят.

---

## 25. Definition of Done

Функция завершена только если:

- реализован утверждённый scope;
- Local regression не нарушена;
- добавлены тесты поведения и security boundary;
- backend проверяет права и origin;
- report contracts strict;
- errors/logs не раскрывают secrets;
- документация обновлена;
- diff прошёл code review;
- выполнена `verification-before-completion`;
- scope не расширен скрыто.

Team 0.1 завершён, когда:

```text
Из одной кодовой базы выпускаются два независимых artifact:
Local — автономный текущий Рапорт;
Team — on-prem сборка с пользователями, историей, решениями
и безопасным централизованным LLM-шлюзом.
```

---

## 26. Решения, которые нельзя менять без согласования

- одна кодовая база;
- две отдельные сборки, не runtime switch;
- Local static artifact;
- Team container artifact;
- текущие Local LLM settings сохраняются;
- Team LLM settings централизованы;
- Team LLM URL ограничен deployment allowlist;
- Team key не попадает в browser;
- local users вместо AD;
- first ADMIN через UI;
- роли `READER`, `EDITOR`, `ADMIN`;
- Fastify 5 / Node 24 LTS;
- SQLite без ORM;
- один Node-процесс;
- client-side dashboard calculations;
- обязательный `CLIENT_CALCULATED` marker;
- strict schema per dashboard;
- immutable reports + triggers;
- append-only events + triggers;
- master secret отдельно от SQLite volume;
- source files не хранятся;
- no new dashboards;
- no mandatory cloud components.
