# Print LLM backend

`backend/print-llm` — optional backend extension для дашборда Print.

Frontend Рапорта не зависит от этого backend:

- `npm run dev`, `npm run check`, `npm run build` работают без запущенного backend;
- опубликованный `dist/` открывает дашборды без Node-сервиса;
- ИИ-проверка личной печати выключена по умолчанию и включается пользователем в `История и возможности`;
- если backend недоступен, Print остается работоспособным в словарном режиме.

## Назначение

Backend принимает минимальный безопасный payload по кандидатам личной печати, обращается к локальной или сетевой Ollama-модели и сохраняет результаты в локальный SQLite cache.

Во входной payload не должны уходить сырые print-логи, пользователи, компьютеры, принтеры и другие лишние поля. Frontend передает только данные, нужные для классификации документа.

## Требования

- Node.js с поддержкой текущего проекта.
- Ollama на локальном ПК или сервере сети.
- Загруженная модель, по умолчанию `qwen3:4b`.
- SQLite cache на локальном диске backend-хоста.

Не размещай SQLite database на сетевой файловой шаре. Backend включает WAL mode, а WAL требует, чтобы процессы работали с базой на одной машине.

## Local mode

Безопасный режим по умолчанию: backend слушает только `127.0.0.1`.

```bash
PRINT_LLM_CLASSIFIER_ENABLED=true
PRINT_LLM_HOST=127.0.0.1
PRINT_LLM_PORT=8787
PRINT_LLM_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
PRINT_LLM_API_KEY=
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_CHAT_URL=http://127.0.0.1:11434/api/chat
PRINT_LLM_MODEL=qwen3:4b
PRINT_LLM_CONCURRENCY=1
PRINT_LLM_CACHE_ENABLED=true
PRINT_LLM_SCHEMA_VERSION=4
```

Запуск из корня репозитория:

```bash
npm run backend:print-llm
```

Ожидаемый вывод:

```text
Print LLM classifier proxy listening on http://127.0.0.1:8787
```

## LAN/server mode

Для 2-5 пользователей backend можно разместить на обычном ПК или сервере в корпоративной сети.

Backend env:

```bash
PRINT_LLM_CLASSIFIER_ENABLED=true
PRINT_LLM_HOST=0.0.0.0
PRINT_LLM_PORT=8787
PRINT_LLM_ALLOWED_ORIGINS=https://bi.ekb.ru,http://server:5173
PRINT_LLM_API_KEY=<shared-lan-key>
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_CHAT_URL=http://127.0.0.1:11434/api/chat
PRINT_LLM_MODEL=qwen3:4b
PRINT_LLM_CONCURRENCY=1
PRINT_LLM_CACHE_ENABLED=true
PRINT_LLM_CACHE_DB_PATH=C:\\raport-cache\\print-llm-cache.sqlite
PRINT_LLM_SQLITE_BUSY_TIMEOUT_MS=5000
```

Frontend можно настроить без пересборки: на главной странице открой `История и возможности`, включи `ИИ-проверка личной печати`, укажи backend URL и API-ключ. Env-переменные ниже остаются полезны для dev/default-сценариев:

```bash
VITE_PRINT_LLM_CLASSIFIER_ENABLED=true
VITE_PRINT_LLM_CLASSIFIER_URL=http://server:8787/api/print/classify-personal
VITE_PRINT_LLM_LOOKUP_URL=http://server:8787/api/print/classifications/lookup
VITE_PRINT_LLM_CLASSIFY_MISSING_URL=http://server:8787/api/print/classifications/classify-missing
VITE_PRINT_LLM_API_KEY=<shared-lan-key>
```

`PRINT_LLM_API_KEY` — не полноценная пользовательская авторизация. Это практический защитный ключ для локальной сети. Если нужна настоящая auth-модель, это отдельная задача.

## Concurrency

`PRINT_LLM_CONCURRENCY=1` по умолчанию. Это намеренно: локальная Ollama на CPU часто плохо переносит много параллельных запросов. Для более мощного сервера можно попробовать `2`, но сначала проверить задержки и стабильность.

Lookup SQLite cache не ставится в очередь. В очередь попадают только новые обращения к Ollama.

## SQLite cache

Если `PRINT_LLM_CACHE_DB_PATH` не задан, SQLite cache создается в:

```text
backend/print-llm/.cache/print-llm-cache.sqlite
```

`.cache/` не коммитится.

Backend включает:

```sql
PRAGMA journal_mode=WAL;
PRAGMA busy_timeout=<PRINT_LLM_SQLITE_BUSY_TIMEOUT_MS>;
```

## API

```text
GET  /health
POST /api/print/classifications/lookup
POST /api/print/classifications/classify-missing
POST /api/print/classify-personal
```

`/health` не раскрывает секреты и подходит для проверки доступности сервиса.

Пример:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

## CORS

`PRINT_LLM_ALLOWED_ORIGINS` должен содержать origin фронтенда. Для production не используй `*`, если backend доступен из сети.

Примеры origin:

```text
https://bi.ekb.ru
http://server:5173
http://127.0.0.1:5173
```

## Оценка качества

Для размеченной выборки:

```bash
npm run backend:print-llm:evaluate -- --input path/to/labeled.csv --proxy http://127.0.0.1:8787/api/print/classify-personal
```

## Диагностика

`ИИ: недоступен` в Print означает, что frontend включил ИИ-режим, но backend не ответил.

Проверь по порядку:

1. Запущен ли backend: `npm run backend:print-llm`.
2. Отвечает ли `/health`.
3. Правильно ли указан `PRINT_LLM_HOST`.
4. Совпадает ли frontend URL с backend host/port.
5. Разрешен ли frontend origin в `PRINT_LLM_ALLOWED_ORIGINS`.
6. Совпадают ли `PRINT_LLM_API_KEY` на backend и API-ключ, сохраненный в `История и возможности`, если ключ включен.
7. Запущена ли Ollama.
8. Доступна ли модель `qwen3:4b`.

Если backend недоступен, Print остается работоспособным и использует словарный режим.
