# SSZ History UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show local SSZ trend context from IndexedDB through KPI deltas and a lightweight SVG trend chart.

**Architecture:** IndexedDB access remains isolated in `src/shared/lib/historyDB.ts`. SSZ-specific history selection lives in `src/features/ssz/logic/useSSZHistory.ts`. Rendering lives in `src/features/ssz/components/SSZTrendChart.tsx` and `SszDashboardPage.tsx`; no formulas for current SSZ calculations are changed.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn-style shared components, lucide-react, native SVG, no new dependencies.

---

### Task 1: SSZ History Hook

**Files:**
- Create: `src/features/ssz/logic/useSSZHistory.ts`

- [ ] Implement `useSSZHistory(currentPeriodStart?: string)`.
- [ ] Read `getSnapshots("ssz")` on mount / period change.
- [ ] Sort by `period.from`, find previous snapshot with `period.from < currentPeriodStart`.
- [ ] Return `{ history, previousSnapshot, isLoading }`.

### Task 2: Trend Chart Component

**Files:**
- Create: `src/features/ssz/components/SSZTrendChart.tsx`

- [ ] Accept `data: DashboardSnapshot[]`.
- [ ] Return `null` when fewer than two points have numeric `workTechnologyPercent`.
- [ ] Render `ChartCard` with native SVG polyline and point `<title>` tooltips.
- [ ] Use only Tailwind classes and CSS variables from the visual contract.

### Task 3: Integrate SSZ Dashboard

**Files:**
- Modify: `src/features/ssz/components/SszDashboardPage.tsx`

- [ ] Import `useSSZHistory` and `SSZTrendChart`.
- [ ] Pass `report.period.start` to the hook.
- [ ] Compute KPI deltas from current `kpis` vs `previousSnapshot.metrics`.
- [ ] Render delta badges near KPI values without changing existing KPI formulas.
- [ ] Place `SSZTrendChart` after KPI cards and before the main analysis sections.

### Task 4: Verify

**Files:**
- No extra code files.

- [ ] Run `npm run check`.
- [ ] Confirm no new npm packages and no direct IndexedDB access in UI components except through the hook/service boundary.
