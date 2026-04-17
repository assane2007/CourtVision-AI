param(
    [string]$StateDir = "scripts/release/.runtime/named-tunnels"
)

$ErrorActionPreference = 'Stop'

function Stop-TunnelProcess {
    param(
        [string]$Name,
        [string]$PidFile
    )

    if (-not (Test-Path -LiteralPath $PidFile)) {
        Write-Host "SKIP: $Name tunnel is not tracked (no pid file)."
        return
    }

    $rawPid = Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    $pidValue = 0
    [void][int]::TryParse(($rawPid | Out-String).Trim(), [ref]$pidValue)

    if ($pidValue -le 0) {
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        Write-Host "CLEANED: $Name pid file was invalid."
        return
    }

    try {
        $proc = Get-Process -Id $pidValue -ErrorAction Stop
        Stop-Process -Id $proc.Id -Force -ErrorAction Stop
        Write-Host "STOPPED: $Name tunnel process PID=$($proc.Id)"
    }
    catch {
        Write-Host "CLEANED: $Name tunnel process already stopped (PID=$pidValue)."
    }

    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath $StateDir)) {
    Write-Host "No tunnel state directory found at $StateDir"
    exit 0
}

$apiPidFile = Join-Path $StateDir 'api.pid'
$cvPidFile = Join-Path $StateDir 'cv.pid'

Write-Host ''
Write-Host 'Stopping named tunnel processes...'
Stop-TunnelProcess -Name 'API' -PidFile $apiPidFile
Stop-TunnelProcess -Name 'CV' -PidFile $cvPidFile
Write-Host 'Done.'
