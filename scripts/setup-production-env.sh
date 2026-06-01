#!/bin/bash

# ==========================================
# Quick Production Setup Script
# Generates secure random passwords
# ==========================================

echo "🔐 Generating secure passwords..."

# Generate random passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
RABBITMQ_PASS=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-24)
REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-24)
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

# Create .env file
cat > .env << EOF
# ==========================================
# Auto-Generated Production Environment
# Generated: $(date)
# ==========================================

# Database Configuration
POSTGRES_USER=auraweb_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=auraweb_db

# Redis Configuration
REDIS_PASSWORD=${REDIS_PASSWORD}

# RabbitMQ Configuration
RABBITMQ_USER=auraweb_admin
RABBITMQ_PASS=${RABBITMQ_PASS}

# JWT Secret
JWT_SECRET=${JWT_SECRET}

# Stripe API Keys (UPDATE THESE WITH YOUR REAL KEYS!)
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_PRODUCTION_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_PRODUCTION_KEY

# AWS/S3 Configuration (UPDATE IF USING)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_BUCKET_NAME=your_bucket_name
AWS_REGION=us-east-1

# Grafana
GRAFANA_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}

# Node Environment
NODE_ENV=production
EOF

echo "✅ .env file created with secure passwords!"
echo ""
echo "📝 IMPORTANT: Update these values in .env:"
echo "   - STRIPE_SECRET_KEY (use your production key)"
echo "   - STRIPE_PUBLISHABLE_KEY (use your production key)"
echo "   - AWS credentials (if using S3)"
echo ""
echo "🔒 Passwords generated:"
echo "   Database: ${POSTGRES_PASSWORD}"
echo "   Redis: ${REDIS_PASSWORD}"
echo "   RabbitMQ: ${RABBITMQ_PASS}"
echo "   JWT: ${JWT_SECRET}"
echo "   Grafana: ${GRAFANA_ADMIN_PASSWORD}"
echo ""
echo "💾 Save these passwords securely!"
echo ""
