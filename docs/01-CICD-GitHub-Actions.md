# GitHub Actions CI/CD Guide

## Overview

Complete guide for setting up and using GitHub Actions for CI/CD with this project.

---

## Quick Start

### 1. Enable GitHub Actions

GitHub Actions is enabled by default for all repositories.

### 2. Configure Secrets

Go to **Settings → Secrets and variables → Actions** and add:

```
KUBE_CONFIG_STAGING (base64 encoded kubeconfig)
KUBE_CONFIG_PRODUCTION (base64 encoded kubeconfig)
```

### 3. Trigger Workflow

```bash
# Manual trigger
gh workflow run ci-cd.yml \
  -f deployment_type=local \
  -f environment=dev \
  -f services=all \
  -f cluster_type=docker-compose

# Or push to trigger automatically
git push origin develop  # Triggers staging deployment
git push origin main     # Triggers production deployment
```

---

## Workflow Configuration

**File**: `.github/workflows/ci-cd.yml`

### Workflow Inputs

| Input | Description | Options | Default |
|-------|-------------|---------|---------|
| `deployment_type` | Where to deploy | `local`, `cloud` | `local` |
| `environment` | Target environment | `dev`, `staging`, `production` | `dev` |
| `services` | Services to deploy | `all`, `backend`, `frontend`, etc. | `all` |
| `cluster_type` | Local cluster type | `docker-compose`, `minikube`, `kind`, `k3d` | `docker-compose` |
| `use_gitops` | Use ArgoCD | `true`, `false` | `false` |

---

## Pipeline Stages

### 1. Lint (Parallel)
- Backend linting
- Frontend linting
- Admin linting

### 2. Test
- Backend unit tests with PostgreSQL
- 80%+ code coverage
- Upload to Codecov

### 3. Security Scan
- npm audit (moderate+ severity)
- Trivy filesystem scan
- Upload to GitHub Security

### 4. Build (Matrix)
- Build 4 Docker images (backend, frontend, admin, nginx)
- Push to GitHub Container Registry (ghcr.io)
- Tag with SHA and branch name
- Scan images with Trivy

### 5. Deploy
- **Local**: Docker Compose or local Kubernetes
- **Staging**: Automatic on `develop` branch
- **Production**: Automatic on `main` branch (requires approval)

---

## Usage Examples

### Local Development

```bash
# Deploy with Docker Compose
gh workflow run ci-cd.yml \
  -f deployment_type=local \
  -f environment=dev \
  -f services=all \
  -f cluster_type=docker-compose

# Deploy with Minikube
gh workflow run ci-cd.yml \
  -f deployment_type=local \
  -f environment=dev \
  -f services=all \
  -f cluster_type=minikube

# Deploy specific services
gh workflow run ci-cd.yml \
  -f deployment_type=local \
  -f environment=dev \
  -f services=backend \
  -f cluster_type=docker-compose
```

### Cloud Deployment

```bash
# Deploy to staging
gh workflow run ci-cd.yml \
  -f deployment_type=cloud \
  -f environment=staging \
  -f services=all

# Deploy to production with GitOps
gh workflow run ci-cd.yml \
  -f deployment_type=cloud \
  -f environment=production \
  -f services=all \
  -f use_gitops=true
```

---

## Automatic Triggers

### On Push

```yaml
# Triggers on push to these branches
branches: [main, develop, feature/**]
```

**Behavior**:
- `main` → Production deployment
- `develop` → Staging deployment
- `feature/**` → Local testing only

### On Pull Request

```yaml
# Triggers on PR to these branches
branches: [main, develop]
```

**Behavior**:
- Runs lint, test, and security scan
- Does NOT deploy

---

## Secrets Setup

### Encode Kubeconfig

```bash
# Encode your kubeconfig
cat ~/.kube/config | base64 -w 0

# Or on macOS
cat ~/.kube/config | base64
```

### Add to GitHub

1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Add:
   - Name: `KUBE_CONFIG_STAGING`
   - Value: (paste base64 encoded kubeconfig)
4. Repeat for `KUBE_CONFIG_PRODUCTION`

---

## Container Registry

### GitHub Container Registry (ghcr.io)

**Automatic**: Uses `GITHUB_TOKEN` (no configuration needed)

**Image naming**:
```
ghcr.io/your-org/your-repo/backend:main
ghcr.io/your-org/your-repo/frontend:develop
ghcr.io/your-org/your-repo/admin:sha-abc123
```

### Pull Images

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull
docker pull ghcr.io/your-org/your-repo/backend:main
```

---

## Monitoring Workflows

### View Runs

```bash
# List workflow runs
gh run list --workflow=ci-cd.yml

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log
```

### GitHub UI

1. Go to **Actions** tab
2. Select **CI/CD Pipeline** workflow
3. View runs, logs, and artifacts

---

## Troubleshooting

### Build Failures

**Check logs**:
```bash
gh run view <run-id> --log
```

**Common issues**:
- Linting errors: Fix with `npm run lint -- --fix`
- Test failures: Run `npm test` locally
- Docker build errors: Test with `docker build -t test ./backend`

### Deployment Failures

**kubectl errors**:
```bash
# Verify kubeconfig is correct
echo $KUBE_CONFIG_STAGING | base64 -d > /tmp/config
export KUBECONFIG=/tmp/config
kubectl cluster-info
```

**Image pull errors**:
```bash
# Verify image exists
docker pull ghcr.io/your-org/your-repo/backend:sha-abc123
```

---

## Best Practices

### Branch Strategy

```
main (production)
  ← develop (staging)
    ← feature/* (local testing)
```

### Commit Messages

```bash
feat: add new feature
fix: fix bug
test: add tests
ci: update CI config
docs: update documentation
```

### Pull Requests

1. Create PR from `feature/*` to `develop`
2. Wait for CI checks to pass
3. Get code review
4. Merge to `develop` (triggers staging deployment)
5. Test in staging
6. Create PR from `develop` to `main`
7. Merge to `main` (triggers production deployment)

---

## Advanced Configuration

### Custom Workflow

Create `.github/workflows/custom.yml`:

```yaml
name: Custom Workflow

on:
  workflow_dispatch:

jobs:
  custom-job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Custom step
        run: echo "Custom workflow"
```

### Matrix Builds

```yaml
strategy:
  matrix:
    node-version: [16, 18, 20]
    os: [ubuntu-latest, windows-latest]
```

---

## Cost Optimization

### GitHub Actions Minutes

- **Public repos**: Unlimited
- **Private repos**: 2,000 minutes/month (free tier)

### Optimization Tips

1. **Cache dependencies**:
   ```yaml
   - uses: actions/setup-node@v4
     with:
       cache: 'npm'
   ```

2. **Conditional jobs**:
   ```yaml
   if: github.ref == 'refs/heads/main'
   ```

3. **Self-hosted runners**: For heavy workloads

---

## Next Steps

1. **Set up secrets**: Add kubeconfig secrets
2. **Test workflow**: Trigger manual run
3. **Configure branch protection**: Require CI checks
4. **Set up notifications**: Slack/Email alerts
5. **Monitor costs**: Check Actions usage

---

**Platform**: GitHub Actions  
**Status**: ✅ Production Ready  
**Documentation**: Complete
