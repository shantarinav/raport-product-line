# Развертывание Raport LLM

`backend/raport-llm` — необязательный локальный ИИ-сервис Рапорта. Он обслуживает ИИ-проверку личной печати в Print и ИИ-помощник A3.

Фронтенд Рапорта остается самостоятельным: если сервис не запущен, дашборды работают без ИИ.

## Быстрый сценарий

Для пользователя без командной строки:

1. Откройте папку `deploy/raport-llm`.
2. Запустите `00-setup.cmd`.
3. После настройки запустите `doctor.cmd`.
4. В Рапорте откройте `Настройки` и проверьте подключение ИИ.

То же из терминала:

```bash
npm run backend:raport-llm:setup
npm run backend:raport-llm:doctor
```

## Ежедневное управление

```bash
npm run backend:raport-llm:start   # запустить в фоне
npm run backend:raport-llm:status  # проверить состояние
npm run backend:raport-llm:stop    # остановить
npm run backend:raport-llm:run     # запустить в текущем окне для диагностики
```

CMD-обертки для двойного клика:

- `02-start.cmd` — запустить сервис в фоне;
- `03-status.cmd` — проверить состояние;
- `04-stop.cmd` — остановить сервис;
- `run-console.cmd` — запустить сервис в текущем окне.

## Первичная настройка без мастера

Локальный режим:

```bash
npm run backend:raport-llm:init:local
```

Сетевой режим для 2-5 пользователей:

```bash
npm run backend:raport-llm:init:lan
```

В сетевом режиме сохраните API-ключ из вывода init-скрипта и укажите его в настройках Рапорта.

## Где лежат настройки

Настройки создаются в:

```text
backend/raport-llm/.env
```

Основные параметры:

```text
RAPORT_LLM_HOST=127.0.0.1
RAPORT_LLM_PORT=8787
RAPORT_LLM_ALLOWED_ORIGINS=http://127.0.0.1:5173
RAPORT_LLM_API_KEY=
RAPORT_LLM_OLLAMA_BASE_URL=http://127.0.0.1:11434
RAPORT_LLM_MODEL=qwen3:1.7b
RAPORT_LLM_A3_MODEL=qwen3:4b
RAPORT_LLM_CONCURRENCY=1
```

## Диагностика

`doctor.cmd` проверяет:

- Node.js;
- файл `backend/raport-llm/.env`;
- доступность порта;
- доступность Ollama;
- наличие моделей;
- ответ `/health`;
- разрешенные сайты Рапорта.

Техническая проверка вручную:

```bash
curl http://127.0.0.1:8787/health
```

В настройках Рапорта указывайте адрес без `/health`, например:

```text
http://127.0.0.1:8787
```

## Изменение сайта Рапорта

Если фронтенд опубликован на другом сайте, добавьте его в разрешенные источники:

```bash
npm run backend:raport-llm:stop
powershell -NoProfile -ExecutionPolicy Bypass -File deploy/raport-llm/change-frontend-site.ps1
npm run backend:raport-llm:start
npm run backend:raport-llm:doctor
```

Для двойного клика используйте `05-change-frontend-site.cmd`.

## Автозапуск Windows

Создать задачу Windows Task Scheduler:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File deploy/raport-llm/install-scheduled-task.ps1 -RunNow
```

Удалить задачу:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File deploy/raport-llm/uninstall-scheduled-task.ps1
```

## Важные ограничения

- Не храните SQLite-кэш на сетевой файловой шаре.
- Не коммитьте `.env`, `.cache/` и `.runtime/`.
- Если сервис недоступен, Рапорт продолжает работать без ИИ.