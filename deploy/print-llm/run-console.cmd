@echo off
setlocal
cd /d "%~dp0..\.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" -InteractiveHelp
pause
exit /b %ERRORLEVEL%
