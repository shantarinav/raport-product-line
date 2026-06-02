# Legacy Changes Recovery Report

Дата анализа: 2026-06-01

Ограничение аудита: в окружении отсутствует `git`, поэтому список сформирован по файловым меткам времени (изменения за 2026-06-01) и содержимому файлов.

## 1) Какие файлы были изменены в `legacy/ssz`, `legacy/tessa`, `legacy/print`

### `legacy/ssz`
- Изменений за 2026-06-01 не обнаружено.

### `legacy/tessa`
Измененные файлы (не считая автогенерации в `node_modules/` и `dist/`):
- `legacy/tessa/package.json`
- `legacy/tessa/package-lock.json`
- `legacy/tessa/postcss.config.cjs`
- `legacy/tessa/tailwind.config.ts`
- `legacy/tessa/vite-dev.log`
- `legacy/tessa/src/App.tsx`
- `legacy/tessa/src/styles.css`
- `legacy/tessa/src/components/ui/alert.tsx`
- `legacy/tessa/src/components/ui/badge.tsx`
- `legacy/tessa/src/components/ui/button.tsx`
- `legacy/tessa/src/components/ui/card.tsx`
- `legacy/tessa/src/components/ui/cn.ts`
- `legacy/tessa/src/components/ui/select.tsx`
- `legacy/tessa/src/components/ui/table.tsx`
- `legacy/tessa/src/components/ui/toggle-group.tsx`

Автогенерация:
- `legacy/tessa/node_modules/**` (15829 файлов)
- `legacy/tessa/dist/**` (3 файла)

### `legacy/print`
Измененные файлы (не считая автогенерации в `node_modules/` и `dist/`):
- `legacy/print/app.js`
- `legacy/print/index.html`
- `legacy/print/package.json`
- `legacy/print/package-lock.json`
- `legacy/print/postcss.config.cjs`
- `legacy/print/tailwind.config.js`
- `legacy/print/vite.config.js`
- `legacy/print/src/main.jsx`
- `legacy/print/src/print-app.jsx`
- `legacy/print/src/styles.css`
- `legacy/print/src/components/ui/badge.jsx`
- `legacy/print/src/components/ui/button.jsx`
- `legacy/print/src/components/ui/card.jsx`
- `legacy/print/src/components/ui/cn.js`

Автогенерация:
- `legacy/print/node_modules/**` (7044 файла)
- `legacy/print/dist/**` (3 файла)

## 2) Какие изменения относятся к визуальному стилю ССЗ

К визуальной миграции под стиль ССЗ относятся:
- `legacy/tessa/src/styles.css` (палитра, карточки, шапка, фильтры, таблицы, токены вида `--raport-*`)
- `legacy/print/src/styles.css` (аналогично, плюс изоляция через `.print-dashboard`)
- `legacy/tessa/src/components/ui/*` и `legacy/print/src/components/ui/*` (унификация оберток `Card/Button/Badge/...` под токены)
- `legacy/print/src/print-app.jsx` (визуальная React-разметка панели/виджетов с теми же ID и data-атрибутами)
- иконки в:
  - `legacy/tessa/src/App.tsx`
  - `legacy/print/src/print-app.jsx`

## 3) Какие изменения относятся к Tailwind CSS

- Подключение Tailwind:
  - `legacy/tessa/tailwind.config.ts`
  - `legacy/tessa/postcss.config.cjs`
  - `legacy/tessa/src/styles.css` (`@tailwind base/components/utilities`)
  - `legacy/print/tailwind.config.js`
  - `legacy/print/postcss.config.cjs`
  - `legacy/print/src/styles.css` (`@tailwind base/components/utilities`)
- Tailwind utility-классы в UI-обертках:
  - `legacy/tessa/src/components/ui/*.tsx`
  - `legacy/print/src/components/ui/*.jsx`
- Tailwind классы в JSX:
  - `legacy/print/src/print-app.jsx`
  - `legacy/tessa/src/App.tsx`

## 4) Какие изменения относятся к shadcn/ui

Признаки shadcn-подхода (локальные примитивы):
- `legacy/tessa/src/components/ui/alert.tsx`
- `legacy/tessa/src/components/ui/badge.tsx`
- `legacy/tessa/src/components/ui/button.tsx`
- `legacy/tessa/src/components/ui/card.tsx`
- `legacy/tessa/src/components/ui/select.tsx`
- `legacy/tessa/src/components/ui/table.tsx`
- `legacy/tessa/src/components/ui/toggle-group.tsx`
- `legacy/tessa/src/components/ui/cn.ts`
- `legacy/print/src/components/ui/badge.jsx`
- `legacy/print/src/components/ui/button.jsx`
- `legacy/print/src/components/ui/card.jsx`
- `legacy/print/src/components/ui/cn.js`

Важно: это shadcn-style обертки, а не полноценные компоненты из установленного `shadcn/ui` пакета с Radix primitives.

## 5) Какие изменения относятся к lucide-react

