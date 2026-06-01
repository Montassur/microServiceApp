# Jenkins CI/CD Guide

## Overview

Complete guide for setting up and using Jenkins for CI/CD with this project.

---

## Quick Start

### 1. Install Jenkins

```bash
# Docker
docker run -p 8080:8080 -p 50000:50000 jenkins/jenkins:lts

# Or use package manager
# See: https://www.jenkins.io/doc/book/installing/
```

### 2. Install Plugins

**Required plugins**:
- Docker Pipeline
- Kubernetes CLI
- HTML Publisher
- Git

### 3. Create Pipeline

1. **New Item** → **Pipeline**
2. **Pipeline** → **Pipeline script from SCM**
3. **SCM**: Git
4. **Repository URL**: Your repo URL
5. **Script Path**: `Jenkinsfile`

---

## Pipeline Configuration

**File**: `Jenkinsfile`

### Pipeline Parameters

When triggering a build, you can configure:

| Parameter | Description | Options | Default |
|-----------|-------------|---------|---------|
| `DEPLOYMENT_TYPE` | Where to deploy | `local`, `cloud` | `local` |
| `ENVIRONMENT` | Target environment | `dev`, `staging`, `production` | `dev` |
| `SERVICES` | Services to deploy | `all`, `backend`, `frontend`, etc. | `all` |
| `CLUSTER_TYPE` | Local cluster type | `docker-compose`, `minikube`, `kind`, `k3d` | `docker-compose` |
| `USE_GITOPS` | Use ArgoCD | `true`, `false` | `false` |

**Set parameters**:
1. Click **Build with Parameters**
2. Select values from dropdowns
3. Click **Build**

### Pipeline Structure

```groovy
pipeline {
    agent any
    
    stages {
        stage('Checkout') { }
        stage('Lint') { }
        stage('Test') { }
        stage('Security Scan') { }
        stage('Build Docker Images') { }
        stage('Deploy to Staging') { }
        stage('Deploy to Production') { }
    }
}
```

---

## Credentials Setup

### Add Credentials

1. **Manage Jenkins** → **Manage Credentials**
2. **Add Credentials**

**Required credentials**:
- `docker-registry-credentials` (Username/Password)
- `kube-config-staging` (Secret file)
- `kube-config-production` (Secret file)

---

## Environment Configuration

### Update Jenkinsfile

```groovy
environment {
    REGISTRY = 'your-registry.com'
    IMAGE_PREFIX = 'auraweb'
}
```

---

## Usage Examples

### Trigger Build

**Manual**:
1. Go to your pipeline
2. Click **Build Now**

**Automatic**:
- Configure webhook in Git repository
- Triggers on push

### View Build

1. Click on build number
2. View **Console Output**
3. Check **HTML Publisher** for coverage reports

---

## Pipeline Features

### Parallel Execution

```groovy
stage('Lint') {
    parallel {
        stage('Lint Backend') { }
        stage('Lint Frontend') { }
        stage('Lint Admin') { }
    }
}
```

### Docker-in-Docker

```groovy
agent {
    docker {
        image 'node:18-alpine'
        reuseNode true
    }
}
```

### Manual Approval

```groovy
stage('Deploy to Production') {
    steps {
        input message: 'Deploy to production?', ok: 'Deploy'
        // deployment steps
    }
}
```

---

## Monitoring

### Build Status

- **Blue**: Success
- **Red**: Failure
- **Yellow**: Unstable
- **Gray**: Aborted

### Notifications

Configure in **Manage Jenkins** → **Configure System** → **E-mail Notification**

---

## Troubleshooting

### Docker Issues

```bash
# Verify Docker is accessible
docker ps

# Check Docker socket permissions
ls -l /var/run/docker.sock
```

### kubectl Issues

```bash
# Test kubeconfig
kubectl cluster-info --kubeconfig /path/to/config
```

### Plugin Issues

1. **Manage Jenkins** → **Manage Plugins**
2. Check for updates
3. Restart Jenkins if needed

---

## Best Practices

### Jenkinsfile in SCM

✅ Store Jenkinsfile in repository  
✅ Version control pipeline changes  
✅ Review pipeline changes in PRs

### Build Triggers

```groovy
triggers {
    pollSCM('H/5 * * * *')  // Poll every 5 minutes
}
```

### Cleanup

```groovy
post {
    always {
        cleanWs()  // Clean workspace
    }
}
```

---

## Advanced Configuration

### Shared Libraries

```groovy
@Library('my-shared-library') _

myCustomStep()
```

### Multibranch Pipeline

1. **New Item** → **Multibranch Pipeline**
2. Configure branch sources
3. Automatic pipeline per branch

---

## Security

### Credentials Best Practices

- ✅ Use credential binding
- ✅ Never log credentials
- ✅ Rotate regularly

### Example

```groovy
withCredentials([
    usernamePassword(
        credentialsId: 'docker-registry-credentials',
        usernameVariable: 'USER',
        passwordVariable: 'PASS'
    )
]) {
    sh 'docker login -u $USER -p $PASS'
}
```

---

## Performance Optimization

### Parallel Builds

```groovy
options {
    parallelsAlwaysFailFast()
}
```

### Build Caching

```groovy
options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
}
```

---

## Next Steps

1. **Install Jenkins**: Set up server
2. **Install plugins**: Required plugins
3. **Add credentials**: Docker + K8s
4. **Create pipeline**: From Jenkinsfile
5. **Test build**: Trigger manually

---

**Platform**: Jenkins  
**Status**: ✅ Production Ready  
**Documentation**: Complete
