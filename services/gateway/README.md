# Nginx Gateway Service

The central reverse proxy and entry point for the entire application.

## 📋 Overview

The gateway service acts as a single point of entry, routing traffic to the appropriate backend services:

- **Frontend**: Routes `/` to the frontend container
- **Admin Panel**: Routes `/admin` to the admin container
- **Security**: Implements rate limiting and security headers
- **Performance**: Handles load balancing and caching

---

## 🏗️ Architecture

```
                    Internet
                       │
                       ▼
              ┌────────────────┐
              │  Port 80/443   │
              │   (Gateway)    │
              └────────┬───────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌───────────────┐           ┌───────────────┐
│   Frontend    │           │  Admin Panel  │
│   Container   │           │   Container   │
│   (Port 80)   │           │   (Port 80)   │
└───────────────┘           └───────────────┘
```

---

## 📁 Files

```
nginx/
├── Dockerfile          # Gateway container definition
├── nginx.conf         # Main routing and security configuration
└── README.md          # This file
```

---

## 🔧 Configuration

### Main Configuration (`nginx.conf`)

The gateway configuration includes:

1. **Event Processing**
   ```nginx
   events {
       worker_connections 1024;
   }
   ```

2. **HTTP Settings**
   ```nginx
   http {
       sendfile on;
       keepalive_timeout 65;
       client_max_body_size 10M;
   }
   ```

3. **Rate Limiting**
   ```nginx
   limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
   limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
   ```

4. **Security Headers**
   ```nginx
   add_header X-Frame-Options "SAMEORIGIN";
   add_header X-XSS-Protection "1; mode=block";
   add_header X-Content-Type-Options "nosniff";
   add_header Permissions-Policy "geolocation=(), microphone=(), camera=()";
   ```

5. **Upstream Definitions**
   ```nginx
   upstream frontend {
       server frontend:80;
   }
   
   upstream admin {
       server admin:80;
   }
   ```

6. **Routing Rules**
   ```nginx
   # Frontend at root
   location / {
       proxy_pass http://frontend;
       # ... proxy headers
   }
   
   # Admin at /admin
   location /admin {
       proxy_pass http://admin;
       # ... proxy headers
   }
   ```

---

## 🛡️ Security Features

### Rate Limiting

Protects against DDoS and brute force attacks:

```nginx
# Define zones
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;

# Apply to locations
location / {
    limit_req zone=general burst=20 nodelay;
}
```

**Configuration:**
- **Rate**: 10 requests/second per IP
- **Burst**: Allow up to 20 requests in burst
- **Zone Size**: 10MB (tracks ~160k IPs)

### Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| X-Frame-Options | SAMEORIGIN | Prevent clickjacking |
| X-XSS-Protection | 1; mode=block | Enable XSS filtering |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| Permissions-Policy | restrictive | Limit browser features |

### Proxy Headers

Essential headers for backend services:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Port $server_port;
```

---

## 🐳 Docker Configuration

### Dockerfile

```dockerfile
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Health Check

The gateway includes a health check that:
- Runs every 30 seconds
- Times out after 5 seconds
- Allows 5 seconds startup time
- Retries 3 times before marking unhealthy

---

## 🚀 Deployment

### Development

```bash
# Build gateway image
docker build -t gateway:latest .

# Run standalone
docker run -p 80:80 gateway:latest
```

### Production

```bash
# With Docker Compose
docker compose up -d gateway

# Check health
docker compose ps gateway

# View logs
docker compose logs -f gateway
```

---

## 🔄 Routing Configuration

### Adding New Routes

To add a new service route:

1. **Define upstream:**
   ```nginx
   upstream newservice {
       server newservice:80;
   }
   ```

2. **Add location block:**
   ```nginx
   location /newservice {
       limit_req zone=general burst=20 nodelay;
       
       proxy_pass http://newservice;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_set_header X-Forwarded-Port $server_port;
   }
   ```

3. **Update docker-compose.yml:**
   ```yaml
   newservice:
     build: ./newservice
     networks:
       - app-network
   ```

---

## 🌐 HTTPS Configuration

For production, enable HTTPS. See the [HTTPS Setup Guide](../docs/https_setup_guide.md).

