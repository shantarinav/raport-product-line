# SSZ Quality Dashboard Verification

Date: 2026-05-22

## Automated Checks

- `npm test`: passed after simplifying the dashboard to one uploaded XLS, 8 test files, 18 tests.
- `npm run build`: passed.
- Sample XLS import test: passed for `Статистика по качеству выдаваемых ССЗ апрель накопительным итогом 2026.xls`.

## Sample XLS Assertions

The automated sample test verifies:

- Period: `2026-04-01 - 2026-05-01`
- SSZ rows: between 850 and 880
- Operation rows: at least 22 000
- Statuses: `В подготовке`, `Завершен`, `Утвержден`
- Import errors: none

## Current Visualization Scope

The current dashboard intentionally focuses on executive-level visualization:

- one uploaded XLS file is active at a time; comparison controls and dashboard filters are removed;
- one department board that shows the percent of each department's own work performed by technology on a 0-100 slider;
- one master board that shows the percent of each master's own work performed by technology on a 0-100 slider;
- one operation board that shows the percent of each operation's own work performed by technology on a 0-100 slider;
- the main KPI card emphasizes technology share, with total SSZ and technology time as supporting KPIs;
- an executive insight line highlights support-point masters: at least 70% technology share, 50 total hours, and 10 operations;
- support-point masters are shown as a Top-5 vertical leaderboard with rank, clickable master name, own technology percent, total hours, and a percent mini-bar;
- support-point master names are clickable and select the master's primary department;
- clickable department names narrow the master board to the selected department;
- department, master, and operation boards are sorted by total hours;
- slider background zones mark 0-30 as focus, 30-70 as transition, and 70-100 as support;
- row-level labels where the own-work technology percent is shown first, followed by total hours and problem share.

SSZ detail, operation detail, risk map, red-zone summary, concentration summary, and technology leader widgets are excluded from the UI.

## Local App

Dev server:

`http://127.0.0.1:5173/`

HTTP check returned status `200`.

## Security Note

The current browser XLS reader uses the SheetJS `xlsx` package because the first version must support legacy `.xls` files in the browser. The parser is loaded lazily only when a file is imported, keeping the main dashboard bundle smaller. `npm audit --omit=dev` reports known advisories for `xlsx` with no upstream fix available. For this local browser-only version, use trusted internal files. Before deploying more broadly, either sandbox parsing more aggressively or reassess the parser dependency.
