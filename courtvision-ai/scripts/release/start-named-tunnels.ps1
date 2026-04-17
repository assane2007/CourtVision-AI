param(
    [string]$ConfigPath = "scripts/release/.named-tunnels.env",
    [string]$StateDir = "scripts/release/.runtime/named-tunnels",
    [string]$MobileEnvPath = "apps/mobile/.env",
    [switch]$UpdateMobileEnv
)

$ErrorActionPreference = 'Stop'

function Read-KeyValueFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Config file not found: $Path. Copy scripts/release/named-tunnels.env.example to $Path and fill values."
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
        if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        if (-not [string]::IsNullOrWhiteSpace($key)) {
            $map[$key] = $value
        }
    }

    return $map
}

function Resolve-CloudflaredPath {
    param([string]$ConfiguredPath)

    if (-not [string]::IsNullOrWhiteSpace($ConfiguredPath)) {
        if (Test-Path -LiteralPath $ConfiguredPath) {
            return (Resolve-Path -LiteralPath $ConfiguredPath).Path
        }

        throw "Configured CLOUDFLARED_BIN path does not exist: $ConfiguredPath"
    }

    $cloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cloudflaredCmd) {
        return $cloudflaredCmd.Source
    }

    $fallbackPaths = @(
        'C:\Program Files (x86)\cloudflared\cloudflared.exe',
        'C:\Program Files\cloudflared\cloudflared.exe'
    )

    foreach ($path in $fallbackPaths) {
        if (Test-Path -LiteralPath $path) {
            return $path
        }
    }

    throw 'cloudflared executable not found. Install Cloudflare.cloudflared or set CLOUDFLARED_BIN in scripts/release/.named-tunnels.env.'
}

function Get-ActiveProcessFromPidFile {
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

function Set-EnvKeyValue {
    param(
        [string[]]$Lines,
        [string]$Key,
        [string]$Value
    )

    $pattern = '^\s*' + [regex]::Escape($Key) + '='
    $replaced = $false
    $updated = New-Object System.Collections.Generic.List[string]

    foreach ($line in $Lines) {
        if (-not $replaced -and $line -match $pattern) {
            $updated.Add("$Key=$Value")
            $replaced = $true
            continue
        }

        $updated.Add($line)
    }

    if (-not $replaced) {
        $updated.Add("$Key=$Value")
    }

    return ,$updated.ToArray()
}

function Convert-ToWebSocketUrl {
    param([string]$BaseUrl)

    $trimmed = $BaseUrl.TrimEnd('/')
    if ($trimmed.StartsWith('https://')) {
        return 'wss://' + $trimmed.Substring('https://'.Length) + '/ws'
    }

    if ($trimmed.StartsWith('http://')) {
        return 'ws://' + $trimmed.Substring('http://'.Length) + '/ws'
    }

    throw "Unsupported API_PUBLIC_URL format: $BaseUrl"
}

function Start-TunnelProcess {
    param(
        [string]$Name,
        [string]$Token,
        [string]$CloudflaredPath,
        [string]$PidFile,
        [string]$StdOutLog,
        [string]$StdErrLog
    )

    if ([string]::IsNullOrWhiteSpace($Token)) {
        throw "$Name token is missing. Fill $($Name)_TUNNEL_TOKEN in scripts/release/.named-tunnels.env."
    }

    $existing = Get-ActiveProcessFromPidFile -PidFile $PidFile
    if ($existing) {
        Write-Host "SKIP: $Name tunnel already running (PID=$($existing.Id))."
        return [int]$existing.Id
    }

    if (Test-Path -LiteralPath $PidFile) {
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
    }

    $args = @('tunnel', '--no-autoupdate', 'run', '--token', $Token)
    $proc = Start-Process -FilePath $CloudflaredPath -ArgumentList $args -RedirectStandardOutput $StdOutLog -RedirectStandardError $StdErrLog -PassThru -WindowStyle Hidden
    Set-Content -LiteralPath $PidFile -Value ([string]$proc.Id) -Encoding ASCII

    Write-Host "STARTED: $Name tunnel PID=$($proc.Id)"
    return [int]$proc.Id
}

$config = Read-KeyValueFile -Path $ConfigPath
$cloudflaredPath = Resolve-CloudflaredPath -ConfiguredPath $config['CLOUDFLARED_BIN']

$apiToken = $config['API_TUNNEL_TOKEN']
$cvToken = $config['CV_TUNNEL_TOKEN']
$apiPublicUrl = $config['API_PUBLIC_URL']
$cvPublicUrl = $config['CV_PUBLIC_URL']

if ([string]::IsNullOrWhiteSpace($apiPublicUrl)) {
    throw 'API_PUBLIC_URL is required in scripts/release/.named-tunnels.env.'
}

if ([string]::IsNullOrWhiteSpace($cvPublicUrl)) {
    throw 'CV_PUBLIC_URL is required in scripts/release/.named-tunnels.env.'
}

if (-not (Test-Path -LiteralPath $StateDir)) {
    New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
}

$apiPidFile = Join-Path $StateDir 'api.pid'
$cvPidFile = Join-Path $StateDir 'cv.pid'
$apiOutLog = Join-Path $StateDir 'api.out.log'
$apiErrLog = Join-Path $StateDir 'api.err.log'
$cvOutLog = Join-Path $StateDir 'cv.out.log'
$cvErrLog = Join-Path $StateDir 'cv.err.log'

$apiPid = Start-TunnelProcess -Name 'API' -Token $apiToken -CloudflaredPath $cloudflaredPath -PidFile $apiPidFile -StdOutLog $apiOutLog -StdErrLog $apiErrLog
$cvPid = Start-TunnelProcess -Name 'CV' -Token $cvToken -CloudflaredPath $cloudflaredPath -PidFile $cvPidFile -StdOutLog $cvOutLog -StdErrLog $cvErrLog

if ($UpdateMobileEnv) {
    if (-not (Test-Path -LiteralPath $MobileEnvPath)) {
        throw "Mobile env file not found: $MobileEnvPath"
    }

    $apiPublicUrl = $apiPublicUrl.TrimEnd('/')
    $cvPublicUrl = $cvPublicUrl.TrimEnd('/')
    $wsUrl = Convert-ToWebSocketUrl -BaseUrl $apiPublicUrl

    $lines = Get-Content -LiteralPath $MobileEnvPath -ErrorAction SilentlyContinue
    if ($null -eq $lines) {
        $lines = @()
    }

    $lines = Set-EnvKeyValue -Lines $lines -Key 'EXPO_PUBLIC_API_URL' -Value $apiPublicUrl
    $lines = Set-EnvKeyValue -Lines $lines -Key 'EXPO_PUBLIC_WS_URL' -Value $wsUrl
    $lines = Set-EnvKeyValue -Lines $lines -Key 'EXPO_PUBLIC_CV_ENGINE_URL' -Value $cvPublicUrl

    Set-Content -LiteralPath $MobileEnvPath -Value $lines -Encoding UTF8
    Write-Host "UPDATED: $MobileEnvPath with stable public URLs."
}

Write-Host ''
Write-Host 'Named tunnels are running.'
Write-Host "API PID: $apiPid"
Write-Host "CV PID:  $cvPid"
Write-Host "API URL: $($apiPublicUrl.TrimEnd('/'))"
Write-Host "CV URL:  $($cvPublicUrl.TrimEnd('/'))"
Write-Host ''
Write-Host 'Use npm run tunnel:named:status to inspect health and process state.'
Write-Host 'Use npm run tunnel:named:stop to stop both tunnel processes.'
