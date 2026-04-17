param(
    [string]$ConfigPath = "scripts/release/.named-tunnels.env",
    [string]$StateDir = "scripts/release/.runtime/named-tunnels"
)

$ErrorActionPreference = 'Stop'

function Read-KeyValueFileOptional {
    param([string]$Path)

    $map = @{}
    if (-not (Test-Path -LiteralPath $Path)) {
        return $map
    }

    foreach ($line in Get-Content -LiteralPath $Path) {
        $trim = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trim) -or $trim.StartsWith('#')) {
            continue
        }

        $parts = $trim.Split('=', 2)
        if ($parts.Count -ne 2) {
            continue
        }

        $key = $parts[0].Trim()
        $value = $parts[1].Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        if (-not [string]::IsNullOrWhiteSpace($key)) {
            $map[$key] = $value
        }
    }

    return $map
}

function Get-ProcessFromPidFile {
    param([string]$PidFile)

    if (-not (Test-Path -LiteralPath $PidFile)) {
        return $null
    }

    $rawPid = Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if ([string]::IsNullOrWhiteSpace($rawPid)) {
        return $null
    }

    $pidValue = 0
    [void][int]::TryParse($rawPid.Trim(), [ref]$pidValue)
    if ($pidValue -le 0) {
        return $null
    }

    try {
        return Get-Process -Id $pidValue -ErrorAction Stop
    }
    catch {
        return $null
    }
}

function Test-UrlStatus {
    param(
        [string]$Url,
        [int]$TimeoutSec = 8
    )

    if ([string]::IsNullOrWhiteSpace($Url)) {
        return 0
    }

    try {
        $resp = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSec
        return [int]$resp.StatusCode
    }
    catch {
        return 0
    }
}

$config = Read-KeyValueFileOptional -Path $ConfigPath

$apiPidFile = Join-Path $StateDir 'api.pid'
$cvPidFile = Join-Path $StateDir 'cv.pid'
$apiOutLog = Join-Path $StateDir 'api.out.log'
$apiErrLog = Join-Path $StateDir 'api.err.log'
$cvOutLog = Join-Path $StateDir 'cv.out.log'
$cvErrLog = Join-Path $StateDir 'cv.err.log'

$apiProc = Get-ProcessFromPidFile -PidFile $apiPidFile
$cvProc = Get-ProcessFromPidFile -PidFile $cvPidFile

Write-Host ''
Write-Host '=== Named Tunnel Status ==='
Write-Host "Config file:  $ConfigPath"
Write-Host "State folder: $StateDir"
Write-Host ''

if ($apiProc) {
    Write-Host "API tunnel process: RUNNING (PID=$($apiProc.Id))"
}
else {
    Write-Host 'API tunnel process: STOPPED'
}

if ($cvProc) {
    Write-Host "CV tunnel process:  RUNNING (PID=$($cvProc.Id))"
}
else {
    Write-Host 'CV tunnel process:  STOPPED'
}

$apiBase = $config['API_PUBLIC_URL']
$cvBase = $config['CV_PUBLIC_URL']

if (-not [string]::IsNullOrWhiteSpace($apiBase)) {
    $apiStatus = Test-UrlStatus -Url ($apiBase.TrimEnd('/') + '/health')
    $onboardingStatus = Test-UrlStatus -Url ($apiBase.TrimEnd('/') + '/api/auth/onboarding/options')
    Write-Host "API public /health: $apiStatus"
    Write-Host "API public onboarding options: $onboardingStatus"
}
else {
    Write-Host 'API public URL: not configured'
}

if (-not [string]::IsNullOrWhiteSpace($cvBase)) {
    $cvStatus = Test-UrlStatus -Url ($cvBase.TrimEnd('/') + '/health')
    Write-Host "CV public /health: $cvStatus"
}
else {
    Write-Host 'CV public URL: not configured'
}

Write-Host ''
Write-Host "API logs: $apiOutLog"
Write-Host "API errors: $apiErrLog"
Write-Host "CV logs: $cvOutLog"
Write-Host "CV errors: $cvErrLog"
