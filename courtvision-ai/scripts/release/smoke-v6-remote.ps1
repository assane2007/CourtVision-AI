param(
    [ValidateSet('both', 'staging', 'production')]
    [string]$Scope = 'both',
    [string]$StagingBaseUrl = "https://api-staging.courtvision.ai",
    [string]$ProductionBaseUrl = "https://api.courtvision.ai",
    [string]$BearerToken = $env:COURTVISION_SMOKE_BEARER
)

$ErrorActionPreference = 'Stop'

$failures = New-Object System.Collections.Generic.List[string]

function Invoke-SmokeCheck {
    param(
        [string]$Method,
        [string]$Url,
        [int[]]$ExpectedStatusCodes,
        [string]$Body = $null
    )

    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($BearerToken)) {
        $headers['Authorization'] = "Bearer $BearerToken"
    }

    $statusCode = 0
    try {
        if ($null -ne $Body) {
            $resp = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -ContentType 'application/json' -Body $Body -UseBasicParsing -TimeoutSec 20
        }
        else {
            $resp = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -UseBasicParsing -TimeoutSec 20
        }
        $statusCode = [int]$resp.StatusCode
    }
    catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        else {
            $statusCode = -1
        }
    }

    $expected = ($ExpectedStatusCodes | ForEach-Object { $_.ToString() }) -join ','
    $line = "$Method $Url => $statusCode (expected: $expected)"

    if ($ExpectedStatusCodes -contains $statusCode) {
        Write-Host "PASS: $line"
    }
    else {
        Write-Host "FAIL: $line"
        $failures.Add($line)
    }
}

function Test-Environment {
    param(
        [string]$Name,
        [string]$BaseUrl
    )

    Write-Host ""
    Write-Host "=== $Name ==="

    $authExpected = if ([string]::IsNullOrWhiteSpace($BearerToken)) { @(401) } else { @(200) }

    Invoke-SmokeCheck -Method 'GET' -Url "$BaseUrl/health" -ExpectedStatusCodes @(200)
    Invoke-SmokeCheck -Method 'GET' -Url "$BaseUrl/api/arena/available" -ExpectedStatusCodes $authExpected
    Invoke-SmokeCheck -Method 'GET' -Url "$BaseUrl/api/reports/scout/00000000-0000-0000-0000-000000000001/pdf" -ExpectedStatusCodes $authExpected
    Invoke-SmokeCheck -Method 'POST' -Url "$BaseUrl/api/arena/create" -Body '{}' -ExpectedStatusCodes $authExpected
}

switch ($Scope) {
    'staging' {
        Test-Environment -Name 'staging' -BaseUrl $StagingBaseUrl
    }
    'production' {
        Test-Environment -Name 'production' -BaseUrl $ProductionBaseUrl
    }
    default {
        Test-Environment -Name 'staging' -BaseUrl $StagingBaseUrl
        Test-Environment -Name 'production' -BaseUrl $ProductionBaseUrl
    }
}

Write-Host ""
if ($failures.Count -gt 0) {
    Write-Host "Smoke checks failed: $($failures.Count)"
    $failures | ForEach-Object { Write-Host " - $_" }
    exit 1
}

Write-Host "All smoke checks passed."
