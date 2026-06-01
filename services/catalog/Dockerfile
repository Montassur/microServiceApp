# ==========================================
# Build Stage
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install production dependencies only
# Using npm ci for reproducible builds
RUN npm ci --only=production && \
    npm cache clean --force

# ==========================================
# Production Stage
# ==========================================
FROM node:22-alpine

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3001

# Health check to ensure service is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["node", "src/index.js"]
