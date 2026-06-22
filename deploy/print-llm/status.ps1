param([switch]$Strict, [switch]$InteractiveHelp)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

if ($InteractiveHelp) {
  Write-Host "Рапорт: проверка состояния ИИ-сервиса Print" -ForegroundColor Cyan
  Write-Host ""
}

$hasEnv = Import-PrintLlmEnv -Optional
if (-not $hasEnv) {
  Write-Host "Файл настроек backend не найден." -ForegroundColor Yellow
  Write-Host "Создайте его через 01-init-local.cmd или 01-init-lan.cmd."
  if ($Strict) { exit 1 }
  exit 0
}

$config = Get-PrintLlmConfigFromEnv
$health = Invoke-PrintLlmHealth -Quiet
if (-not $health) {
  Write-Host "ИИ-сервис недоступен." -ForegroundColor Yellow
  Write-Host "Проверяемый адрес: $($config.HealthUrl)"
  Write-Host "Запуск: 02-start.cmd"
  if ($InteractiveHelp) {
    Write-Host ""
    Write-Host "Что делать дальше:"
    Write-Host "1. Запустите 02-start.cmd."
    Write-Host "2. Если сервис не запускается, используйте run-console.cmd для диагностики."
    Write-Host "3. Для сетевого режима проверьте firewall и адрес сервиса в настройках Рапорта."
  }
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

if ($InteractiveHelp) {
  Write-Host ""
  Write-Host "Как читать результат:"
  Write-Host "- 'ИИ-сервис готов к работе' означает, что backend отвечает."
  Write-Host "- Модель и очередь показывают состояние backend, а не frontend-дашборда."
  Write-Host "- Теперь можно открыть Рапорт и проверить подключение в Настройках."
}
