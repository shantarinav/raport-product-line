# Print LLM Network Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Prepare optional Print LLM backend for local or LAN/server deployment with safe defaults, API-key option, CORS allowlist, health checks, SQLite concurrency settings, and Ollama queueing.

**Architecture:** Keep frontend static and backend optional. Harden `backend/print-llm` as a small Node HTTP service. Add small focused modules for config, HTTP utilities, and queueing instead of growing `server.mjs`.

**Tech Stack:** Node.js native HTTP, node:sqlite, Vitest, TypeScript test runner, no new npm dependencies.

---

## File Map

- Modify `backend/print-llm/config.mjs`: add network/security/concurrency settings.
- Add `backend/print-llm/config.test.ts`: cover env parsing.
- Add `backend/print-llm/httpUtils.mjs`: CORS, API-key, JSON body limit, response helpers.
- Add `backend/print-llm/httpUtils.test.ts`: cover HTTP helper behavior.
- Add `backend/print-llm/taskQueue.mjs`: small promise queue with concurrency cap.
- Add `backend/print-llm/taskQueue.test.ts`: cover concurrency and error propagation.
- Modify `backend/print-llm/sqliteCache.mjs`: enable WAL and busy timeout on open.
- Modify `backend/print-llm/sqliteCache.test.ts`: verify cache still works and PRAGMA is applied.
- Modify `backend/print-llm/classifier.mjs`: route Ollama calls through optional queue dependency.
- Modify `backend/print-llm/classifier.test.ts`: verify classifier respects queue dependency.
- Modify `backend/print-llm/server.mjs`: use config/httpUtils/taskQueue, add `/health`, bind configurable host, set timeouts.
- Add `backend/print-llm/server.test.ts`: test request handling without opening a real port.
- Modify `src/features/print/logic/personalPrint/frontendClient.ts`: include optional API-key header.
- Modify `src/features/print/logic/personalPrint/frontendClient.test.ts`: verify key header behavior.
- Modify `backend/print-llm/.env.example`: add new env vars.
- Modify `backend/print-llm/README.md`: document local and LAN/server mode.
- Modify root `README.md`: short pointer to network backend mode.

## Task 1: Config parsing

- [x] Add config test cases in `backend/print-llm/config.test.ts`:
  - defaults: host `127.0.0.1`, port `8787`, concurrency `1`, request body limit `1000000`, API-key empty.
  - parses allowed origins into array.
  - clamps invalid concurrency to `1`.
  - parses SQLite busy timeout.

Run:

```bash
npm run test -- backend/print-llm/config.test.ts
```

Expected before implementation: fail because test file/module fields do not exist.

- [x] Update `backend/print-llm/config.mjs` with:
  - `host`
  - `allowedOrigins`
  - `apiKey`
  - `requestBodyLimitBytes`
  - `httpRequestTimeoutMs`
  - `httpHeadersTimeoutMs`
  - `httpKeepAliveTimeoutMs`
  - `concurrency`
  - `sqliteBusyTimeoutMs`

- [x] Re-run config tests; expected pass.

## Task 2: HTTP utilities

- [x] Add `backend/print-llm/httpUtils.test.ts` covering:
  - CORS returns request origin only when origin is allowed.
  - local/no-origin requests are allowed.
  - API-key is skipped when config key is empty.
  - API-key is required when config key is set.
  - body reader rejects payload over configured limit.

- [x] Add `backend/print-llm/httpUtils.mjs` with exported functions:
  - `buildCorsHeaders(request, config)`
  - `isOriginAllowed(origin, config)`
  - `isAuthorized(request, config)`
  - `sendJson(response, statusCode, payload, request, config)`
  - `readJsonBody(request, limitBytes)`

- [x] Run HTTP utility tests; expected pass.

## Task 3: Task queue

- [x] Add `backend/print-llm/taskQueue.test.ts`:
  - verifies no more than `concurrency` tasks run at once.
  - verifies rejected task propagates error.
  - verifies queue stats expose active/pending.

