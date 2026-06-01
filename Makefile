.PHONY: help build deploy-dev deploy-prod rollback clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Docker Compose Commands
up: ## Start all services with Docker Compose
	docker compose up -d

down: ## Stop all services
	docker compose down

logs: ## View logs
	docker compose logs -f

build-local: ## Build Docker images locally
	docker compose build

# Kubernetes Commands
k8s-dev: ## Deploy to Kubernetes development
	kubectl apply -k infrastructure/k8s/overlays/development

k8s-prod: ## Deploy to Kubernetes production
	kubectl apply -k infrastructure/k8s/overlays/production

deploy-dev: ## Deploy to development environment
	./scripts/deploy local dev

deploy-prod: ## Deploy to production environment
	./scripts/deploy cloud production all

rollback-dev: ## Rollback development deployment
	./scripts/rollback.sh dev $(service)

rollback-prod: ## Rollback production deployment
	./scripts/rollback.sh prod $(service)

health-dev: ## Check development health
	./scripts/health-check.sh dev

health-prod: ## Check production health
	./scripts/health-check.sh prod

# Image Building
SERVICES := frontend admin gateway user-auth catalog order-payment fulfillment shopping platform inventory

build-images: ## Build all Docker images
	@for svc in $(SERVICES); do \
		echo "Building ecommerce/$$svc:latest"; \
		docker build -t ecommerce/$$svc:latest ./services/$$svc || exit 1; \
	done

push-images: ## Push images to registry
	@for svc in $(SERVICES); do \
		echo "Pushing ecommerce/$$svc:latest"; \
		docker push ecommerce/$$svc:latest || exit 1; \
	done

# Kubernetes Management
k8s-status-dev: ## Show development cluster status
	kubectl get all -n ecommerce-dev

k8s-status-prod: ## Show production cluster status
	kubectl get all -n ecommerce-prod

k8s-logs-dev: ## View development logs
	kubectl logs -f -l app=$(service) -n ecommerce-dev

k8s-logs-prod: ## View production logs
	kubectl logs -f -l app=$(service) -n ecommerce-prod

k8s-shell-dev: ## Get shell in development pod
	kubectl exec -it $(pod) -n ecommerce-dev -- /bin/sh

k8s-shell-prod: ## Get shell in production pod
	kubectl exec -it $(pod) -n ecommerce-prod -- /bin/sh

# Database
db-backup: ## Backup database
	kubectl exec -n ecommerce-prod $(shell kubectl get pods -n ecommerce-prod -l app=database -o jsonpath='{.items[0].metadata.name}') -- pg_dump -U postgres ecommerce > backup-$(shell date +%Y%m%d-%H%M%S).sql

db-restore: ## Restore database (file=backup.sql)
	kubectl exec -i -n ecommerce-prod $(shell kubectl get pods -n ecommerce-prod -l app=database -o jsonpath='{.items[0].metadata.name}') -- psql -U postgres ecommerce < $(file)

# Cleanup
clean: ## Clean up local Docker resources
	./scripts/cleanup local dev --yes

clean-k8s-dev: ## Delete development namespace
	kubectl delete namespace ecommerce-dev

clean-k8s-prod: ## Delete production namespace (DANGEROUS!)
	@echo "⚠️  WARNING: This will delete the production namespace!"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] && kubectl delete namespace ecommerce-prod || echo "Cancelled"
