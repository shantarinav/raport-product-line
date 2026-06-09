# IndexedDB Dashboard History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local, backend-free trend snapshot persistence for dashboard KPI aggregates using native IndexedDB.

**Architecture:** UI components do not talk to IndexedDB directly. `src/shared/lib/historyDB.ts` owns storage; `src/shared/lib/snapshotBuilder.ts` converts parsed dashboard imports into sanitized numeric snapshots; `src/pages/landing/index.tsx` triggers non-blocking persistence after a report is parsed and before route handoff.

**Tech Stack:** React, TypeScript, native `window.indexedDB`, existing KPI functions, no new npm dependencies.

---

### Task 1: Create IndexedDB Storage Adapter

**Files:**
- Create: `src/shared/lib/historyDB.ts`

- [ ] **Step 1: Define snapshot types**

Create `DashboardType = "ssz" | "tessa" | "print" | "support"` and `DashboardSnapshot` with `id`, `dashboardType`, `period`, `meta.savedAt`, and numeric `metrics` only. Do not store file names.

- [ ] **Step 2: Implement `initDB()`**

Open `raport_history` version `1`, create `snapshots` store with `keyPath: "id"`, and create `dashboardType` index.

- [ ] **Step 3: Implement promise wrappers**

Implement `putSnapshot(snapshot)` with `store.put(snapshot)` for upsert and `getSnapshots(dashboardType)` via index filtering.

### Task 2: Create Snapshot Builder

**Files:**
- Create: `src/shared/lib/snapshotBuilder.ts`

- [ ] **Step 1: Define input type**

Accept report labels from landing: `"ССЗ" | "Tessa" | "Print" | "Техподдержка"` and parsed import DTOs from existing features.

- [ ] **Step 2: Add date helpers**

Normalize periods to `YYYY-MM-DD`; return `null` if a period cannot be determined.

- [ ] **Step 3: Build sanitized metrics**

Use existing KPI functions:
- SSZ: `kpiData`, `operationScope`
- Tessa: `getDocumentDatePeriod`, `buildAgreementFacts`, `calculateAgreementKpis`
- Print: `calculatePrintKpis`, `DEFAULT_TARIFFS`
- Support: `calculateSupportKpis`, `resolutionQuantiles`, `overdueQuantiles`

Store only numeric aggregates; do not store names, filenames, document titles, ticket numbers, users, masters, departments, or operation names.

### Task 3: Integrate Landing Pipeline

**Files:**
- Modify: `src/pages/landing/index.tsx`

- [ ] **Step 1: Import persistence helpers**

Import `putSnapshot` and `buildSnapshotData`.

- [ ] **Step 2: Add non-blocking persistence helper**

Create `persistSnapshot(nextMatch, parsedData)` with `try/catch`. Call it with `void`, so navigation is never blocked.

- [ ] **Step 3: Call after `setPendingDashboardData`**

For each matched report, set pending data, call `completeMatch`, and let `completeMatch` trigger snapshot persistence before scheduling redirect.

### Task 4: Verify

**Files:**
- No code changes expected beyond Tasks 1-3.

- [ ] **Step 1: Run typecheck and build**

Run `npm run check`.

- [ ] **Step 2: Inspect storage safety**

Search `historyDB.ts` and `snapshotBuilder.ts` for forbidden fields such as `fileName`, `documentName`, `user`, `responsible`, `master`, `topic`, `ticketNumber` in stored snapshot data. Type imports may mention source DTOs, but `metrics` and `meta` must remain numeric/safe.
