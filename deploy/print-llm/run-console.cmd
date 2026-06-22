@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0..\.."
echo Рапорт: ИИ-сервис Print в режиме диагностики
echo.
echo Backend будет запущен прямо в этом окне.
echo Используйте этот режим, если нужно увидеть подробные сообщения и ошибки.
echo Для остановки нажмите Ctrl+C.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
set EXIT_CODE=%ERRORLEVEL%
echo.
echo Работа backend завершена. Код выхода: %EXIT_CODE%
echo.
echo Что делать дальше:
echo - Если были ошибки, скопируйте текст из этого окна.
echo - Для обычного фонового запуска используйте 02-start.cmd.
echo.
pause
exit /b %EXIT_CODE%
