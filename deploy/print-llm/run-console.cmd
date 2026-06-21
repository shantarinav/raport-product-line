@echo off
setlocal
cd /d "%~dp0..\.."
echo Raport Print AI backend: console mode
echo.
echo This window runs the backend directly. Press Ctrl+C to stop it.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
set EXIT_CODE=%ERRORLEVEL%
echo.
echo Backend process finished. Exit code: %EXIT_CODE%
echo.
pause
exit /b %EXIT_CODE%
