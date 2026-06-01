# Environment Configuration

This project uses separate environment files for different deployment scenarios.

## Available Environment Files

### 1. `.env.development` (Local Development)
Ready-to-use configuration for local development with safe defaults.

**Usage:**
```bash
cp .env.development .env
docker compose up
```

**Features:**
- HTTP (no SSL)
- Debug logging
- Permissive rate limiting
- Local database credentials
- Mailtrap for email testing
- Local file storage

### 2. `.env.production` (Production Deployment)
Template for production deployment with placeholder values.

**Usage:**
```bash
cp .env.production .env
# Edit .env and replace ALL placeholder values
nano .env
docker compose up -d
```

**IMPORTANT:** Replace all `REPLACE_WITH_*` values with real credentials!

**Features:**
- HTTPS enabled
- Info-level logging
- Strict rate limiting
- Production database
- Real email service
- S3 storage
- Monitoring enabled

### 3. `.env.example` (Reference)
Comprehensive example showing all available options with both dev and prod examples.

## Quick Start

### For Local Development
```bash
# Copy development config
cp .env.development .env

# Start services
docker compose up
```

### For Production
```bash
# Copy production template
cp .env.production .env

# Edit and replace placeholders
nano .env

# Generate strong secrets
openssl rand -base64 32

# Deploy
docker compose build --no-cache
docker compose up -d
```

## Environment Variables Reference

| Variable | Development | Production | Required |
|----------|-------------|------------|----------|
| NODE_ENV | development | production | Yes |
| DOMAIN | localhost | yourdomain.com | Yes |
| SECRET_KEY | simple | strong random | Yes |
| DB_PASSWORD | dev_password | strong random | If using DB |
| SSL_ENABLED | false | true | Yes |
| LOG_LEVEL | debug | info | Yes |

## Security Notes

### Development
- Uses simple, non-secret values
- Safe for version control
- Not suitable for production

### Production
- **NEVER commit .env to version control**
- Generate strong random secrets
- Use environment-specific credentials
- Enable all security features

## Generating Secrets

```bash
# Generate a random secret
openssl rand -base64 32

# Generate multiple secrets
for i in {1..3}; do openssl rand -base64 32; done
```

## Switching Environments

```bash
# Switch to development
cp .env.development .env
docker compose restart

# Switch to production
cp .env.production .env
# Edit .env first!
docker compose restart
```

## Best Practices

1. **Never commit `.env`** - It's in `.gitignore`
2. **Use `.env.development`** for local work
3. **Customize `.env.production`** for each deployment
4. **Rotate secrets regularly** in production
5. **Use secrets management** (Vault, AWS Secrets Manager) for production
6. **Document custom variables** in this README

## Troubleshooting

**Issue:** Variables not loading
```bash
# Verify .env exists
ls -la .env

# Check docker-compose picks it up
docker compose config
```

**Issue:** Wrong environment
```bash
# Check NODE_ENV
docker compose exec frontend env | grep NODE_ENV
```

## Additional Resources

- [12-Factor App - Config](https://12factor.net/config)
- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
