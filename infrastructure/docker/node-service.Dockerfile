# Multi-stage build for optimized production image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files (including monorepo workspace configs if needed)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build (if TypeScript or build process exists)
# RUN npm run build

# ==========================================
# Production Image
# ==========================================
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy dependencies and built artifacts from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
# COPY --from=builder /app/dist ./dist  # If using TS/Build

# Use non-root user for security
USER node

# Expose the service port (configure per service)
EXPOSE 3000

# Start the application
CMD ["dumb-init", "node", "src/index.js"]
