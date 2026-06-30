param([switch]$InteractiveHelp)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

if ($InteractiveHelp) {
  Write-Host "Рапорт: ИИ-сервис в режиме диагностики" -ForegroundColor Cyan
  Write-Host "Backend будет запущен прямо в этом окне."
  Write-Host "Используйте этот режим, если нужно увидеть подробные сообщения и ошибки."
  Write-Host "Для остановки нажмите Ctrl+C."
  Write-Host ""
}

Import-PrintLlmEnv | Out-Null
Ensure-PrintLlmRuntimeDir | Out-Null

$existingHealth = Invoke-PrintLlmHealth -Quiet
if ($existingHealth -and $existingHealth.ok) {
  Write-Host "ИИ-сервис уже запущен и отвечает на порту $env:RAPORT_LLM_PORT." -ForegroundColor Green
  Write-Host "Запускать второй экземпляр не нужно."
  if ($InteractiveHelp) {
    Write-Host ""
    Write-Host "Что делать дальше:"
    Write-Host "1. Для проверки состояния запустите 03-status.cmd или doctor.cmd."
    Write-Host "2. Если нужен перезапуск, сначала выполните 04-stop.cmd, затем run-console.cmd или 02-start.cmd."
  }
  exit 0
}

Set-Location (Get-RaportRoot)

Write-Host "Запуск ИИ-сервиса Рапорта в текущем окне..." -ForegroundColor Cyan
Write-Host "Для остановки нажмите Ctrl+C."
node backend/raport-llm/server.mjs
