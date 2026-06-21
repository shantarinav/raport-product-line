@echo off
setlocal
cd /d "%~dp0..\.."
echo Raport Print AI backend: LAN setup
echo.
echo This setup is for a shared backend in a local corporate network.
echo Example frontend origin: https://bi.ekb.ru
echo.
set /p FRONTEND_ORIGIN=Enter Raport site origin: 
if "%FRONTEND_ORIGIN%"=="" (
  echo Frontend origin is required.
  echo.
  pause
  exit /b 1
)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0init-env.ps1" -Mode Lan -FrontendOrigin "%FRONTEND_ORIGIN%" -Force
set EXIT_CODE=%ERRORLEVEL%
echo.
if %EXIT_CODE% EQU 0 (
  echo LAN setup finished.
  echo Save the generated API key and enter it in Raport settings.
) else (
  echo LAN setup failed. Exit code: %EXIT_CODE%
)
echo.
pause
exit /b %EXIT_CODE%
