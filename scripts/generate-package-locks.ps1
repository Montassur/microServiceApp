# Generate package-lock.json for all services
# This script creates package-lock.json files without downloading node_modules
# Usage: .\scripts\generate-package-locks.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Generating package-lock.json files" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Function to generate package-lock for a service
function Generate-PackageLock {
    param (
        [string]$ServicePath
    )
    
    $serviceName = Split-Path $ServicePath -Leaf
    
    Write-Host "Processing: $serviceName" -ForegroundColor Blue
    
    if (Test-Path "$ServicePath\package.json") {
        Push-Location $ServicePath
        
        # Generate package-lock.json without installing node_modules
        npm install --package-lock-only
        
        if (Test-Path "package-lock.json") {
            Write-Host "✓ Generated package-lock.json for $serviceName" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to generate package-lock.json for $serviceName" -ForegroundColor Red
        }
        
        Pop-Location
    } else {
        Write-Host "✗ No package.json found in $serviceName" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Get the project root directory
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "Project root: $ProjectRoot"
Write-Host ""

# Backend Services
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Backend Services" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Generate-PackageLock "services\user-communication-service"
Generate-PackageLock "services\catalog-service"
Generate-PackageLock "services\order-payment-service"
Generate-PackageLock "services\fulfillment-service"
Generate-PackageLock "services\shopping-service"
Generate-PackageLock "services\platform-insights-service"
Generate-PackageLock "services\inventory-service"

# Frontend Applications
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Frontend Applications" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Generate-PackageLock "apps\frontend"
Generate-PackageLock "apps\admin"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✓ All package-lock.json files generated!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: package-lock.json files created without downloading node_modules"
Write-Host "To install dependencies, run: npm install in each service directory"
