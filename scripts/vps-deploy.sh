#!/usr/bin/env bash
#
# vps-deploy.sh — one-shot production deploy on the VPS.
#
# Assumes the VPS already has:
#   - k3s installed and running
#   - ingress-nginx installed (NodePort 30080)
#   - sealed-secrets controller installed
#   - ArgoCD installed in argocd namespace
#   - Apache running on 80/443 with mod_proxy, mod_proxy_http, mod_ssl, mod_headers enabled
#   - this repo cloned at ~/microServiceApp
#
# Safe to re-run. Each step prints a banner and the result.
#
# Tweak these two variables and that's it:
DOMAIN_SUFFIX="monta.dev.montassar-benaziza.com"
CERTBOT_EMAIL="montassar121@gmail.com"
#
# Subdomains we serve:
SUBDOMAINS=(
  "ecommerce"
  "admin"
  "api"
  "argocd"
)

set -e

# Colors
B='\033[1m'; R='\033[0;31m'; G='\033[0;32m'; Y='\033[0;33m'; C='\033[0;36m'; X='\033[0m'

banner() { echo -e "\n${B}${C}━━━ $* ━━━${X}\n"; }
ok()     { echo -e "${G}✓${X} $*"; }
warn()   { echo -e "${Y}!${X} $*"; }
fail()   { echo -e "${R}✗${X} $*"; exit 1; }
info()   { echo -e "  $*"; }

REPO_DIR="$HOME/microServiceApp"
[ -d "$REPO_DIR" ] || fail "Repo not found at $REPO_DIR — clone it first"

cd "$REPO_DIR"

# =============================================================================
banner "1/8  Pull latest from GitHub"
# =============================================================================
git pull --rebase
ok "repo synced — $(git rev-parse --short HEAD)"

# =============================================================================
banner "2/8  Preflight — required tools and cluster components"
# =============================================================================
command -v kubectl >/dev/null   || fail "kubectl not found"
command -v apache2ctl >/dev/null || fail "apache2ctl not found"
command -v certbot >/dev/null   || warn "certbot not installed — will install"

kubectl get nodes >/dev/null    || fail "kubectl can't reach the cluster"
ok "kubectl reaches cluster"

kubectl get ns argocd >/dev/null         || fail "argocd namespace missing"
kubectl get ns ingress-nginx >/dev/null  || fail "ingress-nginx namespace missing"
kubectl get deploy sealed-secrets-controller -n kube-system >/dev/null \
  || fail "sealed-secrets-controller missing"
ok "k3s, argocd, ingress-nginx, sealed-secrets all present"

# Verify Apache modules
for mod in proxy proxy_http rewrite ssl headers; do
  apache2ctl -M 2>/dev/null | grep -q "${mod}_module" \
    || { sudo a2enmod "$mod" >/dev/null 2>&1 && info "enabled apache mod: $mod"; }
done
ok "apache modules ok"

# =============================================================================
banner "3/8  Apply ArgoCD Applications"
# =============================================================================
kubectl apply -f argocd/applications.yaml
ok "applications.yaml applied"

# Apply the standalone ArgoCD UI Ingress (lives in argocd namespace,
# can't be managed by the ecommerce-prod overlay)
kubectl apply -f infrastructure/k8s/argocd-ingress.yaml
ok "argocd-ingress.yaml applied"

# Drop the dev Application if it's there (we only deploy prod on this VPS)
kubectl delete application ecommerce-dev -n argocd --ignore-not-found
ok "ecommerce-dev removed (we don't run dev on this VPS)"

# Wait for the prod application to register
sleep 5
kubectl get application ecommerce-production -n argocd \
  || fail "ArgoCD Application ecommerce-production not registered"
ok "ArgoCD Application ecommerce-production exists"

# Force an immediate sync
kubectl patch application ecommerce-production -n argocd \
  --type=merge -p '{"operation":{"sync":{}}}' || true
ok "sync triggered"

# =============================================================================
banner "4/8  Wait for namespace + pods to appear"
# =============================================================================
echo "Waiting up to 5 min for ArgoCD to create the ecommerce-prod namespace..."
for i in {1..30}; do
  if kubectl get ns ecommerce-prod >/dev/null 2>&1; then
    ok "namespace ecommerce-prod exists"
    break
  fi
  sleep 10
  info "...still waiting ($((i*10))s)"
done

if ! kubectl get ns ecommerce-prod >/dev/null 2>&1; then
  echo
  warn "Namespace not created yet. ArgoCD status:"
  kubectl get application ecommerce-production -n argocd -o jsonpath='{.status.sync.status}{" / "}{.status.health.status}{"\n"}'
  echo
  warn "Conditions:"
  kubectl get application ecommerce-production -n argocd -o jsonpath='{.status.conditions}' | head
  echo
  fail "ArgoCD failed to create the namespace. Run: kubectl describe application ecommerce-production -n argocd"
