@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0..\.."
echo Рапорт: остановка ИИ-сервиса Print
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop.ps1"
set EXIT_CODE=%ERRORLEVEL%
echo.
if %EXIT_CODE% EQU 0 (
  echo Команда остановки выполнена.
  echo.
  echo Что делать дальше:
  echo - Чтобы снова включить ИИ-сервис, запустите 02-start.cmd.
  echo - Рапорт продолжит работать без ИИ-сервиса в обычном словарном режиме.
) else (
  echo Остановка не выполнена. Код ошибки: %EXIT_CODE%
)
echo.
pause
exit /b %EXIT_CODE%
