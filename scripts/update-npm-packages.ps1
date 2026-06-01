# Update npm packages to latest versions for all services
# Usage: .\scripts\update-npm-packages.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Updating npm packages to latest versions" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Function to update packages for a service
function Update-Service {
    param (
        [string]$ServicePath
    )
    
    $serviceName = Split-Path $ServicePath -Leaf
    
    Write-Host "Processing: $serviceName" -ForegroundColor Blue
    
    if (Test-Path "$ServicePath\package.json") {
        Push-Location $ServicePath
        
        Write-Host "  Updating dependencies..." -ForegroundColor Gray
        
        # Update all dependencies to latest
        npx npm-check-updates -u
        
        # Install updated packages
        npm install
        
        # Regenerate package-lock.json
        if (Test-Path "package-lock.json") {
            Remove-Item "package-lock.json"
        }
        npm install --package-lock-only
        
        Write-Host "✓ Updated $serviceName" -ForegroundColor Green
        Pop-Location
    } else {
        Write-Host "⚠ No package.json found in $serviceName" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# Get project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "Project root: $ProjectRoot"
Write-Host ""

# Update all backend services
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Backend Services" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Update-Service "services\user-communication-service"
Update-Service "services\catalog-service"
Update-Service "services\order-payment-service"
Update-Service "services\fulfillment-service"
Update-Service "services\shopping-service"
Update-Service "services\platform-insights-service"
Update-Service "services\inventory-service"

# Update frontend apps
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Frontend Applications" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Update-Service "apps\frontend"
Update-Service "apps\admin"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✓ All packages updated to latest versions!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Review package.json changes"
Write-Host "2. Test services: npm test"
Write-Host "3. Rebuild Docker images: docker compose build"
Write-Host "4. Deploy: docker compose up -d"
