# ==========================================
# Build Stage
# ==========================================
# Uses Node 22 Alpine image for latest stable build environment
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first (Caching layer)
COPY package*.json ./
# Use npm install (not ci) so newly added deps don't require a fresh lockfile.
RUN npm install --no-audit --no-fund --silent

# Build source
COPY . .

# Vite reads VITE_* env vars at build time and inlines them into the bundle.
# Passed by docker-compose / CI via --build-arg.
ARG VITE_STRIPE_PUBLIC_KEY
ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY
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

