$ErrorActionPreference = "Stop"

function Get-RaportRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Get-PrintLlmBackendDir {
  return (Join-Path (Get-RaportRoot) "backend\print-llm")
}

function Get-PrintLlmEnvPath {
  return (Join-Path (Get-PrintLlmBackendDir) ".env")
}

function Get-PrintLlmRuntimeDir {
  return (Join-Path (Get-PrintLlmBackendDir) ".runtime")
}

function Get-PrintLlmPidPath {
  return (Join-Path (Get-PrintLlmRuntimeDir) "print-llm.pid")
}

function Get-PrintLlmStdoutPath {
  return (Join-Path (Get-PrintLlmRuntimeDir) "print-llm.out.log")
}

function Get-PrintLlmStderrPath {
  return (Join-Path (Get-PrintLlmRuntimeDir) "print-llm.err.log")
}

function Ensure-PrintLlmRuntimeDir {
  $runtimeDir = Get-PrintLlmRuntimeDir
  if (-not (Test-Path -LiteralPath $runtimeDir)) {
    New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
  }
  return $runtimeDir
}

function Import-PrintLlmEnv {
  param(
    [string]$Path = (Get-PrintLlmEnvPath),
    [switch]$Optional
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    if ($Optional) { return $false }
    throw "Файл настроек не найден: $Path. Сначала выполните deploy\print-llm\init-env.ps1."
  }

  foreach ($line in Get-Content -LiteralPath $Path -Encoding UTF8) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $separator = $trimmed.IndexOf("=")
    if ($separator -lt 1) { continue }

    $name = $trimmed.Substring(0, $separator).Trim()
    $value = $trimmed.Substring($separator + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }

  return $true
}

function Get-PrintLlmConfigFromEnv {
  $hostName = if ($env:PRINT_LLM_HOST) { $env:PRINT_LLM_HOST } else { "127.0.0.1" }
  $healthHost = if ($hostName -eq "0.0.0.0") { "127.0.0.1" } else { $hostName }
  $port = if ($env:PRINT_LLM_PORT) { [int]$env:PRINT_LLM_PORT } else { 8787 }
  $scheme = "http"
  $baseUrl = "${scheme}://${healthHost}:${port}"

  return [pscustomobject]@{
    Host = $hostName
    HealthHost = $healthHost
    Port = $port
    BaseUrl = $baseUrl
    HealthUrl = "$baseUrl/health"
    ApiKey = $env:PRINT_LLM_API_KEY
    Model = if ($env:PRINT_LLM_MODEL) { $env:PRINT_LLM_MODEL } else { "qwen3:4b" }
  }
}

function Get-PrintLlmAuthHeaders {
  $headers = @{}
  if ($env:PRINT_LLM_API_KEY) {
    $headers["X-Raport-Backend-Key"] = $env:PRINT_LLM_API_KEY
  }
  return $headers
}

function Invoke-PrintLlmHealth {
  param([switch]$Quiet)

  $config = Get-PrintLlmConfigFromEnv
  try {
    return Invoke-RestMethod -Uri $config.HealthUrl -Headers (Get-PrintLlmAuthHeaders) -TimeoutSec 5
  } catch {
    if (-not $Quiet) {
      Write-Host "ИИ-сервис не ответил по адресу $($config.HealthUrl)." -ForegroundColor Yellow
      Write-Host $_.Exception.Message -ForegroundColor DarkYellow
    }
    return $null
  }
}

function Get-PrintLlmRunningProcess {
  $pidPath = Get-PrintLlmPidPath
  if (-not (Test-Path -LiteralPath $pidPath)) { return $null }

  $rawPid = (Get-Content -LiteralPath $pidPath -Encoding UTF8 | Select-Object -First 1).Trim()
  if (-not $rawPid) { return $null }

  try {
    return Get-Process -Id ([int]$rawPid) -ErrorAction Stop
  } catch {
    return $null
  }
}
