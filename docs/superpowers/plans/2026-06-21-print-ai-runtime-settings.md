# Print AI Runtime Settings UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Let users configure optional Print AI backend from the landing settings modal at runtime, without rebuilding the static frontend.

**Architecture:** Extend the existing `printAiSettings` browser-local store from a boolean flag to a small runtime settings object. Keep the static frontend functional without backend: if AI is disabled or backend is unreachable, Print falls back to dictionary mode and hides AI artifacts. The landing modal becomes a business-friendly “История и возможности” center with an expandable “Подключить ИИ” flow and a `/health` connection check.

**Tech Stack:** React, TypeScript, Tailwind, existing shadcn primitives, lucide-react, localStorage, native fetch. No new npm dependencies.

---

## File Map

- Modify `src/shared/lib/printAiSettings.ts`: add runtime settings shape, URL/key persistence, endpoint derivation, health check helper, backward-compatible enabled API.
- Modify `src/shared/lib/printAiSettings.test.ts`: cover default settings, persistence, derived endpoints, and health status mapping.
- Modify `src/features/print/logic/personalPrint/frontendClient.ts`: allow UI runtime settings to override env URL/API key while keeping env defaults.
- Modify `src/features/print/logic/personalPrint/frontendClient.test.ts`: cover runtime override behavior.
- Modify `src/pages/landing/components/HistoryManager.tsx`: rename entry to “История и возможности”, redesign AI section with collapsed connection panel, fields, check button, and status strip.
- Run focused tests and full check.

## Task 1: Runtime settings model

- [x] Update `src/shared/lib/printAiSettings.test.ts` with tests for:
  - default disabled settings with `http://127.0.0.1:8787` base URL and empty API key;
  - `setPrintAiSettings` persists enabled/url/apiKey;
  - derived classifier/lookup/classify-missing endpoints are based on backend base URL;
  - `/health` check returns `available`, `disabled`, `unauthorized`, or `unavailable`.

- [x] Update `src/shared/lib/printAiSettings.ts`:
  - export `PrintAiSettings`, `PrintAiHealthStatus`, `DEFAULT_PRINT_AI_BACKEND_URL`;
  - add `getPrintAiSettings()`, `setPrintAiSettings(next)`, `usePrintAiSettings()`;
  - keep `isPrintAiEnabled()`, `setPrintAiEnabled()`, `usePrintAiEnabled()` as compatibility wrappers;
  - add `buildPrintAiFrontendConfig(env?)` that returns `PrintLlmFrontendConfig` using localStorage settings first and env defaults for batch/maxCandidates;
  - add `checkPrintAiConnection(settings, fetchImpl = fetch)` hitting `${backendUrl}/health` with optional `X-Raport-Backend-Key`.

- [x] Run `npm run test -- src/shared/lib/printAiSettings.test.ts`.

## Task 2: Frontend client runtime override

- [x] Update `src/features/print/logic/personalPrint/frontendClient.test.ts` with a test that `classifyPrintJobsWithProxy` receives URLs/API key from `buildPrintAiFrontendConfig` runtime settings.

- [x] Update `src/features/print/logic/personalPrint/frontendClient.ts` only if endpoint derivation needs to support backend root URLs. Keep existing fetch/classification behavior unchanged.

- [x] Update `src/features/print/components/PrintDashboardPage.tsx` to use `buildPrintAiFrontendConfig()` instead of `readPrintLlmFrontendConfig()` for actual dashboard classification config.

- [x] Run focused Print tests:

```bash
npm run test -- src/shared/lib/printAiSettings.test.ts src/features/print/logic/personalPrint/frontendClient.test.ts src/features/print/logic/dashboard.test.ts
```

## Task 3: Landing modal UX

- [x] Update `src/pages/landing/components/HistoryManager.tsx`:
  - change launcher text to `История и возможности`;
  - header title to `История и возможности Рапорта`;
  - add AI card first with status: disabled / configured / checking / available / disabled-on-server / unauthorized / unavailable;
  - show technical fields only when user clicks `Подключить ИИ` or `Изменить подключение`;
  - fields: backend URL, optional API key;
  - buttons: `Проверить подключение`, `Сохранить и включить`, `Выключить`;
  - keep Trends and Local History sections below;
  - do not show env variable names in UI.

- [x] Keep visual language aligned with existing modal: `rounded-control`, `border-raport-border`, `bg-raport-surface-soft`, `Badge`, `Button`, lucide icons only.

- [x] Run `npm run typecheck` to catch React/TS errors.

## Task 4: Documentation and verification

- [x] Update `backend/print-llm/README.md` or root `README.md` with one short note: users can configure backend URL/API key from `История и возможности` without rebuilding the frontend.

- [x] Run full verification:

```bash
npm run check
```

- [x] Smoke behavior to verify manually after implementation:
  - AI disabled by default: Print shows no AI artifacts.
  - Settings modal can save `http://127.0.0.1:8787`.
  - `Проверить подключение` reports backend health.
  - Print uses saved backend URL/API key when AI is enabled.

## Task 5: Commit and push

- [x] Review diff:

```bash
git diff --stat
git diff --name-status
```

- [x] Commit:

```bash
git add .
git commit -m "feat: configure print ai backend from UI"
git push
```
