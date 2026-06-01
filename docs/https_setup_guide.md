# HTTPS/TLS Setup Guide

## Overview

This guide provides instructions for adding HTTPS/TLS encryption to your Docker + Nginx application. HTTPS is **critical** for production deployments to protect user data and credentials.

---

## Option 1: Let's Encrypt with Certbot (Recommended)

Let's Encrypt provides free, automated SSL certificates. This is the recommended approach for most deployments.

### Prerequisites
- A registered domain name pointing to your server
- Ports 80 and 443 open on your firewall
- Docker and Docker Compose installed

### Step 1: Update Gateway Nginx Configuration

Create a new file `nginx/nginx-https.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    
    sendfile        on;
    keepalive_timeout  65;
    
    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    
    client_max_body_size 10M;

    # Global Security Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()";

    upstream frontend {
        server frontend:80;
    }

    upstream admin {
        server admin:80;
    }

    # HTTP Server - Redirect to HTTPS
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        
        # Allow Let's Encrypt validation
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        # Redirect all other traffic to HTTPS
        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL Certificate paths (managed by Certbot)
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
        
        # SSL Configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # HSTS (HTTP Strict Transport Security)
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Frontend Proxy
        location / {
            limit_req zone=general burst=20 nodelay;
            
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Port $server_port;
        }

        # Admin Proxy
        location /admin {
            limit_req zone=general burst=20 nodelay;
            
            proxy_pass http://admin;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Port $server_port;
            
            rewrite ^/admin$ /admin/ permanent;
        }
    }
}
```

### Step 2: Update Docker Compose

Update `docker-compose.yml` to include Certbot:

```yaml
services:
  gateway:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"  # Add HTTPS port
    restart: unless-stopped
    depends_on:
      frontend:
        condition: service_healthy
      admin:
        condition: service_healthy
    networks:
      - app-network
    volumes:
      # Mount certificate directories
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
      # Use HTTPS config when certificates exist
      - ./nginx/nginx-https.conf:/etc/nginx/nginx.conf

  # Certbot service for SSL certificate management
  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

  frontend:
    # ... rest of config unchanged

  admin:
    # ... rest of config unchanged

networks:
  app-network:
    driver: bridge
```

### Step 3: Initial Certificate Generation

**Before starting the full stack**, obtain certificates:

```bash
# Create directories
mkdir -p certbot/conf certbot/www

# Start only the gateway temporarily with HTTP config
docker-compose up -d gateway

# Obtain certificate (replace with your domain and email)
docker-compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com \
  -d www.yourdomain.com

# Stop gateway
docker-compose down

# Now start the full stack with HTTPS config
docker-compose up -d
```

### Step 4: Automatic Renewal

The Certbot container will automatically renew certificates every 12 hours. To manually renew:

```bash
docker-compose run --rm certbot renew
docker-compose exec gateway nginx -s reload
```

---

## Option 2: Manual SSL Certificates

If you have SSL certificates from another provider (e.g., purchased certificates):

### Step 1: Prepare Certificates

Place your certificate files in `nginx/certs/`:
- `fullchain.pem` - Your certificate + intermediate certificates
- `privkey.pem` - Your private key

### Step 2: Update Gateway Dockerfile

```dockerfile
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY certs/ /etc/nginx/certs/

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
```

### Step 3: Update Nginx Config

Use the HTTPS configuration from Option 1, but change certificate paths:

```nginx
ssl_certificate /etc/nginx/certs/fullchain.pem;
ssl_certificate_key /etc/nginx/certs/privkey.pem;
```

### Step 4: Update Docker Compose

```yaml
gateway:
  build:
    context: ./nginx
    dockerfile: Dockerfile
  ports:
    - "80:80"
    - "443:443"
  # ... rest of config
```

---

## Option 3: Cloud Load Balancer (AWS, GCP, Azure)

If deploying to cloud platforms, use their managed load balancers for SSL termination:

### AWS Application Load Balancer (ALB)

1. **Create ALB** with HTTPS listener
2. **Attach SSL certificate** from AWS Certificate Manager (ACM)
3. **Configure target group** pointing to your EC2 instance on port 80
4. **Keep your current HTTP-only configuration** - ALB handles HTTPS

The ALB will:
- Terminate SSL/TLS
- Forward requests to your gateway on port 80
- Set `X-Forwarded-Proto: https` header (which your config now supports)

### Google Cloud Load Balancer

1. **Create HTTPS load balancer**
2. **Attach Google-managed certificate**
3. **Backend service** points to your instance group
4. **Keep HTTP configuration** - GCP handles HTTPS

### Azure Application Gateway

1. **Create Application Gateway** with HTTPS listener
2. **Upload or use Azure-managed certificate**
3. **Backend pool** points to your VM
4. **Keep HTTP configuration** - Azure handles HTTPS

---

## Testing HTTPS Setup

### 1. Verify Certificate Installation

```bash
# Check certificate details
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Verify certificate chain
curl -vI https://yourdomain.com
```

### 2. Test SSL Configuration

Use [SSL Labs](https://www.ssllabs.com/ssltest/) to test your SSL configuration. Aim for an **A or A+ rating**.

### 3. Test HTTP to HTTPS Redirect

```bash
# Should redirect to HTTPS
curl -I http://yourdomain.com

# Should return 301 Moved Permanently
```

### 4. Verify HSTS Header

```bash
curl -I https://yourdomain.com | grep -i strict-transport-security
```

---

## Security Best Practices

### 1. Strong SSL Configuration

```nginx
# Use only modern TLS versions
ssl_protocols TLSv1.2 TLSv1.3;

# Strong cipher suites
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';

# Prefer server ciphers
ssl_prefer_server_ciphers off;
```

### 2. HSTS (HTTP Strict Transport Security)

```nginx
# Force HTTPS for 1 year, including subdomains
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### 3. OCSP Stapling

```nginx
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

### 4. Disable Weak Protocols

```nginx
# Disable SSLv2, SSLv3, TLSv1, TLSv1.1
ssl_protocols TLSv1.2 TLSv1.3;
```

---

## Troubleshooting

### Certificate Not Found

**Error**: `SSL: error:02001002:system library:fopen:No such file or directory`

**Solution**: Verify certificate paths and ensure files exist:
```bash
docker-compose exec gateway ls -la /etc/letsencrypt/live/yourdomain.com/
```

### Permission Denied

**Error**: `Permission denied` when accessing certificates

**Solution**: Fix file permissions:
```bash
sudo chmod 644 certbot/conf/live/yourdomain.com/*.pem
sudo chmod 600 certbot/conf/live/yourdomain.com/privkey.pem
```

### Redirect Loop

**Error**: Browser shows "Too many redirects"

**Solution**: Check that `X-Forwarded-Proto` header is properly set and your application respects it.

### Certificate Renewal Failed

**Error**: Certbot renewal fails

**Solution**: 
1. Ensure port 80 is accessible
2. Check nginx logs: `docker-compose logs gateway`
3. Verify `.well-known/acme-challenge/` location is configured

---

## Next Steps

After setting up HTTPS:

1. ✅ Update your application URLs to use `https://`
2. ✅ Configure secure cookies in your application
3. ✅ Update CSP headers to enforce HTTPS resources
4. ✅ Test all functionality over HTTPS
5. ✅ Monitor certificate expiration dates
6. ✅ Set up alerts for certificate renewal failures

---

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [SSL Labs Testing Tool](https://www.ssllabs.com/ssltest/)
- [Nginx SSL Documentation](https://nginx.org/en/docs/http/configuring_https_servers.html)
