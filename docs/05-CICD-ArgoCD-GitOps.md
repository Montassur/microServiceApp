# ArgoCD GitOps Guide

## Overview

Complete guide for setting up and using ArgoCD for GitOps-based deployments.

---

## Quick Start

### 1. Install ArgoCD

```bash
# Create namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 2. Access ArgoCD UI

```bash
# Port forward
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

**Access**: https://localhost:8080  
**Username**: `admin`  
**Password**: (from above command)

### 3. Deploy Applications

```bash
# Apply application manifests
kubectl apply -f argocd/applications.yaml
```

---

## Application Configuration

**File**: `argocd/applications.yaml`

### Applications

**Staging**:
```yaml
name: auraweb-staging
source:
  repoURL: https://github.com/your-org/your-repo.git
  targetRevision: develop
  path: k8s/overlays/development
destination:
  namespace: auraweb-dev
```

**Production**:
```yaml
name: auraweb-production
source:
  targetRevision: main
  path: k8s/overlays/production
destination:
  namespace: auraweb-prod
```

---

## Features

### Automated Sync

```yaml
syncPolicy:
  automated:
    prune: true        # Delete resources not in Git
    selfHeal: true     # Auto-correct drift
    allowEmpty: false  # Prevent empty sync
```

### Sync Options

```yaml
syncOptions:
  - CreateNamespace=true
  - PrunePropagationPolicy=foreground
  - PruneLast=true
```

### Retry Policy

```yaml
retry:
  limit: 5
  backoff:
    duration: 5s
    factor: 2
    maxDuration: 3m
```

---

## CLI Usage

### Install CLI

```bash
# macOS
brew install argocd

# Linux
curl -sSL -o /usr/local/bin/argocd \
  https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /usr/local/bin/argocd
```

### Login

```bash
argocd login localhost:8080 \
  --username admin \
  --password <password>
```

### Manage Applications

```bash
# List applications
argocd app list

# Get application details
argocd app get auraweb-production

# Sync application
argocd app sync auraweb-production

# View sync status
argocd app wait auraweb-production

# Rollback
argocd app rollback auraweb-production
```

---

## Repository Configuration

### Add Repository

**UI**:
1. Settings → Repositories
2. Connect Repo using HTTPS
3. Enter credentials

**CLI**:
```bash
argocd repo add https://github.com/your-org/your-repo.git \
  --username your-username \
  --password your-token
```

---

## Sync Strategies

### Automatic Sync

**Best for**: Development, Staging

```yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true
```

### Manual Sync

**Best for**: Production

```yaml
syncPolicy:
  automated: null  # Disable auto-sync
```

**Sync manually**:
```bash
argocd app sync auraweb-production
```

---

## Health Checks

### Resource Health

ArgoCD monitors:
- Deployments
- StatefulSets
- Services
- Ingress
- PVCs

### Custom Health Checks

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

---

## Notifications

### Configure Notifications

```bash
# Install notifications controller
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj-labs/argocd-notifications/stable/manifests/install.yaml
```

### Slack Integration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
data:
  service.slack: |
    token: $slack-token
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [app-deployed]
```

---

## Rollback

### View History

```bash
# List revisions
argocd app history auraweb-production
```

### Rollback to Previous Version

```bash
# Rollback to specific revision
argocd app rollback auraweb-production <revision-id>

# Rollback to previous
argocd app rollback auraweb-production
```

---

## Monitoring

### Application Status

**UI**: Dashboard shows:
- Sync status
- Health status
- Last sync time
- Deployment history

**CLI**:
```bash
# Watch application
argocd app watch auraweb-production

# Get sync status
argocd app get auraweb-production --refresh
```

---

## Troubleshooting

### Sync Failures

**Check logs**:
```bash
# Application logs
kubectl logs -n argocd deployment/argocd-application-controller

# Sync operation logs
argocd app logs auraweb-production
```

### Out of Sync

**Causes**:
- Manual kubectl changes
- Drift from Git
- Failed sync

**Fix**:
```bash
# Hard refresh
argocd app sync auraweb-production --force

# Prune extra resources
argocd app sync auraweb-production --prune
```

---

## Best Practices

### Git Structure

```
k8s/
├── base/              # Base manifests
└── overlays/
    ├── development/   # Dev overrides
    └── production/    # Prod overrides
```

### Application Per Environment

✅ Separate apps for dev/staging/prod  
✅ Different sync policies per environment  
✅ Environment-specific configurations

### Security

- ✅ Use SSH keys for private repos
- ✅ Enable RBAC
- ✅ Rotate credentials regularly
- ✅ Use sealed secrets

---

## Advanced Features

### App of Apps Pattern

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
spec:
  source:
    path: apps/
```

### Sync Waves

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"  # Database first
    argocd.argoproj.io/sync-wave: "1"  # Backend second
    argocd.argoproj.io/sync-wave: "2"  # Frontend last
```

---

## Integration with CI/CD

### GitHub Actions

```yaml
- name: Trigger ArgoCD Sync
  run: |
    argocd app sync auraweb-production --prune
```

### GitLab CI

```yaml
deploy:production:
  script:
    - argocd app sync auraweb-production
```

---

## Next Steps

1. **Install ArgoCD**: Set up in cluster
2. **Configure repository**: Add Git repo
3. **Deploy applications**: Apply manifests
4. **Test sync**: Trigger manual sync
5. **Enable notifications**: Slack/Email

---

**Platform**: ArgoCD  
**Type**: GitOps  
**Status**: ✅ Production Ready  
**Documentation**: Complete
