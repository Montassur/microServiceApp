#!/bin/bash
# Docker Compose Deployment Functions

# Source common functions
LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${LIB_DIR}/common.sh"

# Deploy with Docker Compose
deploy_docker_compose() {
    local environment=$1
    local services=$2
    
    log_header "Docker Compose Deployment"
    
    # Check prerequisites
    check_docker
    check_docker_compose
    
    # Load environment
    load_env_file "$environment"
    
    # Parse services
    local service_list=$(parse_services "$services")
    
    # Build and start services
    if [ "$services" = "all" ]; then
        log_info "Starting all services..."
        docker compose up -d
    else
        log_info "Starting selected services: $service_list"
        docker compose up -d $service_list
    fi
    
    handle_error $? "Failed to start services"
    
    # Wait for services
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Health checks
    run_health_checks "$service_list"
    
    # Show access URLs
    show_access_urls
    
    log_success "Docker Compose deployment complete!"
}

# Run health checks
run_health_checks() {
    local services=$1
    
    log_info "Running health checks..."
    
    for service in $services; do
        case $service in
            backend)
                if wait_for_service "http://localhost:3000/health" 15; then
                    log_success "Backend is healthy"
                else
                    log_warning "Backend health check failed"
                fi
                ;;
            frontend)
                if wait_for_service "http://localhost" 15; then
                    log_success "Frontend is accessible"
                else
                    log_warning "Frontend health check failed"
                fi
                ;;
            admin)
                if wait_for_service "http://localhost/admin" 15; then
                    log_success "Admin panel is accessible"
                else
                    log_warning "Admin panel health check failed"
                fi
                ;;
        esac
    done
}

# Show access URLs
show_access_urls() {
    echo ""
    log_header "Access URLs"
    echo -e "  Frontend:      ${GREEN}http://localhost${NC}"
    echo -e "  Admin Panel:   ${GREEN}http://localhost/admin${NC}"
    echo -e "  Backend API:   ${GREEN}http://localhost:3000${NC}"
    echo -e "  Health Check:  ${GREEN}http://localhost:3000/health${NC}"
    echo -e "  Metrics:       ${GREEN}http://localhost:3000/metrics${NC}"
    echo ""
    echo -e "  View logs:     ${CYAN}docker compose logs -f${NC}"
    echo -e "  Stop services: ${CYAN}docker compose down${NC}"
    echo ""
}

# Stop Docker Compose services
stop_docker_compose() {
    log_info "Stopping Docker Compose services..."
    docker compose down
    log_success "Services stopped"
}

# Clean Docker Compose
clean_docker_compose() {
    log_warning "This will remove all containers, volumes, and networks"
    if confirm_action "Continue with cleanup?"; then
        docker compose down -v --remove-orphans
        docker system prune -f
        log_success "Cleanup complete"
    else
        log_info "Cleanup cancelled"
    fi
}
