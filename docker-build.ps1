# Docker Build and Export Script for SMQS
# This script builds all Docker images and exports them as tar files

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SMQS Docker Build & Export Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ErrorActionPreference = "Continue"

# Create output directory for images
$exportDir = "docker-images"
if (-not (Test-Path $exportDir)) {
    New-Item -ItemType Directory -Path $exportDir | Out-Null
    Write-Host "✓ Created export directory: $exportDir" -ForegroundColor Green
}

# Step 1: Build all images
Write-Host "`n[1/4] Building Docker images..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes depending on your internet speed...`n" -ForegroundColor White

docker-compose build --no-cache
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ All images built successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed. Please check the errors above." -ForegroundColor Red
    exit 1
}

# Step 2: Export images
Write-Host "`n[2/4] Exporting images to tar files..." -ForegroundColor Yellow

Write-Host "  Exporting smqs_web..." -ForegroundColor White
docker save -o "$exportDir\smqs-web.tar" smqs-web:latest
if ($LASTEXITCODE -eq 0) {
    $size = [math]::Round((Get-Item "$exportDir\smqs-web.tar").Length / 1MB, 2)
    Write-Host "  ✓ smqs-web.tar exported ($size MB)" -ForegroundColor Green
}

Write-Host "  Exporting smqs_api..." -ForegroundColor White
docker save -o "$exportDir\smqs-api.tar" smqs-api:latest
if ($LASTEXITCODE -eq 0) {
    $size = [math]::Round((Get-Item "$exportDir\smqs-api.tar").Length / 1MB, 2)
    Write-Host "  ✓ smqs-api.tar exported ($size MB)" -ForegroundColor Green
}

Write-Host "  Exporting mysql:8..." -ForegroundColor White
docker save -o "$exportDir\mysql-8.tar" mysql:8
if ($LASTEXITCODE -eq 0) {
    $size = [math]::Round((Get-Item "$exportDir\mysql-8.tar").Length / 1MB, 2)
    Write-Host "  ✓ mysql-8.tar exported ($size MB)" -ForegroundColor Green
}

# Step 3: Copy necessary files
Write-Host "`n[3/4] Copying deployment files..." -ForegroundColor Yellow

$deploymentFiles = @(
    "docker-compose.yml",
    ".env.docker",
    "docker-load.ps1",
    "docker-run.ps1",
    "DEPLOYMENT-GUIDE.md"
)

foreach ($file in $deploymentFiles) {
    if (Test-Path $file) {
        Copy-Item $file "$exportDir\" -Force
        Write-Host "  ✓ Copied $file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ $file not found (skipping)" -ForegroundColor Yellow
    }
}

# Step 4: Create README
Write-Host "`n[4/4] Creating deployment package..." -ForegroundColor Yellow

$readme = @"
# SMQS Docker Images

## Quick Start for Your Friend

1. **Load the images:**
   ``````powershell
   .\docker-load.ps1
   ``````

2. **Run the application:**
   ``````powershell
   .\docker-run.ps1
   ``````

3. **Access the app:**
   - Web App: http://localhost:3000
   - API: http://localhost:8080

## Files Included

- smqs-web.tar - Frontend (Next.js)
- smqs-api.tar - Backend (PHP API)
- mysql-8.tar - Database (MySQL)
- docker-compose.yml - Docker configuration
- .env.docker - Environment variables
- docker-load.ps1 - Script to load images
- docker-run.ps1 - Script to run containers
- DEPLOYMENT-GUIDE.md - Detailed instructions

## Requirements

- Docker Desktop installed
- Ports 3000, 8080, 3306 available

## Support

If you encounter issues, check DEPLOYMENT-GUIDE.md for troubleshooting.
"@

$readme | Out-File -FilePath "$exportDir\README.txt" -Encoding UTF8
Write-Host "  ✓ Created README.txt" -ForegroundColor Green

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✓ BUILD COMPLETE!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

$totalSize = 0
Get-ChildItem "$exportDir\*.tar" | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    $totalSize += $size
    Write-Host "  $($_.Name): $size MB" -ForegroundColor White
}

Write-Host "`nTotal size: $totalSize MB" -ForegroundColor Yellow
Write-Host "`nAll files are in: $exportDir\" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Compress the '$exportDir' folder to a ZIP file" -ForegroundColor White
Write-Host "2. Send the ZIP to your friend" -ForegroundColor White
Write-Host "3. They extract and run docker-load.ps1" -ForegroundColor White
Write-Host "`n========================================`n" -ForegroundColor Cyan