- [x] Add `backend/print-llm/taskQueue.mjs`:
  - `createTaskQueue(concurrency)` returns `{ run, stats }`.
  - `run(task)` returns promise of task result.

- [x] Run queue tests; expected pass.

## Task 4: SQLite production settings

- [x] Update `backend/print-llm/sqliteCache.test.ts`:
  - construct cache with `{ busyTimeoutMs: 1234 }`.
  - after open, assert `PRAGMA journal_mode` is `wal` where supported.
  - assert `PRAGMA busy_timeout` returns configured value.

- [x] Update `backend/print-llm/sqliteCache.mjs` constructor to accept options:
  - `new PrintLlmSqliteCache(filePath, { busyTimeoutMs })`.
  - run `PRAGMA journal_mode=WAL` and `PRAGMA busy_timeout=<value>` before table creation.

- [x] Re-run SQLite tests; expected pass.

## Task 5: Classifier queue integration

- [x] Update `backend/print-llm/classifier.test.ts`:
  - inject a queue dependency with `run(fn)` wrapper.
  - assert LLM calls go through queue when classifying missing items.

- [x] Update `backend/print-llm/classifier.mjs`:
  - accept `dependencies.queue`.
  - wrap only `dependencies.callOllama(...)` in `queue.run(() => ...)`.
  - keep lookup/cache behavior unchanged.

- [x] Re-run classifier tests; expected pass.

## Task 6: Server hardening and health endpoint

- [x] Refactor `backend/print-llm/server.mjs` to export `createPrintLlmServer(config, dependencies)` for tests and still auto-start when run directly.

- [x] Add `backend/print-llm/server.test.ts`:
  - `GET /health` returns `200` and safe JSON.
  - blocked origin returns `403` or no CORS allow header according to helper behavior.
  - missing API-key returns `401` when configured.
  - `OPTIONS` preflight includes configured headers.
  - POST endpoints still call classifier functions.

- [x] In server implementation:
  - use `PRINT_LLM_HOST` in `listen`.
  - add `GET /health`.
  - reject unauthorized requests before parsing body.
  - set server request/header/keep-alive timeouts.
  - instantiate shared queue and shared SQLite cache config through classifier dependencies where appropriate.

- [x] Run server tests; expected pass.

## Task 7: Frontend API-key support

- [x] Update `src/features/print/logic/personalPrint/frontendClient.test.ts`:
  - `readPrintLlmFrontendConfig` reads `VITE_PRINT_LLM_API_KEY`.
  - requests include `X-Raport-Backend-Key` only when apiKey is non-empty.
  - no key header when apiKey is absent.

- [x] Update `src/features/print/logic/personalPrint/frontendClient.ts`:
  - add optional `apiKey` to config.
  - centralize headers construction.

- [x] Run frontend client tests; expected pass.

## Task 8: Documentation

- [x] Update `backend/print-llm/.env.example` with all new env vars and safe defaults.
- [x] Update `backend/print-llm/README.md`:
  - local mode.
  - LAN/server mode.
  - API-key setup.
  - CORS setup.
  - SQLite local disk/WAL warning.
  - health check examples.
  - troubleshooting.
- [x] Update root `README.md` with a short pointer to LAN mode.

## Task 9: Full verification

- [x] Run focused tests:

```bash
npm run test -- backend/print-llm src/features/print/logic/personalPrint/frontendClient.test.ts
```

- [x] Run full check:

```bash
npm run check
```

- [x] Smoke-start local backend:

```bash
cmd.exe /c "set PRINT_LLM_PORT=8788&& set PRINT_LLM_CLASSIFIER_ENABLED=false&& npm run backend:print-llm"
```

Expected: backend logs `Print LLM classifier proxy listening on http://127.0.0.1:8788`.

- [x] Smoke-start network host binding without external exposure in docs only; do not keep server running.

## Task 10: Final review and commit

- [x] Review diff:

```bash
git diff --stat
git diff --name-status
```

- [x] Verify no real logs/cache files are tracked.
- [ ] Commit is intentionally not performed yet. Recommended commit command:

```bash
git add .
git commit -m "feat: harden print llm backend for network use"
```
