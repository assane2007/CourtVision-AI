param(
    [string]$EnvPath = "apps/mobile/.env",
    [string]$ApiLocalHealthUrl = "http://127.0.0.1:8080/health",
    [string]$CvLocalHealthUrl = "http://127.0.0.1:8000/health"
)

$ErrorActionPreference = 'Stop'

function Read-EnvFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Env file not found: $Path"
    }

    $map = @{}
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
        if (-not [string]::IsNullOrWhiteSpace($key)) {
            $map[$key] = $value
        }
    }

    return $map
}

function Test-UrlStatus {
    param(
        [string]$Url,
        [int]$TimeoutSec = 10
    )

    if ([string]::IsNullOrWhiteSpace($Url)) {
        return 0
    }

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSec
        return [int]$response.StatusCode
    }
    catch {
        return 0
    }
}

$envMap = Read-EnvFile -Path $EnvPath

$apiBase = $envMap['EXPO_PUBLIC_API_URL']
$cvBase = $envMap['EXPO_PUBLIC_CV_ENGINE_URL']

$apiLocalStatus = Test-UrlStatus -Url $ApiLocalHealthUrl -TimeoutSec 6
$cvLocalStatus = Test-UrlStatus -Url $CvLocalHealthUrl -TimeoutSec 6

$apiPublicHealthStatus = 0
$apiPublicOnboardingStatus = 0
$cvPublicHealthStatus = 0

if (-not [string]::IsNullOrWhiteSpace($apiBase)) {
    $apiBaseTrimmed = $apiBase.TrimEnd('/')
    $apiPublicHealthStatus = Test-UrlStatus -Url "$apiBaseTrimmed/health" -TimeoutSec 12
    $apiPublicOnboardingStatus = Test-UrlStatus -Url "$apiBaseTrimmed/api/auth/onboarding/options" -TimeoutSec 12
}

if (-not [string]::IsNullOrWhiteSpace($cvBase)) {
    $cvBaseTrimmed = $cvBase.TrimEnd('/')
    $cvPublicHealthStatus = Test-UrlStatus -Url "$cvBaseTrimmed/health" -TimeoutSec 12
}

Write-Host ""
Write-Host "=== Mobile Runtime Health ==="
Write-Host "ENV API URL: $apiBase"
Write-Host "ENV CV URL:  $cvBase"
Write-Host ""
Write-Host "Local API health:              $apiLocalStatus"
Write-Host "Local CV health:               $cvLocalStatus"
Write-Host "Public API health:             $apiPublicHealthStatus"
Write-Host "Public API onboarding options: $apiPublicOnboardingStatus"
Write-Host "Public CV health:              $cvPublicHealthStatus"
Write-Host ""

$hasFailure = $false

if ($apiLocalStatus -ne 200) {
    Write-Host "FAIL: Local API is down."
    $hasFailure = $true
}

if ($cvLocalStatus -ne 200) {
    Write-Host "FAIL: Local CV engine is down."
    $hasFailure = $true
}

if ($apiPublicHealthStatus -ne 200) {
    Write-Host "FAIL: Public API health endpoint is unavailable."
    $hasFailure = $true
}

if ($apiPublicOnboardingStatus -ne 200) {
    Write-Host "FAIL: Public onboarding endpoint is unavailable."
    $hasFailure = $true
}

if ($cvPublicHealthStatus -ne 200) {
    Write-Host "FAIL: Public CV health endpoint is unavailable."
    $hasFailure = $true
}

if ($hasFailure) {
    exit 1
}

Write-Host "PASS: Mobile runtime endpoints are healthy."
exit 0
