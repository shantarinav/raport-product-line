# Print LLM Backend Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Обособить локальный Print LLM backend как optional extension, чтобы frontend Рапорта удобно публиковался и использовался без backend, а backend сопровождался отдельно.

**Architecture:** Frontend остается статическим приложением в `src/` и использует ИИ только при включенной настройке и доступном API. Backend переносится из `server/print-llm` в `backend/print-llm`, получает отдельные env/docs/cache boundaries. Root scripts остаются frontend-first, backend scripts получают явный префикс `backend:*`.

**Tech Stack:** React/Vite/TypeScript frontend, Node.js HTTP backend, native Node SQLite cache, Ollama local API, Vitest.

---

### Task 1: Move backend files into explicit backend boundary

**Files:**
- Move: `server/print-llm/*` -> `backend/print-llm/*`
- Move: `scripts/print-llm/evaluate.mjs` -> `backend/print-llm/scripts/evaluate.mjs`

- [ ] Move `server/print-llm` to `backend/print-llm` with `git mv`.
- [ ] Create `backend/print-llm/scripts`.
- [ ] Move `scripts/print-llm/evaluate.mjs` to `backend/print-llm/scripts/evaluate.mjs` with `git mv`.
- [ ] Confirm no source references remain to `server/print-llm` or `scripts/print-llm`.

### Task 2: Make backend cache/env self-contained

**Files:**
- Modify: `backend/print-llm/config.mjs`
- Create: `backend/print-llm/.env.example`
- Modify: `.env.example`

- [ ] Update `backend/print-llm/config.mjs` so default `PRINT_LLM_CACHE_DB_PATH` resolves to `backend/print-llm/.cache/print-llm-cache.sqlite` using module directory, not process cwd.
- [ ] Create `backend/print-llm/.env.example` with only backend variables: `PRINT_LLM_*`, `OLLAMA_*`.
- [ ] Keep root `.env.example` frontend-only with `VITE_PRINT_LLM_*` variables and short comment that backend env lives in `backend/print-llm/.env.example`.
- [ ] Ensure `.cache/` remains untracked and not staged.

### Task 3: Rename root scripts to make frontend/backend separation obvious

**Files:**
- Modify: `package.json`

- [ ] Replace `print-llm:server` with `backend:print-llm` pointing to `node backend/print-llm/server.mjs`.
- [ ] Replace `print-llm:evaluate` with `backend:print-llm:evaluate` pointing to `node backend/print-llm/scripts/evaluate.mjs`.
- [ ] Leave `dev`, `build`, `check`, `test`, `typecheck`, `preview` frontend-first.

### Task 4: Update documentation for publication and local backend use

**Files:**
- Modify: `README.md`
- Create: `backend/print-llm/README.md`

- [ ] In root README, state that `dist/` publication does not require backend.
- [ ] In root README, replace old Print LLM commands with `npm run backend:print-llm` and `npm run backend:print-llm:evaluate`.
- [ ] Create backend README with purpose, requirements, env, run command, API endpoints, cache location, and troubleshooting for `ИИ: недоступен`.

### Task 5: Verify and review

**Files:**
- All moved/modified files.

- [ ] Run `rg "server/print-llm|scripts/print-llm|print-llm:server|print-llm:evaluate" package.json README.md backend src .env.example` and verify no stale references.
- [ ] Run `npm run check`.
- [ ] Run `npm run backend:print-llm` only if needed for smoke verification, then stop it.
- [ ] Run `git status -sb` and verify `.cache/` and `demo-data/print/` remain untracked and unstaged.
