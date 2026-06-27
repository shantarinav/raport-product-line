# Raport Team 0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать Raport Team 0.1 как отдельную on-prem Team-поставку из той же кодовой базы, сохранив текущую Local-версию автономным статическим frontend без обязательного backend.

**Architecture:** Team добавляется как build-time edition, а не runtime-переключатель. Расчеты текущих дашбордов остаются во frontend; Team backend принимает только строгие `CLIENT_CALCULATED` пакеты, хранит их в SQLite, управляет локальными пользователями, событиями, решениями и централизованными ИИ-настройками Print.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, lucide-react, Vitest, Playwright, Node.js, Fastify, SQLite без ORM, Zod для runtime-валидации.

---

## 0. Исходный контекст

Прочитаны и учтены:

- `AGENTS.md`;
- `docs/TEAM_V01.md`;
- `docs/TEAM_V01_IMPLEMENTATION_PLAN.md`.

Фактическая структура на момент планирования:

- `src/main.tsx` — React entry, `HashRouter`, `ThemeProvider`.
- `src/App.tsx` — lazy routes `#/`, `#/ssz`, `#/tessa`, `#/print`, `#/support`.
- `src/pages/landing/index.tsx` — единая загрузка файлов, detection, parsing, pending data, Local history snapshots.
- `src/pages/landing/components/HistoryManager.tsx` — Local настройки: ИИ Print, тренды, IndexedDB history.
- `src/shared/pendingDashboardFile.ts` — текущая передача parsed data в дашборды.
- `src/shared/reportDetection.ts` — определение `ssz | tessa | print | support`.
- `src/shared/lib/historyDB.ts` — Local IndexedDB snapshots.
- `src/shared/lib/snapshotBuilder.ts` — месячные Local KPI snapshots.
- `src/shared/lib/printAiSettings.ts` — Local browser settings для Print AI.
- `backend/print-llm/*` — optional Local Print LLM backend extension.
- Текущие npm-команды: `dev`, `typecheck`, `test`, `build`, `check`, `preview`, `backend:print-llm:*`.

Scope boundaries:

- Не добавлять новые дашборды.
- Не добавлять ORM, PostgreSQL, Redis, очереди, cloud services.
- Не переносить KPI-расчеты на backend в Team 0.1.
- Не хранить raw Excel/CSV по умолчанию.
- Не добавлять runtime-переключатель Local/Team в интерфейс.
- Не менять текущие формулы и поведение дашбордов без отдельной задачи.
- Local должен собираться и работать без Team backend и без Team API calls.

## 1. Branch, commit and verification policy

Реализацию вести от стабильного Local tag:

```bash
git switch -c team-v0.1 raport-local-v1.0.0
```

Каждый этап выполняется в отдельной feature-ветке от `team-v0.1`, проверяется, коммитится и только потом вливается в `team-v0.1`.

Обязательные проверки перед каждым stage commit:

```bash
npm run typecheck
npm run test -- <changed test paths>
npm run build:local
```

Перед merge stage branch в `team-v0.1`:

```bash
npm run check
npm run build:local
npm run build:team
```

Если этап затрагивает Team backend:

```bash
npm run team:test
npm run team:start
```

## 2. Target files by subsystem

### Editions

