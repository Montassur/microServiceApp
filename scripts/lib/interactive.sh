#!/bin/bash
# Interactive Menu Functions

# Source common functions
LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${LIB_DIR}/common.sh"

# Show menu and get selection
show_menu() {
    local title=$1
    shift
    local options=("$@")
    
    echo -e "${CYAN}${title}${NC}"
    for i in "${!options[@]}"; do
        echo "  $((i+1)). ${options[$i]}"
    done
    echo ""
}

# Get user choice
get_choice() {
    local max=$1
    local choice
    while true; do
        read -p "$(echo -e ${YELLOW}Enter your choice [1-${max}]: ${NC})" choice
        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "$max" ]; then
            return $((choice - 1))
        else
            log_error "Invalid choice. Please enter a number between 1 and ${max}."
        fi
    done
}

# Interactive deployment configuration
interactive_config() {
    log_header "🚀 Interactive Deployment Configuration"
    echo ""
    
    # 1. Deployment Type
    show_menu "📍 Select Deployment Type:" \
        "Local (Docker Compose)" \
        "Local (Kubernetes)" \
        "Cloud (Kubernetes)"
    get_choice 3
    local type_index=$?
    
    case $type_index in
        0)
            DEPLOYMENT_TYPE="local"
            CLUSTER_TYPE="docker-compose"
            ;;
        1)
            DEPLOYMENT_TYPE="local"
            # Ask for cluster type
            show_menu "☸️  Select Kubernetes Cluster:" \
                "Minikube" \
                "Kind" \
                "k3d" \
                "Docker Desktop"
            get_choice 4
            local cluster_index=$?
            case $cluster_index in
                0) CLUSTER_TYPE="minikube" ;;
                1) CLUSTER_TYPE="kind" ;;
                2) CLUSTER_TYPE="k3d" ;;
                3) CLUSTER_TYPE="docker-desktop" ;;
            esac
            ;;
        2)
            DEPLOYMENT_TYPE="cloud"
            CLUSTER_TYPE=""
            ;;
    esac
    
    log_success "Selected: $DEPLOYMENT_TYPE $([ -n "$CLUSTER_TYPE" ] && echo "($CLUSTER_TYPE)")"
    echo ""
    
    # 2. Environment
    show_menu "🌍 Select Environment:" \
        "Development" \
        "Staging" \
        "Production"
    get_choice 3
    local env_index=$?
    
    case $env_index in
        0) ENVIRONMENT="dev" ;;
        1) ENVIRONMENT="staging" ;;
        2) ENVIRONMENT="production" ;;
    esac
    
    log_success "Selected: $ENVIRONMENT"
    echo ""
    
    # 3. Services
    show_menu "🔧 Select Services:" \
        "All services" \
        "Backend only" \
        "Frontend only" \
        "Admin only" \
        "Backend + Database" \
        "Frontend + Admin"
    get_choice 6
    local service_index=$?
    
    case $service_index in
        0) SERVICES="all" ;;
        1) SERVICES="backend" ;;
        2) SERVICES="frontend" ;;
        3) SERVICES="admin" ;;
        4) SERVICES="backend,database" ;;
        5) SERVICES="frontend,admin" ;;
    esac
    
    log_success "Selected: $SERVICES"
    echo ""
    
    # 4. GitOps (cloud only)
    if [ "$DEPLOYMENT_TYPE" = "cloud" ]; then
        show_menu "🔄 Deployment Method:" \
            "Direct (kubectl)" \
            "GitOps (ArgoCD)"
        get_choice 2
        local gitops_index=$?
        
        if [ $gitops_index -eq 1 ]; then
            USE_GITOPS="true"
        else
            USE_GITOPS="false"
        fi
        
        log_success "Selected: $([ "$USE_GITOPS" = "true" ] && echo "GitOps" || echo "Direct")"
        echo ""
    else
        USE_GITOPS="false"
    fi
    
    # Show summary and confirm
    show_summary "$DEPLOYMENT_TYPE" "$ENVIRONMENT" "$SERVICES" "$CLUSTER_TYPE" "$USE_GITOPS"
    echo ""
    
    if ! confirm_action "Proceed with deployment?"; then
        log_warning "Deployment cancelled"
        exit 0
    fi
    
    echo ""
}
