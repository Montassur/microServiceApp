#!/bin/bash
# Rollback Script

ENV=${1:-dev}
DEPLOYMENT=${2}

if [ "$ENV" = "prod" ]; then
    NAMESPACE="auraweb-prod"
else
    NAMESPACE="auraweb-dev"
fi

if [ -z "$DEPLOYMENT" ]; then
    echo "Usage: ./rollback.sh [dev|prod] [deployment-name]"
    echo "Example: ./rollback.sh prod backend"
    exit 1
fi

echo "🔄 Rolling back $DEPLOYMENT in $ENV environment..."

kubectl rollout undo deployment/$DEPLOYMENT -n $NAMESPACE

echo "⏳ Waiting for rollback..."
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE

echo "✅ Rollback complete!"
kubectl get pods -n $NAMESPACE -l app=$DEPLOYMENT
