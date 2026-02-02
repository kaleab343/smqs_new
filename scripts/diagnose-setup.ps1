# SMQS Setup Diagnostic Script
# Run this to check your installation and find issues

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SMQS Setup Diagnostic Tool" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check 1: XAMPP Installation
Write-Host "[1/7] Checking XAMPP Installation..." -ForegroundColor Yellow
$xamppPath = "C:\xampp"
if (Test-Path $xamppPath) {
    Write-Host "  ✓ XAMPP found at: $xamppPath" -ForegroundColor Green
} else {
    Write-Host "  ✗ XAMPP not found at: $xamppPath" -ForegroundColor Red
    Write-Host "    Please install XAMPP or update the path" -ForegroundColor Yellow
}

# Check 2: Apache Status
Write-Host "`n[2/7] Checking Apache Status..." -ForegroundColor Yellow
$apacheProcess = Get-Process -Name "httpd" -ErrorAction SilentlyContinue
if ($apacheProcess) {
    Write-Host "  ✓ Apache is running" -ForegroundColor Green
} else {
    Write-Host "  ✗ Apache is NOT running" -ForegroundColor Red
    Write-Host "    Please start Apache in XAMPP Control Panel" -ForegroundColor Yellow
}

# Check 3: MySQL Status
Write-Host "`n[3/7] Checking MySQL Status..." -ForegroundColor Yellow
$mysqlProcess = Get-Process -Name "mysqld" -ErrorAction SilentlyContinue
if ($mysqlProcess) {
    Write-Host "  ✓ MySQL is running" -ForegroundColor Green
} else {
    Write-Host "  ✗ MySQL is NOT running" -ForegroundColor Red
    Write-Host "    Please start MySQL in XAMPP Control Panel" -ForegroundColor Yellow
}

# Check 4: Project Path
Write-Host "`n[4/7] Checking Project Installation..." -ForegroundColor Yellow
$currentPath = Get-Location
Write-Host "  Current directory: $currentPath" -ForegroundColor White

$expectedPath = "C:\xampp\htdocs\SMQS"
if ($currentPath -like "*xampp*htdocs*") {
    Write-Host "  ✓ Project is in htdocs" -ForegroundColor Green
    
    $folderName = Split-Path -Leaf $currentPath
    if ($folderName -eq "SMQS") {
        Write-Host "  ✓ Folder name is correct: SMQS" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Folder name is: $folderName (expected: SMQS)" -ForegroundColor Yellow
        Write-Host "    You may need to update NEXT_PUBLIC_PHP_API_BASE" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ Project is NOT in xampp\htdocs" -ForegroundColor Red
    Write-Host "    Expected: $expectedPath" -ForegroundColor Yellow
}

# Check 5: Backend Accessibility
Write-Host "`n[5/7] Testing Backend Connection..." -ForegroundColor Yellow

$backendUrls = @(
    "http://localhost/SMQS/db_samp/api/index.php?r=/ping",
    "http://localhost:80/SMQS/db_samp/api/index.php?r=/ping",
    "http://localhost:8080/SMQS/db_samp/api/index.php?r=/ping"
)

$connected = $false
foreach ($url in $backendUrls) {
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 3 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✓ Backend accessible at: $url" -ForegroundColor Green
            $content = $response.Content | ConvertFrom-Json
            Write-Host "    Response: $($content.message)" -ForegroundColor White
            $connected = $true
            break
        }
    } catch {
        # Try next URL
    }
}

if (-not $connected) {
    Write-Host "  ✗ Backend NOT accessible" -ForegroundColor Red
    Write-Host "    Tried URLs:" -ForegroundColor Yellow
    foreach ($url in $backendUrls) {
        Write-Host "    - $url" -ForegroundColor White
    }
}

# Check 6: Database Connection
Write-Host "`n[6/7] Testing Database Connection..." -ForegroundColor Yellow
try {
    $dbTestUrl = "http://localhost/SMQS/db_samp/api/init-db.php?init=true"
    $response = Invoke-WebRequest -Uri $dbTestUrl -Method GET -TimeoutSec 5 -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    
    if ($data.success) {
        Write-Host "  ✓ Database connection successful" -ForegroundColor Green
        Write-Host "    Tables status:" -ForegroundColor White
        foreach ($table in $data.tables.PSObject.Properties) {
            Write-Host "    - $($table.Name): $($table.Value)" -ForegroundColor White
        }
    } else {
        Write-Host "  ✗ Database initialization failed" -ForegroundColor Red
        Write-Host "    Error: $($data.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Cannot connect to database" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "    Check db_samp/api/config.php for correct credentials" -ForegroundColor Yellow
}

# Check 7: Configuration Files
Write-Host "`n[7/7] Checking Configuration Files..." -ForegroundColor Yellow

$configFiles = @(
    "db_samp\api\config.php",
    "lib\php-api-config.ts",
    ".env.local"
)

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file exists" -ForegroundColor Green
    } else {
        if ($file -eq ".env.local") {
            Write-Host "  ⚠ $file not found (optional)" -ForegroundColor Yellow
        } else {
            Write-Host "  ✗ $file NOT found" -ForegroundColor Red
        }
    }
}

# Check PHP config
if (Test-Path "db_samp\api\config.php") {
    Write-Host "`n  Database Configuration:" -ForegroundColor Cyan
    $configContent = Get-Content "db_samp\api\config.php" | Select-String "define\('DB_"
    foreach ($line in $configContent) {
        Write-Host "    $line" -ForegroundColor White
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Diagnostic Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$issues = @()
if (-not $apacheProcess) { $issues += "Apache not running" }
if (-not $mysqlProcess) { $issues += "MySQL not running" }
if (-not $connected) { $issues += "Backend not accessible" }

if ($issues.Count -eq 0) {
    Write-Host "✓ All checks passed! Your setup looks good." -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Run: npm run dev" -ForegroundColor White
    Write-Host "2. Open: http://localhost:3000" -ForegroundColor White
    Write-Host "3. Try signup/login - should work!" -ForegroundColor White
} else {
    Write-Host "⚠ Found $($issues.Count) issue(s):" -ForegroundColor Yellow
    foreach ($issue in $issues) {
        Write-Host "  - $issue" -ForegroundColor Red
    }
    Write-Host "`nPlease fix these issues and run the diagnostic again." -ForegroundColor Yellow
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
