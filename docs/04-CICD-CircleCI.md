# CircleCI CI/CD Guide

## Overview

Complete guide for setting up and using CircleCI for CI/CD with this project.

---

## Quick Start

### 1. Connect Repository

1. Go to [CircleCI](https://circleci.com/)
2. Sign up with GitHub/GitLab/Bitbucket
3. Click **Set Up Project**
4. Select your repository

### 2. Configure Environment Variables

**Project Settings → Environment Variables**:

```
DOCKER_REGISTRY
DOCKER_LOGIN
DOCKER_PASSWORD
KUBE_CONFIG_STAGING (base64)
KUBE_CONFIG_PRODUCTION (base64)
```

### 3. Trigger Pipeline

```bash
# Push to trigger
git push origin develop
```

---

## Pipeline Configuration

**File**: `.circleci/config.yml`

### Pipeline Parameters

Trigger with parameters via CircleCI API or UI:

| Parameter | Description | Options | Default |
|-----------|-------------|---------|---------|
| `deployment_type` | Where to deploy | `local`, `cloud` | `local` |
| `environment` | Target environment | `dev`, `staging`, `production` | `dev` |
| `services` | Services to deploy | `all`, `backend`, `frontend`, etc. | `all` |
| `cluster_type` | Local cluster type | `docker-compose`, `minikube`, `kind`, `k3d` | `docker-compose` |
| `use_gitops` | Use ArgoCD | `true`, `false` | `false` |

**Trigger with parameters**:
```bash
# Using CircleCI API
curl -X POST https://circleci.com/api/v2/project/gh/ORG/REPO/pipeline \
  -H "Circle-Token: $CIRCLE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "deployment_type": "cloud",
      "environment": "production",
      "services": "all",
      "use_gitops": true
    }
  }'
```

### Workflow Structure

```yaml
workflows:
  build-test-deploy:
    jobs:
      - lint-backend
      - lint-frontend
      - lint-admin
      - test-backend
      - security-scan
      - build-backend
      - deploy-staging
      - hold-production (manual approval)
      - deploy-production
```

---

## Jobs

### Lint Jobs

**Executors**: `node-executor` (Node.js 18)

**Jobs**:
- `lint-backend`
- `lint-frontend`
- `lint-admin`

### Test Job

**Features**:
- PostgreSQL service container
- Code coverage
- Codecov integration

### Build Jobs

**Features**:
- Docker layer caching (requires Performance plan)
- Matrix builds for 4 services
- Push to Docker registry

### Deploy Jobs

**Staging**: Automatic on `develop`  
**Production**: Manual approval required

---

## Usage Examples

### View Pipelines

**CircleCI UI**:
1. Go to **Pipelines**
2. Select your project
3. View workflow runs

**CLI**:
```bash
# Install CLI
curl -fLSs https://circle.ci/cli | bash

# View workflows
circleci workflow list

# Trigger workflow
circleci workflow trigger
```

---

## Orbs

### Used Orbs

```yaml
orbs:
  node: circleci/node@5.1
  docker: circleci/docker@2.2
  kubernetes: circleci/kubernetes@1.3
```

**Benefits**:
- Reusable configuration
- Best practices built-in
- Maintained by CircleCI

---

## Docker Layer Caching

### Enable DLC

**Requires**: Performance or Scale plan

```yaml
- setup_remote_docker:
    docker_layer_caching: true
```

**Benefits**:
- 50%+ faster builds
- Reduced network usage

---

## Test Results

### Store Test Results

```yaml
- store_test_results:
    path: backend/coverage

- store_artifacts:
    path: backend/coverage
```

**View in**: Test Summary tab

---

## Manual Approval

### Hold Job

```yaml
- hold-production:
    type: approval
    requires:
      - build-backend
    filters:
      branches:
        only: main
```

**Approve in**: CircleCI UI → Workflows → Approve

---

## Troubleshooting

### Build Failures

**View logs**:
1. Click on failed workflow
2. Click on failed job
3. View step logs

**Common issues**:
- DLC not enabled: Upgrade plan
- Environment variables: Check spelling
- kubectl issues: Verify kubeconfig

---

## Best Practices

### Workflow Optimization

```yaml
workflows:
  version: 2
  build-test-deploy:
    jobs:
      - lint:
          filters:
            branches:
              ignore: /^skip-ci.*/
```

### Resource Classes

```yaml
resource_class: large  # 4 vCPUs, 8GB RAM
```

**Options**: small, medium, large, xlarge

---

## Cost Optimization

### CircleCI Credits

- **Free plan**: 6,000 build minutes/month
- **Performance**: 25,000 credits/month
- **Scale**: Custom

### Optimization Tips

1. Use Docker layer caching
2. Limit workflow triggers
3. Use appropriate resource classes
4. Cache dependencies

---

## Advanced Features

### Dynamic Configuration

```yaml
setup: true
```

### Scheduled Workflows

```yaml
workflows:
  nightly:
    triggers:
      - schedule:
          cron: "0 0 * * *"
          filters:
            branches:
              only: main
```

---

## Next Steps

1. **Connect repository**: Link to CircleCI
2. **Add environment variables**: Docker + K8s
3. **Test pipeline**: Push to trigger
4. **Enable DLC**: Upgrade if needed
5. **Configure notifications**: Slack/Email

---

**Platform**: CircleCI  
**Status**: ✅ Production Ready  
**Documentation**: Complete
