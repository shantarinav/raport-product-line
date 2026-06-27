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

function ConvertTo-RaportFrontendOrigin {
  param([string]$Value)

  $raw = if ($Value) { $Value.Trim() } else { "" }
  if (-not $raw) {
    throw "Адрес сайта Рапорта не указан."
  }

  if ($raw -notmatch "^[a-zA-Z][a-zA-Z0-9+.-]*://") {
    $raw = "https://$raw"
  }

  try {
    $uri = [System.Uri]::new($raw)
  } catch {
    throw "Не удалось распознать адрес сайта Рапорта: $Value"
  }

  if ($uri.Scheme -ne "http" -and $uri.Scheme -ne "https") {
    throw "Адрес сайта Рапорта должен начинаться с http:// или https://."
  }

  if (-not $uri.Host) {
    throw "В адресе сайта Рапорта не найден домен или IP."
  }

  $builder = [System.UriBuilder]::new($uri.Scheme, $uri.Host, $uri.Port)
  $builder.Path = ""
  $builder.Query = ""
  $builder.Fragment = ""
  return $builder.Uri.GetLeftPart([System.UriPartial]::Authority).TrimEnd("/")
}

function Split-PrintLlmAllowedOrigins {
  param([string]$Value = $env:PRINT_LLM_ALLOWED_ORIGINS)

  if (-not $Value) { return @() }
  return @(
    $Value.Split(",") |
      ForEach-Object { $_.Trim() } |
      Where-Object { $_ }
  )
}

function Join-PrintLlmAllowedOrigins {
  param([string[]]$Origins)

  $unique = New-Object System.Collections.Generic.List[string]
  foreach ($origin in $Origins) {
    $trimmed = if ($origin) { $origin.Trim() } else { "" }
    if ($trimmed -and -not $unique.Contains($trimmed)) {
      $unique.Add($trimmed)
    }
  }
  return ($unique -join ",")
}

function Set-PrintLlmEnvValue {
  param(
    [string]$Name,
    [string]$Value,
    [string]$Path = (Get-PrintLlmEnvPath)
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Файл настроек не найден: $Path. Сначала выполните 01-init-local.cmd или 01-init-lan.cmd."
  }

  $lines = @(Get-Content -LiteralPath $Path -Encoding UTF8)
  $updated = $false
  $result = New-Object System.Collections.Generic.List[string]

  foreach ($line in $lines) {
    if ($line -like "$Name=*") {
      if (-not $updated) {
        $result.Add("$Name=$Value")
        $updated = $true
      }
      continue
    }
    $result.Add($line)
  }

  if (-not $updated) {
    $result.Add("$Name=$Value")
  }

  Set-Content -LiteralPath $Path -Value $result -Encoding UTF8
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
    AllowedOrigins = @(Split-PrintLlmAllowedOrigins)
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
