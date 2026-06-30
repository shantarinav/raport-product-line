param([switch]$InteractiveHelp)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

if ($InteractiveHelp) {
  Write-Host "Рапорт: запуск ИИ-сервиса в фоне" -ForegroundColor Cyan
  Write-Host "Перед запуском должен быть создан файл настроек через 01-init-local.cmd или 01-init-lan.cmd."
  Write-Host ""
}

Import-PrintLlmEnv | Out-Null
Ensure-PrintLlmRuntimeDir | Out-Null

$existingHealth = Invoke-PrintLlmHealth -Quiet
if ($existingHealth -and $existingHealth.ok) {
  Write-Host "ИИ-сервис уже отвечает: $($existingHealth.service), модель $($existingHealth.model)." -ForegroundColor Green
  if ($InteractiveHelp) {
    Write-Host ""
    Write-Host "Что делать дальше:"
    Write-Host "1. Запустите 03-status.cmd для подробного состояния."
    Write-Host "2. Откройте Рапорт и проверьте подключение в Настройках."
  }
  exit 0
}

$nodeCommand = Get-Command node -ErrorAction Stop
$repoRoot = Get-RaportRoot
$stdoutPath = Get-PrintLlmStdoutPath
$stderrPath = Get-PrintLlmStderrPath

$process = Start-Process `
  -FilePath $nodeCommand.Source `
  -ArgumentList @("backend/raport-llm/server.mjs") `
  -WorkingDirectory $repoRoot `
  -RedirectStandardOutput $stdoutPath `
  -RedirectStandardError $stderrPath `
  -WindowStyle Hidden `
  -PassThru

Set-Content -LiteralPath (Get-PrintLlmPidPath) -Value $process.Id -Encoding UTF8
Write-Host "ИИ-сервис запускается. PID: $($process.Id)" -ForegroundColor Cyan
Start-Sleep -Seconds 2

$health = Invoke-PrintLlmHealth -Quiet
if ($health -and $health.ok) {
  Write-Host "ИИ-сервис готов к работе. Модель: $($health.model)." -ForegroundColor Green
  if ($InteractiveHelp) {
    Write-Host ""
    Write-Host "Что делать дальше:"
    Write-Host "1. Запустите 03-status.cmd."
    Write-Host "2. Если статус показывает, что сервис готов, откройте Рапорт и проверьте подключение в Настройках."
  }
  exit 0
}

Write-Host "Сервис запущен, но /health пока не ответил. Проверьте логи:" -ForegroundColor Yellow
Write-Host "stdout: $stdoutPath"
Write-Host "stderr: $stderrPath"
if ($InteractiveHelp) {
  Write-Host ""
  Write-Host "Что делать дальше:"
  Write-Host "1. Подождите несколько секунд и запустите 03-status.cmd."
  Write-Host "2. Если статус не изменится, откройте run-console.cmd и посмотрите ошибку в видимом окне."
}
exit 0
