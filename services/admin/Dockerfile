# ==========================================
# Build Stage
# ==========================================
# Uses Node 22 Alpine image for latest stable build environment
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first (Caching layer)
# Copying package files separately allows Docker to cache npm install
# if dependencies haven't changed, even if source code has.
COPY package*.json ./
RUN npm ci --silent

# Build source
COPY . .
RUN npm run build

# ==========================================
# Production Stage
# ==========================================
# Uses Nginx 1.28 Alpine for serving static files with minimal footprint
FROM nginx:1.28-alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Remove default nginx config and copy custom config
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Install curl for healthcheck
RUN apk add --no-cache curl

# Healthcheck
# Periodically check if Nginx is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
