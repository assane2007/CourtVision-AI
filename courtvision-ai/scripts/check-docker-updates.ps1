# Docker Image Update Checker (PowerShell)
# Compares current images in docker-compose.yml with latest available versions

param(
    [string]$ComposeFile = "./docker-compose.yml"
)

Write-Host "🔍 Checking for Docker image updates..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

# Check if docker-compose.yml exists
if (-not (Test-Path $ComposeFile)) {
    Write-Host "❌ Error: $ComposeFile not found" -ForegroundColor Red
    exit 1
}

# Read docker-compose.yml and extract image lines
$content = Get-Content $ComposeFile -Raw
$imageLines = $content -split "`n" | Where-Object { $_ -match '^\s+image:' }

$images = @()
foreach ($line in $imageLines) {
    $image = $line -replace '^\s+image:\s*', '' -replace '\s*$', ''
    if ($image) {
        $images += $image
    }
}

$images = $images | Sort-Object -Unique

foreach ($image in $images) {
    if (-not $image) { continue }

    if ($image -match ':') {
        $imageName = $image.Split(':')[0]
        $currentTag = $image.Split(':')[1]
    }
    else {
        $imageName = $image
        $currentTag = "latest"
    }

    Write-Host ""
    Write-Host "📦 $image" -ForegroundColor Yellow

    try {
        $uri = "https://registry.hub.docker.com/v2/repositories/$imageName/tags/?page_size=100"
        $response = Invoke-RestMethod -Uri $uri -ErrorAction SilentlyContinue
        
        if ($response.results -and $response.results.Count -gt 0) {
            $latestTag = $response.results[0].name
            
            if ($latestTag -ne $currentTag) {
                Write-Host "  Current:  $currentTag" -ForegroundColor Gray
                Write-Host "  Latest:   $latestTag ⬆️" -ForegroundColor Green
            }
            else {
                Write-Host "  Current:  $currentTag ✅ (up to date)" -ForegroundColor Green
            }
        }
        else {
            Write-Host "  Current:  $currentTag" -ForegroundColor Gray
            Write-Host "  ⚠️  Could not fetch latest tag" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  Current:  $currentTag" -ForegroundColor Gray
        Write-Host "  ⚠️  Error checking: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✨ Check complete!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 To apply updates:" -ForegroundColor Cyan
Write-Host "   1. Update docker-compose.yml with new image tags"
Write-Host "   2. Run: docker compose pull"
Write-Host "   3. Run: docker compose up -d"
