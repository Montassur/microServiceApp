#!/bin/bash
# Environment Variable Validation Script
# Validates required environment variables before deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

# Function to print colored output
log_error() {
    echo -e "${RED}✗ ERROR:${NC} $1"
    ((ERRORS++))
}

log_warn() {
    echo -e "${YELLOW}⚠ WARNING:${NC} $1"
    ((WARNINGS++))
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# Function to check if variable is set and not empty
check_required() {
    local var_name=$1
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        log_error "$var_name is not set or empty"
        return 1
    else
        log_success "$var_name is set"
        return 0
    fi
}

# Function to check if variable is set (can be empty)
check_optional() {
    local var_name=$1
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        log_warn "$var_name is not set (optional)"
        return 1
    else
        log_success "$var_name is set"
        return 0
    fi
}

# Function to validate secret strength
validate_secret() {
    local var_name=$1
    local var_value="${!var_name}"
    local min_length=${2:-32}
    
    if [ -z "$var_value" ]; then
        log_error "$var_name is not set"
        return 1
    fi
    
    local length=${#var_value}
    if [ $length -lt $min_length ]; then
        log_error "$var_name is too short (${length} chars, minimum ${min_length})"
        return 1
    fi
    
    # Check if it's a placeholder
    if [[ "$var_value" == *"REPLACE"* ]] || [[ "$var_value" == *"change"* ]] || [[ "$var_value" == *"example"* ]]; then
        log_error "$var_name appears to be a placeholder value"
        return 1
    fi
    
    log_success "$var_name is valid (${length} chars)"
    return 0
}

# Function to validate environment
validate_env() {
    local env=$1
    
    if [[ "$env" != "development" && "$env" != "production" && "$env" != "staging" ]]; then
        log_error "NODE_ENV must be 'development', 'staging', or 'production' (got: $env)"
        return 1
    fi
    
    log_success "NODE_ENV is valid: $env"
    return 0
}

echo "========================================="
echo "Environment Variable Validation"
echo "========================================="
echo ""

# Check NODE_ENV first
log_info "Checking environment configuration..."
check_required "NODE_ENV" && validate_env "$NODE_ENV"
echo ""

# Required variables for all environments
log_info "Checking required variables..."
check_required "APP_NAME"
check_required "DOMAIN"
check_required "FRONTEND_URL"
check_required "ADMIN_URL"
echo ""

# Security secrets (critical for production)
log_info "Checking security secrets..."
if [ "$NODE_ENV" = "production" ]; then
    validate_secret "JWT_SECRET" 32
    validate_secret "JWT_REFRESH_SECRET" 32
    validate_secret "SECRET_KEY" 32
    validate_secret "SESSION_SECRET" 32
else
    check_required "JWT_SECRET"
    check_required "JWT_REFRESH_SECRET"
    check_required "SECRET_KEY"
    check_required "SESSION_SECRET"
fi
echo ""

# JWT configuration
log_info "Checking JWT configuration..."
check_required "JWT_EXPIRES_IN"
check_required "JWT_REFRESH_EXPIRES_IN"
echo ""

# Database configuration
log_info "Checking database configuration..."
check_required "DB_HOST"
check_required "DB_PORT"
check_required "DB_NAME"
check_required "DB_USER"

if [ "$NODE_ENV" = "production" ]; then
    validate_secret "DB_PASSWORD" 16
else
    check_required "DB_PASSWORD"
fi
echo ""

# CORS configuration
log_info "Checking CORS configuration..."
check_required "CORS_ORIGIN"

if [ "$NODE_ENV" = "production" ]; then
    if [ "$CORS_ORIGIN" = "*" ]; then
        log_error "CORS_ORIGIN should not be '*' in production"
    fi
fi
echo ""

# Optional but recommended
log_info "Checking optional variables..."
check_optional "LOG_LEVEL"
check_optional "SENTRY_DSN"
check_optional "RATE_LIMIT_WINDOW_MS"
check_optional "RATE_LIMIT_MAX_REQUESTS"
echo ""

# Production-specific checks
if [ "$NODE_ENV" = "production" ]; then
    log_info "Performing production-specific checks..."
    
    # SSL should be enabled
    if [ "$SSL_ENABLED" != "true" ]; then
        log_warn "SSL_ENABLED is not set to 'true' in production"
    fi
    
    # Check for production URLs
    if [[ "$FRONTEND_URL" == *"localhost"* ]]; then
        log_error "FRONTEND_URL contains 'localhost' in production"
    fi
    
    if [[ "$ADMIN_URL" == *"localhost"* ]]; then
        log_error "ADMIN_URL contains 'localhost' in production"
    fi
    
    # Analytics and monitoring
    if [ "$ENABLE_MONITORING" != "true" ]; then
        log_warn "ENABLE_MONITORING is not enabled in production"
    fi
    
    echo ""
fi

# Summary
echo "========================================="
echo "Validation Summary"
echo "========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Validation completed with $WARNINGS warning(s)${NC}"
    exit 0
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before deploying to production."
    exit 1
fi
