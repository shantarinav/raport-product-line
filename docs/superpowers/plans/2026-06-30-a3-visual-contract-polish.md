# A3 Visual Contract Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Local A3 controls, badges, and AI-assist affordances back in line with the Raport visual contract.

**Architecture:** Keep Local A3 behavior and storage unchanged. Limit changes to presentation in existing A3 components and shared UI usage.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui Button/Badge, lucide-react, Vitest.

---

### Task 1: A3 Editor AI Actions

**Files:**
- Modify: `src/features/local-a3/components/LocalA3ProtocolEditor.tsx`
- Test: `src/features/local-a3/components/LocalA3ProtocolEditor.test.ts`

- [ ] Write a failing test that AI field actions render as text action `С ИИ`, not icon-only hidden text.
- [ ] Run `npm test -- src/features/local-a3/components/LocalA3ProtocolEditor.test.ts` and verify the test fails on current markup.
- [ ] Replace per-field AI button styling with a compact secondary text action: icon + `С ИИ`, ghost tone, no header-action visual weight.
- [ ] Keep existing titles/aria-labels and disabled behavior.
- [ ] Run the targeted test and verify pass.

### Task 2: A3 Editor Badges And Hints

**Files:**
- Modify: `src/features/local-a3/components/LocalA3ProtocolEditor.tsx`
- Test: `src/features/local-a3/components/LocalA3ProtocolEditor.test.ts`

- [ ] Write/adjust tests so `Основание разбора` uses shared badge semantics and does not render old local rounded-pill classes for dashboard/period/source.
- [ ] Replace manual context pills with `Badge variant="secondary"`.
- [ ] Soften field quality recommendations: keep warning semantics, but reduce visual weight and keep them clearly advisory, not validation errors.
- [ ] Keep actual validation errors red and unchanged.
- [ ] Run targeted test and verify pass.

### Task 3: A3 Journal Controls Audit Fixes

**Files:**
- Modify only if needed: `src/features/local-a3/components/LocalA3JournalPage.tsx`, `src/features/local-a3/components/A3DashboardDraftPanel.tsx`, `src/features/local-a3/components/A3ReviewButton.tsx`
- Test existing tests if affected.

- [ ] Review current buttons against `HeaderIconButton`, `IconActionButton`, `Button`, `Badge`, `SegmentedControl` patterns.
- [ ] Fix only obvious visual-contract violations without changing behavior.
- [ ] Do not rewrite journal UX or data flow.
- [ ] Run relevant tests.

### Task 4: Verification And Review

**Files:**
- No new code unless review finds a concrete issue.

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run check`.
- [ ] Review `git diff` for accidental business logic, storage, or backend changes.
- [ ] Report changed files, checks, and remaining risks.
