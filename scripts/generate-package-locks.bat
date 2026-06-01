@echo off
REM Generate package-lock.json for all services
REM This script creates package-lock.json files without downloading node_modules
REM Usage: scripts\generate-package-locks.bat

echo ==========================================
echo Generating package-lock.json files
echo ==========================================
echo.

cd /d "%~dp0.."
set PROJECT_ROOT=%CD%

echo Project root: %PROJECT_ROOT%
echo.

echo ==========================================
echo Backend Services
echo ==========================================
echo.

echo Processing: user-communication-service
cd "%PROJECT_ROOT%\services\user-communication-service"
if exist package.json (
    call npm install --package-lock-only
    if exist package-lock.json (
        echo [32m✓ Generated package-lock.json for user-communication-service[0m
    ) else (
        echo [31m✗ Failed to generate package-lock.json for user-communication-service[0m
    )
) else (
    echo [31m✗ No package.json found[0m
)
echo.

echo Processing: catalog-service
cd "%PROJECT_ROOT%\services\catalog-service"
if exist package.json (
    call npm install --package-lock-only
    if exist package-lock.json (
        echo [32m✓ Generated package-lock.json for catalog-service[0m
    ) else (
        echo [31m✗ Failed to generate package-lock.json for catalog-service[0m
    )
) else (
    echo [31m✗ No package.json found[0m
)
echo.

echo Processing: order-payment-service
cd "%PROJECT_ROOT%\services\order-payment-service"
if exist package.json (
    call npm install --package-lock-only
    if exist package-lock.json (
        echo [32m✓ Generated package-lock.json for order-payment-service[0m
    ) else (
        echo [31m✗ Failed to generate package-lock.json for order-payment-service[0m
    )
) else (
    echo [31m✗ No package.json found[0m
)
echo.

echo Processing: fulfillment-service
cd "%PROJECT_ROOT%\services\fulfillment-service"
if exist package.json (
    call npm install --package-lock-only
    if exist package-lock.json (
        echo [32m✓ Generated package-lock.json for fulfillment-service[0m
    ) else (
        echo [31m✗ Failed to generate package-lock.json for fulfillment-service[0m
    )
) else (
    echo [31m✗ No package.json found[0m
)
echo.

echo Processing: shopping-service
cd "%PROJECT_ROOT%\services\shopping-service"
if exist package.json (
    call npm install --package-lock-only
    if exist package-lock.json (
        echo [32m✓ Generated package-lock.json for shopping-service[0m
    ) else (
        echo [31m✗ Failed to generate package-lock.json for shopping-service[0m
    )
) else (
    echo [31m✗ No package.json found[0m
)
echo.

echo Processing: platform-insights-service
cd "%PROJECT_ROOT%\services\platform-insights-service"
if exist package.json (
    call npm install --package-lock-only
    if exist package-lock.json (
        echo [32m✓ Generated package-lock.json for platform-insights-service[0m
    ) else (
        echo [31m✗ Failed to generate package-lock.json for platform-insights-service[0m
    )
) else (
    echo [31m✗ No package.json found[0m
)
echo.

echo Processing: inventory-service
cd "%PROJECT_ROOT%\services\inventory-service"
if exist package.json (
    call npm install --package-lock-only
    if exist package-lock.json (
        echo [32m✓ Generated package-lock.json for inventory-service[0m
    ) else (
        echo [31m✗ Failed to generate package-lock.json for inventory-service[0m
    )
) else (
    echo [31m✗ No package.json found[0m
)
echo.

echo ==========================================
echo Frontend Applications
echo ==========================================
echo.

echo Processing: frontend
cd "%PROJECT_ROOT%\apps\frontend"
if exist package.json (
    call npm install --package-lock-only
    if exist package-lock.json (
        echo [32m✓ Generated package-lock.json for frontend[0m
    ) else (
        echo [31m✗ Failed to generate package-lock.json for frontend[0m
    )
) else (
    echo [31m✗ No package.json found[0m
)
echo.

echo Processing: admin
cd "%PROJECT_ROOT%\apps\admin"
if exist package.json (
    call npm install --package-lock-only
    if exist package-lock.json (
        echo [32m✓ Generated package-lock.json for admin[0m
    ) else (
        echo [31m✗ Failed to generate package-lock.json for admin[0m
    )
) else (
    echo [31m✗ No package.json found[0m
)
echo.

cd "%PROJECT_ROOT%"

echo ==========================================
echo ✓ All package-lock.json files generated!
echo ==========================================
echo.
echo Note: package-lock.json files created without downloading node_modules
echo To install dependencies, run: npm install in each service directory
echo.

pause
