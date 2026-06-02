# SSZ Quality Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-only dashboard that imports one or more SSZ quality XLS reports, calculates the share of work done without technology, compares loaded periods, and lets the user drill down to SSZ operations.

**Architecture:** Create a Vite + React + TypeScript single-page app. Keep XLS parsing, data normalization, analytics, and UI in separate feature folders so each part is testable without the browser. Store uploaded report data in memory for the current tab only.

**Tech Stack:** React, TypeScript, Vite, SheetJS `xlsx`, Vitest, Testing Library, Recharts, lucide-react.

---

## File Structure

- `package.json`: scripts and dependencies for the frontend app.
- `index.html`: Vite HTML entry.
- `src/main.tsx`: React bootstrap.
- `src/App.tsx`: top-level dashboard composition and in-memory report state.
- `src/styles.css`: global BI-style layout and component styling.
- `src/test/setup.ts`: DOM test setup.
- `src/features/import/types.ts`: shared domain types for reports, SSZ records, operation rows, import warnings, and duplicate-period decisions.
- `src/features/import/parseRows.ts`: pure parser from worksheet rows to normalized report data.
- `src/features/import/readWorkbook.ts`: browser XLS reader using SheetJS, delegating normalized parsing to `parseRows`.
- `src/features/import/ImportPanel.tsx`: file input, import summary, duplicate-period choice, and import warnings.
- `src/features/analytics/metrics.ts`: pure aggregation, ratio, ranking, filtering, and period comparison helpers.
- `src/features/dashboard/DashboardPage.tsx`: page-level layout for filters, KPI cards, widgets, and detail table.
- `src/features/dashboard/filters.ts`: pure filter state and filtering logic.
- `src/features/dashboard/KpiCards.tsx`: KPI summary cards.
- `src/features/dashboard/RankingWidgets.tsx`: department, master, operation, and status visual summaries.
- `src/features/dashboard/SszDetailTable.tsx`: SSZ table and selected SSZ operation detail.

