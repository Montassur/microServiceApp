#!/bin/bash
# Kubernetes Deployment Functions

# Source common functions
LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(dirname "$LIB_DIR")"
source "${LIB_DIR}/common.sh"

# Available services
ALL_SERVICES=("catalog-service" "inventory-service" "shopping-service" "order-payment-service" "fulfillment-service" "user-communication-service" "platform-insights-service" "gateway" "frontend" "admin" "database")

# ... (skip to deploy_local_services)

# Deploy local services
deploy_local_services() {
    local services=$1
    local cluster_type=$2
    
    log_info "Deploying services to Kubernetes..."
    
    # Create namespace
    kubectl create namespace auraweb-local --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply base configurations
    kubectl apply -k k8s/base
    
    if [ "$services" = "all" ]; then
        log_info "Deploying all services..."
        kubectl apply -k k8s/overlays/development -n auraweb-local
        
        # Update images with local tags
        for service in "${ALL_SERVICES[@]}"; do
             if [ "$service" != "database" ]; then
                # Helm/Kustomize might prefix names, e.g. dev-catalog-service
                kubectl set image deployment/dev-${service} ${service}=auraweb/${service}:local -n auraweb-local || true
             fi
        done
    else
        log_info "Deploying selected services: ${services}"
        # Parse services string if it contains commas
        local OLD_IFS=$IFS
        IFS=',' read -ra SERVICE_ARRAY <<< "$services"
        IFS=$OLD_IFS
        
        for service in "${SERVICE_ARRAY[@]}"; do
            # Simply apply the specific deployment file from base if it exists
            if [ -f "infrastructure/k8s/base/${service}-deployment.yaml" ]; then
                kubectl apply -f infrastructure/k8s/base/${service}-deployment.yaml -n auraweb-local
                kubectl set image deployment/${service} ${service}=auraweb/${service}:local -n auraweb-local || true
            elif [ "$service" = "database" ]; then
                 kubectl apply -f infrastructure/k8s/base/postgres-statefulset.yaml -n auraweb-local
            fi
        done
    fi
}

# Wait for local deployments
wait_for_local_deployments() {
    local services=$1
    log_info "Waiting for deployments to be ready..."
    
    if [ "$services" = "all" ]; then
        kubectl wait --for=condition=available --timeout=300s deployment --all -n auraweb-local
    else
        local OLD_IFS=$IFS
        IFS=',' read -ra SERVICE_ARRAY <<< "$services"
        IFS=$OLD_IFS
        
        for service in "${SERVICE_ARRAY[@]}"; do
            if [ "$service" != "database" ]; then
                kubectl wait --for=condition=available --timeout=300s deployment/dev-${service} -n auraweb-local || true
            fi
        done
    fi
}

# Show local status
show_local_status() {
    echo ""
    log_header "Local Deployment Status"
    echo ""
    kubectl get pods -n auraweb-local
    echo ""
    kubectl get svc -n auraweb-local
    echo ""
    kubectl get ingress -n auraweb-local
}

# Get access URL
get_local_access_url() {
    local cluster_type=$1
    case $cluster_type in
        minikube)
            log_success "Access URL: http://$(minikube ip)"
            log_info "Or run: minikube service gateway -n auraweb-local"
            ;;
        kind|k3d|docker-desktop)
             log_success "Access URL: http://localhost"
             log_info "Port forward: kubectl port-forward -n auraweb-local svc/gateway 8080:80"
            ;;
    esac
}

# Deploy to cloud Kubernetes
deploy_cloud_kubernetes() {
    local environment=$1
    local services=$2
    local use_gitops=$3
    
    if [ "$use_gitops" = "true" ]; then
        deploy_with_argocd "$environment" "$services"
    else
        deploy_with_kubectl "$environment" "$services"
    fi
}

# Deploy with kubectl
deploy_with_kubectl() {
    local environment=$1
    local services=$2
    
    log_info "Deploying with kubectl..."
    
    local namespace
    local overlay
    
    case $environment in
        dev)
            namespace="auraweb-dev"
            overlay="development"
            ;;
        staging)
            namespace="auraweb-staging"
            overlay="development"
            ;;
        production)
            namespace="auraweb-prod"
            overlay="production"
            ;;
    esac
    
    # Apply manifests
    log_info "Applying Kubernetes manifests..."
    kubectl apply -k "k8s/overlays/${overlay}"
    handle_error $? "Failed to apply manifests"
    
    # Wait for rollout
    log_info "Waiting for deployments..."
    local service_list=$(parse_services "$services")
    
    for service in $service_list; do
        if [ "$service" != "database" ]; then
            local deployment="${environment}-${service}"
            kubectl rollout status "deployment/${deployment}" -n "$namespace" --timeout=5m
        fi
    done
    
    # Show status
    show_k8s_status "$namespace"
    
    log_success "Kubernetes deployment complete!"
}

# Deploy with ArgoCD
deploy_with_argocd() {
    local environment=$1
    local services=$2
    
    log_info "Deploying with ArgoCD..."
    
    local app_name="auraweb-${environment}"
    
    # Check if ArgoCD CLI is available
    if ! command_exists argocd; then
        log_error "ArgoCD CLI is not installed"
        exit 1
    fi
    
    # Sync application
    log_info "Syncing ArgoCD application: $app_name"
    argocd app sync "$app_name" --prune
    handle_error $? "Failed to sync ArgoCD application"
    
    # Wait for sync
    log_info "Waiting for sync to complete..."
    argocd app wait "$app_name" --timeout 300
    
    log_success "ArgoCD deployment complete!"
}

# Show Kubernetes status
show_k8s_status() {
    local namespace=$1
    
    echo ""
    log_header "Kubernetes Status"
    echo ""
    echo -e "${CYAN}Pods:${NC}"
    kubectl get pods -n "$namespace"
    echo ""
    echo -e "${CYAN}Services:${NC}"
    kubectl get svc -n "$namespace"
    echo ""
}
