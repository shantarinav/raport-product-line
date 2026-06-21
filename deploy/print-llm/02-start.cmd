@echo off
setlocal
cd /d "%~dp0..\.."
echo Raport Print AI backend: start in background
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
set EXIT_CODE=%ERRORLEVEL%
echo.
if %EXIT_CODE% EQU 0 (
  echo Start command finished.
) else (
  echo Start command failed. Exit code: %EXIT_CODE%
)
echo.
pause
exit /b %EXIT_CODE%
