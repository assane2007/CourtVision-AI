param(
    [string]$ApiHealthUrl = "http://127.0.0.1:8080/health",
    [string]$CvHealthUrl = "http://127.0.0.1:8000/health",
    [string]$CvNbaHealthUrl = "http://127.0.0.1:8000/nba/health",
    [int]$TimeoutSec = 8,
    [switch]$AllowDegradedApi,
    [switch]$AllowDatabaseUnavailable,
    [switch]$AllowWarmingCv,
    [switch]$AllowNbaUnavailable
)

$ErrorActionPreference = 'Stop'

function Invoke-JsonRequest {
    param(
        [string]$Url,
        [string]$Method = 'GET',
        [hashtable]$Headers,
        [string]$Body
    )

    try {
        $invokeArgs = @{
            UseBasicParsing = $true
            Uri = $Url
            Method = $Method
            TimeoutSec = $TimeoutSec
        }

        if ($Headers) {
            $invokeArgs['Headers'] = $Headers
        }

        if (-not [string]::IsNullOrWhiteSpace($Body)) {
            $invokeArgs['Body'] = $Body
            $invokeArgs['ContentType'] = 'application/json'
        }

        $response = Invoke-WebRequest @invokeArgs
        $json = $null
        try {
            $json = $response.Content | ConvertFrom-Json
        }
        catch {
            $json = $null
        }

        return @{
            ok = $true
            statusCode = [int]$response.StatusCode
            body = $json
            raw = [string]$response.Content
            error = ''
        }
    }
    catch {
        $statusCode = 0
        $raw = ''

        if ($_.Exception.Response) {
            try {
                $statusCode = [int]$_.Exception.Response.StatusCode.value__
            }
            catch {}

            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $raw = $reader.ReadToEnd()
            }
            catch {}
        }

        $json = $null
        if (-not [string]::IsNullOrWhiteSpace($raw)) {
            try {
                $json = $raw | ConvertFrom-Json
            }
            catch {
                $json = $null
            }
        }

        return @{
            ok = $false
            statusCode = $statusCode
            body = $json
            raw = $raw
            error = [string]$_.Exception.Message
        }
    }
}

function Add-CheckResult {
    param(
        [string]$Name,
        [bool]$Passed,
        [string]$Detail
    )

    return [PSCustomObject]@{
        Check = $Name
        Status = if ($Passed) { 'PASS' } else { 'FAIL' }
        Detail = $Detail
    }
}

$results = New-Object System.Collections.Generic.List[object]
$hasFailure = $false

Write-Host ''
Write-Host '=== Backend + CV Runtime Health ==='
Write-Host "API Health URL:    $ApiHealthUrl"
Write-Host "CV Health URL:     $CvHealthUrl"
Write-Host "CV NBA Health URL: $CvNbaHealthUrl"
Write-Host ''

$cvBaseUrl = $CvHealthUrl
if ($cvBaseUrl.EndsWith('/health')) {
    $cvBaseUrl = $cvBaseUrl.Substring(0, $cvBaseUrl.Length - '/health'.Length)
}
$cvBaseUrl = $cvBaseUrl.TrimEnd('/')

# 1) Backend health
$apiHealth = Invoke-JsonRequest -Url $ApiHealthUrl
if (-not $apiHealth.ok -or $apiHealth.statusCode -ne 200 -or -not $apiHealth.body) {
    $hasFailure = $true
    $results.Add((Add-CheckResult -Name 'backend.health.http' -Passed:$false -Detail "HTTP=$($apiHealth.statusCode) $($apiHealth.error)"))
}
else {
    $results.Add((Add-CheckResult -Name 'backend.health.http' -Passed:$true -Detail "HTTP=200"))

    $service = [string]$apiHealth.body.service
    $status = [string]$apiHealth.body.status
    $dbStatus = [string]$apiHealth.body.checks.database
    $cvStatus = [string]$apiHealth.body.checks.cvEngine

    $serviceOk = ($service -eq 'courtvision-api')
    if (-not $serviceOk) {
        $hasFailure = $true
    }
    $results.Add((Add-CheckResult -Name 'backend.health.service' -Passed:$serviceOk -Detail "service=$service"))

    $statusOk = ($status -eq 'ok') -or ($AllowDegradedApi.IsPresent -and $status -eq 'degraded')
    if (-not $statusOk) {
        $hasFailure = $true
    }
    $results.Add((Add-CheckResult -Name 'backend.health.status' -Passed:$statusOk -Detail "status=$status allowDegraded=$($AllowDegradedApi.IsPresent)"))

    $dbOk = ($dbStatus -eq 'ok') -or ($AllowDatabaseUnavailable.IsPresent -and $dbStatus -eq 'error')
    if (-not $dbOk) {
        $hasFailure = $true
    }
    $results.Add((Add-CheckResult -Name 'backend.health.database' -Passed:$dbOk -Detail "database=$dbStatus allowUnavailable=$($AllowDatabaseUnavailable.IsPresent)"))

    $cvOk = ($cvStatus -eq 'ok') -or ($cvStatus -eq 'skipped')
    if (-not $cvOk) {
        $hasFailure = $true
    }
    $results.Add((Add-CheckResult -Name 'backend.health.cvEngine' -Passed:$cvOk -Detail "cvEngine=$cvStatus"))
}