fi

# Wait for pods
echo
echo "Waiting up to 8 min for pods to come up..."
for i in {1..48}; do
  total=$(kubectl get pods -n ecommerce-prod --no-headers 2>/dev/null | wc -l | tr -d ' ')
  ready=$(kubectl get pods -n ecommerce-prod --no-headers 2>/dev/null | awk '$3=="Running"' | wc -l | tr -d ' ')
  if [ "$total" -ge 13 ] && [ "$ready" -ge 10 ]; then
    ok "$ready/$total pods Running"
    break
  fi
  info "...$ready/$total Running ($((i*10))s elapsed)"
  sleep 10
done

echo
kubectl get pods -n ecommerce-prod

# =============================================================================
banner "5/8  Write Apache vhost files"
# =============================================================================
for sub in "${SUBDOMAINS[@]}"; do
  CONF="/etc/apache2/sites-available/${sub}.${DOMAIN_SUFFIX}.conf"
  sudo tee "$CONF" >/dev/null <<EOF
# Auto-generated by scripts/vps-deploy.sh — do not edit by hand.
# Forwards HTTP traffic for ${sub}.${DOMAIN_SUFFIX} to k3s NGINX Ingress
# on NodePort 30080. certbot will inject the HTTPS vhost below.

<VirtualHost *:80>
    ServerName ${sub}.${DOMAIN_SUFFIX}
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:30080/
    ProxyPassReverse / http://127.0.0.1:30080/
    RequestHeader set X-Forwarded-Proto "http"
    ErrorLog \${APACHE_LOG_DIR}/${sub}.error.log
    CustomLog \${APACHE_LOG_DIR}/${sub}.access.log combined
</VirtualHost>
EOF
  sudo a2ensite "${sub}.${DOMAIN_SUFFIX}" >/dev/null
  ok "vhost: ${sub}.${DOMAIN_SUFFIX}"
done

sudo apache2ctl configtest 2>&1 | tail -1
sudo systemctl reload apache2
ok "apache reloaded"

# =============================================================================
banner "6/8  Install certbot + request HTTPS certs"
# =============================================================================
if ! command -v certbot >/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq certbot python3-certbot-apache
  ok "certbot installed"
fi

# Build -d args for all subdomains
DARGS=""
for sub in "${SUBDOMAINS[@]}"; do
  DARGS="$DARGS -d ${sub}.${DOMAIN_SUFFIX}"
done

# Only request a cert for subdomains that don't have one yet
NEED_CERT=0
for sub in "${SUBDOMAINS[@]}"; do
  if [ ! -f "/etc/letsencrypt/live/${sub}.${DOMAIN_SUFFIX}/fullchain.pem" ]; then
    NEED_CERT=1
    break
  fi
done

if [ "$NEED_CERT" -eq 1 ]; then
  sudo certbot --apache \
    $DARGS \
    --email "$CERTBOT_EMAIL" \
    --agree-tos --redirect --non-interactive \
    --keep-until-expiring \
    || warn "certbot returned non-zero — some subdomains may already have certs"
else
  ok "certs already exist for all 4 subdomains"
fi

sudo systemctl reload apache2

# =============================================================================
banner "7/8  Verification — does it actually serve?"
# =============================================================================
for sub in "${SUBDOMAINS[@]}"; do
  URL="https://${sub}.${DOMAIN_SUFFIX}"
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$URL" --max-time 10 || echo "TIMEOUT")
  case "$CODE" in
    200|301|302|303|307|308) ok "$URL → HTTP $CODE" ;;
    404)                     warn "$URL → HTTP 404 (ingress alive but no matching rule yet — pods might still be coming up)" ;;
    503)                     warn "$URL → HTTP 503 (Service has no Endpoints yet — pods not ready)" ;;
    TIMEOUT)                 warn "$URL → timeout" ;;
    *)                       warn "$URL → HTTP $CODE" ;;
  esac
done

# =============================================================================
banner "8/8  Summary"
# =============================================================================
echo "ArgoCD:"
kubectl get application ecommerce-production -n argocd -o jsonpath='  Sync: {.status.sync.status}{"\n  Health: "}{.status.health.status}{"\n"}'
echo
echo "Pods:"
kubectl get pods -n ecommerce-prod --no-headers | awk '{printf "  %-30s %s\n", $1, $3}'
echo
echo "Public URLs:"
for sub in "${SUBDOMAINS[@]}"; do
  echo "  https://${sub}.${DOMAIN_SUFFIX}"
done
echo
echo "ArgoCD admin password:"
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' 2>/dev/null \
  | base64 -d | sed 's/^/  /'
echo
echo
ok "Done."
echo
echo "If anything still shows 404/503:"
echo "  kubectl describe application ecommerce-production -n argocd | tail -30"
echo "  kubectl get pods -n ecommerce-prod"
echo "  kubectl logs -n ecommerce-prod deployment/<service>"
