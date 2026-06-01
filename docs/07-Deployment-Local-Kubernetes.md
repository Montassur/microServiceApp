# Local Kubernetes Deployment Guide

## Overview

Deploy to local Kubernetes clusters with support for:
- **Minikube** - VM-based local cluster
- **Kind** - Kubernetes in Docker
- **k3d** - Lightweight K3s in Docker
- **Docker Desktop** - Built-in Kubernetes

## Quick Start

### Deploy All Services

```bash
# Minikube (default)
./scripts/deploy-k8s-local.sh minikube deploy all

# Kind
./scripts/deploy-k8s-local.sh kind deploy all

# k3d
./scripts/deploy-k8s-local.sh k3d deploy all

# Docker Desktop
./scripts/deploy-k8s-local.sh docker-desktop deploy all
```

### Deploy Specific Services

```bash
# Deploy only backend
./scripts/deploy-k8s-local.sh minikube deploy backend

# Deploy core services
./scripts/deploy-k8s-local.sh kind deploy "catalog user-auth frontend"

# Deploy frontend, admin, and gateway
./scripts/deploy-k8s-local.sh k3d deploy "frontend admin gateway"
```

---

## Prerequisites

### Install Cluster Tools

**Minikube**:
```bash
# macOS
brew install minikube

# Linux
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Windows
choco install minikube
```

**Kind**:
```bash
# macOS/Linux
brew install kind

# Windows
choco install kind
```

**k3d**:
```bash
# macOS/Linux
brew install k3d

# Windows
choco install k3d
```

**Docker Desktop**:
- Enable Kubernetes in Docker Desktop settings

---

## Deployment Options

### 1. Deploy All Services

```bash
./scripts/deploy-k8s-local.sh minikube deploy all
```

**Deploys**:
- Database (PostgreSQL StatefulSet)
- Backend (Deployment)
- Frontend (Deployment)
- Admin (Deployment)
- Gateway (Deployment + Ingress)

### 2. Deploy Backend Only

```bash
./scripts/deploy-k8s-local.sh minikube deploy "catalog user-auth"
```

**Use Case**: Backend development

### 3. Deploy Frontend + Admin

```bash
./scripts/deploy-k8s-local.sh minikube deploy "frontend admin"
```

**Use Case**: Frontend development with existing backend

### 4. Deploy Backend + Database

```bash
./scripts/deploy-k8s-local.sh minikube deploy "catalog user-auth database"
```

**Use Case**: API development

### 5. Deploy Gateway + Frontend

```bash
./scripts/deploy-k8s-local.sh minikube deploy "gateway frontend"
```

**Use Case**: Testing routing

---

## Cluster Comparison

| Feature | Minikube | Kind | k3d | Docker Desktop |
|---------|----------|------|-----|----------------|
| **Speed** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Resource Usage** | High | Low | Low | Medium |
| **Multi-node** | ✅ | ✅ | ✅ | ❌ |
| **LoadBalancer** | ✅ (tunnel) | ⚠️ (manual) | ✅ | ✅ |
| **Ingress** | ✅ (addon) | ✅ (manual) | ✅ (manual) | ✅ (manual) |
| **Best For** | Full features | CI/CD | Speed | Simplicity |

---

## Access Services

### Minikube

```bash
# Get cluster IP
minikube ip

# Access via IP
curl http://$(minikube ip)

# Or use service
minikube service gateway -n auraweb-local

# Or tunnel
minikube tunnel
# Then access: http://localhost
```

### Kind / k3d / Docker Desktop

```bash
# Port forward
kubectl port-forward -n auraweb-local svc/gateway 8080:80

# Access
curl http://localhost:8080
```

---

## Management Commands

### View Status

```bash
./scripts/deploy-k8s-local.sh minikube status
```

### View Logs

```bash
# All services
./scripts/deploy-k8s-local.sh minikube logs

# Specific service
kubectl logs -f -l app=backend -n auraweb-local
```

### Restart Services

```bash
# All services
./scripts/deploy-k8s-local.sh minikube restart all

# Specific service
./scripts/deploy-k8s-local.sh minikube restart backend
```

### Cleanup

```bash
./scripts/deploy-k8s-local.sh minikube cleanup
```

---

## CI/CD Integration

### GitHub Actions

```bash
# Trigger via workflow dispatch
gh workflow run ci-cd.yml \
  -f environment=local-k8s \
  -f cluster_type=kind \
  -f services=all

# Deploy specific services
gh workflow run ci-cd.yml \
  -f environment=local-k8s \
  -f cluster_type=minikube \
  -f services="backend frontend"
```

