# Frontend Application

The public-facing React application served at the root path (`/`).

## 📋 Overview

This is a modern React application built with Vite, featuring:

- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: CSS (customize as needed)
- **Deployment**: Docker + Nginx

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│         Nginx Gateway               │
│         (Port 80/443)               │
└──────────────┬──────────────────────┘
               │ Proxy Pass
               ▼
┌─────────────────────────────────────┐
│      Frontend Container             │
│  ┌───────────────────────────────┐  │
│  │   Nginx (Port 80)             │  │
│  │   - Serves static files       │  │
│  │   - Gzip compression          │  │
│  │   - Caching policies          │  │
│  │   - SPA routing support       │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │   React Build Output          │  │
│  │   /usr/share/nginx/html       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
frontend/
├── Dockerfile              # Multi-stage build configuration
├── nginx.conf             # Nginx server configuration
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite build configuration
├── .dockerignore          # Docker build exclusions
├── index.html             # HTML entry point
├── eslint.config.js       # ESLint configuration
│
├── src/                   # Source code
│   ├── main.jsx          # Application entry point
│   ├── App.jsx           # Root component
│   ├── App.css           # App styles
│   ├── index.css         # Global styles
│   └── assets/           # Static assets
│
└── public/               # Public static files
    └── vite.svg          # Favicon
```

---

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:5173
```

### Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

### Docker Development

```bash
# Build Docker image
docker build -t frontend:latest .

# Run container
docker run -p 8080:80 frontend:latest

# Access at http://localhost:8080
```

---

## 🔧 Configuration

### Vite Configuration (`vite.config.js`)

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})
```

### Nginx Configuration (`nginx.conf`)

Key features:
- **Gzip Compression**: Reduces file sizes
- **Caching**: 1 year for static assets, no-cache for HTML
- **Security Headers**: X-Frame-Options, CSP, etc.
- **SPA Routing**: `try_files` for client-side routing

```nginx
server {
    listen 80;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/javascript;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header Content-Security-Policy "...";
    
    # Serve static files
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(css|js|jpg|png|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🐳 Docker Configuration

### Multi-Stage Build

The `Dockerfile` uses a two-stage build process:

**Stage 1: Build**
- Base: `node:18-alpine`
- Install dependencies with `npm ci`
- Build production bundle with `npm run build`

**Stage 2: Production**
- Base: `nginx:stable-alpine`
- Copy build output to nginx
- Copy custom nginx configuration
- Add health check

### Build Arguments

```bash
# Build with custom base path
docker build --build-arg BASE_PATH=/ -t frontend .
```

### Health Check

The container includes a health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1
```

---

## 📦 Dependencies

### Production Dependencies

```json
{
  "react": "^18.x",
  "react-dom": "^18.x"
}
```

### Development Dependencies

```json
{
  "@vitejs/plugin-react": "^4.x",
  "vite": "^6.x",
  "eslint": "^9.x"
}
```

### Adding New Dependencies

```bash
# Production dependency
npm install package-name

# Development dependency
npm install -D package-name

# Rebuild Docker image
docker compose build frontend
```

---

## 🎨 Styling

### Current Setup

- **CSS Modules**: Supported by Vite
- **Global Styles**: `src/index.css`
- **Component Styles**: `src/App.css`

### Adding CSS Frameworks

**Tailwind CSS:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Material-UI:**
```bash
npm install @mui/material @emotion/react @emotion/styled
```

---

## 🔒 Security

### Implemented Security Features

1. **Content Security Policy (CSP)**
   ```nginx
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline';";
   ```

2. **Security Headers**
   - X-Frame-Options: SAMEORIGIN
   - X-XSS-Protection: 1; mode=block
   - X-Content-Type-Options: nosniff

3. **Request Size Limit**
   ```nginx
   client_max_body_size 10M;
   ```

### Security Best Practices

- ✅ Keep dependencies updated
- ✅ Use environment variables for secrets
- ✅ Validate user input
- ✅ Implement HTTPS in production
- ✅ Regular security audits

---

## 🧪 Testing

### Unit Testing (Setup Required)

```bash
# Install testing libraries
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Run tests
npm test
```

### E2E Testing (Setup Required)

```bash
# Install Playwright
npm install -D @playwright/test

# Run E2E tests
npx playwright test
```

---

## 📊 Performance

### Build Optimization

- **Code Splitting**: Automatic with Vite
- **Tree Shaking**: Removes unused code
- **Minification**: Enabled in production
- **Gzip Compression**: Nginx level

### Performance Tips

1. **Lazy Loading**
   ```javascript
   const Component = lazy(() => import('./Component'));
   ```

2. **Image Optimization**
   ```bash
   npm install -D vite-plugin-imagemin
   ```

3. **Bundle Analysis**
   ```bash
   npm install -D rollup-plugin-visualizer
   ```

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Frontend

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
```

---

## 🐛 Troubleshooting

### Common Issues

**Build Fails:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Hot Reload Not Working:**
```javascript
// vite.config.js
server: {
  watch: {
    usePolling: true
  }
}
```

**404 on Refresh:**
Ensure nginx has `try_files $uri $uri/ /index.html;`

---

## 📚 Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

## 🤝 Contributing

When making changes:

1. Test locally with `npm run dev`
2. Build and test Docker image
3. Update documentation if needed
4. Submit pull request

---

**Maintained by**: [Your Team]  
**Last Updated**: 2025-12-28
