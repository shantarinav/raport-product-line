param(
  [ValidateSet("Local", "Lan", "")]
  [string]$Mode = "",
  [string]$FrontendOrigin = "",
  [string]$OllamaBaseUrl = "http://127.0.0.1:11434",
  [string]$Model = "qwen3:1.7b",
  [string]$A3Model = "qwen3:4b",
  [int]$Port = 8787,
  [switch]$Force,
  [switch]$StartAfterSetup,
  [switch]$Interactive
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

function Read-ChoiceOrDefault {
  param(
    [string]$Prompt,
    [string]$Default
  )
  $value = Read-Host "$Prompt [$Default]"
  if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
  return $value.Trim()
}

function Read-YesNo {
  param(
    [string]$Prompt,
    [bool]$Default = $false
  )
  $defaultText = if ($Default) { "Y" } else { "N" }
  $value = Read-Host "$Prompt [$defaultText]"
  if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
  return $value.Trim().ToLowerInvariant().StartsWith("y") -or $value.Trim().ToLowerInvariant().StartsWith("д")
}

if ($Interactive) {
  Write-Host "Рапорт: настройка ИИ-сервиса" -ForegroundColor Cyan
  Write-Host "Сервис нужен для ИИ-помощника и дополнительной проверки печати. Рапорт работает и без него."
  Write-Host ""

  if (-not $Mode) {
    Write-Host "Выберите режим:"
    Write-Host "1. На этом компьютере"
    Write-Host "2. В корпоративной сети для нескольких пользователей"
    $choice = Read-ChoiceOrDefault "Режим" "1"
    $Mode = if ($choice -eq "2") { "Lan" } else { "Local" }
  }

  $defaultOrigin = if ($Mode -eq "Lan") { "https://bi.ekb.ru" } else { "http://127.0.0.1:5173" }
  $FrontendOrigin = Read-ChoiceOrDefault "Адрес сайта Рапорта" $(if ($FrontendOrigin) { $FrontendOrigin } else { $defaultOrigin })
  $OllamaBaseUrl = Read-ChoiceOrDefault "Адрес Ollama" $OllamaBaseUrl
  $Model = Read-ChoiceOrDefault "Модель для анализа печати" $Model
  $A3Model = Read-ChoiceOrDefault "Модель для A3-помощника" $A3Model
  $Port = [int](Read-ChoiceOrDefault "Порт ИИ-сервиса" ([string]$Port))
  $shouldStartAfterSetup = Read-YesNo "Запустить сервис после настройки?" $true
}

if (-not $Mode) { $Mode = "Local" }
if (-not $Interactive) { $shouldStartAfterSetup = [bool]$StartAfterSetup }

$initArgs = @{
  Mode = $Mode
  FrontendOrigin = $FrontendOrigin
  OllamaBaseUrl = $OllamaBaseUrl
  Model = $Model
  A3Model = $A3Model
  Port = $Port
}
if ($Force) { $initArgs.Force = $true }
if ($Interactive) { $initArgs.InteractiveHelp = $true }

& "$PSScriptRoot\init-env.ps1" @initArgs
if (-not $?) { exit 1 }

if ($shouldStartAfterSetup) {
  Write-Host ""
  Write-Host "Запускаю ИИ-сервис..." -ForegroundColor Cyan
  & "$PSScriptRoot\start.ps1"
  if (-not $?) { exit 1 }
}

Write-Host ""
Write-Host "Следующий шаг:" -ForegroundColor Cyan
Write-Host "1. Запустите doctor.cmd, чтобы проверить Node, Ollama, модели и доступность сервиса."
Write-Host "2. В Рапорте откройте Настройки и проверьте подключение ИИ."
