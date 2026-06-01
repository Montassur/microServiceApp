#!/bin/bash
# Generate package-lock.json for all services
# This script creates package-lock.json files without downloading node_modules
# Usage: ./scripts/generate-package-locks.sh

set -e  # Exit on error

echo "=========================================="
echo "Generating package-lock.json files"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to generate package-lock for a service
generate_lock() {
    local service_path=$1
    local service_name=$(basename "$service_path")
    
    echo -e "${BLUE}Processing: ${service_name}${NC}"
    
    if [ -f "$service_path/package.json" ]; then
        cd "$service_path"
        
        # Generate package-lock.json without installing node_modules
        npm install --package-lock-only
        
        if [ -f "package-lock.json" ]; then
            echo -e "${GREEN}✓ Generated package-lock.json for ${service_name}${NC}"
        else
            echo "✗ Failed to generate package-lock.json for ${service_name}"
        fi
        
        cd - > /dev/null
    else
        echo "✗ No package.json found in ${service_name}"
    fi
    
    echo ""
}

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Project root: $PROJECT_ROOT"
echo ""

# Backend Services
echo "=========================================="
echo "Backend Services"
echo "=========================================="
echo ""

generate_lock "services/user-communication-service"
generate_lock "services/catalog-service"
generate_lock "services/order-payment-service"
generate_lock "services/fulfillment-service"
generate_lock "services/shopping-service"
generate_lock "services/platform-insights-service"
generate_lock "services/inventory-service"

# Frontend Applications
echo "=========================================="
echo "Frontend Applications"
echo "=========================================="
echo ""

generate_lock "apps/frontend"
generate_lock "apps/admin"

echo "=========================================="
echo "✓ All package-lock.json files generated!"
echo "=========================================="
echo ""
echo "Note: package-lock.json files created without downloading node_modules"
echo "To install dependencies, run: npm install in each service directory"
