param(
  [string]$FrontendOrigin,
  [switch]$InteractiveHelp
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

if ($InteractiveHelp) {
  Write-Host "Рапорт: настройка сайта, которому разрешен доступ к ИИ-сервису" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Вставьте адрес страницы Рапорта целиком. Скрипт сам сохранит только сайт."
  Write-Host "Пример ввода: https://bi.ekb.ru/llmtest/#/print"
  Write-Host "Будет сохранено: https://bi.ekb.ru"
  Write-Host ""
}

if (-not (Test-Path -LiteralPath (Get-PrintLlmEnvPath))) {
  Write-Host "Файл настроек backend не найден." -ForegroundColor Yellow
  Write-Host "Сначала выполните 01-init-local.cmd или 01-init-lan.cmd."
  exit 1
}

Import-PrintLlmEnv | Out-Null
$config = Get-PrintLlmConfigFromEnv

if ($InteractiveHelp -and $config.AllowedOrigins.Count -gt 0) {
  Write-Host "Сейчас разрешены:" -ForegroundColor Cyan
  foreach ($origin in $config.AllowedOrigins) {
    Write-Host "- $origin"
  }
  Write-Host ""
}

if (-not $FrontendOrigin) {
  $FrontendOrigin = Read-Host "Введите адрес сайта Рапорта"
}

try {
  $origin = ConvertTo-RaportFrontendOrigin $FrontendOrigin
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}

$origins = @($config.AllowedOrigins)
if (-not $origins.Contains("http://localhost:5173")) {
  $origins += "http://localhost:5173"
}
if (-not $origins.Contains("http://127.0.0.1:5173")) {
  $origins += "http://127.0.0.1:5173"
}
if (-not $origins.Contains($origin)) {
  $origins += $origin
}

$joined = Join-PrintLlmAllowedOrigins $origins
Set-PrintLlmEnvValue -Name "RAPORT_LLM_ALLOWED_ORIGINS" -Value $joined

Write-Host "Сайт Рапорта добавлен в разрешенные адреса:" -ForegroundColor Green
Write-Host $origin

if ($InteractiveHelp) {
  Write-Host ""
  Write-Host "Что делать дальше:"
  Write-Host "1. Перезапустите ИИ-сервис: 04-stop.cmd, затем 02-start.cmd."
  Write-Host "2. Проверьте состояние: 03-status.cmd."
  Write-Host "3. В Рапорте снова нажмите проверку ИИ."
}