- Create: `src/editions/types.ts`
- Create: `src/editions/local.ts`
- Create: `src/editions/team.ts`
- Create: `src/editions/current.ts`
- Create: `scripts/build-edition.mjs`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx` only if provider composition must receive edition context
- Modify: `package.json`
- Test: `src/editions/current.test.ts`

### Report package contracts

- Create: `src/shared/report-package/reportTypes.ts`
- Create: `src/shared/report-package/reportEnvelope.ts`
- Create: `src/shared/report-package/canonicalJson.ts`
- Create: `src/shared/report-package/hash.ts`
- Create: `src/shared/report-package/registry.ts`
- Create: `src/shared/report-package/schemas/print.ts`
- Create: `src/shared/report-package/schemas/ssz.ts`
- Create: `src/shared/report-package/schemas/tessa.ts`
- Create: `src/shared/report-package/schemas/support.ts`
- Test: `src/shared/report-package/*.test.ts`

### Dashboard package adapters

- Create: `src/features/print/team/printReportPackage.ts`
- Create: `src/features/ssz/team/sszReportPackage.ts`
- Create: `src/features/tessa/team/tessaReportPackage.ts`
- Create: `src/features/support/team/supportReportPackage.ts`
- Test: `src/features/*/team/*.test.ts`

### Team frontend

- Create: `src/team/api/teamApiClient.ts`
- Create: `src/team/auth/AuthProvider.tsx`
- Create: `src/team/auth/useAuth.ts`
- Create: `src/team/components/TeamShell.tsx`
- Create: `src/team/components/BackendUnavailableState.tsx`
- Create: `src/team/components/ClientCalculatedBadge.tsx`
- Create: `src/team/components/PublishReportButton.tsx`
- Create: `src/team/components/ReportEventTimeline.tsx`
- Create: `src/team/components/DecisionForm.tsx`
- Create: `src/team/pages/SetupPage.tsx`
- Create: `src/team/pages/LoginPage.tsx`
- Create: `src/team/pages/TeamHomePage.tsx`
- Create: `src/team/pages/UsersPage.tsx`
- Create: `src/team/pages/ReportsPage.tsx`
- Create: `src/team/pages/ReportViewPage.tsx`
- Create: `src/team/pages/AiSettingsPage.tsx`

### Team backend

- Create: `backend/team/config.mjs`
- Create: `backend/team/app.mjs`
- Create: `backend/team/server.mjs`
- Create: `backend/team/db/connection.mjs`
- Create: `backend/team/db/migrations.mjs`
- Create: `backend/team/db/schema.sql`
- Create: `backend/team/db/repositories/users.mjs`
- Create: `backend/team/db/repositories/reports.mjs`
- Create: `backend/team/db/repositories/events.mjs`
- Create: `backend/team/security/passwords.mjs`
- Create: `backend/team/security/sessions.mjs`
- Create: `backend/team/security/origin.mjs`
- Create: `backend/team/security/masterKey.mjs`
- Create: `backend/team/security/encryption.mjs`
- Create: `backend/team/security/ssrfGuard.mjs`
- Create: `backend/team/routes/health.mjs`
- Create: `backend/team/routes/setup.mjs`
- Create: `backend/team/routes/auth.mjs`
- Create: `backend/team/routes/adminUsers.mjs`
- Create: `backend/team/routes/reports.mjs`
- Create: `backend/team/routes/aiSettings.mjs`
- Create: `backend/team/routes/aiPrint.mjs`
- Create: `backend/team/validation/*.mjs`
- Test: `backend/team/**/*.test.ts`

### Packaging

- Create: `Dockerfile.team`
- Create: `.dockerignore`
- Create: `scripts/package-local.mjs`
- Create: `deploy/team/README.md`
- Create: `deploy/team/docker-compose.example.yml`
- Create: `deploy/team/generate-master-key.ps1`
- Create: `deploy/team/backup.ps1`
- Create: `deploy/team/restore.md`
- Modify: `README.md`
- Modify: `package.json`

## 3. Report types and routes

Allowed report types:

```ts
export type TeamReportType = "ssz" | "tessa" | "print" | "support";
```

Current route mapping:

```ts
export const TEAM_REPORT_ROUTE_BY_TYPE = {
  ssz: "/ssz",
  tessa: "/tessa",
  print: "/print",
  support: "/support",
} as const;
```

Current parsers remain frontend-only:

- `readWorkbookFile` from `src/features/ssz/import/readWorkbook.ts`
- `readTessaReportFile` from `src/features/tessa/import/readReportFile.ts`
- `readPrintReportFile` from `src/features/print/import/readReportFile.ts`
- `readSupportReportFile` from `src/features/support/import/readReportFile.ts`

## 4. Shared Team report envelope

Create in `src/shared/report-package/reportEnvelope.ts`:

```ts
export type ReportVerificationStatus = "CLIENT_CALCULATED";