- Зависимость добавлена/зафиксирована в:
  - `legacy/tessa/package.json`
  - `legacy/tessa/package-lock.json`
  - `legacy/print/package.json`
  - `legacy/print/package-lock.json`
- Использование иконок в коде:
  - `legacy/tessa/src/App.tsx` (`AlertTriangle`, `ClipboardCheck`, `Download`, `Filter`, `Gauge`, `Info`, `UploadCloud`)
  - `legacy/print/src/print-app.jsx` (`Filter`, `Printer`, `SearchCheck`, `UploadCloud`)

## 6) Какие изменения затрагивают бизнес-логику, расчеты, фильтры, переключатели или поведение виджетов

Явно затрагивают поведение:
- `legacy/print/app.js`: изменен запуск `init()`.
  - Было: только `DOMContentLoaded` listener.
  - Стало: если DOM уже загружен, `init()` вызывается сразу.
  - Это runtime-поведение (инициализация), но не пересчет метрик.

Потенциально затрагивают поведение (требуют ручной проверки):
- `legacy/print/index.html`, `legacy/print/src/main.jsx`, `legacy/print/src/print-app.jsx`
  - Изменен каркас страницы (React root), логика продолжает работать через `app.js` и те же `id`/`data-*`.
  - Риск: несовпадение ID/атрибутов или порядка монтирования.
- `legacy/tessa/src/App.tsx`
  - Файл содержит и UI, и вычислительные функции/фильтрацию.
  - Без git-диффа нельзя гарантировать, что изменения только визуальные.

Не выявлено прямых изменений в отдельных файлах вычислительных библиотек `legacy/tessa/src/lib/*` и основном блоке вычислений `legacy/print/app.js` (кроме инициализации).

## 7) Какие изменения можно безопасно перенести в `src/shared/ui`

Безопасно переносить:
- Универсальные UI-примитивы:
  - `legacy/tessa/src/components/ui/cn.ts`
  - `legacy/tessa/src/components/ui/button.tsx`
  - `legacy/tessa/src/components/ui/card.tsx`
  - `legacy/tessa/src/components/ui/badge.tsx`
  - `legacy/tessa/src/components/ui/alert.tsx`
  - `legacy/tessa/src/components/ui/select.tsx`
  - `legacy/tessa/src/components/ui/table.tsx`
  - `legacy/tessa/src/components/ui/toggle-group.tsx`
- Аналогичные примитивы из `legacy/print/src/components/ui/*` можно использовать как reference, но предпочтительнее брать TS-версии из `legacy/tessa` как базу.

## 8) Какие изменения можно безопасно перенести в `src/shared/styles`

Безопасно переносить:
- Токены и базовые CSS variables из:
  - `legacy/tessa/src/styles.css` (`:root`, `--raport-*`)
  - `legacy/print/src/styles.css` (часть токенов; с сохранением префикса изоляции для print-legacy)
- Tailwind/PostCSS конфиг-паттерны:
  - `legacy/tessa/tailwind.config.ts`
  - `legacy/tessa/postcss.config.cjs`
  - `legacy/print/tailwind.config.js`
  - `legacy/print/postcss.config.cjs`

С оговоркой:
- Селекторы, завязанные на legacy-структуру (`.print-dashboard .app-shell ...`) переносить только после адаптации к целевому DOM в `src/pages`.

## 9) Какие изменения можно безопасно перенести в `src/pages`

Безопасно переносить как визуальный слой:
- `legacy/print/src/print-app.jsx` как шаблон разметки страницы `/print`, при условии сохранения всех `id` и `data-*`, которыми пользуется текущая логика.
- Из `legacy/tessa/src/App.tsx`:
  - визуальные секции, обертки, иконки, подключение UI-примитивов;
  - без переноса/изменения доменной логики и вычислительных функций.

## 10) Какие изменения нельзя переносить без ручной проверки

Нельзя переносить автоматически:
- `legacy/print/app.js` (любые правки, включая блок инициализации) — влияет на жизненный цикл ивентов.
- Любые изменения в `legacy/tessa/src/App.tsx`, которые находятся в блоках:
  - `applyAgreementFilters`, `calculateAgreementKpis`, `buildAgreementFilterOptions`, сортировки/агрегации, defaults фильтров/переключателей.
- `legacy/print/index.html` + `legacy/print/src/main.jsx` как есть — сначала нужно сверить с архитектурой текущего `src/`.
- Автогенерацию:
  - `legacy/tessa/node_modules/**`, `legacy/tessa/dist/**`
  - `legacy/print/node_modules/**`, `legacy/print/dist/**`
- Логи:
  - `legacy/tessa/vite-dev.log`

---

Итог: факт изменений в `legacy/` подтвержден для `legacy/tessa` и `legacy/print`; в `legacy/ssz` изменений за 2026-06-01 не обнаружено. Переносить автоматически стоит только слой UI/токенов, а все, что касается инициализации, фильтров, вычислений и событий, требует ручной сверки.
