#!/bin/bash
# Generate Strong Secrets for Production
# Usage: ./generate-secrets.sh > .env.secrets
# Then copy values to your .env.production file

echo "# =========================================="
echo "# Generated Secrets - $(date)"
echo "# =========================================="
echo "# IMPORTANT: Keep these secrets secure!"
echo "# Do NOT commit these to version control"
echo "# =========================================="
echo ""

echo "# JWT Secrets"
echo "JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo ""

echo "# Application Secret"
echo "SECRET_KEY=$(openssl rand -base64 64 | tr -d '\n')"
echo ""

echo "# Database Password"
echo "DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')"
echo ""

echo "# Redis Password (optional)"
echo "REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')"
echo ""

echo "# RabbitMQ Password"
echo "RABBITMQ_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')"
echo ""

echo "# =========================================="
echo "# Copy these values to .env.production"
echo "# =========================================="
