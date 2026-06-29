# Support Work Time Format Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support the new Support XLSX format with explicit SLA work time, full time, priority and source SLA status while preserving legacy Support uploads.

**Architecture:** Keep parsing in `src/features/support/import/readReportFile.ts`, domain types in `supportTypes.ts`, metrics in `logic/supportMetrics.ts`, and UI rendering in existing Support components. The new format is additive: legacy files continue to calculate from dates, while work-time files prefer source SLA status and parsed durations.

**Tech Stack:** React, TypeScript, Vitest, xlsx.

---

### Task 1: Import and Domain Tests

**Files:**
- Create: `src/features/support/import/readReportFile.test.ts`
- Modify: `src/features/support/import/readReportFile.ts`
- Modify: `src/features/support/supportTypes.ts`
- Modify: `src/features/support/supportConfig.ts`

- [ ] Add tests that generate a small XLSX with `SLA_work_time`, `Приоритет`, `Выполнение SLA`, `Full_time`.
- [ ] Verify tests fail before implementation.
- [ ] Parse new optional columns, `(null)` values, priority SLA hours and `HH:MM:SS` durations.
- [ ] Preserve legacy behavior when optional columns are absent.

### Task 2: Metrics Tests and Calculations

**Files:**
- Create/modify tests for `src/features/support/logic/supportMetrics.ts`
- Modify: `src/features/support/logic/supportMetrics.ts`

- [ ] Add tests for total resolution time, clean work time, waiting time and open tickets.
- [ ] Verify tests fail before implementation.
- [ ] Add quantile helpers for total/work/waiting time and update KPI calculations.

### Task 3: Support UI

**Files:**
- Modify: `src/features/support/components/SupportDashboardPage.tsx`
- Modify: `src/features/support/components/SupportFiltersPanel.tsx`
- Modify: `src/features/support/components/SupportOverdueTailTable.tsx`
- Modify other Support components only if required by types.

- [ ] Add priority/status filter support.
- [ ] Show both total and clean work time in manager/analyst view.
- [ ] Separate open tickets from data-quality errors.
- [ ] Keep visual contract and existing dashboard layout.

### Task 4: Verification

**Files:** project-wide.

- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Review `git diff --stat` and summarize risks.
