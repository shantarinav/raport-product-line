param(
  [string]$TaskName = "Raport Print LLM Backend",
  [switch]$RunNow
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

$envPath = Get-PrintLlmEnvPath
if (-not (Test-Path -LiteralPath $envPath)) {
  throw "Файл настроек не найден: $envPath. Сначала выполните npm run backend:print-llm:init:local или init:lan."
}

$runScript = Join-Path $PSScriptRoot "run.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runScript`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DisallowStartIfOnBatteries:$false -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Raport optional Print LLM backend" -Force | Out-Null
Write-Host "Задача Windows создана: $TaskName" -ForegroundColor Green
Write-Host "Она будет запускать ИИ-сервис при входе текущего пользователя в Windows."

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Задача запущена. Через несколько секунд проверьте: npm run backend:print-llm:status"
}