### Manual Trigger

```yaml
# .github/workflows/ci-cd.yml supports:
environment:
  - local-compose    # Docker Compose
  - local-k8s        # Local Kubernetes
  - staging
  - production

cluster_type:
  - minikube
  - kind
  - k3d
  - docker-desktop

services:
  - all
  - backend
  - frontend
  - admin
  - gateway
  - database
  - "backend frontend"  # Multiple
```

---

## Development Workflows

### Workflow 1: Full Stack Development

```bash
# Deploy all services
./scripts/deploy-k8s-local.sh minikube deploy all

# Make changes to backend
vim backend/src/app.js

# Rebuild and redeploy backend only
docker build -t auraweb/backend:local ./backend
minikube image load auraweb/backend:local
kubectl rollout restart deployment/dev-backend -n auraweb-local

# View logs
kubectl logs -f -l app=backend -n auraweb-local
```

### Workflow 2: Frontend Development

```bash
# Deploy backend + database (dependencies)
./scripts/deploy-k8s-local.sh minikube deploy "backend database"

# Run frontend locally (faster iteration)
cd frontend
npm run dev

# Or deploy frontend to K8s
./scripts/deploy-k8s-local.sh minikube deploy frontend
```

### Workflow 3: Backend API Development

```bash
# Deploy only database
./scripts/deploy-k8s-local.sh minikube deploy database

# Run backend locally with hot reload
cd backend
npm run dev

# Or deploy to K8s
./scripts/deploy-k8s-local.sh minikube deploy backend
```

---

## Troubleshooting

### Cluster Not Starting

**Minikube**:
```bash
minikube delete
minikube start --driver=docker --cpus=4 --memory=8192
```

**Kind**:
```bash
kind delete cluster --name auraweb-local
kind create cluster --name auraweb-local
```

**k3d**:
```bash
k3d cluster delete auraweb-local
k3d cluster create auraweb-local --agents 2
```

### Image Pull Errors

```bash
# Verify image is loaded
minikube image ls | grep auraweb
kind load docker-image auraweb/backend:local --name auraweb-local
k3d image import auraweb/backend:local -c auraweb-local
```

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n auraweb-local

# Describe pod
kubectl describe pod <pod-name> -n auraweb-local

# View logs
kubectl logs <pod-name> -n auraweb-local

# Check events
kubectl get events -n auraweb-local --sort-by='.lastTimestamp'
```

### Ingress Not Working

```bash
# Minikube
minikube addons enable ingress
minikube tunnel

# Kind/k3d
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for ingress controller
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

---

## Best Practices

### 1. Resource Limits

Ensure your cluster has enough resources:
```bash
# Minikube
minikube start --cpus=4 --memory=8192

# Kind
kind create cluster --config kind-config.yaml
```

### 2. Image Management

Build images before deploying:
```bash
# Build all
docker compose build

# Load into cluster
for service in backend frontend admin gateway; do
  minikube image load auraweb/${service}:local
done
```

### 3. Namespace Isolation

Always use the `auraweb-local` namespace:
```bash
kubectl config set-context --current --namespace=auraweb-local
```

### 4. Clean Up Regularly

```bash
# Remove old resources
./scripts/deploy-k8s-local.sh minikube cleanup

# Prune Docker
docker system prune -f
```

---

## Comparison: Docker Compose vs Local K8s

| Aspect | Docker Compose | Local K8s |
|--------|----------------|-----------|
| **Startup Time** | ⚡ Fast (seconds) | 🐢 Slower (minutes) |
| **Resource Usage** | 💚 Low | 💛 Medium-High |
| **Production Parity** | ⚠️ Different | ✅ Same |
| **Networking** | Simple | Complex (Ingress) |
| **Scaling** | ❌ No | ✅ Yes |
| **Best For** | Quick dev | Production testing |

### When to Use Docker Compose
- ✅ Quick local development
- ✅ Simple testing
- ✅ Low resource machines
- ✅ Fast iteration

### When to Use Local K8s
- ✅ Testing K8s manifests
- ✅ Production-like environment
- ✅ Testing scaling
- ✅ Testing ingress/networking
- ✅ CI/CD testing

---

## Next Steps

1. **Choose your cluster**: Minikube for full features, Kind/k3d for speed
2. **Deploy services**: Start with all, then selective as needed
3. **Develop**: Make changes and redeploy specific services
4. **Test**: Use K8s for production-like testing
5. **Deploy**: Push to staging/production with confidence
