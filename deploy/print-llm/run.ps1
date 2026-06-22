param([switch]$InteractiveHelp)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

if ($InteractiveHelp) {
  Write-Host "Рапорт: ИИ-сервис Print в режиме диагностики" -ForegroundColor Cyan
  Write-Host "Backend будет запущен прямо в этом окне."
  Write-Host "Используйте этот режим, если нужно увидеть подробные сообщения и ошибки."
  Write-Host "Для остановки нажмите Ctrl+C."
  Write-Host ""
}

Import-PrintLlmEnv | Out-Null
Ensure-PrintLlmRuntimeDir | Out-Null
Set-Location (Get-RaportRoot)

Write-Host "Запуск ИИ-сервиса Print в текущем окне..." -ForegroundColor Cyan
Write-Host "Для остановки нажмите Ctrl+C."
node backend/print-llm/server.mjs
