@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0..\.."
echo Рапорт: запуск ИИ-сервиса Print в фоне
echo.
echo Перед запуском должен быть создан файл настроек через 01-init-local.cmd или 01-init-lan.cmd.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
set EXIT_CODE=%ERRORLEVEL%
echo.
if %EXIT_CODE% EQU 0 (
  echo Команда запуска выполнена.
  echo.
  echo Что делать дальше:
  echo 1. Запустите 03-status.cmd.
  echo 2. Если статус показывает, что сервис готов, откройте Рапорт и проверьте подключение в Настройках.
) else (
  echo Запуск не выполнен. Код ошибки: %EXIT_CODE%
  echo Проверьте текст ошибки выше.
)
echo.
pause
exit /b %EXIT_CODE%
