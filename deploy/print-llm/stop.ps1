$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

$process = Get-PrintLlmRunningProcess
if (-not $process) {
  Write-Host "Не найден запущенный процесс ИИ-сервиса по локальному PID-файлу." -ForegroundColor Yellow
  exit 0
}

Stop-Process -Id $process.Id -Force
Remove-Item -LiteralPath (Get-PrintLlmPidPath) -Force -ErrorAction SilentlyContinue
Write-Host "ИИ-сервис остановлен. PID: $($process.Id)" -ForegroundColor Green
