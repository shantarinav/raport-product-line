# Развертывание Print LLM backend

`backend/print-llm` — необязательное расширение Рапорта для ИИ-проверки личной печати в дашборде Print.

Frontend остается самостоятельным статическим приложением. Если backend не запущен или не настроен, Рапорт продолжает работать без ИИ-функции.

## Что разворачивается

- Node.js backend из `backend/print-llm/server.mjs`.
- Локальный SQLite-кэш ответов модели.
- Подключение к Ollama через `OLLAMA_CHAT_URL`.
- Опциональная задача Windows Task Scheduler для автозапуска.

## Требования

- Windows-хост или ПК администратора.
- Node.js той же версии, на которой запускается проект.
- Установленная Ollama и загруженная модель, например `qwen3:4b`.
- Репозиторий Рапорта на локальном диске.

SQLite-кэш должен храниться на локальном диске backend-хоста. Не размещайте SQLite-файл на сетевой шаре.

## Запуск двойным кликом на локальной машине

Для пользователя без командной строки используйте CMD-кнопки в `deploy/print-llm/`:

1. `01-init-local.cmd` — создать локальные настройки для одного ПК.
2. `01-init-lan.cmd` — создать сетевые настройки для общего backend в корпоративной сети.
3. `02-start.cmd` — запустить ИИ-сервис в фоне.
4. `03-status.cmd` — проверить состояние.
5. `04-stop.cmd` — остановить ИИ-сервис.

Для диагностики используйте `run-console.cmd`: он запускает backend в видимом окне и показывает логи. Остановить такой запуск можно через `Ctrl+C`.

## Быстрый локальный запуск

Из корня репозитория:

```powershell
npm run backend:print-llm:init:local
npm run backend:print-llm:start
npm run backend:print-llm:status
```

Что произойдет:

1. Создастся `backend/print-llm/.env`.
2. Backend запустится в фоне.
3. Статус покажет адрес, модель, очередь и кэш.

Остановить:

```powershell
npm run backend:print-llm:stop
```

Запустить в текущем окне для диагностики:

```powershell
npm run backend:print-llm:run
```

## Сетевой режим для 2-5 пользователей

Для запуска двойным кликом используйте `01-init-lan.cmd`: он попросит адрес сайта Рапорта, например `https://bi.ekb.ru`, создаст `.env` и сгенерирует API-ключ.

Альтернативно создайте `.env` в LAN-режиме командой:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File deploy/print-llm/init-env.ps1 -Mode Lan -FrontendOrigin https://bi.ekb.ru -Force
```

Скрипт сгенерирует API-ключ. Его нужно сохранить и указать пользователям в настройках Рапорта.

Проверьте ключевые параметры в `backend/print-llm/.env`:

```text
PRINT_LLM_HOST=0.0.0.0
PRINT_LLM_PORT=8787
PRINT_LLM_ALLOWED_ORIGINS=https://bi.ekb.ru
PRINT_LLM_API_KEY=<ключ>
OLLAMA_CHAT_URL=http://127.0.0.1:11434/api/chat
PRINT_LLM_MODEL=qwen3:4b
PRINT_LLM_CONCURRENCY=1
```

После этого:

```powershell
npm run backend:print-llm:start
npm run backend:print-llm:status
```

Если Windows Firewall блокирует порт, откройте входящие подключения на `PRINT_LLM_PORT` только для корпоративной сети.

## Автозапуск через Windows Task Scheduler

Создать задачу автозапуска при входе текущего пользователя:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File deploy/print-llm/install-scheduled-task.ps1 -RunNow
```

Проверить:

```powershell
npm run backend:print-llm:status
```

Удалить задачу:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File deploy/print-llm/uninstall-scheduled-task.ps1
```

Задача запускает `deploy/print-llm/run.ps1`, который читает `backend/print-llm/.env` и стартует backend в текущем окружении.

## Настройка frontend

На главной странице Рапорта откройте `Настройки`:

1. Включите `ИИ-проверку личной печати`.
2. В режиме администратора укажите адрес сервиса, например `http://server:8787`.
3. Если задан `PRINT_LLM_API_KEY`, укажите этот ключ.
4. Нажмите проверку подключения.

Если проверка не проходит, дашборд Print продолжит работать в словарном режиме.

## Где хранятся локальные файлы

Не коммитятся:

- `backend/print-llm/.env`;
- `backend/print-llm/.cache/`;
- `backend/print-llm/.runtime/`.

`.runtime/` содержит PID и логи фонового запуска:

```text
backend/print-llm/.runtime/print-llm.pid
backend/print-llm/.runtime/print-llm.out.log
backend/print-llm/.runtime/print-llm.err.log
```

## Диагностика

Проверка состояния:

```powershell
npm run backend:print-llm:status
```

Ручная проверка health endpoint:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

Если задан API-ключ:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health -Headers @{ "X-Raport-Backend-Key" = "<ключ>" }
```

Типовые причины недоступности:

- backend не запущен;
- порт занят другим процессом;
- Ollama не запущена;
- модель не загружена;
- frontend origin не указан в `PRINT_LLM_ALLOWED_ORIGINS`;
- API-ключ в frontend не совпадает с `PRINT_LLM_API_KEY`;
- firewall блокирует порт в LAN-режиме.

## Обновление backend

1. Остановите сервис:

```powershell
npm run backend:print-llm:stop
```

2. Обновите репозиторий обычным Git-процессом.

3. Запустите сервис снова:

```powershell
npm run backend:print-llm:start
npm run backend:print-llm:status
```

`backend/print-llm/.env` и SQLite-кэш не должны удаляться при обновлении кода.
