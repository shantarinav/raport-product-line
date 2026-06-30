param([switch]$Strict, [switch]$InteractiveHelp)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

if ($InteractiveHelp) {
  Write-Host "Рапорт: проверка состояния ИИ-сервиса" -ForegroundColor Cyan
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
  Write-Host "Адрес для Рапорта: $($config.BaseUrl)"
  Write-Host "Адрес проверки: $($config.HealthUrl)"
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
Write-Host "Адрес для Рапорта: $($config.BaseUrl)"
Write-Host "Адрес проверки: $($config.HealthUrl)"
if ($config.AllowedOrigins.Count -gt 0) {
  Write-Host "Разрешенные сайты Рапорта:"
  foreach ($origin in $config.AllowedOrigins) {
    Write-Host "- $origin"
  }
}
Write-Host "Модель для анализа печати: $($health.model)"
if ($health.a3Model) {
  Write-Host "Модель для A3-помощника: $($health.a3Model)"
}
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
  Write-Host "- Модели и очередь показывают состояние backend, а не frontend-дашборда."
  Write-Host "- В настройках Рапорта указывайте адрес без /health: $($config.BaseUrl)."
  Write-Host "- Адрес с /health нужен только для технической проверки."
  Write-Host "- Если Рапорт открыт с другого сайта, добавьте этот сайт через 05-change-frontend-site.cmd."
  Write-Host ""
  Write-Host "Как изменить модель, адрес Ollama или производительность:" -ForegroundColor Cyan
  Write-Host "1. Откройте файл backend\raport-llm\.env."
  Write-Host "2. Измените OLLAMA_BASE_URL, OLLAMA_CHAT_URL, RAPORT_LLM_MODEL, RAPORT_LLM_A3_MODEL, RAPORT_LLM_BATCH_SIZE или RAPORT_LLM_CONCURRENCY."
  Write-Host "3. Перезапустите сервис: 04-stop.cmd, затем 02-start.cmd."
  Write-Host "4. Проверьте состояние: 03-status.cmd."
  Write-Host ""
  Write-Host "Как изменить сайт Рапорта:" -ForegroundColor Cyan
  Write-Host "1. Запустите 05-change-frontend-site.cmd."
  Write-Host "2. Вставьте адрес страницы Рапорта, например https://bi.ekb.ru/llmtest/."
  Write-Host "3. Скрипт сохранит только origin, например https://bi.ekb.ru."
  Write-Host "4. Перезапустите сервис: 04-stop.cmd, затем 02-start.cmd."
}
