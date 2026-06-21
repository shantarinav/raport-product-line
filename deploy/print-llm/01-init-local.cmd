@echo off
setlocal
cd /d "%~dp0..\.."
echo Raport Print AI backend: local setup
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0init-env.ps1" -Mode Local
set EXIT_CODE=%ERRORLEVEL%
echo.
if %EXIT_CODE% EQU 0 (
  echo Setup finished.
) else (
  echo Setup failed. Exit code: %EXIT_CODE%
)
echo.
pause
exit /b %EXIT_CODE%
