@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0..\.."
echo Рапорт: настройка ИИ-сервиса Print на этом компьютере
echo.
echo Что делает этот шаг:
echo - создает файл backend\print-llm\.env;
echo - включает локальный режим http://127.0.0.1:8787;
echo - подходит, если Рапорт и ИИ-сервис запускаются на одном ПК.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0init-env.ps1" -Mode Local
set EXIT_CODE=%ERRORLEVEL%
echo.
if %EXIT_CODE% EQU 0 (
  echo Настройка завершена.
  echo.
  echo Что делать дальше:
  echo 1. Запустите 02-start.cmd.
  echo 2. Затем запустите 03-status.cmd и проверьте, что сервис готов.
  echo 3. В Рапорте откройте Настройки и укажите адрес http://127.0.0.1:8787.
) else (
  echo Настройка не выполнена. Код ошибки: %EXIT_CODE%
  echo Проверьте текст ошибки выше.
)
echo.
pause
exit /b %EXIT_CODE%
