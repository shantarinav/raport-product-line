$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

Import-PrintLlmEnv | Out-Null
Ensure-PrintLlmRuntimeDir | Out-Null

$existingHealth = Invoke-PrintLlmHealth -Quiet
if ($existingHealth -and $existingHealth.ok) {
  Write-Host "ИИ-сервис уже отвечает: $($existingHealth.service), модель $($existingHealth.model)." -ForegroundColor Green
  exit 0
}

$nodeCommand = Get-Command node -ErrorAction Stop
$repoRoot = Get-RaportRoot
$stdoutPath = Get-PrintLlmStdoutPath
$stderrPath = Get-PrintLlmStderrPath

$process = Start-Process `
  -FilePath $nodeCommand.Source `
  -ArgumentList @("backend/print-llm/server.mjs") `
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
  exit 0
}

Write-Host "Сервис запущен, но /health пока не ответил. Проверьте логи:" -ForegroundColor Yellow
Write-Host "stdout: $stdoutPath"
Write-Host "stderr: $stderrPath"
exit 0
