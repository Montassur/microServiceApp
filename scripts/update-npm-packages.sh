#!/bin/bash
# Update npm packages to latest versions for all services
# Usage: ./scripts/update-npm-packages.sh

set -e

echo "=========================================="
echo "Updating npm packages to latest versions"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to update packages for a service
update_service() {
    local service_path=$1
    local service_name=$(basename "$service_path")
    
    echo -e "${BLUE}Processing: ${service_name}${NC}"
    
    if [ -f "$service_path/package.json" ]; then
        cd "$service_path"
        
        echo "  Updating dependencies..."
        
        # Update all dependencies to latest
        npx npm-check-updates -u
        
        # Install updated packages
        npm install
        
        # Regenerate package-lock.json
        rm -f package-lock.json
        npm install --package-lock-only
        
        echo -e "${GREEN}✓ Updated ${service_name}${NC}"
        cd - > /dev/null
    else
        echo -e "${YELLOW}⚠ No package.json found in ${service_name}${NC}"
    fi
    
    echo ""
}

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Project root: $PROJECT_ROOT"
echo ""

# Update all backend services
echo "=========================================="
echo "Backend Services"
echo "=========================================="
echo ""

update_service "services/user-communication-service"
update_service "services/catalog-service"
update_service "services/order-payment-service"
update_service "services/fulfillment-service"
update_service "services/shopping-service"
update_service "services/platform-insights-service"
update_service "services/inventory-service"

# Update frontend apps
echo "=========================================="
echo "Frontend Applications"
echo "=========================================="
echo ""

update_service "apps/frontend"
update_service "apps/admin"

echo "=========================================="
echo "✓ All packages updated to latest versions!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review package.json changes"
echo "2. Test services: npm test"
echo "3. Rebuild Docker images: docker compose build"
echo "4. Deploy: docker compose up -d"
