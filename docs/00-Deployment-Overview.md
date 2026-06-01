# Deployment Guide - All Methods

## Overview

Comprehensive guide covering all deployment methods for this project.

---

## Deployment Methods

| Method | Best For | Complexity | Production Ready |
|--------|----------|------------|------------------|
| **Docker Compose** | Local development | ⭐ | ❌ |
| **Local Kubernetes** | Testing K8s configs | ⭐⭐ | ⚠️ |
| **Cloud Kubernetes** | Production | ⭐⭐⭐ | ✅ |
| **GitOps (ArgoCD)** | Enterprise production | ⭐⭐⭐⭐ | ✅ |

---

## 1. Docker Compose Deployment

**Best for**: Quick local development

### Quick Start

```bash
# Using unified script
./scripts/deploy local dev all docker-compose

# Or directly
docker compose up -d
```

### Access

- Frontend: http://localhost
- Admin: http://localhost/admin
- Backend (Gateway): http://localhost:8080

### Management

```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop all
docker compose down
```

**Full Guide**: [`06-Deployment-Docker-Compose.md`](06-Deployment-Docker-Compose.md)

---

## 2. Local Kubernetes Deployment

**Best for**: Testing Kubernetes configurations locally

### Supported Clusters

- **Minikube** - Full-featured, VM-based
- **Kind** - Kubernetes in Docker (fast)
- **k3d** - Lightweight K3s (fastest)
- **Docker Desktop** - Built-in Kubernetes

### Quick Start

### Interactive Deployment (Recommended)

```bash
./scripts/deploy
```

**Features**:
- ✅ Console-based menu selection
- ✅ Step-by-step prompts
- ✅ No need to remember parameters
- ✅ Confirmation before deployment

### Direct Command

```bash
./scripts/deploy <type> <env> [services] [cluster] [options]
```

**Examples**:
```bash
# Local development
./scripts/deploy local dev

# Local Kubernetes
./scripts/deploy local dev all minikube

# Cloud production with GitOps
./scripts/deploy cloud production all --gitops
```

---### Access

```bash
# Minikube
minikube service gateway -n auraweb-local

# Kind/k3d/Docker Desktop
kubectl port-forward -n auraweb-local svc/gateway 8080:80
# Then: http://localhost:8080
```

**Full Guide**: [`07-Deployment-Local-Kubernetes.md`](07-Deployment-Local-Kubernetes.md)

---

## 3. Cloud Kubernetes Deployment

**Best for**: Production deployments

### Prerequisites

- Kubernetes cluster (GKE, EKS, AKS, or self-hosted)
- kubectl configured
- Container registry
- Domain name (for ingress)

### Quick Start

```bash
# Deploy to staging
./scripts/deploy cloud staging all

# Deploy to production
./scripts/deploy cloud production all
```

### Environments

**Development**:
- Namespace: `auraweb-dev`
- Replicas: 2
- Resources: Medium

**Staging**:
- Namespace: `auraweb-staging`
- Replicas: 2-3
- Resources: Production-like

**Production**:
- Namespace: `auraweb-prod`
- Replicas: 3-10 (auto-scaling)
- Resources: High
- Network policies: Enabled

**Full Guide**: [`KUBERNETES.md`](KUBERNETES.md)

---

## 4. GitOps Deployment (ArgoCD)

**Best for**: Enterprise production with automated sync

### Quick Start

```bash
# Deploy with GitOps
./scripts/deploy cloud production all "" gitops
```

### Features

- ✅ Automated sync from Git
- ✅ Self-healing
- ✅ Rollback capability
- ✅ Audit trail

### Management

```bash
# View applications
argocd app list

# Sync application
argocd app sync auraweb-production

# Rollback
argocd app rollback auraweb-production
```

**Full Guide**: [`05-CICD-ArgoCD-GitOps.md`](05-CICD-ArgoCD-GitOps.md)

---

## Selective Service Deployment

All methods support deploying specific services:

```bash
# Deploy only backend
./scripts/deploy local dev backend docker-compose

# Deploy backend services + database
./scripts/deploy local dev "catalog user-auth database" minikube

# Deploy frontend + admin + gateway
./scripts/deploy cloud staging "frontend admin gateway"
```

---

## Environment Configuration

### Development

```bash
# Copy environment file
cp .env.development .env

# Edit as needed
vim .env
```

### Staging

```bash
cp .env.staging .env
# Update with staging values
```

### Production

```bash
cp .env.production .env
# Update with production secrets
```

**Full Guide**: [`ENVIRONMENT.md`](ENVIRONMENT.md)

---

## Comparison Matrix

| Feature | Docker Compose | Local K8s | Cloud K8s | GitOps |
|---------|----------------|-----------|-----------|--------|
| **Setup Time** | 5 min | 15 min | 30 min | 45 min |
| **Complexity** | Low | Medium | High | High |
| **Prod Parity** | ❌ | ✅ | ✅ | ✅ |
| **Auto-scaling** | ❌ | ⚠️ | ✅ | ✅ |
| **Self-healing** | ❌ | ❌ | ⚠️ | ✅ |
| **Rollback** | Manual | Manual | Manual | ✅ |
| **Cost** | Free | Free | $$$ | $$$ |

---

## Troubleshooting

### Docker Compose Issues

```bash
# Check logs
docker compose logs [service]

# Restart service
docker compose restart [service]

# Rebuild
docker compose build --no-cache [service]
```

### Kubernetes Issues

```bash
# Check pods
kubectl get pods -n [namespace]

# View logs
kubectl logs -f [pod-name] -n [namespace]

# Describe pod
kubectl describe pod [pod-name] -n [namespace]
```

---

## Next Steps

1. **Choose deployment method** based on your needs
2. **Follow specific guide** for detailed instructions
3. **Configure environment** variables
4. **Deploy** using unified script or platform-specific method
5. **Verify** deployment with health checks

---

## Related Documentation

- **Unified Deployment**: [`UNIFIED_DEPLOYMENT.md`](UNIFIED_DEPLOYMENT.md)
- **Docker Compose**: [`06-Deployment-Docker-Compose.md`](06-Deployment-Docker-Compose.md)
- **Local Kubernetes**: [`07-Deployment-Local-Kubernetes.md`](07-Deployment-Local-Kubernetes.md)
- **Cloud Kubernetes**: [`KUBERNETES.md`](KUBERNETES.md)
- **GitOps**: [`05-CICD-ArgoCD-GitOps.md`](05-CICD-ArgoCD-GitOps.md)

---

**Status**: ✅ Production Ready  
**Last Updated**: December 28, 2025