## Task 1: App Scaffold And Test Harness

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.test.tsx`
- Create: `src/test/setup.ts`
- Create: `src/styles.css`

- [ ] **Step 1: Create package and scripts**

Create `package.json`:

```json
{
  "name": "ssz-quality-dashboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview --host 127.0.0.1"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "lucide-react": "^0.468.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "recharts": "^2.15.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create TypeScript and Vite config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
```

- [ ] **Step 3: Create the initial app shell**

Create `index.html`:

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Качество ССЗ</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/App.tsx`:

```tsx
import { Upload } from "lucide-react";

export function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Сменно-суточные задания</p>
          <h1>Качество выполнения ССЗ</h1>
        </div>
        <button className="icon-button" type="button" aria-label="Загрузить XLS">
          <Upload size={18} />
          <span>Загрузить XLS</span>
        </button>
      </header>

      <section className="empty-state">
        <h2>Загрузите XLS-отчёт</h2>
        <p>Дашборд рассчитает долю работ без технологии и покажет проблемные подразделения, мастеров, ССЗ и операции.</p>
      </section>
    </main>
  );
}
```

Create `src/styles.css`:

```css
:root {
  font-family: Inter, "Segoe UI", system-ui, sans-serif;
  color: #182230;
  background: #f4f7fb;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button,
input,
select {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 24px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #667085;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #b8c4d6;
  background: #ffffff;
  color: #182230;
  border-radius: 8px;
  padding: 10px 14px;
  cursor: pointer;
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 420px;
  text-align: center;
  border: 1px dashed #b8c4d6;
  border-radius: 8px;
  background: #ffffff;
  padding: 32px;
}

.empty-state p {
  max-width: 620px;
  color: #667085;
}
```

- [ ] **Step 4: Add the smoke test**

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("shows the empty import state", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Качество выполнения ССЗ" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Загрузите XLS-отчёт" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Загрузить XLS" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Install and verify**

Run:

```powershell
npm install
npm test
npm run build
```

Expected:

```text
1 test file passed
build completed without TypeScript errors
```

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json index.html tsconfig.json tsconfig.node.json vite.config.ts src
git commit -m "chore: scaffold SSZ dashboard app"
```

## Task 2: Domain Types And Pure XLS Row Parser

**Files:**
- Create: `src/features/import/types.ts`
- Create: `src/features/import/parseRows.ts`
- Create: `src/features/import/parseRows.test.ts`

- [ ] **Step 1: Write parser tests from representative worksheet rows**

Create `src/features/import/parseRows.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseSszRows } from "./parseRows";

describe("parseSszRows", () => {
  it("parses period, hierarchy, SSZ rows, operation rows, and statuses", () => {
    const rows = [
      [],
      ["Параметры:", "", "Начало периода: 01.04.2026"],
      ["", "", "Конец периода: 01.05.2026"],
      [],
      ["Подразделение", "", "", "", "", "", "", "", "Время выполнения по технологии", "Время выполнения без технологии"],
      ["Мастер смены"],
      ["Сменно-суточное задание", "", "", "", "Статус"],
      ["Продукция", "", "", "", "Комплект", "Полуфабрикат", "Операция", "Исполнитель"],
      ["131 Цех по изготовлению арматурных блоков"],
      ["Беспятых Александр Сергеевич"],
      ["Сменно-суточное задание 00000002617 от 01.04.2026 18:05:09", "", "", "", "Завершен", "", "", "", "", "19"],
      ["206713102", "", "", "", "1", "К0764.05.00.000 Змеевик", "Зачистка", "Большаков Евгений Викторович", "", "11"],
      ["205511211", "", "", "", "2", "К0748.11.01.000 Узел", "Сборка", "Чистяков Алексей Борисович", "8", ""],
    ];

    const report = parseSszRows(rows, "sample.xls");

    expect(report.period.start).toBe("2026-04-01");
    expect(report.period.end).toBe("2026-05-01");
    expect(report.sszRecords).toHaveLength(1);
    expect(report.operationRows).toHaveLength(2);
    expect(report.statuses).toEqual(["Завершен"]);
    expect(report.sszRecords[0]).toMatchObject({
      number: "00000002617",
      department: "131 Цех по изготовлению арматурных блоков",
      master: "Беспятых Александр Сергеевич",
      status: "Завершен",
      technologyTime: 8,
      noTechnologyTime: 11,
    });
  });

  it("keeps rows with empty executor when operation and time are present", () => {
    const rows = [
      ["", "", "Начало периода: 01.04.2026"],
      ["", "", "Конец периода: 01.05.2026"],
      ["150 Цех тяжелой химической аппаратуры № 15"],
      ["Сменно-суточное задание 00000003364 от 28.04.2026 12:31:50", "", "", "", "В подготовке"],
      ["2006021", "", "", "", "1", "К0704.01.02.000 Затвор", "Очистка абразивоструйная", "", "3,9", ""],
    ];

    const report = parseSszRows(rows, "empty-executor.xls");

    expect(report.operationRows).toHaveLength(1);
    expect(report.operationRows[0].executor).toBe("");
    expect(report.operationRows[0].technologyTime).toBe(3.9);
    expect(report.warnings).toEqual([]);
  });

  it("returns an import error when no SSZ rows are found", () => {
    const report = parseSszRows([["Произвольный файл"], ["без ожидаемой структуры"]], "bad.xls");

    expect(report.sszRecords).toHaveLength(0);
    expect(report.errors).toContain("Не найдены строки сменно-суточных заданий.");
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
npm test -- src/features/import/parseRows.test.ts
```

Expected:

```text
FAIL parseRows.test.ts
Cannot find module './parseRows'
```

- [ ] **Step 3: Add domain types**

Create `src/features/import/types.ts`:

```ts
export type CellValue = string | number | boolean | Date | null | undefined;

export interface ReportPeriod {
  start: string | null;
  end: string | null;
  label: string;
}

export interface ImportWarning {
  rowNumber: number;
  message: string;
}

export interface OperationRecord {
  id: string;
  sourceName: string;
  rowNumber: number;
  sszNumber: string;
  sszDate: string | null;
  department: string;
  master: string;
  status: string;
  product: string;
  kit: string;
  semiProduct: string;
  operation: string;
  executor: string;
  technologyTime: number;
  noTechnologyTime: number;
}

export interface SszRecord {
  id: string;
  sourceName: string;
  number: string;
  date: string | null;
  department: string;
  master: string;
  status: string;
  technologyTime: number;
  noTechnologyTime: number;
  operations: OperationRecord[];
}

export interface ImportedReport {
  sourceId: string;
  sourceName: string;
  importedAt: string;
  period: ReportPeriod;
  statuses: string[];
  sszRecords: SszRecord[];
  operationRows: OperationRecord[];
  warnings: ImportWarning[];
  errors: string[];
}
```

- [ ] **Step 4: Implement the parser**

Create `src/features/import/parseRows.ts`:

```ts
import type { CellValue, ImportedReport, OperationRecord, ReportPeriod, SszRecord } from "./types";

const SSZ_PATTERN = /^Сменно-суточное задание\s+(\d+)\s+от\s+(.+)$/i;

function text(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function parseNumber(value: CellValue): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = text(value).replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateOnly(value: string): string | null {
  const match = value.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function toDateTime(value: string): string | null {
  const match = value.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return toDateOnly(value);
  const hour = match[4].padStart(2, "0");
  const second = match[6] ?? "00";
  return `${match[3]}-${match[2]}-${match[1]}T${hour}:${match[5]}:${second}`;
}

function findPeriod(rows: CellValue[][]): ReportPeriod {
  let start: string | null = null;
  let end: string | null = null;

  for (const row of rows.slice(0, 12)) {
    const cells = row.map(text);
    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      if (cell.includes("Начало периода")) {
        start = toDateOnly(cell) ?? toDateOnly(cells[index + 1] ?? "");
      }
      if (cell.includes("Конец периода")) {
        end = toDateOnly(cell) ?? toDateOnly(cells[index + 1] ?? "");
      }
    }
  }

  const label = start && end ? `${start} - ${end}` : "Не определён";
  return { start, end, label };
}

function makeSourceId(sourceName: string, period: ReportPeriod): string {
  return `${sourceName}::${period.label}::${Date.now()}`;
}

function isContextRow(row: CellValue[]): boolean {
  const first = text(row[0]);
  if (!first) return false;
  const status = text(row[4]);
  const semiProduct = text(row[5]);
  const operation = text(row[6]);
  const executor = text(row[7]);
  return !status && !semiProduct && !operation && !executor;
}

function isDepartment(value: string): boolean {
  return /^\d+\s+/.test(value);
}

function finalizeSsz(record: SszRecord): SszRecord {
  if (record.operations.length === 0) return record;
  return {
    ...record,
    technologyTime: record.operations.reduce((sum, operation) => sum + operation.technologyTime, 0),
    noTechnologyTime: record.operations.reduce((sum, operation) => sum + operation.noTechnologyTime, 0),
  };
}

export function parseSszRows(rows: CellValue[][], sourceName: string): ImportedReport {
  const period = findPeriod(rows);
  const sourceId = makeSourceId(sourceName, period);
  const warnings: ImportedReport["warnings"] = [];
  const errors: string[] = [];
  const sszRecords: SszRecord[] = [];
  const operationRows: OperationRecord[] = [];
  let currentDepartment = "";
  let currentMaster = "";
  let currentSsz: SszRecord | null = null;

  const pushCurrentSsz = () => {
    if (!currentSsz) return;
    sszRecords.push(finalizeSsz(currentSsz));
    currentSsz = null;
  };

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const first = text(row[0]);
    if (!first) return;

    const sszMatch = first.match(SSZ_PATTERN);
    if (sszMatch) {
      pushCurrentSsz();
      currentSsz = {
        id: `${sourceId}:ssz:${sszMatch[1]}`,
        sourceName,
        number: sszMatch[1],
        date: toDateTime(sszMatch[2]),
        department: currentDepartment,
        master: currentMaster,
        status: text(row[4]),
        technologyTime: parseNumber(row[8]),
        noTechnologyTime: parseNumber(row[9]),
        operations: [],
      };
      return;
    }

    if (isContextRow(row)) {
      if (isDepartment(first)) {
        currentDepartment = first;
        currentMaster = "";
      } else {
        currentMaster = first;
      }
      return;
    }

    const operation = text(row[6]);
    const semiProduct = text(row[5]);
    const technologyTime = parseNumber(row[8]);
    const noTechnologyTime = parseNumber(row[9]);
    const hasOperationData = Boolean(first && semiProduct && operation);
    const hasTime = technologyTime !== 0 || noTechnologyTime !== 0;

    if (!hasOperationData || !hasTime) return;

    if (!currentSsz) {
      warnings.push({ rowNumber, message: "Строка операции пропущена: не найден контекст ССЗ." });
      return;
    }

    const operationRecord: OperationRecord = {
      id: `${sourceId}:row:${rowNumber}`,
      sourceName,
      rowNumber,
      sszNumber: currentSsz.number,
      sszDate: currentSsz.date,
      department: currentSsz.department,
      master: currentSsz.master,
      status: currentSsz.status,
      product: first,
      kit: text(row[4]),
      semiProduct,
      operation,
      executor: text(row[7]),
      technologyTime,
      noTechnologyTime,
    };
    currentSsz.operations.push(operationRecord);
    operationRows.push(operationRecord);
  });

  pushCurrentSsz();

  if (sszRecords.length === 0) {
    errors.push("Не найдены строки сменно-суточных заданий.");
  }

  const statuses = Array.from(new Set(sszRecords.map((record) => record.status).filter(Boolean))).sort();

  return {
    sourceId,
    sourceName,
    importedAt: new Date().toISOString(),
    period,
    statuses,
    sszRecords,
    operationRows,
    warnings,
    errors,
  };
}
```

- [ ] **Step 5: Run parser tests**

Run:

```powershell
npm test -- src/features/import/parseRows.test.ts
```

Expected:

```text
3 tests passed
```

- [ ] **Step 6: Commit**

```powershell
git add src/features/import/types.ts src/features/import/parseRows.ts src/features/import/parseRows.test.ts
git commit -m "feat: parse SSZ worksheet rows"
```

## Task 3: Browser XLS Reader

**Files:**
- Create: `src/features/import/readWorkbook.ts`
- Create: `src/features/import/readWorkbook.test.ts`

- [ ] **Step 1: Write workbook reader test**

Create `src/features/import/readWorkbook.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readWorkbookFile } from "./readWorkbook";

describe("readWorkbookFile", () => {
  it("reads the first worksheet and returns a parsed report", async () => {
    const workbook = XLSX.utils.book_new();
    const rows = [
      ["", "", "Начало периода: 01.04.2026"],
      ["", "", "Конец периода: 01.05.2026"],
      ["131 Цех по изготовлению арматурных блоков"],
      ["Сменно-суточное задание 00000002617 от 01.04.2026 18:05:09", "", "", "", "Завершен"],
      ["206713102", "", "", "", "1", "К0764.05.00.000 Змеевик", "Зачистка", "Исполнитель", "", "11"],
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "TDSheet");
    const array = XLSX.write(workbook, { type: "array", bookType: "xls" });
    const file = new File([array], "quality.xls", { type: "application/vnd.ms-excel" });

    const report = await readWorkbookFile(file);

    expect(report.sourceName).toBe("quality.xls");
    expect(report.period.label).toBe("2026-04-01 - 2026-05-01");
    expect(report.sszRecords).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```powershell
npm test -- src/features/import/readWorkbook.test.ts
```

Expected:

```text
FAIL readWorkbook.test.ts
Cannot find module './readWorkbook'
```

- [ ] **Step 3: Implement reader**

Create `src/features/import/readWorkbook.ts`:

```ts
import * as XLSX from "xlsx";
import { parseSszRows } from "./parseRows";
import type { CellValue, ImportedReport } from "./types";

export async function readWorkbookFile(file: File): Promise<ImportedReport> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return parseSszRows([], file.name);
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<CellValue[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  return parseSszRows(rows, file.name);
}
```

- [ ] **Step 4: Run tests**

Run:

```powershell
npm test -- src/features/import/readWorkbook.test.ts src/features/import/parseRows.test.ts
```

Expected:

```text
4 tests passed
```

- [ ] **Step 5: Commit**

```powershell
git add src/features/import/readWorkbook.ts src/features/import/readWorkbook.test.ts
git commit -m "feat: read XLS reports in browser"
```

## Task 4: Analytics Metrics, Rankings, Filters, And Comparisons

**Files:**
- Create: `src/features/analytics/metrics.ts`
- Create: `src/features/analytics/metrics.test.ts`
- Create: `src/features/dashboard/filters.ts`
- Create: `src/features/dashboard/filters.test.ts`

- [ ] **Step 1: Write analytics tests**

Create `src/features/analytics/metrics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { SszRecord } from "../import/types";
import { compareSummaries, groupSszRecords, ratioNoTechnology, summarizeSszRecords } from "./metrics";

const records: SszRecord[] = [
  {
    id: "a",
    sourceName: "a.xls",
    number: "1",
    date: "2026-04-01T08:00:00",
    department: "131 Цех",
    master: "Мастер A",
    status: "Завершен",
    technologyTime: 80,
    noTechnologyTime: 20,
    operations: [],
  },
  {
    id: "b",
    sourceName: "a.xls",
    number: "2",
    date: "2026-04-02T08:00:00",
    department: "150 Цех",
    master: "Мастер B",
    status: "В подготовке",
    technologyTime: 50,
    noTechnologyTime: 50,
    operations: [],
  },
];

describe("metrics", () => {
  it("calculates no-technology ratio", () => {
    expect(ratioNoTechnology(80, 20)).toBe(0.2);
    expect(ratioNoTechnology(0, 0)).toBeNull();
  });

  it("summarizes SSZ records", () => {
    const summary = summarizeSszRecords(records);

    expect(summary.sszCount).toBe(2);
    expect(summary.problemSszCount).toBe(2);
    expect(summary.technologyTime).toBe(130);
    expect(summary.noTechnologyTime).toBe(70);
    expect(summary.noTechnologyRatio).toBe(0.35);
  });

  it("groups and sorts records by highest ratio", () => {
    const groups = groupSszRecords(records, "department");

    expect(groups[0].key).toBe("150 Цех");
    expect(groups[0].summary.noTechnologyRatio).toBe(0.5);
  });

  it("compares summaries in percentage points", () => {
    const current = summarizeSszRecords(records);
    const previous = summarizeSszRecords([records[0]]);

    expect(compareSummaries(current, previous).noTechnologyRatioDelta).toBe(0.15);
  });
});
```

- [ ] **Step 2: Write filter tests**

Create `src/features/dashboard/filters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { SszRecord } from "../import/types";
import { applyDashboardFilters, createEmptyFilters } from "./filters";

const records: SszRecord[] = [
  {
    id: "1",
    sourceName: "a.xls",
    number: "0001",
    date: "2026-04-01T08:00:00",
    department: "131 Цех",
    master: "Мастер A",
    status: "Завершен",
    technologyTime: 8,
    noTechnologyTime: 2,
    operations: [{ operation: "Сборка", executor: "Иванов" } as never],
  },
  {
    id: "2",
    sourceName: "a.xls",
    number: "0002",
    date: "2026-04-02T08:00:00",
    department: "150 Цех",
    master: "Мастер B",
    status: "В подготовке",
    technologyTime: 5,
    noTechnologyTime: 5,
    operations: [{ operation: "Сварка", executor: "Петров" } as never],
  },
];

describe("filters", () => {
  it("filters by department, master, status, and operation", () => {
    const filters = {
      ...createEmptyFilters(),
      department: "131 Цех",
      master: "Мастер A",
      status: "Завершен",
      operation: "Сборка",
    };

    expect(applyDashboardFilters(records, filters).map((record) => record.number)).toEqual(["0001"]);
  });
});
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```powershell
npm test -- src/features/analytics/metrics.test.ts src/features/dashboard/filters.test.ts
```

Expected:

```text
FAIL metrics.test.ts
FAIL filters.test.ts
```

- [ ] **Step 4: Implement analytics**

Create `src/features/analytics/metrics.ts`:

```ts
import type { SszRecord } from "../import/types";

export type GroupDimension = "department" | "master" | "status";

export interface Summary {
  sszCount: number;
  problemSszCount: number;
  technologyTime: number;
  noTechnologyTime: number;
  noTechnologyRatio: number | null;
}

export interface GroupSummary {
  key: string;
  summary: Summary;
}

export interface SummaryComparison {
  noTechnologyRatioDelta: number | null;
  noTechnologyTimeDelta: number;
  sszCountDelta: number;
}

export function ratioNoTechnology(technologyTime: number, noTechnologyTime: number): number | null {
  const total = technologyTime + noTechnologyTime;
  if (total <= 0) return null;
  return noTechnologyTime / total;
}

export function summarizeSszRecords(records: SszRecord[]): Summary {
  const technologyTime = records.reduce((sum, record) => sum + record.technologyTime, 0);
  const noTechnologyTime = records.reduce((sum, record) => sum + record.noTechnologyTime, 0);
  return {
    sszCount: records.length,
    problemSszCount: records.filter((record) => record.noTechnologyTime > 0).length,
    technologyTime,
    noTechnologyTime,
    noTechnologyRatio: ratioNoTechnology(technologyTime, noTechnologyTime),
  };
}

export function groupSszRecords(records: SszRecord[], dimension: GroupDimension): GroupSummary[] {
  const groups = new Map<string, SszRecord[]>();
  records.forEach((record) => {
    const key = record[dimension] || "Не заполнено";
    groups.set(key, [...(groups.get(key) ?? []), record]);
  });

  return Array.from(groups.entries())
    .map(([key, groupedRecords]) => ({ key, summary: summarizeSszRecords(groupedRecords) }))
    .sort((left, right) => (right.summary.noTechnologyRatio ?? -1) - (left.summary.noTechnologyRatio ?? -1));
}

export function compareSummaries(current: Summary, previous: Summary | null): SummaryComparison {
  return {
    noTechnologyRatioDelta:
      current.noTechnologyRatio === null || previous?.noTechnologyRatio === null || !previous
        ? null
        : current.noTechnologyRatio - previous.noTechnologyRatio,
    noTechnologyTimeDelta: current.noTechnologyTime - (previous?.noTechnologyTime ?? 0),
    sszCountDelta: current.sszCount - (previous?.sszCount ?? 0),
  };
}
```

- [ ] **Step 5: Implement filters**

Create `src/features/dashboard/filters.ts`:

```ts
import type { SszRecord } from "../import/types";

export interface DashboardFilters {
  department: string;
  master: string;
  status: string;
  operation: string;
}

export function createEmptyFilters(): DashboardFilters {
  return {
    department: "",
    master: "",
    status: "",
    operation: "",
  };
}

export function applyDashboardFilters(records: SszRecord[], filters: DashboardFilters): SszRecord[] {
  return records.filter((record) => {
    if (filters.department && record.department !== filters.department) return false;
    if (filters.master && record.master !== filters.master) return false;
    if (filters.status && record.status !== filters.status) return false;
    if (filters.operation && !record.operations.some((operation) => operation.operation === filters.operation)) return false;
    return true;
  });
}
```

- [ ] **Step 6: Run tests**

Run:

```powershell
npm test -- src/features/analytics/metrics.test.ts src/features/dashboard/filters.test.ts
```

Expected:

```text
5 tests passed
```

- [ ] **Step 7: Commit**

```powershell
git add src/features/analytics src/features/dashboard/filters.ts src/features/dashboard/filters.test.ts
git commit -m "feat: calculate SSZ quality metrics"
```

## Task 5: Import Panel And In-Memory Report State

**Files:**
- Create: `src/features/import/ImportPanel.tsx`
- Create: `src/features/import/ImportPanel.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write import panel interaction test**

Create `src/features/import/ImportPanel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ImportPanel } from "./ImportPanel";
import type { ImportedReport } from "./types";

const report: ImportedReport = {
  sourceId: "source-1",
  sourceName: "quality.xls",
  importedAt: "2026-05-22T00:00:00.000Z",
  period: { start: "2026-04-01", end: "2026-05-01", label: "2026-04-01 - 2026-05-01" },
  statuses: ["Завершен"],
  sszRecords: [],
  operationRows: [],
  warnings: [{ rowNumber: 10, message: "Строка операции пропущена: не найден контекст ССЗ." }],
  errors: [],
};

describe("ImportPanel", () => {
  it("shows loaded report summaries", async () => {
    const onFilesSelected = vi.fn();
    render(<ImportPanel reports={[report]} onFilesSelected={onFilesSelected} importError="" />);

    expect(screen.getByText("quality.xls")).toBeInTheDocument();
    expect(screen.getByText("2026-04-01 - 2026-05-01")).toBeInTheDocument();
    expect(screen.getByText("1 предупреждение")).toBeInTheDocument();
  });

  it("passes selected files to the caller", async () => {
    const onFilesSelected = vi.fn();
    const user = userEvent.setup();
    render(<ImportPanel reports={[]} onFilesSelected={onFilesSelected} importError="" />);
    const file = new File(["content"], "quality.xls", { type: "application/vnd.ms-excel" });

    await user.upload(screen.getByLabelText("Загрузить XLS"), file);

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```powershell
npm test -- src/features/import/ImportPanel.test.tsx
```

Expected:

```text
FAIL ImportPanel.test.tsx
Cannot find module './ImportPanel'
```

- [ ] **Step 3: Implement import panel**

Create `src/features/import/ImportPanel.tsx`:

```tsx
import { Upload } from "lucide-react";
import type { ImportedReport } from "./types";

interface ImportPanelProps {
  reports: ImportedReport[];
  importError: string;
  onFilesSelected: (files: File[]) => void;
}

export function ImportPanel({ reports, importError, onFilesSelected }: ImportPanelProps) {
  return (
    <section className="import-panel" aria-label="Импорт XLS">
      <label className="icon-button upload-control">
        <Upload size={18} />
        <span>Загрузить XLS</span>
        <input
          aria-label="Загрузить XLS"
          type="file"
          accept=".xls,.xlsx"
          multiple
          onChange={(event) => onFilesSelected(Array.from(event.currentTarget.files ?? []))}
        />
      </label>

      {importError && <p className="error-text">{importError}</p>}

      <div className="import-list">
        {reports.map((report) => (
          <article className="import-item" key={report.sourceId}>
            <strong>{report.sourceName}</strong>
            <span>{report.period.label}</span>
            <span>{report.sszRecords.length} ССЗ</span>
            <span>{report.operationRows.length} строк операций</span>
            {report.warnings.length > 0 && <span>{report.warnings.length} предупреждение</span>}
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Wire imports into App**

Replace `src/App.tsx` with:

```tsx
import { useMemo, useState } from "react";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { ImportPanel } from "./features/import/ImportPanel";
import { readWorkbookFile } from "./features/import/readWorkbook";
import type { ImportedReport } from "./features/import/types";

function makeUniqueReports(existing: ImportedReport[], incoming: ImportedReport[]): ImportedReport[] {
  const reports = [...existing];
  incoming.forEach((report) => {
    const duplicateIndex = reports.findIndex((item) => item.period.label === report.period.label);
    if (duplicateIndex >= 0) {
      reports[duplicateIndex] = report;
    } else {
      reports.push(report);
    }
  });
  return reports;
}

export function App() {
  const [reports, setReports] = useState<ImportedReport[]>([]);
  const [activeReportId, setActiveReportId] = useState("");
  const [comparisonReportId, setComparisonReportId] = useState("");
  const [importError, setImportError] = useState("");

  const activeReport = useMemo(
    () => reports.find((report) => report.sourceId === activeReportId) ?? reports[0] ?? null,
    [activeReportId, reports],
  );
  const comparisonReport = useMemo(
    () => reports.find((report) => report.sourceId === comparisonReportId) ?? null,
    [comparisonReportId, reports],
  );

  async function handleFilesSelected(files: File[]) {
    setImportError("");
    try {
      const parsed = await Promise.all(files.map(readWorkbookFile));
      const valid = parsed.filter((report) => report.errors.length === 0);
      const invalid = parsed.flatMap((report) => report.errors);
      if (invalid.length > 0) setImportError(invalid.join(" "));
      setReports((current) => {
        const next = makeUniqueReports(current, valid);
        if (!activeReportId && next[0]) setActiveReportId(next[0].sourceId);
        return next;
      });
    } catch {
      setImportError("Не удалось прочитать XLS-файл.");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Сменно-суточные задания</p>
          <h1>Качество выполнения ССЗ</h1>
        </div>
        <ImportPanel reports={reports} importError={importError} onFilesSelected={handleFilesSelected} />
      </header>

      {activeReport ? (
        <DashboardPage
          reports={reports}
          activeReport={activeReport}
          comparisonReport={comparisonReport}
          activeReportId={activeReport.sourceId}
          comparisonReportId={comparisonReportId}
          onActiveReportChange={setActiveReportId}
          onComparisonReportChange={setComparisonReportId}
        />
      ) : (
        <section className="empty-state">
          <h2>Загрузите XLS-отчёт</h2>
          <p>Дашборд рассчитает долю работ без технологии и покажет проблемные подразделения, мастеров, ССЗ и операции.</p>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Add import panel styles**

Append to `src/styles.css`:

```css
.import-panel {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.upload-control {
  position: relative;
  overflow: hidden;
}

.upload-control input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.import-list {
  display: flex;
  gap: 8px;
  max-width: 720px;
  overflow: auto;
}

.import-item {
  display: grid;
  gap: 2px;
  min-width: 190px;
  border: 1px solid #d7deea;
  border-radius: 8px;
  background: #ffffff;
  padding: 8px 10px;
  font-size: 12px;
  color: #667085;
}

.import-item strong {
  color: #182230;
}

.error-text {
  margin: 0;
  color: #b42318;
  font-weight: 700;
}
```

- [ ] **Step 6: Run tests**

Run:

```powershell
npm test -- src/features/import/ImportPanel.test.tsx src/App.test.tsx
```

Expected:

```text
3 tests passed
```

- [ ] **Step 7: Commit**

```powershell
git add src/App.tsx src/styles.css src/features/import/ImportPanel.tsx src/features/import/ImportPanel.test.tsx
git commit -m "feat: add XLS import panel"
```

## Task 6: Dashboard Page, KPI Cards, And Period Controls

**Files:**
- Create: `src/features/dashboard/DashboardPage.tsx`
- Create: `src/features/dashboard/KpiCards.tsx`
- Create: `src/features/dashboard/DashboardPage.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write dashboard page test**

Create `src/features/dashboard/DashboardPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ImportedReport } from "../import/types";
import { DashboardPage } from "./DashboardPage";

const report: ImportedReport = {
  sourceId: "current",
  sourceName: "current.xls",
  importedAt: "2026-05-22T00:00:00.000Z",
  period: { start: "2026-04-01", end: "2026-05-01", label: "2026-04-01 - 2026-05-01" },
  statuses: ["Завершен"],
  sszRecords: [
    {
      id: "1",
      sourceName: "current.xls",
      number: "0001",
      date: "2026-04-01T08:00:00",
      department: "131 Цех",
      master: "Мастер A",
      status: "Завершен",
      technologyTime: 80,
      noTechnologyTime: 20,
      operations: [],
    },
  ],
  operationRows: [],
  warnings: [],
  errors: [],
};

describe("DashboardPage", () => {
  it("renders period controls and KPI cards", () => {
    render(
      <DashboardPage
        reports={[report]}
        activeReport={report}
        comparisonReport={null}
        activeReportId="current"
        comparisonReportId=""
        onActiveReportChange={vi.fn()}
        onComparisonReportChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Основной период")).toBeInTheDocument();
    expect(screen.getByText("Всего ССЗ")).toBeInTheDocument();
    expect(screen.getByText("20,0%")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```powershell
npm test -- src/features/dashboard/DashboardPage.test.tsx
```

Expected:

```text
FAIL DashboardPage.test.tsx
Cannot find module './DashboardPage'
```

- [ ] **Step 3: Implement KPI cards**

Create `src/features/dashboard/KpiCards.tsx`:

```tsx
import type { Summary, SummaryComparison } from "../analytics/metrics";

function formatHours(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return "н/д";
  return new Intl.NumberFormat("ru-RU", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function formatDelta(value: number | null): string {
  if (value === null) return "н/д";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} п.п.`;
}

interface KpiCardsProps {
  summary: Summary;
  comparison: SummaryComparison;
}

export function KpiCards({ summary, comparison }: KpiCardsProps) {
  return (
    <section className="kpi-grid" aria-label="Ключевые показатели">
      <article className="kpi-card">
        <span>Всего ССЗ</span>
        <strong>{summary.sszCount}</strong>
        <small>{comparison.sszCountDelta >= 0 ? "+" : ""}{comparison.sszCountDelta} к сравнению</small>
      </article>
      <article className="kpi-card">
        <span>Доля без технологии</span>
        <strong>{formatPercent(summary.noTechnologyRatio)}</strong>
        <small>{formatDelta(comparison.noTechnologyRatioDelta)}</small>
      </article>
      <article className="kpi-card">
        <span>Время по технологии</span>
        <strong>{formatHours(summary.technologyTime)}</strong>
        <small>нормо-часы</small>
      </article>
      <article className="kpi-card">
        <span>Время без технологии</span>
        <strong>{formatHours(summary.noTechnologyTime)}</strong>
        <small>{comparison.noTechnologyTimeDelta >= 0 ? "+" : ""}{formatHours(comparison.noTechnologyTimeDelta)} к сравнению</small>
      </article>
      <article className="kpi-card">
        <span>Проблемные ССЗ</span>
        <strong>{summary.problemSszCount}</strong>
        <small>с ненулевым временем без технологии</small>
      </article>
    </section>
  );
}
```

- [ ] **Step 4: Implement dashboard page**

Create `src/features/dashboard/DashboardPage.tsx`:

```tsx
import { useMemo, useState } from "react";
import { compareSummaries, summarizeSszRecords } from "../analytics/metrics";
import type { ImportedReport } from "../import/types";
import { createEmptyFilters, applyDashboardFilters } from "./filters";
import { KpiCards } from "./KpiCards";
import { RankingWidgets } from "./RankingWidgets";
import { SszDetailTable } from "./SszDetailTable";

interface DashboardPageProps {
  reports: ImportedReport[];
  activeReport: ImportedReport;
  comparisonReport: ImportedReport | null;
  activeReportId: string;
  comparisonReportId: string;
  onActiveReportChange: (reportId: string) => void;
  onComparisonReportChange: (reportId: string) => void;
}

export function DashboardPage({
  reports,
  activeReport,
  comparisonReport,
  activeReportId,
  comparisonReportId,
  onActiveReportChange,
  onComparisonReportChange,
}: DashboardPageProps) {
  const [filters, setFilters] = useState(createEmptyFilters());
  const filteredRecords = useMemo(
    () => applyDashboardFilters(activeReport.sszRecords, filters),
    [activeReport.sszRecords, filters],
  );
  const filteredComparisonRecords = useMemo(
    () => (comparisonReport ? applyDashboardFilters(comparisonReport.sszRecords, filters) : []),
    [comparisonReport, filters],
  );
  const summary = summarizeSszRecords(filteredRecords);
  const comparison = compareSummaries(summary, comparisonReport ? summarizeSszRecords(filteredComparisonRecords) : null);

  return (
    <section className="dashboard-page">
      <div className="controls-bar">
        <label>
          <span>Основной период</span>
          <select value={activeReportId} onChange={(event) => onActiveReportChange(event.target.value)} aria-label="Основной период">
            {reports.map((report) => (
              <option key={report.sourceId} value={report.sourceId}>
                {report.period.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Период сравнения</span>
          <select value={comparisonReportId} onChange={(event) => onComparisonReportChange(event.target.value)} aria-label="Период сравнения">
            <option value="">Без сравнения</option>
            {reports
              .filter((report) => report.sourceId !== activeReportId)
              .map((report) => (
                <option key={report.sourceId} value={report.sourceId}>
                  {report.period.label}
                </option>
              ))}
          </select>
        </label>
      </div>

      <KpiCards summary={summary} comparison={comparison} />
      <RankingWidgets records={filteredRecords} />
      <SszDetailTable records={filteredRecords} />
    </section>
  );
}
```

- [ ] **Step 5: Add temporary child components for compilation**

Create `src/features/dashboard/RankingWidgets.tsx`:

```tsx
import type { SszRecord } from "../import/types";

export function RankingWidgets({ records }: { records: SszRecord[] }) {
  return <section className="widget-grid" aria-label="Рейтинги">Загружено ССЗ: {records.length}</section>;
}
```

Create `src/features/dashboard/SszDetailTable.tsx`:

```tsx
import type { SszRecord } from "../import/types";

export function SszDetailTable({ records }: { records: SszRecord[] }) {
  return <section className="table-section" aria-label="Детализация ССЗ">Строк в таблице: {records.length}</section>;
}
```

- [ ] **Step 6: Add dashboard styles**

Append to `src/styles.css`:

```css
.dashboard-page {
  display: grid;
  gap: 16px;
}

.controls-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px;
  border: 1px solid #d7deea;
  border-radius: 8px;
  background: #ffffff;
}

.controls-bar label {
  display: grid;
  gap: 4px;
  min-width: 220px;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.controls-bar select {
  min-height: 36px;
  border: 1px solid #b8c4d6;
  border-radius: 6px;
  padding: 6px 8px;
  color: #182230;
  background: #ffffff;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
  gap: 12px;
}

.kpi-card {
  display: grid;
  gap: 6px;
  min-height: 112px;
  border: 1px solid #d7deea;
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
}

.kpi-card span,
.kpi-card small {
  color: #667085;
}

.kpi-card strong {
  font-size: 28px;
}

.widget-grid,
.table-section {
  border: 1px solid #d7deea;
  border-radius: 8px;
  background: #ffffff;
  padding: 16px;
}
```

- [ ] **Step 7: Run tests**

Run:

```powershell
npm test -- src/features/dashboard/DashboardPage.test.tsx
npm run build
```

Expected:

```text
1 test passed
build completed without TypeScript errors
```

- [ ] **Step 8: Commit**

```powershell
git add src/features/dashboard src/styles.css
git commit -m "feat: add dashboard KPI shell"
```

## Task 7: Filters And Ranking Widgets

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Replace: `src/features/dashboard/RankingWidgets.tsx`
- Create: `src/features/dashboard/RankingWidgets.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write ranking widget test**

Create `src/features/dashboard/RankingWidgets.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SszRecord } from "../import/types";
import { RankingWidgets } from "./RankingWidgets";

const records: SszRecord[] = [
  { id: "1", sourceName: "a.xls", number: "1", date: null, department: "131 Цех", master: "Мастер A", status: "Завершен", technologyTime: 90, noTechnologyTime: 10, operations: [{ operation: "Сборка" } as never] },
  { id: "2", sourceName: "a.xls", number: "2", date: null, department: "150 Цех", master: "Мастер B", status: "В подготовке", technologyTime: 50, noTechnologyTime: 50, operations: [{ operation: "Сварка" } as never] },
];

describe("RankingWidgets", () => {
  it("shows top department, status, master, and operation summaries", () => {
    render(<RankingWidgets records={records} />);

    expect(screen.getByText("Подразделения по риску")).toBeInTheDocument();
    expect(screen.getByText("150 Цех")).toBeInTheDocument();
    expect(screen.getByText("В подготовке")).toBeInTheDocument();
    expect(screen.getByText("Сварка")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Replace ranking implementation**

Replace `src/features/dashboard/RankingWidgets.tsx` with:

```tsx
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { groupSszRecords } from "../analytics/metrics";
import type { SszRecord } from "../import/types";

function percent(value: number | null): number {
  return value === null ? 0 : Number((value * 100).toFixed(1));
}

function operationRows(records: SszRecord[]) {
  const map = new Map<string, { key: string; noTechnologyTime: number }>();
  records.flatMap((record) => record.operations).forEach((operation) => {
    const key = operation.operation || "Не заполнено";
    const current = map.get(key) ?? { key, noTechnologyTime: 0 };
    current.noTechnologyTime += operation.noTechnologyTime;
    map.set(key, current);
  });
  return Array.from(map.values()).sort((left, right) => right.noTechnologyTime - left.noTechnologyTime).slice(0, 8);
}

function SimpleList({ title, rows }: { title: string; rows: { key: string; value: string }[] }) {
  return (
    <article className="ranking-card">
      <h2>{title}</h2>
      <ol>
        {rows.map((row) => (
          <li key={row.key}>
            <span>{row.key}</span>
            <strong>{row.value}</strong>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function RankingWidgets({ records }: { records: SszRecord[] }) {
  const departments = groupSszRecords(records, "department").slice(0, 8);
  const masters = groupSszRecords(records, "master").slice(0, 8);
  const statuses = groupSszRecords(records, "status").slice(0, 8);
  const operations = operationRows(records);

  return (
    <section className="widget-grid" aria-label="Рейтинги">
      <article className="ranking-card ranking-chart">
        <h2>Подразделения по риску</h2>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={departments.map((row) => ({ name: row.key, value: percent(row.summary.noTechnologyRatio) }))} layout="vertical" margin={{ left: 20, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit="%" />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#d92d20" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </article>
      <SimpleList title="Мастера" rows={masters.map((row) => ({ key: row.key, value: `${percent(row.summary.noTechnologyRatio)}%` }))} />
      <SimpleList title="Статусы ССЗ" rows={statuses.map((row) => ({ key: row.key, value: `${row.summary.sszCount} ССЗ` }))} />
      <SimpleList title="Операции без технологии" rows={operations.map((row) => ({ key: row.key, value: row.noTechnologyTime.toLocaleString("ru-RU", { maximumFractionDigits: 1 }) }))} />
    </section>
  );
}
```

- [ ] **Step 3: Add filter controls to DashboardPage**

In `src/features/dashboard/DashboardPage.tsx`, add option lists above the return:

```tsx
  const departments = Array.from(new Set(activeReport.sszRecords.map((record) => record.department).filter(Boolean))).sort();
  const masters = Array.from(new Set(activeReport.sszRecords.map((record) => record.master).filter(Boolean))).sort();
  const statuses = Array.from(new Set(activeReport.sszRecords.map((record) => record.status).filter(Boolean))).sort();
  const operations = Array.from(new Set(activeReport.operationRows.map((operation) => operation.operation).filter(Boolean))).sort();
```

Then add these labels inside `.controls-bar` after the period selectors:

```tsx
        <label>
          <span>Подразделение</span>
          <select value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })} aria-label="Подразделение">
            <option value="">Все</option>
            {departments.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Мастер</span>
          <select value={filters.master} onChange={(event) => setFilters({ ...filters, master: event.target.value })} aria-label="Мастер">
            <option value="">Все</option>
            {masters.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Статус</span>
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} aria-label="Статус">
            <option value="">Все</option>
            {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Операция</span>
          <select value={filters.operation} onChange={(event) => setFilters({ ...filters, operation: event.target.value })} aria-label="Операция">
            <option value="">Все</option>
            {operations.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
```

- [ ] **Step 4: Add ranking styles**

Append to `src/styles.css`:

```css
.widget-grid {
  display: grid;
  grid-template-columns: minmax(360px, 1.4fr) repeat(3, minmax(220px, 1fr));
  gap: 12px;
}

.ranking-card {
  min-width: 0;
  border: 1px solid #d7deea;
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
}

.ranking-card h2 {
  margin-bottom: 12px;
  font-size: 16px;
}

.ranking-card ol {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ranking-card li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #edf1f6;
  padding-bottom: 8px;
  font-size: 13px;
}

.ranking-card li span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 5: Run tests and build**

Run:

```powershell
npm test -- src/features/dashboard/RankingWidgets.test.tsx src/features/dashboard/DashboardPage.test.tsx
npm run build
```

Expected:

```text
2 tests passed
build completed without TypeScript errors
```

- [ ] **Step 6: Commit**

```powershell
git add src/features/dashboard src/styles.css
git commit -m "feat: add dashboard filters and rankings"
```

## Task 8: SSZ Detail Table And Operation Drill-Down

**Files:**
- Replace: `src/features/dashboard/SszDetailTable.tsx`
- Create: `src/features/dashboard/SszDetailTable.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write drill-down test**

Create `src/features/dashboard/SszDetailTable.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { SszRecord } from "../import/types";
import { SszDetailTable } from "./SszDetailTable";

const records: SszRecord[] = [
  {
    id: "1",
    sourceName: "a.xls",
    number: "0001",
    date: "2026-04-01T08:00:00",
    department: "131 Цех",
    master: "Мастер A",
    status: "Завершен",
    technologyTime: 80,
    noTechnologyTime: 20,
    operations: [
      {
        id: "op1",
        sourceName: "a.xls",
        rowNumber: 12,
        sszNumber: "0001",
        sszDate: "2026-04-01T08:00:00",
        department: "131 Цех",
        master: "Мастер A",
        status: "Завершен",
        product: "206713102",
        kit: "1",
        semiProduct: "К0764.05.00.000 Змеевик",
        operation: "Зачистка",
        executor: "Большаков Евгений Викторович",
        technologyTime: 0,
        noTechnologyTime: 20,
      },
    ],
  },
];

describe("SszDetailTable", () => {
  it("opens operation details for a selected SSZ", async () => {
    const user = userEvent.setup();
    render(<SszDetailTable records={records} />);

    await user.click(screen.getByRole("button", { name: "Открыть ССЗ 0001" }));

    expect(screen.getByText("Операции ССЗ 0001")).toBeInTheDocument();
    expect(screen.getByText("Зачистка")).toBeInTheDocument();
    expect(screen.getByText("Большаков Евгений Викторович")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Replace table implementation**

Replace `src/features/dashboard/SszDetailTable.tsx` with:

```tsx
import { useMemo, useState } from "react";
import { ratioNoTechnology } from "../analytics/metrics";
import type { SszRecord } from "../import/types";

function formatHours(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}

function formatRatio(technologyTime: number, noTechnologyTime: number): string {
  const ratio = ratioNoTechnology(technologyTime, noTechnologyTime);
  if (ratio === null) return "н/д";
  return ratio.toLocaleString("ru-RU", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function SszDetailTable({ records }: { records: SszRecord[] }) {
  const sortedRecords = useMemo(
    () => [...records].sort((left, right) => right.noTechnologyTime - left.noTechnologyTime),
    [records],
  );
  const [selectedId, setSelectedId] = useState(sortedRecords[0]?.id ?? "");
  const selected = sortedRecords.find((record) => record.id === selectedId) ?? sortedRecords[0] ?? null;

  return (
    <section className="table-section" aria-label="Детализация ССЗ">
      <div className="section-heading">
        <h2>Детализация ССЗ</h2>
        <span>{sortedRecords.length} записей</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ССЗ</th>
              <th>Дата</th>
              <th>Подразделение</th>
              <th>Мастер</th>
              <th>Статус</th>
              <th>По технологии</th>
              <th>Без технологии</th>
              <th>Доля</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record) => (
              <tr key={record.id}>
                <td>
                  <button className="link-button" type="button" onClick={() => setSelectedId(record.id)} aria-label={`Открыть ССЗ ${record.number}`}>
                    {record.number}
                  </button>
                </td>
                <td>{record.date?.slice(0, 10) ?? "н/д"}</td>
                <td>{record.department || "Не заполнено"}</td>
                <td>{record.master || "Не заполнено"}</td>
                <td>{record.status || "Не заполнено"}</td>
                <td>{formatHours(record.technologyTime)}</td>
                <td>{formatHours(record.noTechnologyTime)}</td>
                <td>{formatRatio(record.technologyTime, record.noTechnologyTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <article className="operation-detail">
          <h2>Операции ССЗ {selected.number}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Операция</th>
                  <th>Исполнитель</th>
                  <th>Продукция</th>
                  <th>Полуфабрикат</th>
                  <th>По технологии</th>
                  <th>Без технологии</th>
                </tr>
              </thead>
              <tbody>
                {selected.operations.map((operation) => (
                  <tr key={operation.id}>
                    <td>{operation.operation}</td>
                    <td>{operation.executor || "Не заполнено"}</td>
                    <td>{operation.product}</td>
                    <td>{operation.semiProduct}</td>
                    <td>{formatHours(operation.technologyTime)}</td>
                    <td>{formatHours(operation.noTechnologyTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Add table styles**

Append to `src/styles.css`:

```css
.section-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.section-heading h2 {
  font-size: 18px;
}

.section-heading span {
  color: #667085;
}

.table-wrap {
  overflow: auto;
  border: 1px solid #edf1f6;
  border-radius: 8px;
}

table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  border-bottom: 1px solid #edf1f6;
  padding: 9px 10px;
  text-align: left;
  vertical-align: top;
}

th {
  background: #f8fafc;
  color: #667085;
  font-weight: 800;
}

.link-button {
  border: 0;
  background: none;
  color: #175cd3;
  font-weight: 800;
  cursor: pointer;
  padding: 0;
}

.operation-detail {
  margin-top: 16px;
}

.operation-detail h2 {
  font-size: 16px;
}
```

- [ ] **Step 4: Run tests and build**

Run:

```powershell
npm test -- src/features/dashboard/SszDetailTable.test.tsx
npm run build
```

Expected:

```text
1 test passed
build completed without TypeScript errors
```

- [ ] **Step 5: Commit**

```powershell
git add src/features/dashboard/SszDetailTable.tsx src/features/dashboard/SszDetailTable.test.tsx src/styles.css
git commit -m "feat: add SSZ operation drilldown"
```

## Task 9: Import Edge Cases And Duplicate Period UX

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/features/import/ImportPanel.tsx`
- Modify: `src/features/import/ImportPanel.test.tsx`
- Modify: `src/features/import/parseRows.test.ts`

- [ ] **Step 1: Extend parser tests for missing period**

Append to `src/features/import/parseRows.test.ts`:

```ts
it("allows reports without period and labels them as not defined", () => {
  const rows = [
    ["131 Цех"],
    ["Сменно-суточное задание 00000002617 от 01.04.2026 18:05:09", "", "", "", "Завершен"],
    ["206713102", "", "", "", "1", "К0764.05.00.000 Змеевик", "Зачистка", "Исполнитель", "", "11"],
  ];

  const report = parseSszRows(rows, "no-period.xls");

  expect(report.period.label).toBe("Не определён");
  expect(report.errors).toEqual([]);
});
```

- [ ] **Step 2: Run parser tests**

Run:

```powershell
npm test -- src/features/import/parseRows.test.ts
```

Expected:

```text
4 tests passed
```

- [ ] **Step 3: Add duplicate period choice to ImportPanel props**

Update `src/features/import/ImportPanel.tsx` props:

```tsx
interface DuplicatePeriodChoice {
  periodLabel: string;
  incomingSourceName: string;
}

interface ImportPanelProps {
  reports: ImportedReport[];
  importError: string;
  duplicateChoice: DuplicatePeriodChoice | null;
  onFilesSelected: (files: File[]) => void;
  onResolveDuplicate: (mode: "replace" | "keep") => void;
}
```

Add this block below the error text:

```tsx
      {duplicateChoice && (
        <div className="duplicate-panel" role="dialog" aria-label="Одинаковый период">
          <strong>Период уже загружен: {duplicateChoice.periodLabel}</strong>
          <span>{duplicateChoice.incomingSourceName}</span>
          <button type="button" onClick={() => onResolveDuplicate("replace")}>Заменить период</button>
          <button type="button" onClick={() => onResolveDuplicate("keep")}>Оставить оба</button>
        </div>
      )}
```

- [ ] **Step 4: Update App duplicate handling**

In `src/App.tsx`, add state:

```tsx
  const [pendingDuplicate, setPendingDuplicate] = useState<ImportedReport | null>(null);
```

Replace `makeUniqueReports` with:

```tsx
function appendReport(existing: ImportedReport[], report: ImportedReport): ImportedReport[] {
  return [...existing, report];
}

function replaceReportForPeriod(existing: ImportedReport[], report: ImportedReport): ImportedReport[] {
  const duplicateIndex = existing.findIndex((item) => item.period.label === report.period.label);
  if (duplicateIndex < 0) return appendReport(existing, report);
  return existing.map((item, index) => (index === duplicateIndex ? report : item));
}
```

In `handleFilesSelected`, replace the valid report handling with:

```tsx
      setReports((current) => {
        let next = current;
        valid.forEach((report) => {
          const duplicate = next.some((item) => item.period.label === report.period.label);
          if (duplicate) {
            setPendingDuplicate(report);
          } else {
            next = appendReport(next, report);
          }
        });
        if (!activeReportId && next[0]) setActiveReportId(next[0].sourceId);
        return next;
      });
```

Add resolver before the return:

```tsx
  function handleResolveDuplicate(mode: "replace" | "keep") {
    if (!pendingDuplicate) return;
    setReports((current) => (mode === "replace" ? replaceReportForPeriod(current, pendingDuplicate) : appendReport(current, pendingDuplicate)));
    setPendingDuplicate(null);
  }
```

Pass props into `ImportPanel`:

```tsx
        <ImportPanel
          reports={reports}
          importError={importError}
          duplicateChoice={
            pendingDuplicate
              ? { periodLabel: pendingDuplicate.period.label, incomingSourceName: pendingDuplicate.sourceName }
              : null
          }
          onFilesSelected={handleFilesSelected}
          onResolveDuplicate={handleResolveDuplicate}
        />
```

- [ ] **Step 5: Update ImportPanel tests**

Update render calls in `src/features/import/ImportPanel.test.tsx` to pass:

```tsx
duplicateChoice={null}
onResolveDuplicate={vi.fn()}
```

Add test:

```tsx
it("shows duplicate period actions", async () => {
  const onResolveDuplicate = vi.fn();
  const user = userEvent.setup();
  render(
    <ImportPanel
      reports={[report]}
      importError=""
      duplicateChoice={{ periodLabel: "2026-04-01 - 2026-05-01", incomingSourceName: "second.xls" }}
      onFilesSelected={vi.fn()}
      onResolveDuplicate={onResolveDuplicate}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Оставить оба" }));

  expect(onResolveDuplicate).toHaveBeenCalledWith("keep");
});
```

- [ ] **Step 6: Add duplicate styles**

Append to `src/styles.css`:

```css
.duplicate-panel {
  display: grid;
  gap: 6px;
  border: 1px solid #fedf89;
  border-radius: 8px;
  background: #fffbeb;
  padding: 10px;
  font-size: 12px;
}

.duplicate-panel button {
  border: 1px solid #d6a316;
  border-radius: 6px;
  background: #ffffff;
  padding: 6px 8px;
  cursor: pointer;
}
```

- [ ] **Step 7: Run tests**

Run:

```powershell
npm test -- src/features/import/ImportPanel.test.tsx src/features/import/parseRows.test.ts
npm run build
```

Expected:

```text
all targeted tests passed
build completed without TypeScript errors
```

- [ ] **Step 8: Commit**

```powershell
git add src/App.tsx src/features/import src/styles.css
git commit -m "feat: handle import edge cases"
```

## Task 10: End-To-End Validation With The Sample XLS

**Files:**
- Modify: `src/styles.css`
- Create: `docs/superpowers/verification/2026-05-22-ssz-quality-dashboard.md`

- [ ] **Step 1: Run full automated checks**

Run:

```powershell
npm test
npm run build
```

Expected:

```text
all tests passed
build completed without TypeScript errors
```

- [ ] **Step 2: Start the dev server**

Run:

```powershell
npm run dev
```

Expected:

```text
Local: http://127.0.0.1:5173/
```

- [ ] **Step 3: Manually import the sample workbook**

Open `http://127.0.0.1:5173/` and upload:

```text
C:\codex\bi_ssz\Статистика по качеству выдаваемых ССЗ апрель накопительным итогом 2026.xls
```

Expected visible results:

```text
Period: 2026-04-01 - 2026-05-01
SSZ count is close to 865
Operation row count is close to 22 349
Statuses include Завершен, Утвержден, В подготовке
KPI "Доля без технологии" is displayed as a percentage
The SSZ table shows rows with SSZ numbers and operation drill-down opens
```

- [ ] **Step 4: Check responsive layout**

Use browser dev tools or the in-app browser to check widths near 1366px and 390px.

Expected:

```text
No text overlaps
KPI cards wrap into readable columns
Tables scroll horizontally instead of breaking the page
Upload controls remain reachable
```

- [ ] **Step 5: Record verification**

Create `docs/superpowers/verification/2026-05-22-ssz-quality-dashboard.md`:

```md
# SSZ Quality Dashboard Verification

Date: 2026-05-22

## Commands

- `npm test`: passed
- `npm run build`: passed

## Sample XLS

Imported file:

`C:\codex\bi_ssz\Статистика по качеству выдаваемых ССЗ апрель накопительным итогом 2026.xls`

Observed:

- Period detected: `2026-04-01 - 2026-05-01`
- SSZ count: record the value displayed by the app
- Operation rows: record the value displayed by the app
- Statuses: `Завершен`, `Утвержден`, `В подготовке`
- Drill-down: opens operation rows for a selected SSZ

## Responsive Check

- Desktop width 1366px: passed
- Mobile width 390px: passed
```

- [ ] **Step 6: Commit**

```powershell
git add docs/superpowers/verification/2026-05-22-ssz-quality-dashboard.md src/styles.css
git commit -m "test: verify SSZ dashboard with sample workbook"
```

## Self-Review

Spec coverage:

- Browser-only app: covered by Tasks 1, 3, and 5.
- XLS upload: covered by Tasks 3 and 5.
- Multiple XLS files in current session: covered by Tasks 5 and 9.
- No server and no database: reflected in Task 1 architecture and no backend files.
- Hierarchical parsing of department, master, SSZ, and operations: covered by Task 2.
- Main KPI based on time without technology: covered by Task 4 and Task 6.
- Comparison of loaded periods: covered by Task 6 using current and comparison reports.
- Filters by department, master, status, and operation: covered by Task 7.
- Rankings and overview layout: covered by Tasks 6 and 7.
- SSZ detail and operation drill-down: covered by Task 8.
- Import warnings and duplicate-period behavior: covered by Task 9.
- Verification with the provided XLS and responsive checks: covered by Task 10.

Placeholder scan:

- No placeholder markers or vague implementation steps remain.
- Code steps define concrete file contents, commands, and expected outcomes.

Type consistency:

- `ImportedReport`, `SszRecord`, and `OperationRecord` are defined once in `src/features/import/types.ts`.
- Parser, analytics, dashboard, import panel, and table components all use those shared types.
- Function names are consistent across tests and implementation snippets: `parseSszRows`, `readWorkbookFile`, `summarizeSszRecords`, `groupSszRecords`, `compareSummaries`, `applyDashboardFilters`.
