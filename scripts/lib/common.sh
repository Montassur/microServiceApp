#!/bin/bash
# Common Functions Library
# Shared utilities for deployment scripts

# Colors
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export RED='\033[0;31m'
export BLUE='\033[0;34m'
export CYAN='\033[0;36m'
export NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Progress indicator
show_progress() {
    local message=$1
    echo -ne "${YELLOW}⏳${NC} ${message}..."
}

complete_progress() {
    echo -e " ${GREEN}✓${NC}"
}

# Error handling
handle_error() {
    local exit_code=$1
    local message=$2
    if [ $exit_code -ne 0 ]; then
        log_error "$message"
        exit $exit_code
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Docker
check_docker() {
    if ! command_exists docker; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running"
        exit 1
    fi
    
    log_success "Docker is available"
}

# Check Docker Compose
check_docker_compose() {
    if ! docker compose version >/dev/null 2>&1; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    log_success "Docker Compose is available"
}

# Check kubectl
check_kubectl() {
    if ! command_exists kubectl; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    log_success "kubectl is available"
}

# Load environment file
load_env_file() {
    local env=$1
    local env_file=".env.${env}"
    
    if [ -f "$env_file" ]; then
        log_success "Loading $env_file"
        cp "$env_file" .env
    elif [ -f ".env.example" ]; then
        log_warning "$env_file not found, using .env.example"
        cp .env.example .env
    else
        log_error "No environment file found"
        exit 1
    fi
}

# Confirm action
confirm_action() {
    local message=$1
    local default=${2:-n}
    
    if [ "$default" = "y" ]; then
        read -p "$(echo -e ${YELLOW}${message} [Y/n]: ${NC})" response
        response=${response:-y}
    else
        read -p "$(echo -e ${YELLOW}${message} [y/N]: ${NC})" response
        response=${response:-n}
    fi
    
    [[ "$response" =~ ^[Yy]$ ]]
}

# Wait for service
wait_for_service() {
    local url=$1
    local max_attempts=${2:-30}
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "$url" >/dev/null 2>&1; then
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    return 1
}

# Parse service list
parse_services() {
    local services=$1
    
    if [ "$services" = "all" ]; then
        echo "catalog inventory shopping order-payment fulfillment user-auth platform gateway frontend admin database"
    else
        echo "$services" | tr ',' ' '
    fi
}

# Display summary
show_summary() {
    local deployment_type=$1
    local environment=$2
    local services=$3
    local cluster_type=$4
    local use_gitops=$5
    
    log_header "Deployment Summary"
    echo -e "  Deployment Type: ${GREEN}${deployment_type}${NC}"
    echo -e "  Environment:     ${GREEN}${environment}${NC}"
    echo -e "  Services:        ${GREEN}${services}${NC}"
    
    if [ -n "$cluster_type" ]; then
        echo -e "  Cluster Type:    ${GREEN}${cluster_type}${NC}"
    fi
    
    if [ "$use_gitops" = "true" ]; then
        echo -e "  GitOps:          ${GREEN}Enabled${NC}"
    fi
    
    echo -e "${BLUE}========================================${NC}"
}
