@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0..\.."
echo Рапорт: проверка состояния ИИ-сервиса Print
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0status.ps1"
set EXIT_CODE=%ERRORLEVEL%
echo.
if %EXIT_CODE% EQU 0 (
  echo.
  echo Как читать результат:
  echo - "ИИ-сервис готов к работе" означает, что backend отвечает.
  echo - "ИИ-сервис недоступен" означает, что нужно запустить 02-start.cmd или проверить настройки.
  echo - Модель и очередь показывают состояние backend, а не frontend-дашборда.
)
echo.
pause
exit /b %EXIT_CODE%
