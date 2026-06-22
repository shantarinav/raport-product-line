@echo off
setlocal
cd /d "%~dp0..\.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0init-env.ps1" -Mode Local -InteractiveHelp
pause
exit /b %ERRORLEVEL%
