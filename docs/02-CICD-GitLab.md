# GitLab CI/CD Guide

## Overview

Complete guide for setting up and using GitLab CI for CI/CD with this project.

---

## Quick Start

### 1. Enable GitLab CI

GitLab CI is enabled by default for all projects.

### 2. Configure Variables

Go to **Settings → CI/CD → Variables** and add:

```
KUBE_CONFIG_STAGING (base64, protected, masked)
KUBE_CONFIG_PRODUCTION (base64, protected, masked)
```

### 3. Trigger Pipeline

```bash
# Push to trigger
git push origin develop  # Triggers staging
git push origin main     # Triggers production (manual)
```

---

## Pipeline Configuration

**File**: `.gitlab-ci.yml`

### Deployment Parameters

Configure via **Settings → CI/CD → Variables**:

| Variable | Description | Options | Default |
|----------|-------------|---------|---------|
| `DEPLOYMENT_TYPE` | Where to deploy | `local`, `cloud` | `cloud` |
| `ENVIRONMENT` | Target environment | `dev`, `staging`, `production` | `dev` |
| `SERVICES` | Services to deploy | `all`, `backend`, `frontend`, etc. | `all` |
| `CLUSTER_TYPE` | Local cluster type | `docker-compose`, `minikube`, `kind`, `k3d` | `minikube` |
| `USE_GITOPS` | Use ArgoCD | `true`, `false` | `false` |

**Set variables**:
1. Go to **Settings → CI/CD → Variables**
2. Add variable (e.g., `DEPLOYMENT_TYPE` = `cloud`)
3. Save

### Pipeline Stages

1. **lint** - Code quality checks
2. **test** - Unit and integration tests
3. **security** - Vulnerability scanning
4. **build** - Docker image builds
5. **deploy** - Kubernetes deployment

---

## Stage Details

### Lint Stage

**Jobs**:
- `lint:backend`
- `lint:frontend`
- `lint:admin`

**Runs on**: All branches

### Test Stage

**Job**: `test:backend`

**Features**:
- PostgreSQL service container
- Code coverage reporting
- Cobertura format for GitLab UI

**Coverage visualization**:
```
Coverage: 85.5%
```

### Security Stage

**Jobs**:
- `security:npm-audit` - npm vulnerability scan
- `security:trivy-scan` - Filesystem and image scanning

**Reports**: Container scanning results in GitLab Security Dashboard

### Build Stage

**Jobs**:
- `build:backend`
- `build:frontend`
- `build:admin`
- `build:nginx`

**Features**:
- Template-based configuration
- GitLab Container Registry
- Automatic tagging (SHA + branch)

### Deploy Stage

**Jobs**:
- `deploy:staging` - Automatic on `develop`
- `deploy:production` - Manual on `main`

---

## Usage Examples

### View Pipeline

```bash
# GitLab UI
Project → CI/CD → Pipelines

# CLI
gitlab-ci-lint .gitlab-ci.yml
```

### Trigger Manual Job

1. Go to **CI/CD → Pipelines**
2. Find your pipeline
3. Click **▶** on `deploy:production`

---

## Container Registry

### GitLab Container Registry

**Automatic**: Uses `CI_REGISTRY_*` variables

**Image naming**:
```
registry.gitlab.com/your-group/your-project/backend:main
registry.gitlab.com/your-group/your-project/frontend:develop
```

### Pull Images

```bash
# Login
docker login registry.gitlab.com

# Pull
docker pull registry.gitlab.com/your-group/your-project/backend:main
```

---

## Variables Setup

### Add CI/CD Variables

1. Go to **Settings → CI/CD → Variables**
2. Click **Add variable**
3. Configure:
   - **Key**: `KUBE_CONFIG_STAGING`
   - **Value**: (base64 encoded kubeconfig)
   - **Type**: File
   - **Protected**: ✅
   - **Masked**: ✅

---

## Caching

### npm Cache

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}-backend
  paths:
    - backend/node_modules/
```

**Benefits**:
- Faster builds
- Reduced network usage
- Shared across jobs

---

## Artifacts

### Coverage Reports

```yaml
artifacts:
  reports:
    coverage_report:
      coverage_format: cobertura
      path: backend/coverage/cobertura-coverage.xml
```

**View in**: Merge Request → Overview → Test coverage

---

## Troubleshooting

### Pipeline Failures

**View logs**:
1. Go to **CI/CD → Pipelines**
2. Click on failed pipeline
3. Click on failed job
4. View logs

**Common issues**:
- Cache issues: Clear cache in **CI/CD → Pipelines → Clear runner caches**
- Registry issues: Check `CI_REGISTRY_*` variables
- kubectl issues: Verify kubeconfig variable

---

## Best Practices

### Merge Request Pipelines

```yaml
only:
  - merge_requests
  - main
  - develop
```

### Protected Branches

1. **Settings → Repository → Protected branches**
2. Protect `main` and `develop`
3. Require pipeline success

### Code Quality

Enable in **Settings → General → Visibility → Code Quality**

---

## Advanced Features

### Parallel Jobs

```yaml
test:backend:
  parallel: 3
```

### Dynamic Environments

```yaml
environment:
  name: review/$CI_COMMIT_REF_NAME
  url: https://$CI_COMMIT_REF_SLUG.example.com
  on_stop: stop_review
```

---

## Cost Optimization

### GitLab CI Minutes

- **Free tier**: 400 minutes/month
- **Premium**: 10,000 minutes/month
- **Ultimate**: 50,000 minutes/month

### Optimization

1. Use caching
2. Limit pipeline triggers
3. Use shared runners efficiently

---

## Next Steps

1. **Configure variables**: Add kubeconfig
2. **Test pipeline**: Push to trigger
3. **Set up protected branches**: Require CI
4. **Enable security scanning**: SAST, DAST
5. **Configure notifications**: Slack/Email

---

**Platform**: GitLab CI  
**Status**: ✅ Production Ready  
**Documentation**: Complete
