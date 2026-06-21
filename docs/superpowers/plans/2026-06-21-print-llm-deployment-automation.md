# Print LLM Backend Deployment Automation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the optional Print LLM backend easier to deploy, run, stop, and diagnose on a local Windows PC or a small LAN server.

**Architecture:** Keep the frontend static and independent. Add PowerShell deployment scripts under `deploy/print-llm/` that load `backend/print-llm/.env`, start the existing Node backend, query `/health`, and optionally register a Windows Task Scheduler entry. Document local and LAN workflows.

**Tech Stack:** PowerShell, Windows Task Scheduler, Node.js backend already present in `backend/print-llm`, no new npm dependencies.

---

### Task 1: Deployment Scripts

**Files:**
- Create: `deploy/print-llm/common.ps1`
- Create: `deploy/print-llm/init-env.ps1`
- Create: `deploy/print-llm/run.ps1`
- Create: `deploy/print-llm/start.ps1`
- Create: `deploy/print-llm/stop.ps1`
- Create: `deploy/print-llm/status.ps1`
- Create: `deploy/print-llm/install-scheduled-task.ps1`
- Create: `deploy/print-llm/uninstall-scheduled-task.ps1`

Steps:
- Add shared helpers for repo paths, `.env` parsing, health URL calculation, API-key headers, PID/log paths.
- Add environment initialization for local and LAN modes.
- Add foreground run, background start, stop, status, install and uninstall scripts.

### Task 2: Documentation

**Files:**
- Create: `backend/print-llm/DEPLOYMENT.md`
- Modify: `backend/print-llm/README.md`
- Modify: `README.md`

Steps:
- Document local PC and LAN server workflows.
- Explain frontend independence from backend.
- Explain how to configure the frontend Settings screen after backend deployment.

### Task 3: npm Aliases and Ignore Rules

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

Steps:
- Add npm aliases for `status`, `start`, `stop`, `init:local`, and `init:lan`.
- Ignore runtime PID/log files under `backend/print-llm/.runtime/`.

### Task 4: Verification

Commands:
- `powershell -NoProfile -ExecutionPolicy Bypass -File deploy/print-llm/status.ps1`
- `powershell -NoProfile -ExecutionPolicy Bypass -File deploy/print-llm/init-env.ps1 -Mode Local -Force`
- `npm run backend:print-llm:status`
- `npm run test -- backend/print-llm`
- `npm run check`

Acceptance:
- Scripts parse and run without syntax errors.
- Status reports unavailable backend gracefully when service is not running.
- Full project check passes.
