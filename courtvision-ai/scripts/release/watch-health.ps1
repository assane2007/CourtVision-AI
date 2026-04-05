param(
    [ValidateSet('both', 'staging', 'production')]
    [string]$Scope = 'both',
    [string]$StagingBaseUrl = "",
    [string]$ProductionBaseUrl = "",
    [string]$StagingHealthUrl = "https://api-staging.courtvision.ai/health",
    [string]$ProductionHealthUrl = "https://api.courtvision.ai/health",
    [int]$DurationMinutes = 60,
    [int]$IntervalSeconds = 30
)

$ErrorActionPreference = 'Stop'

if (-not [string]::IsNullOrWhiteSpace($StagingBaseUrl)) {
    $StagingHealthUrl = "$($StagingBaseUrl.TrimEnd('/'))/health"
}

if (-not [string]::IsNullOrWhiteSpace($ProductionBaseUrl)) {
    $ProductionHealthUrl = "$($ProductionBaseUrl.TrimEnd('/'))/health"
}

$deadline = (Get-Date).AddMinutes($DurationMinutes)
$failCount = 0

function Test-Health {
    param(
        [string]$Name,
        [string]$Url
    )

    try {
        $resp = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 15
        $status = [int]$resp.StatusCode
        if ($status -eq 200) {
            Write-Host "[$(Get-Date -Format s)] $Name OK ($status)"
            return $true
        }

        Write-Host "[$(Get-Date -Format s)] $Name FAIL ($status)"
        return $false
    }
    catch {
        Write-Host "[$(Get-Date -Format s)] $Name FAIL (network)"
        return $false
    }
}

while ((Get-Date) -lt $deadline) {
    if ($Scope -eq 'both' -or $Scope -eq 'staging') {
        $s = Test-Health -Name 'staging' -Url $StagingHealthUrl
        if (-not $s) { $failCount++ }
    }

    if ($Scope -eq 'both' -or $Scope -eq 'production') {
        $p = Test-Health -Name 'production' -Url $ProductionHealthUrl
        if (-not $p) { $failCount++ }
    }

    Start-Sleep -Seconds $IntervalSeconds
}

Write-Host ""
Write-Host "Health watch completed. Failure count: $failCount"
if ($failCount -gt 0) {
    exit 1
}
