# Print LLM Network Backend Design

## Context

Рапорт остается frontend-first продуктом: статическая сборка должна работать без backend. Backend Print LLM является optional extension для ИИ-проверки личной печати в дашборде Print.

Текущая реализация backend рассчитана в первую очередь на локальный запуск на одном ПК. Следующий шаг — подготовить его к размещению на обычном сервере или ПК в корпоративной сети для 2-5 одновременных пользователей.

## Goals

- Сохранить работоспособность frontend без backend.
- Разрешить backend работать как локально (`127.0.0.1`), так и в сети (`0.0.0.0`).
- Добавить управляемый CORS allowlist.
- Добавить опциональный API-key: если ключ задан, backend требует `X-Raport-Backend-Key`; если не задан, работает без ключа.
- Добавить `/health` для проверки доступности сервиса.
- Защитить backend от слишком больших request body.
- Подготовить SQLite cache к нескольким пользователям через WAL и busy timeout.
- Ограничить параллельные обращения к Ollama через in-process очередь.
- Обновить документацию для local и LAN/server deployment.

## Non-goals

- Не добавлять полноценную систему пользователей и ролей.
- Не добавлять Redis/Postgres/очередь задач как отдельный сервис.
- Не превращать backend в обязательную часть Рапорта.
- Не сохранять сырые print-логи или строковые идентификаторы сверх уже существующего безопасного payload классификации.
- Не добавлять Docker/systemd/Windows Service как обязательную часть первого этапа.

## Architecture

### Frontend

Frontend остается статическим приложением. ИИ-проверка в Print включается пользователем явно. Если backend недоступен, дашборд работает в словарном режиме и не ломает остальные расчеты.

Frontend получает backend URL через `VITE_PRINT_LLM_*`. Для сетевого режима frontend также может передавать API-key через `VITE_PRINT_LLM_API_KEY`, если backend настроен требовать ключ.

### Backend

`backend/print-llm` становится переносимым HTTP-сервисом с безопасными defaults:

- `PRINT_LLM_HOST=127.0.0.1` по умолчанию;
- `PRINT_LLM_PORT=8787`;
- `PRINT_LLM_ALLOWED_ORIGINS` задает список разрешенных frontend origins;
- `PRINT_LLM_API_KEY` включает проверку `X-Raport-Backend-Key`;
- `PRINT_LLM_REQUEST_BODY_LIMIT_BYTES` ограничивает размер payload;
- `PRINT_LLM_HTTP_REQUEST_TIMEOUT_MS` задает server/request timeout;
- `PRINT_LLM_CONCURRENCY=1` ограничивает число одновременных Ollama-классификаций;
- `PRINT_LLM_SQLITE_BUSY_TIMEOUT_MS=5000` задает ожидание SQLite lock.

### SQLite

SQLite cache остается локальным файлом на той же машине, где запущен backend. Для сетевого режима база не должна лежать на network share.

При открытии базы backend включает:

```sql
PRAGMA journal_mode=WAL;
PRAGMA busy_timeout = <PRINT_LLM_SQLITE_BUSY_TIMEOUT_MS>;
```

WAL нужен для лучшей параллельности чтения и записи; busy timeout снижает риск падения на кратких блокировках.

### Ollama queue

Lookup cache не блокируется очередью. В очередь ставятся только новые LLM-классификации, которые реально вызывают Ollama.

Очередь in-process, без внешних зависимостей:

- concurrency по умолчанию 1;
- значение настраивается через env;
- ошибки одного item не валят весь batch;
- существующий fallback сохраняется.

## API

Existing endpoints remain:

```text
POST /api/print/classifications/lookup
POST /api/print/classifications/classify-missing
POST /api/print/classify-personal
```

New endpoint:

```text
GET /health
```

Health response does not expose secrets. It may include:

```json
{
  "ok": true,
  "service": "print-llm",
  "enabled": true,
  "model": "qwen3:4b",
  "cacheEnabled": true,
  "cacheClassifications": 123,
  "queue": { "concurrency": 1, "active": 0, "pending": 0 }
}
```

## Security

- Default host remains `127.0.0.1`.
- Network mode requires explicit `PRINT_LLM_HOST=0.0.0.0`.
- CORS is allowlist-based. In network deployment, do not use wildcard origins.
- API-key is optional for local simplicity, but recommended for LAN deployment.
- Backend accepts only JSON and bounded payload size.
- Backend must not log raw document titles in normal operation.

## Testing

- Config parsing tests for host, origins, apiKey, limits, timeouts, concurrency, SQLite busy timeout.
- HTTP tests for `/health`, CORS allowed/blocked, preflight, API-key optional/required, body size limit.
- Queue tests for concurrency cap and result propagation.
- SQLite tests for cache behavior and PRAGMA initialization where possible.
- Frontend client tests for `X-Raport-Backend-Key` header and no header when absent.

## Deployment modes

### Local mode

- Backend listens on `127.0.0.1:8787`.
- Frontend points to local backend or uses relative proxy in dev.
- API-key can stay empty.

### LAN/server mode

- Backend listens on `0.0.0.0:8787`.
- `PRINT_LLM_ALLOWED_ORIGINS` contains production frontend origins.
- `PRINT_LLM_API_KEY` is set.
- Frontend build uses network backend URL and matching API-key.
- SQLite DB path points to a local disk on the backend host.

## Risks

- Ollama throughput on CPU may still be slow; queue prevents overload but does not make inference fast.
- API-key in frontend env is not a secret against a malicious user; it is only a practical LAN guardrail. Real authentication is out of scope.
- SQLite WAL is suitable for this small workload but should not be placed on a network filesystem.
- If usage grows beyond 2-5 users or classification becomes mission-critical, move to a proper job queue and service auth.