export interface ReportEnvelopeV1<TReportType extends TeamReportType, TSnapshot> {
  schemaVersion: 1;
  reportType: TReportType;
  title: string;
  period: { from: string; to: string };
  createdAt: string;
  clientBuildVersion: string;
  calculationEngineVersion: string;
  verification: {
    status: ReportVerificationStatus;
    calculatedAt: string;
    warning: "KPI calculated in browser and stored without server-side recomputation";
  };
  snapshot: TSnapshot;
  aiMetadata?: {
    enabled: boolean;
    provider: "local-browser" | "team-gateway" | "none";
    model?: string;
    promptVersion?: string;
    classifiedCount?: number;
  };
}
```

Rules:

- `verification.status` must be `CLIENT_CALCULATED`.
- Backend rejects missing or different trust marker.
- Backend never recalculates KPI.
- Backend stores package and hash.
- No `Record<string, unknown>` catch-all snapshot.
- Zod schemas must be `.strict()`.

## 5. Stage 1 — Build-time editions

**Depends on:** `raport-local-v1.0.0`.

**Goal:** Add Local and Team build-time editions without changing Local behavior.

**Files:**

- Create: `src/editions/types.ts`
- Create: `src/editions/local.ts`
- Create: `src/editions/team.ts`
- Create: `src/editions/current.ts`
- Create: `scripts/build-edition.mjs`
- Modify: `src/App.tsx`
- Modify: `package.json`
- Test: `src/editions/current.test.ts`

**Functions and constants:**

- `readRaportEdition(env): RaportEdition`
- `getCurrentCapabilities(env): RaportCapabilities`
- `localCapabilities`
- `teamCapabilities`

**Capability shape:**

```ts
export type RaportEdition = "local" | "team";

