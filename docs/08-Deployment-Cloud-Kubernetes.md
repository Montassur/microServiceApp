# Kubernetes Deployment Guide

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

---

## Prerequisites

### Required Tools

1. **kubectl** (v1.25+)
   ```bash
   # Install kubectl
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   chmod +x kubectl
   sudo mv kubectl /usr/local/bin/
   ```

2. **kustomize** (v4.5+)
   ```bash
   curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
   sudo mv kustomize /usr/local/bin/
   ```

3. **Docker** (for building images)
   - [Install Docker](https://docs.docker.com/get-docker/)

4. **Kubernetes Cluster**
   - Local: Docker Desktop, Minikube, or kind
   - Cloud: EKS, GKE, or AKS

### Optional Tools

- **helm** - Package manager for Kubernetes
- **k9s** - Terminal UI for Kubernetes
- **kubectx/kubens** - Context and namespace switcher

---

## Quick Start

### 1. Local Development with Docker Compose

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### 2. Deploy to Kubernetes (Development)

```bash
# Using Makefile
make deploy-dev

# Or manually
kubectl apply -k k8s/overlays/development

# Check status
kubectl get pods -n ecommerce-dev
```

---

## Development Deployment

### Step 1: Build Docker Images

```bash
# Build all images
docker build -t ecommerce/frontend:dev ./frontend
docker build -t ecommerce/admin:dev ./admin
docker build -t ecommerce/backend:dev ./backend
```

### Step 2: Push to Registry (Optional)

```bash
# Tag for your registry
docker tag ecommerce/frontend:dev your-registry/ecommerce/frontend:dev
docker tag ecommerce/admin:dev your-registry/ecommerce/admin:dev
docker tag ecommerce/backend:dev your-registry/ecommerce/backend:dev

# Push
docker push your-registry/ecommerce/frontend:dev
docker push your-registry/ecommerce/admin:dev
docker push your-registry/ecommerce/backend:dev
```

### Step 3: Deploy to Kubernetes

```bash
# Deploy using kustomize
kubectl apply -k k8s/overlays/development

# Or use the script
./scripts/deploy-dev.sh

# Or use Makefile
make deploy-dev
```

### Step 4: Verify Deployment

```bash
# Check pods
kubectl get pods -n ecommerce-dev

# Check services
kubectl get svc -n ecommerce-dev

# Check logs
kubectl logs -f deployment/dev-backend -n ecommerce-dev
```

### Step 5: Access the Application

```bash
# Port forward to local machine
kubectl port-forward svc/dev-gateway 8080:80 -n ecommerce-dev

# Access at http://localhost:8080
```

---

## Production Deployment

### Prerequisites

1. **Container Registry**
   - Docker Hub, AWS ECR, GCR, or ACR
   - Credentials configured

2. **Domain & DNS**
   - Domain name configured
   - DNS pointing to cluster

3. **SSL Certificates**
   - cert-manager installed
   - Let's Encrypt configured

### Step 1: Prepare Secrets

```bash
# Create secrets directory
mkdir -p k8s/overlays/production/secrets

# Generate JWT secrets
openssl rand -base64 32 > k8s/overlays/production/secrets/jwt-secret.txt
openssl rand -base64 32 > k8s/overlays/production/secrets/jwt-refresh-secret.txt

# Database credentials
echo "postgres" > k8s/overlays/production/secrets/db-username.txt
echo "$(openssl rand -base64 32)" > k8s/overlays/production/secrets/db-password.txt

# IMPORTANT: Add secrets/ to .gitignore
echo "k8s/overlays/production/secrets/" >> .gitignore
```

### Step 2: Update Configuration

Edit `k8s/overlays/production/kustomization.yaml`:

```yaml
# Update image tags
images:
- name: ecommerce/frontend
  newTag: v1.0.0
- name: ecommerce/admin
  newTag: v1.0.0
- name: ecommerce/backend
  newTag: v1.0.0
```

### Step 3: Deploy

```bash
# Using script (recommended)
./scripts/deploy-prod.sh

# Or manually
kubectl apply -k k8s/overlays/production

# Update images
kubectl set image deployment/prod-frontend frontend=ecommerce/frontend:v1.0.0 -n ecommerce-prod
kubectl set image deployment/prod-admin admin=ecommerce/admin:v1.0.0 -n ecommerce-prod
kubectl set image deployment/prod-backend backend=ecommerce/backend:v1.0.0 -n ecommerce-prod
```

### Step 4: Verify Production

```bash
# Check all resources
kubectl get all -n ecommerce-prod

# Run health checks
./scripts/health-check.sh prod

# Check ingress
kubectl get ingress -n ecommerce-prod

# Check SSL certificate
kubectl get certificate -n ecommerce-prod
```

---

## Configuration

### Environment Variables

#### Development
Located in: `k8s/overlays/development/kustomization.yaml`

```yaml
configMapGenerator:
- name: env-config
  literals:
  - NODE_ENV=development
  - LOG_LEVEL=debug
```

#### Production
Located in: `k8s/overlays/production/kustomization.yaml`

```yaml
configMapGenerator:
- name: env-config
  literals:
  - NODE_ENV=production
  - LOG_LEVEL=info
```

### Resource Limits

#### Development
- Backend: 128Mi RAM, 100m CPU
- Frontend/Admin: 64Mi RAM, 50m CPU

#### Production
- Backend: 512Mi-1Gi RAM, 500m-1000m CPU
- Frontend/Admin: 256Mi-512Mi RAM, 200m-400m CPU

### Scaling

#### Manual Scaling
```bash
# Scale backend to 5 replicas
kubectl scale deployment/prod-backend --replicas=5 -n ecommerce-prod
```

#### Auto-Scaling (Production)
HPA configured in `k8s/overlays/production/hpa.yaml`:
- Backend: 3-10 replicas (70% CPU)
- Frontend: 2-8 replicas (75% CPU)

---

## Monitoring

### View Logs

```bash
# All pods in namespace
kubectl logs -f -l app=backend -n ecommerce-prod

# Specific pod
kubectl logs -f pod-name -n ecommerce-prod

# Previous pod logs
kubectl logs -f pod-name --previous -n ecommerce-prod
```

### Metrics

```bash
# Pod metrics
kubectl top pods -n ecommerce-prod

# Node metrics
kubectl top nodes
```

### Events

```bash
# Recent events
kubectl get events -n ecommerce-prod --sort-by='.lastTimestamp'
```

---

## Troubleshooting

### Pod Not Starting

```bash
# Describe pod
kubectl describe pod pod-name -n ecommerce-prod

# Check logs
kubectl logs pod-name -n ecommerce-prod

# Common issues:
# - Image pull errors
# - Resource limits too low
# - Missing secrets/configmaps
```

### Service Not Accessible

```bash
# Check service
kubectl get svc -n ecommerce-prod

# Check endpoints
kubectl get endpoints -n ecommerce-prod

# Test from another pod
kubectl run -it --rm debug --image=alpine --restart=Never -- sh
# Inside pod:
wget -O- http://backend:3000/health
```

### Database Connection Issues

```bash
# Check database pod
kubectl get pods -l app=database -n ecommerce-prod

# Check database logs
kubectl logs -f statefulset/database -n ecommerce-prod

# Connect to database
kubectl exec -it database-0 -n ecommerce-prod -- psql -U postgres -d ecommerce
```

### Rollback Failed Deployment

```bash
# Rollback to previous version
kubectl rollout undo deployment/prod-backend -n ecommerce-prod

# Rollback to specific revision
kubectl rollout undo deployment/prod-backend --to-revision=2 -n ecommerce-prod

# Check rollout history
kubectl rollout history deployment/prod-backend -n ecommerce-prod
```

---

## Maintenance

### Database Backup

```bash
# Backup database
make db-backup

# Or manually
kubectl exec database-0 -n ecommerce-prod -- pg_dump -U postgres ecommerce > backup.sql
```

### Database Restore

```bash
# Restore from backup
make db-restore file=backup.sql

# Or manually
kubectl exec -i database-0 -n ecommerce-prod -- psql -U postgres ecommerce < backup.sql
```

### Update Secrets

```bash
# Update secret
kubectl create secret generic backend-secrets \
  --from-literal=JWT_SECRET=new-secret \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart pods to pick up new secrets
kubectl rollout restart deployment/prod-backend -n ecommerce-prod
```

### Certificate Renewal

Certificates are automatically renewed by cert-manager. To force renewal:

```bash
# Delete certificate
kubectl delete certificate ecommerce-prod-tls -n ecommerce-prod

# Reapply ingress
kubectl apply -f k8s/base/ingress/ingress.yaml
```

---

## Useful Commands

### Quick Reference

```bash
# Get all resources
kubectl get all -n ecommerce-prod

# Describe resource
kubectl describe deployment/prod-backend -n ecommerce-prod

# Edit resource
kubectl edit deployment/prod-backend -n ecommerce-prod

# Delete resource
kubectl delete pod pod-name -n ecommerce-prod

# Execute command in pod
kubectl exec -it pod-name -n ecommerce-prod -- /bin/sh

# Port forward
kubectl port-forward svc/backend 3000:3000 -n ecommerce-prod

# Copy files
kubectl cp pod-name:/path/to/file ./local-file -n ecommerce-prod

# Apply changes
kubectl apply -f file.yaml

# Delete namespace (CAREFUL!)
kubectl delete namespace ecommerce-dev
```

---

## Best Practices

1. **Always use version tags** for production images
2. **Test in development** before deploying to production
3. **Backup database** before major updates
4. **Monitor resource usage** and adjust limits
5. **Use secrets** for sensitive data
6. **Enable autoscaling** for production
7. **Set up alerts** for critical issues
8. **Document changes** in Git commits
9. **Use rolling updates** for zero-downtime
10. **Have a rollback plan** ready

---

## Support

For issues or questions:
1. Check logs: `kubectl logs -f deployment/name -n namespace`
2. Check events: `kubectl get events -n namespace`
3. Review documentation
4. Contact DevOps team

---

**Last Updated**: 2025-12-28
