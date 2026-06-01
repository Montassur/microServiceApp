# Unified Deployment Guide

## Overview

Single deployment interface supporting:
- **Deployment Types**: Local or Cloud
- **Environments**: Dev, Staging, Production
- **Services**: Selective or All
- **GitOps**: Optional for cloud deployments

---

## Quick Start

### Basic Usage

```bash
./scripts/deploy [deployment-type] [environment] [services] [cluster-type] [gitops]
```

### Examples

```bash
# Local dev with Docker Compose - all services
./scripts/deploy local dev all docker-compose

# Local dev with Minikube - backend only
./scripts/deploy local dev backend minikube

# Local staging with Kind - frontend and admin
./scripts/deploy local staging "frontend admin" kind

# Cloud dev - all services
./scripts/deploy cloud dev all

# Cloud production with GitOps - all services
./scripts/deploy cloud production all "" gitops

# Cloud staging - backend and database only
./scripts/deploy cloud staging "backend database"
```

---

## Deployment Matrix

| Deployment Type | Environment | Method | GitOps | Self-Healing |
|-----------------|-------------|--------|--------|--------------|
| **Local** | dev | Docker Compose | ❌ | ❌ |
| **Local** | dev | Minikube/Kind/k3d | ❌ | ❌ |
| **Local** | staging | Minikube/Kind/k3d | ❌ | ❌ |
| **Local** | production | Minikube/Kind/k3d | ❌ | ❌ |
| **Cloud** | dev | Kubernetes | ✅ | ✅ |
| **Cloud** | staging | Kubernetes | ✅ | ✅ |
| **Cloud** | production | Kubernetes | ✅ | ✅ |

---

## Parameters

### 1. Deployment Type

| Value | Description | Use Case |
|-------|-------------|----------|
| `local` | Local development | Development, testing |
| `cloud` | Self-hosted infrastructure | Staging, production |

### 2. Environment

| Value | Description | Namespace |
|-------|-------------|-----------|
| `dev` | Development | `auraweb-dev` |
| `staging` | Pre-production | `auraweb-staging` |
| `production` | Live production | `auraweb-prod` |

### 3. Services

| Value | Description |
|-------|-------------|
| `all` | All services (default) |
| `backend` | Backend API only |
| `frontend` | Frontend app only |
| `admin` | Admin panel only |
| `gateway` | Nginx gateway only |
| `database` | PostgreSQL only |
| `"backend frontend"` | Multiple services |

### 4. Cluster Type (Local only)

| Value | Description | Speed | Resources |
|-------|-------------|-------|-----------|
| `docker-compose` | Docker Compose (default for dev) | ⚡⚡⚡ | Low |
| `minikube` | Full-featured K8s | ⚡⚡ | High |
| `kind` | K8s in Docker | ⚡⚡⚡ | Medium |
| `k3d` | Lightweight K3s | ⚡⚡⚡ | Low |
| `docker-desktop` | Built-in K8s | ⚡⚡ | Medium |

### 5. GitOps (Cloud only)

| Value | Description |
|-------|-------------|
| `gitops` | Use ArgoCD for deployment |
| (empty) | Direct kubectl deployment |

---

## Deployment Workflows

### Local Development (Docker Compose)

```bash
# Start all services
./scripts/deploy local dev all docker-compose

# Start only backend for API development
./scripts/deploy local dev backend docker-compose

# Start frontend and admin for UI development
./scripts/deploy local dev "frontend admin" docker-compose
```

**Access**:
- Frontend: http://localhost
- Admin: http://localhost/admin
- Backend: http://localhost:3000

---

### Local Development (Kubernetes)

```bash
# Deploy to Minikube - all services
./scripts/deploy local dev all minikube

# Deploy to Kind - backend only
./scripts/deploy local dev backend kind

# Deploy to k3d - frontend and gateway
./scripts/deploy local dev "frontend gateway" k3d
```

**Access**:
```bash
# Minikube
minikube service gateway -n auraweb-local

# Kind/k3d/Docker Desktop
kubectl port-forward -n auraweb-local svc/gateway 8080:80
# Then: http://localhost:8080
```

---

### Cloud Staging

```bash
# Deploy all services to staging
./scripts/deploy cloud staging all

# Deploy only backend to staging
./scripts/deploy cloud staging backend

# Deploy with GitOps
./scripts/deploy cloud staging all "" gitops
```

**Access**:
```bash
kubectl get ingress -n auraweb-staging
```

---

### Cloud Production

```bash
# Deploy all services to production
./scripts/deploy cloud production all

# Deploy with GitOps (recommended)
./scripts/deploy cloud production all "" gitops

# Deploy only specific services
./scripts/deploy cloud production "backend frontend"
```

**Access**:
```bash
kubectl get ingress -n auraweb-prod
```

---

## CI/CD Integration

### GitHub Actions

