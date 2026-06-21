param([switch]$Strict)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

$hasEnv = Import-PrintLlmEnv -Optional
if (-not $hasEnv) {
  Write-Host "Файл настроек backend не найден." -ForegroundColor Yellow
  Write-Host "Создайте его командой: npm run backend:print-llm:init:local"
  if ($Strict) { exit 1 }
  exit 0
}

$config = Get-PrintLlmConfigFromEnv
$health = Invoke-PrintLlmHealth -Quiet
if (-not $health) {
  Write-Host "ИИ-сервис недоступен." -ForegroundColor Yellow
  Write-Host "Проверяемый адрес: $($config.HealthUrl)"
  Write-Host "Запуск: npm run backend:print-llm:start"
  if ($Strict) { exit 1 }
  exit 0
}

Write-Host "ИИ-сервис готов к работе." -ForegroundColor Green
Write-Host "Адрес: $($config.HealthUrl)"
Write-Host "Модель: $($health.model)"
Write-Host "Классификация: $(if ($health.enabled) { 'включена' } else { 'выключена' })"
if ($health.queue) {
  Write-Host "Очередь: активно $($health.queue.active) · ожидает $($health.queue.pending) · потоков $($health.queue.concurrency)"
}
if ($null -ne $health.cacheClassifications) {
  Write-Host "Кэш: $($health.cacheClassifications) ответов"
} elseif ($health.cacheEnabled -eq $false) {
  Write-Host "Кэш: выключен"
}
