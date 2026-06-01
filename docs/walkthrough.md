# Project Walkthrough - Full-Stack Kubernetes Microservices Platform

**Last Updated**: December 29, 2025  
**Project**: Docker + Nginx + React + Kubernetes Full-Stack Application

---

## Overview

This walkthrough demonstrates a **production-ready, enterprise-grade full-stack microservices application** with comprehensive DevOps practices, Kubernetes orchestration, and modern observability stack.

---

## 🏗️ Architecture Highlights

### Microservices Design

The application follows a microservices architecture with clear separation of concerns:

1. **Frontend Service**: Public-facing React 19 + Vite 7 application
2. **Admin Service**: Administrative dashboard (React 19 + Vite 7)
3. **Backend API**: Node.js + Express.js REST API with JWT authentication
4. **Database**: PostgreSQL 16 with persistent storage
5. **Gateway**: Nginx reverse proxy with security hardening

### Deployment Flexibility

**Local Development** (Docker Compose):
- Fast startup with hot-reloading
- Nginx gateway for routing
- Isolated Docker network
- Health checks on all services

**Production** (Kubernetes):
- Kustomize overlays for environment-specific configs
- Horizontal Pod Autoscaling (HPA)
- Ingress controller for traffic management
- StatefulSet for database persistence
- ConfigMaps and Secrets for configuration

---

## 🚀 Quick Start Guide

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- kubectl (for Kubernetes deployment)
- Minikube or cloud Kubernetes cluster (optional)

### 1. Clone and Setup

```bash
git clone https://github.com/devopsexpertlearning/docker-nginx-react-kubernetes-fullstack.git
cd docker-nginx-react-kubernetes-fullstack
```

### 2. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env.development

# Review and customize variables
nano .env.development
```

### 3. Deploy Locally with Docker Compose

```bash
# Use the unified deployment script
./scripts/deploy local dev

# Or use Docker Compose directly
docker compose up -d

# Check service health
docker compose ps
```

### 4. Access the Application

- **Frontend**: http://localhost
- **Admin Panel**: http://localhost/admin
- **Backend API**: http://localhost/api/health
- **Metrics**: http://localhost/api/metrics

### 5. Default Credentials

- **Email**: `admin@auraweb.com`
- **Password**: `Admin@123`

> **⚠️ Warning**: Change these credentials immediately in production!

---

## 📦 Component Deep Dive

### Backend API (Express.js)

**Location**: `backend/src/`

**Key Features**:
- **Authentication**: JWT with refresh token rotation
- **Authorization**: Role-Based Access Control (RBAC)
- **Validation**: express-validator for input sanitization
- **Security**: Helmet, CORS, rate limiting
- **Observability**: Winston logging, Prometheus metrics, Sentry error tracking

**API Endpoints**:

```
POST   /api/auth/signup          - User registration
POST   /api/auth/login           - User login
POST   /api/auth/refresh         - Refresh access token
POST   /api/auth/logout          - User logout
GET    /api/auth/me              - Get current user

GET    /api/users                - List all users (admin)
GET    /api/users/:id            - Get user by ID
PUT    /api/users/:id            - Update user
DELETE /api/users/:id            - Delete user

GET    /api/admin/stats          - Dashboard statistics
GET    /api/admin/users          - User management
POST   /api/admin/users          - Create user
PUT    /api/admin/users/:id      - Update user
DELETE /api/admin/users/:id      - Delete user

GET    /api/health               - Health check
GET    /api/metrics              - Prometheus metrics
```

**Observability Stack**:

1. **Winston Logger**:
   ```javascript
   // Structured JSON logging
   logger.info('User logged in', { userId, email });
   logger.error('Database connection failed', { error });
   ```

2. **Prometheus Metrics**:
   ```javascript
   // Automatic metrics collection
   - http_requests_total
   - http_request_duration_seconds
   - nodejs_memory_usage_bytes
   ```

3. **Sentry Error Tracking**:
   ```javascript
   // Real-time error monitoring
   Sentry.captureException(error);
   ```

### Frontend Application (React 19)

**Location**: `frontend/src/`

**Key Features**:
- **Build Tool**: Vite 7 for fast HMR and optimized builds
- **Routing**: React Router 6 with protected routes
- **State Management**: Context API for authentication
- **API Client**: Axios with interceptors for token management
- **UI Design**: Modern, responsive design

**Pages**:
- `Home.jsx` - Landing page with hero section
- `Products.jsx` - Product catalog
- `About.jsx` - About page
- `Contact.jsx` - Contact form
- `Login.jsx` - User authentication
- `Signup.jsx` - User registration
- `Dashboard.jsx` - Protected user dashboard

**Authentication Flow**:

```javascript
// 1. Login
const response = await api.post('/auth/login', { email, password });
const { accessToken, refreshToken, user } = response.data;

