@echo off
setlocal
cd /d "%~dp0..\.."
echo Raport Print AI backend: status
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0status.ps1"
set EXIT_CODE=%ERRORLEVEL%
echo.
pause
exit /b %EXIT_CODE%
