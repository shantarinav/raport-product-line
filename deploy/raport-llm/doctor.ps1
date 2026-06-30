param([switch]$Interactive)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\common.ps1"

$issues = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Add-Issue([string]$Message) { $issues.Add($Message) | Out-Null }
function Add-Warning([string]$Message) { $warnings.Add($Message) | Out-Null }
function Show-Ok([string]$Message) { Write-Host "[OK] $Message" -ForegroundColor Green }
function Show-Warn([string]$Message) { Write-Host "[!] $Message" -ForegroundColor Yellow }
function Show-Fail([string]$Message) { Write-Host "[X] $Message" -ForegroundColor Red }

function Test-PortFree {
  param([string]$HostName, [int]$Port)
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $task = $client.ConnectAsync($HostName, $Port)
    $connected = $task.Wait(500)
    $client.Dispose()
    return -not $connected
  } catch {
    return $true
  }
}

function Invoke-JsonGet {
  param([string]$Url)
  try {
    return Invoke-RestMethod -Uri $Url -TimeoutSec 5
  } catch {
    return $null
  }
}

Write-Host "Рапорт: диагностика ИИ-сервиса" -ForegroundColor Cyan
Write-Host ""

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $nodeVersion = (& node --version) 2>$null
  Show-Ok "Node.js найден: $nodeVersion"
} else {
  Show-Fail "Node.js не найден. Установите Node.js и повторите проверку."
  Add-Issue "Node.js не найден."
}

$envPath = Get-PrintLlmEnvPath
if (Test-Path -LiteralPath $envPath) {
  Show-Ok "Файл настроек найден: $envPath"
  Import-PrintLlmEnv | Out-Null
} else {
  Show-Fail "Файл настроек не найден: $envPath"
  Add-Issue "Сначала запустите 00-setup.cmd или npm run backend:raport-llm:init:local."
}

$config = Get-PrintLlmConfigFromEnv
$healthHost = $config.HealthHost
if ($healthHost -eq "0.0.0.0") { $healthHost = "127.0.0.1" }

$runningHealth = Invoke-PrintLlmHealth -Quiet
if ($runningHealth) {
  Show-Ok "ИИ-сервис отвечает: $($config.BaseUrl)"
} else {
  if (Test-PortFree -HostName $healthHost -Port $config.Port) {
    Show-Warn "Порт $($config.Port) свободен: сервис, вероятно, не запущен."
    Add-Warning "Запустите 02-start.cmd или npm run backend:raport-llm:start."
  } else {
    Show-Warn "Порт $($config.Port) занят, но /health не ответил корректно."
    Add-Warning "Проверьте, не запущен ли другой процесс на этом порту."
  }
}

$ollamaBase = if ($env:RAPORT_LLM_OLLAMA_BASE_URL) { $env:RAPORT_LLM_OLLAMA_BASE_URL } elseif ($env:OLLAMA_BASE_URL) { $env:OLLAMA_BASE_URL } else { "http://127.0.0.1:11434" }
$ollamaTagsUrl = "$($ollamaBase.TrimEnd('/'))/api/tags"
$tags = Invoke-JsonGet $ollamaTagsUrl
if ($tags) {
  Show-Ok "Ollama отвечает: $ollamaBase"
  $availableModels = @($tags.models | ForEach-Object { $_.name })
  foreach ($modelName in @($config.Model, $env:RAPORT_LLM_A3_MODEL)) {
    if (-not $modelName) { continue }
    if ($availableModels -contains $modelName) {
      Show-Ok "Модель доступна: $modelName"
    } else {
      Show-Warn "Модель не найдена в Ollama: $modelName"
      Add-Warning "Загрузите модель: ollama pull $modelName"
    }
  }
} else {
  Show-Warn "Ollama не ответила по адресу $ollamaBase."
  Add-Warning "Запустите Ollama и проверьте RAPORT_LLM_OLLAMA_BASE_URL."
}

if ($config.AllowedOrigins.Count -gt 0) {
  Show-Ok "Разрешенные сайты Рапорта: $($config.AllowedOrigins -join ', ')"
} else {
  Show-Warn "Не указаны разрешенные сайты Рапорта."
  Add-Warning "Добавьте сайт через 05-change-frontend-site.cmd."
}

Write-Host ""
if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
  Write-Host "Итог: критичных проблем не найдено." -ForegroundColor Green
  exit 0
}

if ($issues.Count -gt 0) {
  Write-Host "Что нужно исправить:" -ForegroundColor Red
  foreach ($issue in $issues) { Write-Host "- $issue" }
}

if ($warnings.Count -gt 0) {
  Write-Host "Рекомендации:" -ForegroundColor Yellow
  foreach ($warning in $warnings) { Write-Host "- $warning" }
}

if ($issues.Count -gt 0) { exit 1 }
exit 0
