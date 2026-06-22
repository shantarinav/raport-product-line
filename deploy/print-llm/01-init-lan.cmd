@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0..\.."
echo Рапорт: настройка общего ИИ-сервиса Print в сети
echo.
echo Этот режим нужен, если одним ИИ-сервисом будут пользоваться несколько человек.
echo Пример адреса сайта Рапорта: https://bi.ekb.ru
echo Вводите только origin: схема + домен + порт, без /#/print и без путей.
echo.
set /p FRONTEND_ORIGIN=Введите адрес сайта Рапорта: 
if "%FRONTEND_ORIGIN%"=="" (
  echo Адрес сайта Рапорта обязателен.
  echo.
  pause
  exit /b 1
)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0init-env.ps1" -Mode Lan -FrontendOrigin "%FRONTEND_ORIGIN%" -Force
set EXIT_CODE=%ERRORLEVEL%
echo.
if %EXIT_CODE% EQU 0 (
  echo Сетевая настройка завершена.
  echo.
  echo Что делать дальше:
  echo 1. Сохраните API-ключ, который показан выше.
  echo 2. Запустите 02-start.cmd на этом сервере или ПК.
  echo 3. Запустите 03-status.cmd и проверьте, что сервис готов.
  echo 4. В Рапорте укажите адрес сервиса, например http://server:8787, и API-ключ.
  echo 5. Если сервис недоступен с других ПК, проверьте Windows Firewall для порта 8787.
) else (
  echo Сетевая настройка не выполнена. Код ошибки: %EXIT_CODE%
  echo Проверьте текст ошибки выше.
)
echo.
pause
exit /b %EXIT_CODE%