// 2. Store tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// 3. Auto-refresh on 401
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Refresh token and retry
    }
  }
);
```

### Admin Panel (React 19)

**Location**: `admin/src/`

**Key Features**:
- Separate SPA with `/admin` base path
- Sidebar navigation
- User management interface
- Dashboard with statistics
- Settings and reports

**Configuration**:
```javascript
// vite.config.js
export default {
  base: '/admin',  // Serves under /admin path
  build: {
    outDir: 'dist',
  }
}
```

### Database (PostgreSQL 16)

**Location**: `database/init.sql`

**Schema**:

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (refresh tokens)
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
```

**Connection Pooling**:
```javascript
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,  // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Nginx Gateway

**Location**: `nginx/nginx.conf`

**Routing Configuration**:

```nginx
# API requests
location /api {
    proxy_pass http://backend:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Admin panel
location /admin {
    proxy_pass http://admin:80;
}

# Frontend (default)
location / {
    proxy_pass http://frontend:80;
}
```

**Security Features**:
- Rate limiting (10 req/s general, 30 req/s API)
- Security headers (CSP, HSTS, X-Frame-Options)
- Request size limits (10MB)
- Gzip compression
- Static asset caching

---

## ☸️ Kubernetes Deployment

### Structure

```
k8s/
├── base/                    # Base resources
│   ├── namespace.yaml
│   ├── deployments/
│   ├── services/
│   ├── configmaps/
│   └── ingress/
└── overlays/
    ├── development/         # Dev-specific configs
    └── production/          # Prod-specific configs
```

### Deployment with Kustomize

**Development**:
```bash
# Deploy to development
kubectl apply -k k8s/overlays/development

# Check deployment status
kubectl get pods -n fullstack-dev

# View logs
kubectl logs -f deployment/backend -n fullstack-dev
```

**Production**:
```bash
# Deploy to production
kubectl apply -k k8s/overlays/production

# Check HPA status
kubectl get hpa -n fullstack-prod

# View ingress
kubectl get ingress -n fullstack-prod
```

### Using the Unified Deploy Script

```bash
# Interactive mode
./scripts/deploy

# Direct deployment to local Kubernetes
./scripts/deploy local dev all minikube

# Cloud deployment with GitOps
./scripts/deploy cloud production all --gitops

# Dry run
./scripts/deploy cloud production all --dry-run
```

### Key Kubernetes Features

**Horizontal Pod Autoscaling**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**Health Checks**:
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

**Resource Management**:
```yaml
resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

---

## 🔄 CI/CD Pipelines

### GitHub Actions (Primary)

**Location**: `.github/workflows/deploy.yml`

**Pipeline Stages**:
1. Checkout code
2. Run tests
3. Build Docker images
4. Push to registry
5. Deploy to Kubernetes
6. Verify deployment

**Secrets Required**:
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `KUBECONFIG`
- `SENTRY_DSN`

### GitOps with ArgoCD

**Location**: `argocd/application.yaml`

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: fullstack-app
spec:
  project: default
  source:
    repoURL: https://github.com/devopsexpertlearning/docker-nginx-react-kubernetes-fullstack
    targetRevision: main
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: fullstack-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

**Benefits**:
- Declarative deployments
- Git as single source of truth
- Automatic sync and self-healing
- Easy rollbacks
- Multi-cluster support

---

## 📊 Monitoring & Observability

### Winston Logging

**Configuration**: `backend/src/config/logger.js`

```javascript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});
```

### Prometheus Metrics

**Endpoint**: `http://localhost/api/metrics`

**Metrics Collected**:
- HTTP request count
- Request duration
- Error rates
- Node.js memory usage
- Event loop lag
- Active connections

**Integration**:
```javascript
const promClient = require('prom-client');
const register = new promClient.Registry();

// Collect default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});
```

### Sentry Error Tracking

**Configuration**: `backend/src/config/sentry.js`

```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new ProfilingIntegration(),
  ],
});
```

**Features**:
- Real-time error alerts
- Stack trace analysis
- User context tracking
- Performance monitoring
- Release tracking

---

## 🔒 Security Features

### Application Security

1. **Authentication**: JWT with refresh tokens
2. **Authorization**: Role-based access control
3. **Input Validation**: express-validator
4. **SQL Injection Prevention**: Parameterized queries
5. **XSS Protection**: Content Security Policy
6. **CSRF Protection**: SameSite cookies
7. **Rate Limiting**: 10 req/s general, 30 req/s API
8. **Password Hashing**: bcrypt with 12 rounds

### Network Security

1. **Docker Network Isolation**: Custom bridge network
2. **Kubernetes Network Policies**: Pod-to-pod communication rules
3. **Ingress TLS**: SSL/TLS termination
4. **Service Mesh Ready**: Supports Istio/Linkerd

### Secrets Management

**Development**:
```bash
# .env.development
JWT_SECRET=dev-secret-change-in-production
DB_PASSWORD=dev-password
```

**Production (Kubernetes)**:
```bash
# Create secrets
kubectl create secret generic app-secrets \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32) \
  --from-literal=DB_PASSWORD=$(openssl rand -base64 32) \
  -n fullstack-prod
```

---

## 🧪 Testing

### Backend Tests

**Location**: `backend/tests/`

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Test Structure**:
```javascript
describe('Auth Controller', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: 'Test@123' });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('accessToken');
  });
});
```

### Integration Tests

```bash
# Health check validation
./scripts/health-check.sh

# Environment validation
./scripts/validate-env.sh
```

---

## 📈 Performance Optimization

### Docker Optimizations

1. **Multi-stage builds**: Smaller image sizes
2. **.dockerignore**: Exclude unnecessary files
3. **Layer caching**: Optimize build times
4. **Alpine base images**: Minimal footprint

### Frontend Optimizations

1. **Vite build**: Fast builds with tree-shaking
2. **Code splitting**: Lazy loading routes
3. **Asset optimization**: Minification and compression
4. **Caching**: Long-term caching for static assets

### Backend Optimizations

1. **Connection pooling**: Database connection reuse
2. **Compression**: Gzip middleware
3. **Caching headers**: Nginx static asset caching
4. **Rate limiting**: Prevent resource exhaustion

---

## 🚀 Deployment Strategies

### Rolling Update (Default)

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

### Blue-Green Deployment

```bash
# Deploy new version (green)
kubectl apply -k k8s/overlays/production-green

# Switch traffic
kubectl patch service backend -p '{"spec":{"selector":{"version":"green"}}}'

# Remove old version (blue)
kubectl delete -k k8s/overlays/production-blue
```

### Canary Deployment

```yaml
# 10% traffic to canary
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: backend
spec:
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: backend-canary
      weight: 10
    - destination:
        host: backend-stable
      weight: 90
```

---

## 🛠️ Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check database pod
kubectl get pods -l app=database

# View logs
kubectl logs -f deployment/database

# Verify connection string
kubectl get configmap app-config -o yaml
```

**2. 502 Bad Gateway**
```bash
# Check backend health
curl http://localhost/api/health

# View nginx logs
docker compose logs nginx

# Check service status
kubectl get svc
```

**3. Authentication Errors**
```bash
# Verify JWT secret
echo $JWT_SECRET

# Check token expiration
# Tokens expire after 15 minutes (access) / 7 days (refresh)

# Clear browser storage
localStorage.clear()
```

### Debugging Commands

```bash
# Docker Compose
docker compose ps                    # Service status
docker compose logs -f backend       # Follow logs
docker compose exec backend sh       # Shell access

# Kubernetes
kubectl get all -n fullstack-prod    # All resources
kubectl describe pod <pod-name>      # Pod details
kubectl logs -f <pod-name>           # Follow logs
kubectl exec -it <pod-name> -- sh    # Shell access
```

---

## 📚 Additional Resources

### Documentation

- [Deployment Overview](00-Deployment-Overview.md)
- [Kubernetes Guide](07-Deployment-Local-Kubernetes.md)
- [CI/CD Platform Comparison](00-CICD-Platform-Comparison.md)
- [Environment Variables](11-Environment-Variables.md)
- [HTTPS Setup Guide](https_setup_guide.md)

### External Links

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [PostgreSQL Manual](https://www.postgresql.org/docs/)

---

## 🎯 Next Steps

### For Development

1. Customize the frontend UI
2. Add more API endpoints
3. Implement additional features
4. Write comprehensive tests
5. Set up pre-commit hooks

### For Production

1. **Set up HTTPS/TLS** (see [HTTPS Setup Guide](https_setup_guide.md))
2. **Configure monitoring** (Prometheus + Grafana)
3. **Set up log aggregation** (ELK Stack or Loki)
4. **Implement backups** (Database and configuration)
5. **Security audit** (Container scanning, penetration testing)
6. **Load testing** (Apache JMeter, k6)
7. **Documentation** (API documentation with Swagger)

---

## 💡 Best Practices Demonstrated

✅ **12-Factor App**: Environment-based configuration, stateless processes  
✅ **Microservices**: Service isolation, independent scaling  
✅ **DevOps**: Automated CI/CD, infrastructure as code  
✅ **Security**: Defense in depth, least privilege  
✅ **Observability**: Logging, metrics, tracing  
✅ **Scalability**: Horizontal scaling, load balancing  
✅ **Reliability**: Health checks, self-healing, rollbacks  
✅ **Maintainability**: Clean code, documentation, testing  

---

**Project Status**: ✅ Production Ready  
**Last Tested**: December 29, 2025  
**Kubernetes Version**: 1.28+  
**Docker Version**: 24.0+