### Quick HTTPS Config

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # ... rest of configuration
}
```

---

## 📊 Monitoring

### Access Logs

Enable access logging:

```nginx
http {
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;
}
```

### View Logs

```bash
# Real-time logs
docker compose logs -f gateway

# Access logs
docker compose exec gateway tail -f /var/log/nginx/access.log

# Error logs
docker compose exec gateway tail -f /var/log/nginx/error.log
```

### Metrics

Monitor key metrics:
- Request rate
- Error rate (4xx, 5xx)
- Response times
- Active connections

---

## ⚙️ Performance Tuning

### Worker Processes

```nginx
# Auto-detect CPU cores
worker_processes auto;

events {
    worker_connections 1024;
    use epoll;  # Linux optimization
}
```

### Caching

Add proxy caching for better performance:

```nginx
http {
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g;
    
    location / {
        proxy_cache my_cache;
        proxy_cache_valid 200 60m;
        proxy_cache_bypass $http_cache_control;
    }
}
```

### Connection Limits

```nginx
http {
    keepalive_timeout 65;
    keepalive_requests 100;
    
    # Limit connections per IP
    limit_conn_zone $binary_remote_addr zone=addr:10m;
    limit_conn addr 10;
}
```

---

## 🐛 Troubleshooting

### Test Configuration

```bash
# Test nginx config syntax
docker compose exec gateway nginx -t

# Reload configuration
docker compose exec gateway nginx -s reload
```

### Common Issues

**502 Bad Gateway:**
- Backend service is down
- Check: `docker compose ps`
- Check backend logs

**Rate Limit Errors (429):**
- Increase rate limit or burst size
- Check if legitimate traffic is being blocked

**SSL Certificate Errors:**
- Verify certificate paths
- Check certificate expiration
- Ensure proper permissions

### Debug Mode

Enable debug logging:

```nginx
error_log /var/log/nginx/error.log debug;
```

---

## 🔒 Security Best Practices

### 1. Update Server Name

```nginx
# Replace catch-all with actual domain
server_name yourdomain.com www.yourdomain.com;
```

### 2. Hide Nginx Version

```nginx
http {
    server_tokens off;
}
```

### 3. Implement IP Whitelisting (for admin)

```nginx
location /admin {
    allow 192.168.1.0/24;  # Office network
    deny all;
    
    proxy_pass http://admin;
}
```

### 4. Add Request Filtering

```nginx
# Block common exploits
location ~ /\. {
    deny all;
}

location ~ \.(sql|bak|old)$ {
    deny all;
}
```

---

## 📈 Load Balancing

### Multiple Backend Instances

```nginx
upstream frontend {
    least_conn;  # Load balancing method
    
    server frontend1:80;
    server frontend2:80;
    server frontend3:80;
    
    # Health checks
    keepalive 32;
}
```

### Load Balancing Methods

- `round-robin` (default): Distribute evenly
- `least_conn`: Send to least busy server
- `ip_hash`: Sticky sessions based on IP

---

## 🔄 Maintenance

### Graceful Reload

```bash
# Reload without downtime
docker compose exec gateway nginx -s reload
```

### Update Configuration

```bash
# Edit nginx.conf
nano nginx/nginx.conf

# Test configuration
docker compose exec gateway nginx -t

# Apply changes
docker compose exec gateway nginx -s reload
```

### Backup Configuration

```bash
# Backup current config
docker compose exec gateway cat /etc/nginx/nginx.conf > nginx.conf.backup
```

---

## 📚 Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Nginx Rate Limiting](https://www.nginx.com/blog/rate-limiting-nginx/)
- [Nginx Security](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [Nginx Performance](https://www.nginx.com/blog/tuning-nginx/)

---

## ⚠️ Important Notes

> [!IMPORTANT]
> **Production Deployment**: Update `server_name` from `_` to your actual domain before production.

> [!WARNING]
> **Rate Limiting**: Adjust rate limits based on your traffic patterns. Too restrictive may block legitimate users.

> [!NOTE]
> **HTTPS Required**: Always use HTTPS in production. HTTP should redirect to HTTPS.

---

**Maintained by**: [Your Team]  
**Last Updated**: 2025-12-28
