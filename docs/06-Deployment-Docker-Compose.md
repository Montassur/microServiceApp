# Local Deployment with Docker Compose

## Quick Start

### 1. Start Local Environment

```bash
# Using the deployment script (recommended)
./scripts/deploy-local.sh development up

# Or using Docker Compose directly
docker compose up -d
```

### 2. Access Services

- **Frontend**: http://localhost
- **Admin Panel**: http://localhost/admin
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics

### 3. View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f admin
```

### 4. Stop Services

```bash
./scripts/deploy-local.sh development down
# Or
docker compose down
```

---

## Deployment Script

The `scripts/deploy-local.sh` script provides convenient commands:

### Start Services
```bash
./scripts/deploy-local.sh development up
```

### Stop Services
```bash
./scripts/deploy-local.sh development down
```

### Restart Services
```bash
./scripts/deploy-local.sh development restart
```

### Rebuild Services
```bash
./scripts/deploy-local.sh development rebuild
```

### View Status
```bash
./scripts/deploy-local.sh development status
```

### Run Tests
```bash
./scripts/deploy-local.sh development test
```

### Clean Up
```bash
./scripts/deploy-local.sh development clean
```

---

## Environment Configuration

### Development (Default)
```bash
# Uses .env.development
./scripts/deploy-local.sh development up
```

### Production-like Local
```bash
# Uses .env.production
./scripts/deploy-local.sh production up
```

---

## Health Checks

The deployment script automatically runs health checks:

- ✅ Backend health endpoint
- ✅ Frontend accessibility
- ✅ Admin panel accessibility

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use different ports in .env
PORT=3001
```

### Database Connection Issues

```bash
# Check database logs
docker compose logs database

# Restart database
docker compose restart database
```

### Clear Everything and Start Fresh

```bash
# Stop and remove all containers, volumes, networks
docker compose down -v --remove-orphans

# Remove all images
docker compose down --rmi all

# Rebuild and start
docker compose build --no-cache
docker compose up -d
```

---

## CI/CD Integration

### GitHub Actions

The `.github/workflows/local-dev.yml` workflow tests local deployment:

```yaml
# Triggered on:
- Pull requests
- Feature branch pushes
```

### Manual Deployment

```bash
# Trigger via GitHub Actions
gh workflow run ci-cd.yml -f environment=local
```

---

## Development Workflow

### 1. Make Changes

```bash
# Edit code
vim backend/src/app.js
```

### 2. Rebuild Service

```bash
# Rebuild specific service
docker compose build backend

# Restart service
docker compose restart backend
```

### 3. Test Changes

```bash
# Run tests
docker compose exec backend npm test

# Check logs
docker compose logs -f backend
```

### 4. Commit and Push

```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

---

## Makefile Commands

Alternative to the deployment script:

```bash
# Start services
make up

# Stop services
make down

# View logs
make logs

# Run tests
make test

# Clean up
make clean
```

---

## Docker Compose Services

| Service | Port | Description |
|---------|------|-------------|
| **database** | 5432 | PostgreSQL 16 |
| **backend** | 3000 | Express.js API |
| **frontend** | 80 | React frontend |
| **admin** | 80 | React admin panel |
| **gateway** | 80 | Nginx reverse proxy |

---

## Resource Limits

Configured in `docker-compose.yml`:

| Service | CPU | Memory |
|---------|-----|--------|
| database | 1.0 | 1GB |
| backend | 0.5 | 512MB |
| frontend | 0.5 | 512MB |
| admin | 0.5 | 512MB |
| gateway | 0.5 | 512MB |

---

## Next Steps

1. **Development**: Use local deployment for development
2. **Staging**: Push to `develop` branch for staging deployment
3. **Production**: Push to `main` branch for production deployment