export interface RaportCapabilities {
  edition: RaportEdition;
  teamApiEnabled: boolean;
  teamRoutesEnabled: boolean;
  publicationEnabled: boolean;
  localPrintAiSettingsEnabled: boolean;
}
```

**Scripts to add:**

```json
"build:local": "node scripts/build-edition.mjs local",
"build:team": "node scripts/build-edition.mjs team"
```

`scripts/build-edition.mjs` sets `VITE_RAPORT_EDITION` and runs `vite build` after `tsc`.

**Tests:**

- default edition is `local`;
- `team` enables Team routes and publication;
- invalid edition throws clear error;
- Local capabilities keep `teamApiEnabled === false`.

**Commands:**

```bash
npm run test -- src/editions/current.test.ts
npm run typecheck
npm run build:local
npm run build:team
```

**Commit:**

```bash
git add src/editions scripts/build-edition.mjs src/App.tsx package.json
git commit -m "feat(team): add build-time editions"
```

## 6. Stage 2 — Strict report package registry

**Depends on:** Stage 1.

**Goal:** Add strict client-calculated publication contract.

**Files:**

- Create: `src/shared/report-package/reportTypes.ts`
- Create: `src/shared/report-package/reportEnvelope.ts`
- Create: `src/shared/report-package/canonicalJson.ts`
- Create: `src/shared/report-package/hash.ts`
- Create: `src/shared/report-package/registry.ts`
- Create: `src/shared/report-package/schemas/print.ts`
- Create: `src/shared/report-package/schemas/ssz.ts`
- Create: `src/shared/report-package/schemas/tessa.ts`
- Create: `src/shared/report-package/schemas/support.ts`
- Test: `src/shared/report-package/registry.test.ts`
- Test: `src/shared/report-package/canonicalJson.test.ts`

**Dependency to add:**

```bash
npm install zod
```

**Functions:**

- `parseReportEnvelope(input: unknown): ReportEnvelopeUnion`
- `getReportSnapshotSchema(reportType: TeamReportType)`
- `canonicalJson(value: unknown): string`
- `sha256Canonical(value: unknown): string`

**Schema rules:**

- literal `reportType`;
- `.strict()` on envelope and snapshot objects;
- reject unknown report type;
- reject unknown fields;
- reject missing `CLIENT_CALCULATED`;
- reject raw/source file fields by schema and tests.

**Tests:**

- unknown `reportType` rejected;
- unknown snapshot field rejected;
- missing trust marker rejected;
- canonical hash stable for key order;
- changed KPI changes hash;
- secret-like field rejected.

**Commands:**

```bash
npm run test -- src/shared/report-package
npm run typecheck
npm run build:local
npm run build:team
```

**Commit:**

```bash
git add package.json package-lock.json src/shared/report-package
git commit -m "feat(team): add strict report package contract"
```

## 7. Stage 3 — Dashboard package adapters

**Depends on:** Stage 2.

**Goal:** Convert current frontend-calculated dashboard state to strict report packages.

**Files:**

- Create: `src/features/print/team/printReportPackage.ts`
- Create: `src/features/ssz/team/sszReportPackage.ts`
- Create: `src/features/tessa/team/tessaReportPackage.ts`
- Create: `src/features/support/team/supportReportPackage.ts`
- Test: `src/features/print/team/printReportPackage.test.ts`
- Test: `src/features/ssz/team/sszReportPackage.test.ts`
- Test: `src/features/tessa/team/tessaReportPackage.test.ts`
- Test: `src/features/support/team/supportReportPackage.test.ts`

**Functions:**

```ts
createPrintReportPackage(input: PrintImportResult, options: PackageOptions): PrintReportEnvelope
createSszReportPackage(input: ImportedReport, options: PackageOptions): SszReportEnvelope
createTessaReportPackage(input: TessaImportResult, options: PackageOptions): TessaReportEnvelope
createSupportReportPackage(input: SupportImportResult, options: PackageOptions): SupportReportEnvelope
```

**PackageOptions:**

```ts
export interface PackageOptions {
  title: string;
  clientBuildVersion: string;
  calculationEngineVersion: string;
  calculatedAt: string;
  aiMetadata?: ReportEnvelopeV1<TeamReportType, unknown>["aiMetadata"];
}
```

**Adapter constraints:**

- Do not reimplement dashboard formulas.
- Reuse existing logic modules: `dashboard.ts`, `supportMetrics.ts`, current import result types.
- Do not include raw workbook rows.
- Keep fields minimal and schema-limited.
- Include enough data for read-only saved report view.

**Tests:**

- adapter output passes registry parser;
- trust marker is present;
- KPI values match existing logic;
- forbidden raw/source/secret fields absent;
- canonical hash stable.

**Commands:**

```bash
npm run test -- src/features/print/team src/features/ssz/team src/features/tessa/team src/features/support/team
npm run typecheck
npm run build:local
npm run build:team
```

**Commit:**

```bash
git add src/features/print/team src/features/ssz/team src/features/tessa/team src/features/support/team
git commit -m "feat(team): add dashboard package adapters"
```

## 8. Stage 4 — Team Fastify shell

**Depends on:** Stage 1.

**Goal:** Add minimal Team backend process and health endpoint.

**Files:**

- Create: `backend/team/config.mjs`
- Create: `backend/team/app.mjs`
- Create: `backend/team/server.mjs`
- Create: `backend/team/routes/health.mjs`
- Test: `backend/team/config.test.ts`
- Test: `backend/team/server.test.ts`
- Modify: `package.json`

**Dependencies:**

```bash
npm install fastify @fastify/helmet @fastify/static
```

**Routes:**

```text
GET /healthz
```

**Health response:**

```json
{
  "ok": true,
  "service": "raport-team",
  "edition": "team"
}
```

**Scripts:**

```json
"team:dev": "node backend/team/server.mjs",
"team:start": "node backend/team/server.mjs",
"team:test": "vitest run backend/team"
```

**Tests:**

- `/healthz` returns 200;
- unknown API route returns JSON 404;
- Helmet/security headers enabled;
- no CORS by default.

**Commands:**

```bash
npm run team:test
npm run typecheck
npm run build:team
npm run build:local
```

**Commit:**

```bash
git add backend/team package.json package-lock.json
git commit -m "feat(team): add Fastify server shell"
```

## 9. Stage 5 — SQLite, migrations, immutability and secrets

**Depends on:** Stage 4.

**Goal:** Add persistent SQLite foundation and secret boundary.

**Files:**

- Create: `backend/team/db/connection.mjs`
- Create: `backend/team/db/migrations.mjs`
- Create: `backend/team/db/schema.sql`
- Create: `backend/team/security/masterKey.mjs`
- Create: `backend/team/security/encryption.mjs`
- Test: `backend/team/db/migrations.test.ts`
- Test: `backend/team/security/masterKey.test.ts`
- Test: `backend/team/security/encryption.test.ts`

**SQLite tables:**

```sql
users(id, username, password_hash, role, status, must_change_password, session_version, created_at, updated_at)
sessions(id, user_id, expires_at, created_at, revoked_at)
settings(key, value_json, secret_ciphertext, secret_nonce, updated_at, updated_by)
reports(id, report_type, title, period_from, period_to, payload_json, payload_hash, author_id, created_at, supersedes_report_id)
report_events(id, report_id, event_type, message, author_id, created_at, payload_json)
audit_events(id, actor_user_id, event_type, target_type, target_id, created_at, payload_json)
```

**DB triggers:**

- reject `UPDATE` and `DELETE` on `reports`;
- reject `UPDATE` and `DELETE` on `report_events`.

**Secret rules:**

- `RAPORT_MASTER_KEY_FILE` required for Team runtime.
- Master key is outside `/data`.
- HKDF labels:
  - `raport/session/v1`
  - `raport/team-ai-credentials/v1`

**Tests:**

- migrations are idempotent;
- report update/delete fails;
- event update/delete fails;
- missing master key fails closed;
- derived keys differ by label;
- AES-GCM roundtrip works.

**Commands:**

```bash
npm run test -- backend/team/db backend/team/security
npm run team:test
npm run typecheck
```

**Commit:**

```bash
git add backend/team/db backend/team/security
git commit -m "feat(team): add SQLite and secret foundation"
```

## 10. Stage 6 — First-run setup, auth, sessions and origin protection

**Depends on:** Stage 5.

**Goal:** Implement first ADMIN setup and local auth.

**Files:**

- Create: `backend/team/security/passwords.mjs`
- Create: `backend/team/security/sessions.mjs`
- Create: `backend/team/security/origin.mjs`
- Create: `backend/team/routes/setup.mjs`
- Create: `backend/team/routes/auth.mjs`
- Create: `backend/team/validation/authSchemas.mjs`
- Modify: `backend/team/app.mjs`
- Create: `src/team/auth/AuthProvider.tsx`
- Create: `src/team/auth/useAuth.ts`
- Create: `src/team/pages/SetupPage.tsx`
- Create: `src/team/pages/LoginPage.tsx`
- Modify: `src/App.tsx`

**Routes:**

```text
GET  /api/setup/status
POST /api/setup/initialize
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/change-password
GET  /api/me
```

**Cookie:**

```text
__Host-raport-session
HttpOnly
SameSite=Strict
Path=/
No Domain
Secure in production
```

**Rules:**

- first ADMIN once only;
- setup token from env preferred;
- optional ephemeral setup token logged once if env absent;
- identical invalid login errors;
- `session_version` invalidates old sessions;
- state-changing routes enforce exact Origin or strict Referer fallback.

**Tests:**

- empty DB requires setup;
- first ADMIN works once;
- invalid setup token rejected;
- login/logout works;
- change password works;
- cookie attributes verified;
- Origin mismatch rejected.

**Commands:**

```bash
npm run test -- backend/team/routes/setup.test.ts backend/team/routes/auth.test.ts
npm run typecheck
npm run build:team
npm run build:local
```

**Commit:**

```bash
git add backend/team src/team src/App.tsx
git commit -m "feat(team): add setup and local authentication"
```

## 11. Stage 7 — Admin user management

**Depends on:** Stage 6.

**Goal:** Let ADMIN manage local users.

**Files:**

- Create: `backend/team/db/repositories/users.mjs`
- Create: `backend/team/routes/adminUsers.mjs`
- Create: `backend/team/validation/userSchemas.mjs`
- Create: `src/team/pages/UsersPage.tsx`
- Create: `src/team/components/UserRoleBadge.tsx`
- Modify: `src/team/api/teamApiClient.ts`
- Test: `backend/team/routes/adminUsers.test.ts`

**Routes:**

```text
GET   /api/admin/users
POST  /api/admin/users
PATCH /api/admin/users/:id
POST  /api/admin/users/:id/reset-password
```

**Rules:**

- ADMIN only;
- roles: `READER`, `EDITOR`, `ADMIN`;
- temporary password returned once;
- last active ADMIN cannot be blocked or downgraded;
- role/status/password reset increments `session_version`.

**Tests:**

- READER/EDITOR get 403;
- ADMIN creates user;
- duplicate username rejected;
- last active ADMIN protection works;
- reset password returns temporary password once.

**Commands:**

```bash
npm run test -- backend/team/routes/adminUsers.test.ts
npm run typecheck
npm run build:team
npm run build:local
```

**Commit:**

```bash
git add backend/team/db/repositories/users.mjs backend/team/routes/adminUsers.mjs backend/team/validation/userSchemas.mjs src/team/pages/UsersPage.tsx src/team/api/teamApiClient.ts
git commit -m "feat(team): add admin user management"
```

## 12. Stage 8 — Reports and events API

**Depends on:** Stage 3 and Stage 6.

**Goal:** Persist immutable report packages and append-only events.

**Files:**

- Create: `backend/team/db/repositories/reports.mjs`
- Create: `backend/team/db/repositories/events.mjs`
- Create: `backend/team/routes/reports.mjs`
- Create: `backend/team/validation/reportSchemas.mjs`
- Create: `backend/team/shared/reportPackageValidation.mjs`
- Modify: `backend/team/app.mjs`
- Modify: `src/team/api/teamApiClient.ts`
- Test: `backend/team/routes/reports.test.ts`

**Routes:**

```text
GET  /api/reports
POST /api/reports
GET  /api/reports/:id
POST /api/reports/:id/events
```

**Permissions:**

- READER: list/get reports;
- EDITOR: list/get/create reports/create events;
- ADMIN: EDITOR permissions plus admin routes.

**Rules:**

- strict envelope validation;
- unknown report type rejected;
- unknown fields rejected;
- `CLIENT_CALCULATED` required;
- duplicate canonical hash returns 409;
- no update/delete API;
- DB triggers also block mutation.

**Event types:**

```ts
type ReportEventType = "DECISION_RECORDED" | "REPORT_SUPERSEDED" | "NOTE_RECORDED";
```

**Tests:**

- create/list/get report;
- duplicate returns 409;
- READER cannot create;
- EDITOR can create;
- append event works;
- event mutation blocked by DB trigger.

**Commands:**

```bash
npm run test -- backend/team/routes/reports.test.ts
npm run team:test
npm run typecheck
npm run build:team
npm run build:local
```

**Commit:**

```bash
git add backend/team/db/repositories/reports.mjs backend/team/db/repositories/events.mjs backend/team/routes/reports.mjs backend/team/validation/reportSchemas.mjs backend/team/shared src/team/api/teamApiClient.ts
git commit -m "feat(team): add immutable reports and events API"
```

## 13. Stage 9 — Team publication, history, read-only view and decisions UI

**Depends on:** Stage 8.

**Goal:** Add Team user flow around existing dashboards.

**Files:**

- Create: `src/team/pages/ReportsPage.tsx`
- Create: `src/team/pages/ReportViewPage.tsx`
- Create: `src/team/components/PublishReportButton.tsx`
- Create: `src/team/components/ReportEventTimeline.tsx`
- Create: `src/team/components/DecisionForm.tsx`
- Create: `src/team/components/ClientCalculatedBadge.tsx`
- Modify: `src/features/print/components/PrintDashboardPage.tsx`
- Modify: `src/features/ssz/components/SszDashboardPage.tsx`
- Modify: `src/features/tessa/components/TessaDashboardPage.tsx`
- Modify: `src/features/support/components/SupportDashboardPage.tsx`
- Modify: `src/team/api/teamApiClient.ts`

**Behavior:**

- Local build shows no publish/history Team UI.
- Team build shows publish button to EDITOR/ADMIN after successful calculation.
- Publish uses adapters from Stage 3.
- Duplicate publish shows link to existing report.
- History filters by type and period.
- Saved report view is read-only.
- Decision form appends `DECISION_RECORDED`.
- `CLIENT_CALCULATED` badge is visible.
- Team API unavailable state is explicit, not Local fallback.

**Tests:**

- Local build has no publish button;
- Team route exists in Team build;
- EDITOR can publish;
- READER can open saved report;
- READER cannot publish;
- decision event appears after save.

**Commands:**

```bash
npm run test -- src/team
npm run typecheck
npm run build:local
npm run build:team
```

**Commit:**

```bash
git add src/team src/features/print src/features/ssz src/features/tessa src/features/support
git commit -m "feat(team): add publication history and decisions UI"
```

## 14. Stage 10 — Team AI settings and secure Print gateway

**Depends on:** Stage 6 and Stage 8.

**Goal:** Keep Local Print AI unchanged and add centralized Team Print AI gateway.

**Files:**

- Create: `backend/team/routes/aiSettings.mjs`
- Create: `backend/team/routes/aiPrint.mjs`
- Create: `backend/team/validation/aiSchemas.mjs`
- Create: `backend/team/security/ssrfGuard.mjs`
- Create: `src/team/pages/AiSettingsPage.tsx`
- Create: `src/team/api/teamPrintAiClient.ts`
- Modify: `src/features/print/logic/personalPrint/frontendClient.ts`
- Test: `backend/team/routes/aiSettings.test.ts`
- Test: `backend/team/routes/aiPrint.test.ts`

**Routes:**

```text
GET  /api/admin/ai-settings
PUT  /api/admin/ai-settings
POST /api/admin/ai-settings/test
GET  /api/ai/status
POST /api/ai/print/classify-filenames
```

**Rules:**

- ADMIN configures Team AI.
- API key is encrypted and write-only.
- Browser never receives Team AI key.
- URL origin must match `RAPORT_AI_ALLOWED_ORIGINS`.
- Credentials in URL rejected.
- Redirects not followed.
- Timeouts and response size limits enforced.
- Only filenames and minimal print metadata are sent.
- No generic LLM proxy.
- Local `printAiSettings.ts` remains browser-local in Local edition.

**Tests:**

- Local direct transport still works in Local build;
- Team transport calls backend;
- key is never returned;
- non-allowlisted origin rejected;
- redirect rejected;
- invalid model output rejected safely;
- AI disabled fallback works.

**Commands:**

```bash
npm run test -- backend/team/routes/aiSettings.test.ts backend/team/routes/aiPrint.test.ts src/features/print/logic/personalPrint
npm run typecheck
npm run build:local
npm run build:team
```

**Commit:**

```bash
git add backend/team/routes/aiSettings.mjs backend/team/routes/aiPrint.mjs backend/team/validation/aiSchemas.mjs backend/team/security/ssrfGuard.mjs src/team/pages/AiSettingsPage.tsx src/team/api/teamPrintAiClient.ts src/features/print/logic/personalPrint/frontendClient.ts
git commit -m "feat(team): add centralized Print AI gateway"
```

## 15. Stage 11 — Packaging, deployment, backup and restore

**Depends on:** Stage 10.

**Goal:** Produce independent Local and Team artifacts.

**Files:**

- Create: `scripts/package-local.mjs`
- Create: `Dockerfile.team`
- Create: `.dockerignore`
- Create: `deploy/team/README.md`
- Create: `deploy/team/docker-compose.example.yml`
- Create: `deploy/team/generate-master-key.ps1`
- Create: `deploy/team/backup.ps1`
- Create: `deploy/team/restore.md`
- Modify: `package.json`
- Modify: `README.md`

**Scripts:**

```json
"package:local": "node scripts/package-local.mjs",
"docker:team": "docker build -f Dockerfile.team -t raport-team:0.1 ."
```

**Docker requirements:**

- multi-stage build;
- Team frontend built in builder stage;
- one Node process;
- non-root runtime user;
- `/data` writable volume;
- `/run/secrets` read-only master key mount;
- `/healthz` healthcheck;
- no mandatory outbound dependency except allowlisted Team AI endpoint.

**Backup requirements:**

- SQLite backup via controlled script/API, not copying open DB file as only official method;
- DB backup and master key backup are separate;
- restore requires both.

**Tests:**

- `package:local` creates static artifact;
- Team image builds;
- empty Team install starts with generated master key;
- missing master key fails closed;
- restart preserves DB.

**Commands:**

```bash
npm run build:local
npm run build:team
npm run package:local
npm run docker:team
npm run check
```

**Commit:**

```bash
git add scripts Dockerfile.team .dockerignore deploy/team README.md package.json package-lock.json
git commit -m "feat(team): add packaging backup and deployment"
```

## 16. Stage 12 — Final hardening and release candidate

**Depends on:** Stages 1-11.

**Goal:** Verify Team 0.1 without expanding scope.

**Files:**

- Create: `docs/releases/TEAM_V01_RC_CHECKLIST.md`
- Modify: `README.md`
- Modify: `AGENTS.md` only for durable future-agent rules discovered during implementation
- Modify: `docs/tech-stack-rules.md` only for durable build/deployment rules

**Local checks:**

```bash
npm run build:local
npm run preview -- --port=4173
```

Verify:

- `#/`, `#/print`, `#/ssz`, `#/tessa`, `#/support` open;
- no Team navigation;
- no Team API calls;
- Local Print AI settings remain browser-local;
- dashboard routes without pending data redirect to landing.

