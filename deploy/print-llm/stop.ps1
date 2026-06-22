param([switch]$InteractiveHelp)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

if ($InteractiveHelp) {
  Write-Host "Рапорт: остановка ИИ-сервиса Print" -ForegroundColor Cyan
  Write-Host ""
}

$process = Get-PrintLlmRunningProcess
if (-not $process) {
  Write-Host "Не найден запущенный процесс ИИ-сервиса по локальному PID-файлу." -ForegroundColor Yellow
  if ($InteractiveHelp) {
    Write-Host ""
    Write-Host "Что делать дальше:"
    Write-Host "- Если сервис все еще отвечает, остановите его вручную или перезагрузите backend-хост."
    Write-Host "- Чтобы запустить сервис снова, используйте 02-start.cmd."
  }
  exit 0
}

Stop-Process -Id $process.Id -Force
Remove-Item -LiteralPath (Get-PrintLlmPidPath) -Force -ErrorAction SilentlyContinue
Write-Host "ИИ-сервис остановлен. PID: $($process.Id)" -ForegroundColor Green
if ($InteractiveHelp) {
  Write-Host ""
  Write-Host "Что делать дальше:"
  Write-Host "- Чтобы снова включить ИИ-сервис, запустите 02-start.cmd."
  Write-Host "- Рапорт продолжит работать без ИИ-сервиса в обычном словарном режиме."
}
