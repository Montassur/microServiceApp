#!/bin/bash
# Health Check Script

ENV=${1:-dev}

if [ "$ENV" = "prod" ]; then
    NAMESPACE="auraweb-prod"
    URL="https://auraweb.com"
else
    NAMESPACE="auraweb-dev"
    URL="https://dev.auraweb.com"
fi

echo "🏥 Running health checks for $ENV environment..."

# Check if all pods are running
echo "📊 Checking pod status..."
PODS=$(kubectl get pods -n $NAMESPACE --no-headers | grep -v Running | grep -v Completed | wc -l)
if [ $PODS -gt 0 ]; then
    echo "❌ Some pods are not running:"
    kubectl get pods -n $NAMESPACE
    exit 1
fi
echo "✅ All pods are running"

# Check gateway health endpoint
echo "🔍 Checking gateway health..."
GATEWAY_POD=$(kubectl get pods -n $NAMESPACE -l app=gateway -o jsonpath='{.items[0].metadata.name}')
kubectl exec $GATEWAY_POD -n $NAMESPACE -- curl -f http://localhost:8080/health || {
    echo "❌ Gateway health check failed"
    exit 1
}
echo "✅ Gateway is healthy"

echo "🔍 Checking catalog-service health..."
CATALOG_POD=$(kubectl get pods -n $NAMESPACE -l app=catalog-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec $CATALOG_POD -n $NAMESPACE -- curl -f http://localhost:3001/health || {
    echo "❌ Catalog Service health check failed"
    exit 1
}
echo "✅ Catalog Service is healthy"

# Check if ingress is accessible (if URL is reachable)
if command -v curl &> /dev/null; then
    echo "🌐 Checking ingress..."
    # Assuming Ingress routes / to frontend, and /api/health might need to be checked via gateway path if exposed
    # For now, checking root URL availability
    curl -f -k $URL || {
        echo "⚠️  Ingress health check failed (might not be accessible yet)"
    }
fi

echo "✅ All health checks passed!"