**Team checks:**

```bash
npm run build:team
npm run team:start
```

Verify:

- empty DB opens setup wizard;
- first ADMIN created once;
- login/logout/change password work;
- ADMIN creates EDITOR and READER;
- EDITOR publishes report;
- READER opens saved report without source file;
- EDITOR records decision;
- report/event mutation blocked;
- Team AI disabled does not break Print;
- Team AI key is hidden.

**Full gate:**

```bash
npm run check
npm run team:test
npm run build:local
npm run build:team
npm run package:local
npm run docker:team
```

**Commit:**

```bash
git add docs/releases README.md AGENTS.md docs/tech-stack-rules.md
git commit -m "docs(team): add release verification checklist"
```

## 17. Dependencies

```text
raport-local-v1.0.0
  -> Stage 1 editions
      -> Stage 2 report contracts
          -> Stage 3 dashboard adapters
              -> Stage 8 reports API
                  -> Stage 9 Team UI
  -> Stage 4 backend shell
      -> Stage 5 SQLite and secrets
          -> Stage 6 setup/auth
              -> Stage 7 users
              -> Stage 8 reports API
              -> Stage 10 Team AI
                  -> Stage 11 packaging
                      -> Stage 12 RC
```

Stages 2 and 4 may run independently after Stage 1. Stage 8 requires both Stage 3 and Stage 6.