```bash
# Local dev with Docker Compose
gh workflow run ci-cd.yml \
  -f deployment_type=local \
  -f environment=dev \
  -f services=all \
  -f cluster_type=docker-compose

# Local staging with Minikube
gh workflow run ci-cd.yml \
  -f deployment_type=local \
  -f environment=staging \
  -f services=all \
  -f cluster_type=minikube

# Cloud production with GitOps
gh workflow run ci-cd.yml \
  -f deployment_type=cloud \
  -f environment=production \
  -f services=all \
  -f use_gitops=true

# Cloud dev - backend only
gh workflow run ci-cd.yml \
  -f deployment_type=cloud \
  -f environment=dev \
  -f services=backend
```

---

## Service Selection Patterns

### Full Stack Development
```bash
# All services
./scripts/deploy local dev all docker-compose
```

### Backend Development
```bash
# Backend + Database
./scripts/deploy local dev "backend database" docker-compose
```

### Frontend Development
```bash
# Frontend + Admin + Gateway (assumes backend is running elsewhere)
./scripts/deploy local dev "frontend admin gateway" minikube
```

### API Testing
```bash
# Backend only
./scripts/deploy local dev backend kind
```

### UI Testing
```bash
# Frontend + Admin
./scripts/deploy local dev "frontend admin" docker-compose
```

---

## GitOps with ArgoCD

### Enable GitOps

```bash
# Deploy with GitOps
./scripts/deploy cloud production all "" gitops
```

### Benefits

- ✅ **Declarative**: Git as source of truth
- ✅ **Self-Healing**: Automatic drift correction
- ✅ **Rollback**: Easy rollback to previous versions
- ✅ **Audit Trail**: All changes tracked in Git
- ✅ **Multi-Environment**: Manage dev/staging/prod from one place

### ArgoCD UI

```bash
# Access ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

---

## Environment-Specific Configurations

### Development
- **Purpose**: Local development and testing
- **Method**: Docker Compose or local K8s
- **Resources**: Minimal
- **Data**: Sample data
- **Monitoring**: Basic logs

### Staging
- **Purpose**: Pre-production testing
- **Method**: Cloud K8s or local K8s
- **Resources**: Production-like
- **Data**: Anonymized production data
- **Monitoring**: Full monitoring stack

### Production
- **Purpose**: Live environment
- **Method**: Cloud K8s with GitOps
- **Resources**: High availability
- **Data**: Real data
- **Monitoring**: Full monitoring + alerting

---

## Best Practices

### Local Development
```bash
# Use Docker Compose for speed
./scripts/deploy local dev all docker-compose

# Use local K8s for testing K8s configs
./scripts/deploy local dev all minikube
```

### Staging
```bash
# Use cloud K8s for production parity
./scripts/deploy cloud staging all

# Test with GitOps before production
./scripts/deploy cloud staging all "" gitops
```

### Production
```bash
# Always use GitOps for production
./scripts/deploy cloud production all "" gitops

# Deploy all services together
# Avoid selective deployment in production
```

---

## Comparison Table

| Feature | Local (Compose) | Local (K8s) | Cloud (Direct) | Cloud (GitOps) |
|---------|-----------------|-------------|----------------|----------------|
| **Speed** | ⚡⚡⚡ | ⚡⚡ | ⚡⚡ | ⚡ |
| **Resources** | Low | Medium | High | High |
| **Prod Parity** | ⚠️ | ✅ | ✅ | ✅ |
| **GitOps** | ❌ | ❌ | ❌ | ✅ |
| **Self-Healing** | ❌ | ❌ | ❌ | ✅ |
| **Rollback** | Manual | Manual | Manual | ✅ |
| **Audit Trail** | ❌ | ❌ | ⚠️ | ✅ |
| **Best For** | Dev | Testing | Staging | Production |

---

## Troubleshooting

### Check Deployment Status

```bash
# Local (Docker Compose)
docker compose ps

# Local (K8s)
kubectl get pods -n auraweb-local

# Cloud
kubectl get pods -n auraweb-[dev|staging|production]
```

### View Logs

```bash
# Local (Docker Compose)
docker compose logs -f [service]

# Kubernetes
kubectl logs -f -l app=[service] -n [namespace]
```

### Restart Services

```bash
# Local (Docker Compose)
docker compose restart [service]

# Kubernetes
kubectl rollout restart deployment/[service] -n [namespace]
```

---

## Summary

**Unified Command**:
```bash
./scripts/deploy [local|cloud] [dev|staging|production] [services] [cluster-type] [gitops]
```

**Examples**:
- Local dev: `./scripts/deploy local dev all docker-compose`
- Local staging: `./scripts/deploy local staging all minikube`
- Cloud staging: `./scripts/deploy cloud staging all`
- Cloud prod (GitOps): `./scripts/deploy cloud production all "" gitops`

**Service Selection**: `all`, `backend`, `frontend`, `admin`, `gateway`, `database`, or combinations

**GitOps**: Add `gitops` as last parameter for cloud deployments
