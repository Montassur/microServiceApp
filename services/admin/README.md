# Admin Panel Application

The administrative dashboard React application served at `/admin` path.

## 📋 Overview

This is a React-based admin panel built with Vite, featuring:

- **Framework**: React 18+
- **Build Tool**: Vite
- **Base Path**: `/admin` (configured in vite.config.js)
- **Deployment**: Docker + Nginx
- **Access**: `https://yourdomain.com/admin`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│         Nginx Gateway               │
│         (Port 80/443)               │
└──────────────┬──────────────────────┘
               │ Proxy Pass /admin
               ▼
┌─────────────────────────────────────┐
│      Admin Container                │
│  ┌───────────────────────────────┐  │
│  │   Nginx (Port 80)             │  │
│  │   - Serves at /admin path     │  │
│  │   - Gzip compression          │  │
│  │   - Caching policies          │  │
│  │   - SPA routing support       │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │   React Build Output          │  │
│  │   /usr/share/nginx/html       │  │
│  │   (Built with base: /admin)   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
admin/
├── Dockerfile              # Multi-stage build configuration
├── nginx.conf             # Nginx server configuration (path-aware)
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite config with base: '/admin/'
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

# Access at http://localhost:8080/admin
```

> **Note**: The dev server runs on port 8080 to avoid conflicts with the frontend.

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
docker build -t admin:latest .

# Run container
docker run -p 8081:80 admin:latest

# Access at http://localhost:8081/admin
```

---

## 🔧 Configuration

### Vite Configuration (`vite.config.js`)

**Critical**: The `base` path must match the nginx proxy path.

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Set base path to match Nginx subpath
  base: '/admin/',
  server: {
    port: 8080,
    host: true
  }
})
```

### Nginx Configuration (`nginx.conf`)

**Key Difference from Frontend**: Uses `alias` and path-aware routing.

```nginx
server {
    listen 80;
    
    client_max_body_size 10M;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/javascript;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header Content-Security-Policy "...";
    
    # Main application at /admin
    location /admin {
        alias /usr/share/nginx/html;
        index index.html;
        
        # SPA Routing: MUST use /admin/index.html
        try_files $uri $uri/ /admin/index.html;
        
        # No-cache for HTML
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
    
    # Static assets caching
    location ~* \.(css|js|jpg|png|svg|woff2)$ {
        alias /usr/share/nginx/html/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🐳 Docker Configuration

### Multi-Stage Build

**Stage 1: Build**
- Install dependencies
- Build with `base: '/admin/'`
- Output to `dist/`

**Stage 2: Production**
- Copy build to nginx
- Configure path-aware routing
- Add health check

### Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1
```

---

## 🛣️ Routing Configuration

### Client-Side Routing

When using React Router, configure with `basename`:

```javascript
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter basename="/admin">
      {/* Your routes */}
    </BrowserRouter>
  );
}
```

### Asset Paths

Vite automatically handles asset paths with the `base` configuration:

```javascript
// Automatically resolves to /admin/assets/logo.png
import logo from './assets/logo.png';
```

---

## 📦 Dependencies

### Production Dependencies

```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "react-router-dom": "^6.x"  // If using routing
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

---

## 🔒 Security

### Admin-Specific Security

1. **Authentication Required**: Implement auth guards
2. **CSRF Protection**: Add CSRF tokens
3. **Role-Based Access**: Implement RBAC
4. **Audit Logging**: Log admin actions

### Example Auth Guard

```javascript
function ProtectedRoute({ children }) {
  const isAuthenticated = checkAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" />;
  }
  
  return children;
}
```

### Security Headers

```nginx
# Stricter CSP for admin panel
add_header Content-Security-Policy "default-src 'self'; script-src 'self';";

# Prevent embedding in iframes
add_header X-Frame-Options "DENY";
```

---

## 🎨 Styling

### Recommended Approach

For admin panels, consider using UI frameworks:

**Material-UI:**
```bash
npm install @mui/material @emotion/react @emotion/styled
```

**Ant Design:**
```bash
npm install antd
```

**Tailwind CSS:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## 🧪 Testing

### Testing with Base Path

Ensure tests account for the `/admin` base path:

```javascript
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

function renderWithRouter(component) {
  return render(
    <BrowserRouter basename="/admin">
      {component}
    </BrowserRouter>
  );
}
```

---

## 📊 Performance

### Admin Panel Optimization

1. **Code Splitting by Route**
   ```javascript
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   const Users = lazy(() => import('./pages/Users'));
   ```

2. **Data Tables**: Use virtualization for large datasets
   ```bash
   npm install react-window
   ```

3. **API Caching**: Implement with React Query
   ```bash
   npm install @tanstack/react-query
   ```

---

## 🔄 API Integration

### Example API Setup

```javascript
// api/client.js
const API_BASE = import.meta.env.VITE_API_URL;

export async function fetchUsers() {
  const response = await fetch(`${API_BASE}/api/users`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  return response.json();
}
```

### Environment Variables

```bash
# .env.production
VITE_API_URL=https://api.yourdomain.com
```

---

## 🐛 Troubleshooting

### Common Issues

**404 on Direct Navigation:**
- Ensure nginx has `try_files $uri $uri/ /admin/index.html;`
- Verify `base: '/admin/'` in vite.config.js

**Assets Not Loading:**
- Check that `base: '/admin/'` is set in vite.config.js
- Verify nginx `alias` directive is correct

**Routing Not Working:**
- Ensure React Router has `basename="/admin"`
- Check browser console for errors

**Build Fails:**
```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

---

## 🚀 Deployment Checklist

Before deploying admin panel:

- [ ] Configure authentication
- [ ] Set up authorization/RBAC
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up audit logging
- [ ] Test all routes work on refresh
- [ ] Verify asset paths are correct
- [ ] Test with production API
- [ ] Enable rate limiting
- [ ] Set up monitoring

---

## 🔐 Authentication Example

### Login Flow

```javascript
// Login.jsx
async function handleLogin(credentials) {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
    credentials: 'include'
  });
  
  if (response.ok) {
    navigate('/admin/dashboard');
  }
}
```

### Protected Routes

```javascript
// App.jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } />
</Routes>
```

---

## 📚 Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

## 🤝 Contributing

When making changes to the admin panel:

1. Test locally with `npm run dev`
2. Verify routing works correctly
3. Test build with `npm run build`
4. Test Docker container
5. Update documentation
6. Submit pull request

---

## ⚠️ Important Notes

> [!IMPORTANT]
> **Base Path Configuration**: Always keep `vite.config.js` base path in sync with nginx proxy path.

> [!WARNING]
> **Security**: Admin panels should ALWAYS require authentication and use HTTPS in production.

> [!NOTE]
> **SPA Routing**: The nginx `try_files` directive must use `/admin/index.html`, not `/index.html`.

---

**Maintained by**: [Your Team]  
**Last Updated**: 2025-12-28
