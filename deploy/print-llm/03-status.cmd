@echo off
setlocal
cd /d "%~dp0..\.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0status.ps1" -InteractiveHelp
pause
exit /b %ERRORLEVEL%
