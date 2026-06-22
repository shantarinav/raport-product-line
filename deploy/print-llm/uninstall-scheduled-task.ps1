param([string]$TaskName = "Raport Print LLM Backend")

$ErrorActionPreference = "Stop"

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $task) {
  Write-Host "Задача Windows не найдена: $TaskName" -ForegroundColor Yellow
  exit 0
}

Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Задача Windows удалена: $TaskName" -ForegroundColor Green
