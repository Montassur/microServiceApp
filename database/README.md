# Database Service

PostgreSQL 16 database for AuraWeb application.

## Overview

This directory contains the database configuration and initialization scripts for the PostgreSQL database used by the backend API.

## Database Schema

### Users Table
Stores user account information including authentication credentials.

**Columns:**
- `id` - Primary key (auto-increment)
- `email` - Unique email address
- `password_hash` - Bcrypt hashed password
- `first_name` - User's first name
- `last_name` - User's last name
- `role` - User role (user, admin, editor)
- `is_active` - Account status
- `email_verified` - Email verification status
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp
- `last_login` - Last login timestamp

### Sessions Table
Manages refresh tokens for JWT authentication.

**Columns:**
- `id` - Primary key
- `user_id` - Foreign key to users table
- `refresh_token` - Unique refresh token
- `expires_at` - Token expiration time
- `created_at` - Session creation time
- `ip_address` - Client IP address
- `user_agent` - Client user agent

## Default Credentials

**Admin Account:**
- Email: `admin@auraweb.com`
- Password: `Admin@123`
- Role: admin

**Test User:**
- Email: `user@example.com`
- Password: `Admin@123`
- Role: user

**Test Editor:**
- Email: `editor@example.com`
- Password: `Admin@123`
- Role: editor

> ⚠️ **Security Warning**: Change these passwords immediately in production!

## Docker Volume

Data is persisted in a Docker volume named `postgres_data`.

**Location:** Managed by Docker
**Backup:** Use `pg_dump` for backups

## Backup & Restore

### Backup
```bash
# Create backup
docker exec docker-nginx-react-frontend-admin-database-1 pg_dump -U auraweb_user auraweb_db > backup_$(date +%Y%m%d).sql

# Compressed backup
docker exec docker-nginx-react-frontend-admin-database-1 pg_dump -U auraweb_user auraweb_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore
```bash
# Restore from backup
docker exec -i docker-nginx-react-frontend-admin-database-1 psql -U auraweb_user auraweb_db < backup.sql

# Restore from compressed backup
gunzip < backup.sql.gz | docker exec -i docker-nginx-react-frontend-admin-database-1 psql -U auraweb_user auraweb_db
```

## Accessing the Database

### Via Docker
```bash
# Connect to PostgreSQL
docker exec -it docker-nginx-react-frontend-admin-database-1 psql -U auraweb_user -d auraweb_db

# Run SQL file
docker exec -i docker-nginx-react-frontend-admin-database-1 psql -U auraweb_user -d auraweb_db < query.sql
```

### Via psql (if installed locally)
```bash
psql -h localhost -p 5432 -U auraweb_user -d auraweb_db
```

## Common Queries

### List all users
```sql
SELECT id, email, first_name, last_name, role, is_active, created_at 
FROM users 
ORDER BY created_at DESC;
```

### Count users by role
```sql
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role;
```

### Active sessions
```sql
SELECT s.id, u.email, s.created_at, s.expires_at, s.ip_address
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.expires_at > NOW()
ORDER BY s.created_at DESC;
```

### Clean expired sessions
```sql
DELETE FROM sessions WHERE expires_at < NOW();
```

## Maintenance

### Vacuum Database
```bash
docker exec docker-nginx-react-frontend-admin-database-1 vacuumdb -U auraweb_user -d auraweb_db -z
```

### Check Database Size
```sql
SELECT pg_size_pretty(pg_database_size('auraweb_db'));
```

### Check Table Sizes
```sql
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Monitoring

### Health Check
The database service includes a health check that runs every 10 seconds:
```bash
pg_isready -U auraweb_user
```

### Connection Stats
```sql
SELECT 
    datname,
    numbackends as connections,
    xact_commit as commits,
    xact_rollback as rollbacks
FROM pg_stat_database
WHERE datname = 'auraweb_db';
```

## Security

- ✅ Password authentication required
- ✅ Isolated in Docker network
- ✅ No external port exposure (internal only)
- ✅ Encrypted passwords (bcrypt)
- ✅ Prepared statements prevent SQL injection
- ⚠️ Enable SSL/TLS for production
- ⚠️ Use strong database password
- ⚠️ Regular backups

## Troubleshooting

### Database won't start
```bash
# Check logs
docker logs docker-nginx-react-frontend-admin-database-1

# Check if port is already in use
docker ps | grep 5432
```

### Connection refused
```bash
# Verify database is healthy
docker compose ps database

# Check network connectivity
docker exec backend ping database
```

### Reset database
```bash
# WARNING: This deletes all data!
docker compose down -v
docker compose up -d database
```

## Environment Variables

Required in `.env`:
- `DB_NAME` - Database name (default: auraweb_db)
- `DB_USER` - Database user (default: auraweb_user)
- `DB_PASSWORD` - Database password (CHANGE IN PRODUCTION!)

## Performance Tuning

For production, consider adjusting PostgreSQL settings in docker-compose.yml:
```yaml
command:
  - "postgres"
  - "-c"
  - "max_connections=200"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "effective_cache_size=1GB"
```

## Migration Strategy

For schema changes:
1. Create migration SQL file
2. Test in development
3. Backup production database
4. Apply migration
5. Verify changes

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker PostgreSQL Image](https://hub.docker.com/_/postgres)
- [pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
