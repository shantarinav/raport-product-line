# Dashboard Maintainability Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the size and complexity of SSZ, Print, and Tessa page components by extracting local UI components and pure helpers without changing dashboard calculations, filters, defaults, widget order, or visual behavior.

**Architecture:** Keep business logic in existing `logic/` modules. Move reusable or local page UI into feature-local `components/` files. Page files remain orchestration layers: read pending data, hold state, compute memoized data, compose sections.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing shared UI/shadcn components, lucide-react. No new dependencies.

---

## File Structure

SSZ:
- Create `src/features/ssz/components/SszControls.tsx` for `AutocompleteField`, `TargetControl`, small row controls.
- Create `src/features/ssz/components/SszCards.tsx` for KPI cards, leaderboard card, technology board card.
- Create `src/features/ssz/components/SszFilters.tsx` for sidebar filters and active filter chip helpers if needed.
- Modify `src/features/ssz/components/SszDashboardPage.tsx` to import extracted components and keep page composition.

Print:
- Create `src/features/print/components/PrintControls.tsx` for autocomplete, quick focus, sort toolbar, bar list.
- Create `src/features/print/components/PrintCards.tsx` for risk job list and presentation-only insight helpers if needed.
- Modify `src/features/print/components/PrintDashboardPage.tsx` to import extracted components.

Tessa:
- Create `src/features/tessa/components/TessaControls.tsx` for autocomplete and deadline focus control.
- Create `src/features/tessa/components/TessaFilters.tsx` for filter sidebar.
- Create `src/features/tessa/components/TessaCards.tsx` for small presentational blocks if extraction is safe.
- Modify `src/features/tessa/components/TessaDashboardPage.tsx` to import extracted components.

Shared:
- Do not modify `src/shared/ui` unless type compatibility requires a minimal prop addition. Prefer feature-local files.

---

### Task 1: SSZ Controls Extraction

**Files:**
- Create: `src/features/ssz/components/SszControls.tsx`
- Modify: `src/features/ssz/components/SszDashboardPage.tsx`

- [ ] Move `RowNameButton`, `RankBadge`, `AutocompleteField`, and `TargetControl` into `SszControls.tsx`.
- [ ] Export their prop types only if needed by `SszDashboardPage.tsx`.
- [ ] Keep Tailwind classes and event behavior identical.
- [ ] Keep autocomplete timer cleanup behavior.
- [ ] Replace local definitions in `SszDashboardPage.tsx` with imports.
- [ ] Run `npm run typecheck`.

Expected: TypeScript passes and SSZ behavior is unchanged.

### Task 2: SSZ Cards Extraction

**Files:**
- Create: `src/features/ssz/components/SszCards.tsx`
- Modify: `src/features/ssz/components/SszDashboardPage.tsx`

- [ ] Move `ProgressStrip`, `SszKpiCards`, `MasterLeaderboardCard`, and `TechnologyBoardCard` into `SszCards.tsx`.
- [ ] Move only helper functions that are exclusively used by those extracted components.
- [ ] Keep business calculations in `logic/dashboard.ts` untouched.
- [ ] Keep widget order and props unchanged.
- [ ] Run `npm run typecheck`.

Expected: TypeScript passes and SSZ page shrinks substantially.

### Task 3: Print Controls Extraction

**Files:**
- Create: `src/features/print/components/PrintControls.tsx`
- Modify: `src/features/print/components/PrintDashboardPage.tsx`

- [ ] Move `AutocompleteField`, `QuickFocusPanel`, `SortToolbar`, and `BarList` into `PrintControls.tsx`.
- [ ] Preserve timer cleanup in autocomplete.
- [ ] Keep quick focus options and labels behavior identical; export constants only if still needed by page.
- [ ] Keep visual classes unchanged.
- [ ] Run `npm run typecheck`.

Expected: TypeScript passes and Print filters/lists behave the same.

### Task 4: Print Cards Extraction

**Files:**
- Create: `src/features/print/components/PrintCards.tsx`
- Modify: `src/features/print/components/PrintDashboardPage.tsx`

- [ ] Move `RiskJobList` and related presentation helpers that only format risk labels/badges.
- [ ] Do not move or change KPI formulas, `calculatePrintKpis`, `calculatePrintAnalytics`, or filter logic.
- [ ] Preserve green-not-for-deviations badge rule.
- [ ] Run `npm run typecheck`.

Expected: TypeScript passes and risk job widget stays visually identical.

### Task 5: Tessa Controls And Filters Extraction

**Files:**
- Create: `src/features/tessa/components/TessaControls.tsx`
- Create: `src/features/tessa/components/TessaFilters.tsx`
- Modify: `src/features/tessa/components/TessaDashboardPage.tsx`

- [ ] Move `AutocompleteField` and `DeadlineFocusControl` into `TessaControls.tsx`.
- [ ] Move `TessaFilterSidebar` into `TessaFilters.tsx`.
- [ ] Preserve searchable autocomplete behavior.
- [ ] Preserve filter defaults and reset behavior.
- [ ] Run `npm run typecheck`.

Expected: TypeScript passes and Tessa filters behave the same.

### Task 6: Final Verification

**Files:**
- No new files beyond task outputs.

- [ ] Run `npm run check`.
- [ ] Inspect `git diff --stat` and confirm no business logic files were changed except imports/types required by extraction.
- [ ] Confirm no temporary files are created.
- [ ] Report changed files, checks, and residual risk.

Expected: Full project check passes.
