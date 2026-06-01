#!/usr/bin/env bash
# Open all the K8s port-forwards you need for daily dev in one go.
# Run with no args to start; run with "stop" to kill them.

set -euo pipefail

PIDFILE="/tmp/ecommerce-pf.pids"

# format: namespace:service:host-port:container-port
declare -a FORWARDS=(
  "ecommerce-dev:frontend:9080:80"
  "ecommerce-dev:admin:8081:80"
  "ecommerce-dev:gateway:3080:80"
  "ecommerce-dev:postgres:5432:5432"
  "ecommerce-dev:rabbitmq:15672:15672"
  "monitoring:prometheus:9090:9090"
  "monitoring:grafana:3100:3000"
  "argocd:argocd-server:8083:443"
)

cmd_start() {
  echo "Starting port-forwards..."
  : > "$PIDFILE"
  for fwd in "${FORWARDS[@]}"; do
    IFS=':' read -r ns svc host ctr <<< "$fwd"
    kubectl port-forward -n "$ns" "svc/$svc" "$host:$ctr" >/dev/null 2>&1 &
    pid=$!
    echo "$pid" >> "$PIDFILE"
    printf "  %-25s  port %s\n" "$ns/$svc" "$host"
  done
  echo
  echo "URLs:"
  echo "  Storefront         http://localhost:9080"
  echo "  Admin              http://localhost:8081"
  echo "  Gateway API        http://localhost:3080"
  echo "  Postgres           localhost:5432    (ecommerce_user / password)"
  echo "  RabbitMQ UI        http://localhost:15672  (guest / guest)"
  echo "  Prometheus         http://localhost:9090"
  echo "  Grafana            http://localhost:3100   (admin / admin)"
  echo "  ArgoCD UI          https://localhost:8083  (admin / see secret)"
  echo
  echo "Stop all with: $0 stop"
}

cmd_stop() {
  if [ ! -f "$PIDFILE" ]; then
    echo "No PID file at $PIDFILE — running pkill fallback"
    pkill -f "kubectl port-forward" || true
    return
  fi
  echo "Stopping port-forwards..."
  while read -r pid; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  done < "$PIDFILE"
  rm -f "$PIDFILE"
  echo "Done."
}

case "${1:-start}" in
  start)  cmd_start ;;
  stop)   cmd_stop ;;
  *)      echo "Usage: $0 [start|stop]" ; exit 1 ;;
esac