## 18. Local preservation checklist for every stage

- Current dashboard formulas unchanged.
- `npm run build:local` passes.
- Local works without Team backend.
- Local does not call `/api/reports`, `/api/auth`, `/api/setup`, `/api/admin/*`.
- Local still uses hash routing and relative assets.
- Local Print AI settings remain in browser storage.
- No Team screens in Local UI.

## 19. Risks and mitigations

### Team code leaking into Local

Mitigation:

- build-time edition capabilities;
- Team routes lazy-imported only in Team edition;
- Local bundle grep for `/api/reports` and Team labels after `build:local`.

### Backend treated as KPI authority

Mitigation:

- `CLIENT_CALCULATED` required and displayed;
- backend stores package and hash only;
- backend does not import dashboard calculation modules.

### Unsafe generic report package

Mitigation:

- no catch-all schema;
- strict Zod objects;
- per-dashboard literal registry;
- tests for unknown fields and secret-like fields.

### Raw data persistence

Mitigation:

- no file upload API;
- adapter tests for forbidden fields;
- schema length/count limits;
- source files not stored.

### Team AI becoming proxy

Mitigation:

- only Print filename classification endpoint;
- exact origin allowlist;
- no redirects;
- no arbitrary URL from browser;
- no generic `/api/llm`.

## 20. Self-review

Spec coverage:

- Two artifacts: Stages 1 and 11.
- Local unchanged: every stage checklist and Stage 12.
- Fastify + SQLite without ORM: Stages 4 and 5.
- First ADMIN/auth/users: Stages 6 and 7.
- Strict schemas and `CLIENT_CALCULATED`: Stages 2 and 3.
- Immutable reports/events: Stages 5 and 8.
- Publication/history/decisions: Stage 9.
- Team AI settings and Print gateway: Stage 10.
- Secrets, backup, Docker: Stages 5 and 11.

Placeholder scan:

- No `TBD`.
- No catch-all schema.
- No unspecified dashboard additions.
- No forbidden infrastructure additions.

Type consistency:

- Report types: `ssz | tessa | print | support`.
- Roles: `READER | EDITOR | ADMIN`.
- Trust marker: `CLIENT_CALCULATED`.