# 2) CV health
$cvHealth = Invoke-JsonRequest -Url $CvHealthUrl
if (-not $cvHealth.ok -or $cvHealth.statusCode -ne 200 -or -not $cvHealth.body) {
    $hasFailure = $true
    $results.Add((Add-CheckResult -Name 'cv.health.http' -Passed:$false -Detail "HTTP=$($cvHealth.statusCode) $($cvHealth.error)"))
}
else {
    $results.Add((Add-CheckResult -Name 'cv.health.http' -Passed:$true -Detail 'HTTP=200'))

    $cvService = [string]$cvHealth.body.service
    $cvStatus = [string]$cvHealth.body.status
    $modelsReady = [bool]$cvHealth.body.models_ready

    $cvServiceOk = ($cvService -eq 'cv-engine')
    if (-not $cvServiceOk) {
        $hasFailure = $true
    }
    $results.Add((Add-CheckResult -Name 'cv.health.service' -Passed:$cvServiceOk -Detail "service=$cvService"))

    $cvStatusOk = ($cvStatus -eq 'ok') -or ($AllowWarmingCv.IsPresent -and $cvStatus -eq 'warming-up')
    if (-not $cvStatusOk) {
        $hasFailure = $true
    }
    $results.Add((Add-CheckResult -Name 'cv.health.status' -Passed:$cvStatusOk -Detail "status=$cvStatus allowWarming=$($AllowWarmingCv.IsPresent)"))

    $modelsOk = $modelsReady -or $AllowWarmingCv.IsPresent
    if (-not $modelsOk) {
        $hasFailure = $true
    }
    $results.Add((Add-CheckResult -Name 'cv.health.models_ready' -Passed:$modelsOk -Detail "models_ready=$modelsReady"))
}

# 3) CV NBA provider health
$nbaHealth = Invoke-JsonRequest -Url $CvNbaHealthUrl
if (-not $nbaHealth.ok -or $nbaHealth.statusCode -ne 200 -or -not $nbaHealth.body) {
    $hasFailure = $true
    $results.Add((Add-CheckResult -Name 'cv.nba.http' -Passed:$false -Detail "HTTP=$($nbaHealth.statusCode) $($nbaHealth.error)"))
}
else {
    $results.Add((Add-CheckResult -Name 'cv.nba.http' -Passed:$true -Detail 'HTTP=200'))

    $success = [bool]$nbaHealth.body.success
    $available = [bool]$nbaHealth.body.data.api_available
    $reason = [string]$nbaHealth.body.data.reason

    $successOk = $success
    if (-not $successOk) {
        $hasFailure = $true
    }
    $results.Add((Add-CheckResult -Name 'cv.nba.success' -Passed:$successOk -Detail "success=$success"))

    $availabilityOk = $available -or $AllowNbaUnavailable.IsPresent
    if (-not $availabilityOk) {
        $hasFailure = $true
    }
    $results.Add((Add-CheckResult -Name 'cv.nba.available' -Passed:$availabilityOk -Detail "api_available=$available reason=$reason allowUnavailable=$($AllowNbaUnavailable.IsPresent)"))
}

# 4) Endpoint contract smoke checks
$tinyFramePayload = '{"frame_base64":"aGVsbG8="}'
$frameProbe = Invoke-JsonRequest -Url ($cvBaseUrl + '/analyze/frame-base64') -Method 'POST' -Body $tinyFramePayload
$frameEndpointOk = ($frameProbe.statusCode -eq 400 -or $frameProbe.statusCode -eq 413)
if (-not $frameEndpointOk) {
    $hasFailure = $true
}
$results.Add((Add-CheckResult -Name 'cv.endpoint.frame_base64' -Passed:$frameEndpointOk -Detail "status=$($frameProbe.statusCode)"))

$jobProbe = Invoke-JsonRequest -Url ($cvBaseUrl + '/job/nonexistent-job/status') -Method 'GET'
$jobEndpointOk = ($jobProbe.statusCode -eq 404)
if (-not $jobEndpointOk) {
    $hasFailure = $true
}
$results.Add((Add-CheckResult -Name 'cv.endpoint.job_status' -Passed:$jobEndpointOk -Detail "status=$($jobProbe.statusCode)"))

Write-Host ''
$results | Format-Table -AutoSize
Write-Host ''

if ($hasFailure) {
    Write-Host 'FAIL: Backend + CV runtime checks are not fully healthy.'
    Write-Host 'Hints:'
    Write-Host ' - Backend DB: verify Supabase env and connectivity.'
    Write-Host ' - CV models: install runtime deps and restart CV engine.'
    Write-Host ' - NBA data: install nba_api in CV environment or allow degraded mode for local dev.'
    exit 1
}

Write-Host 'PASS: Backend + CV runtime checks are healthy.'
exit 0