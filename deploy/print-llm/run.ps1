$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

Import-PrintLlmEnv | Out-Null
Ensure-PrintLlmRuntimeDir | Out-Null
Set-Location (Get-RaportRoot)

Write-Host "Запуск ИИ-сервиса Print в текущем окне..." -ForegroundColor Cyan
Write-Host "Для остановки нажмите Ctrl+C."
node backend/print-llm/server.mjs
