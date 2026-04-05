param(
    [string]$DbUrl = $env:SUPABASE_DB_URL
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($DbUrl)) {
    Write-Error "Missing SUPABASE_DB_URL (or -DbUrl)."
    exit 1
}

$workdir = Join-Path $PSScriptRoot "..\..\packages\api"
$workdir = (Resolve-Path $workdir).Path

Write-Host "Applying Supabase migrations from: $workdir"
Push-Location $workdir
try {
    npx --yes supabase db push --db-url $DbUrl --include-all
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Supabase migration push failed (exit code $LASTEXITCODE)."
        exit $LASTEXITCODE
    }

    Write-Host "Migration push completed successfully."
}
finally {
    Pop-Location
}
