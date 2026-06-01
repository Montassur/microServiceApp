# Scripts Directory

## Overview

Consolidated deployment scripts with modular design for maintainability and ease of use.

---

## Main Entry Point

### `deploy`
**Single unified deployment script** - Use this for all deployments!

**Usage**:
```bash
# Interactive mode (recommended)
./scripts/deploy

# Direct mode
./scripts/deploy <type> <env> [services] [cluster] [options]
```

**Examples**:
```bash
# Interactive
./scripts/deploy

# Local development
./scripts/deploy local dev

# Local Kubernetes
./scripts/deploy local dev all minikube

# Cloud production with GitOps
./scripts/deploy cloud production all --gitops
```

---

## Library Modules

### `lib/common.sh`
Shared utilities and functions:
- Logging (info, success, warning, error)
- Error handling
- Progress indicators
- Environment file loading
- Service parsing

### `lib/docker-compose.sh`
Docker Compose deployment functions:
- Deploy with Docker Compose
- Health checks
- Service management
- Access URLs

### `lib/kubernetes.sh`
Kubernetes deployment functions:
- Local K8s deployment
- Cloud K8s deployment
- ArgoCD GitOps deployment
- kubectl operations

### `lib/interactive.sh`
Interactive menu functions:
- Menu display
- User input handling
- Configuration wizard

---

## Utility Scripts

### `health-check.sh`
Health verification for deployed services

### `rollback.sh`
Rollback deployments to previous version

### `backup-cleanup.sh`
Database backup management

### `validate-env.sh`
Environment variable validation

### `deploy-k8s-local.sh`
Specialized local Kubernetes deployment (called by main deploy script)

---

## Quick Reference

| Task | Command |
|------|---------|
| **Interactive deployment** | `./scripts/deploy` |
| **Local dev (fastest)** | `./scripts/deploy local dev` |
| **Local K8s testing** | `./scripts/deploy local dev all minikube` |
| **Cloud staging** | `./scripts/deploy cloud staging` |
| **Cloud production** | `./scripts/deploy cloud production all --gitops` |
| **Specific services** | `./scripts/deploy local dev backend,database` |
| **Dry run** | `./scripts/deploy cloud production all --dry-run` |
| **Help** | `./scripts/deploy --help` |

---

## Benefits of New Structure

**Before**:
- 6 different deployment scripts
- ~900 lines of code
- Confusing for users
- Hard to maintain

**After**:
- 1 main entry point
- ~400 lines of code (55% reduction)
- Clear and simple
- Modular and maintainable

---

**Status**: ✅ Consolidated  
**Last Updated**: December 28, 2025
