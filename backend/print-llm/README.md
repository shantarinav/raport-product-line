# Print LLM backend

`backend/print-llm` — optional local backend extension для дашборда Print.

Frontend Рапорта не зависит от этого backend:

- `npm run dev`, `npm run check`, `npm run build` работают без запущенного backend;
- опубликованный `dist/` открывает дашборды без Node-сервиса;
- ИИ-проверка личной печати выключена по умолчанию и включается пользователем в `История и настройки`.

## Назначение

Backend принимает минимальный безопасный payload по кандидатам личной печати, обращается к локальной Ollama-модели и сохраняет результаты в локальный SQLite cache.

Во входной payload не должны уходить сырые print-логи, пользователи, компьютеры, принтеры и другие лишние поля. Frontend передает только данные, нужные для классификации документа.

## Требования

- Node.js с поддержкой текущего проекта.
- Локальная Ollama на `http://127.0.0.1:11434`.
- Загруженная модель, по умолчанию `qwen3:4b`.

## Настройка

Пример backend env находится в `.env.example`.

Основные переменные:

```bash
PRINT_LLM_CLASSIFIER_ENABLED=true
PRINT_LLM_PORT=8787
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_CHAT_URL=http://127.0.0.1:11434/api/chat
PRINT_LLM_MODEL=qwen3:4b
PRINT_LLM_TIMEOUT_MS=30000
PRINT_LLM_BATCH_SIZE=20
PRINT_LLM_CACHE_ENABLED=true
PRINT_LLM_SCHEMA_VERSION=4
```

Если `PRINT_LLM_CACHE_DB_PATH` не задан, SQLite cache создается в:

```text
backend/print-llm/.cache/print-llm-cache.sqlite
```

`.cache/` не коммитится.

## Запуск

Из корня репозитория:

```bash
npm run backend:print-llm
```

Ожидаемый вывод:

```text
Print LLM classifier proxy listening on http://127.0.0.1:8787
```

## API

Backend слушает только локальный адрес `127.0.0.1` и поддерживает POST endpoints:

```text
/api/print/classifications/lookup
/api/print/classifications/classify-missing
/api/print/classify-personal
```

Frontend использует эти endpoints только если включены:

```bash
VITE_PRINT_LLM_CLASSIFIER_ENABLED=true
```

и пользователь включил ИИ-проверку в интерфейсе.

## Оценка качества

Для размеченной выборки:

```bash
npm run backend:print-llm:evaluate -- --input path/to/labeled.csv --proxy http://127.0.0.1:8787/api/print/classify-personal
```

## Диагностика

`ИИ: недоступен` в Print означает, что frontend включил ИИ-режим, но backend не ответил.

Проверь по порядку:

1. Запущен ли backend: `npm run backend:print-llm`.
2. Слушает ли порт `8787`.
3. Запущена ли Ollama.
4. Доступна ли модель `qwen3:4b`.
5. Совпадают ли `VITE_PRINT_LLM_*` frontend URLs с backend port.

Если backend недоступен, Print остается работоспособным и использует словарный режим.
