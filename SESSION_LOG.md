# Session Log — Project Stabilization & Deployment

Complete record of every issue found, every fix applied, and every system brought online during this session.

---

## TL;DR — what works now

| System | URL | Login |
|---|---|---|
| Storefront (Docker) | http://localhost:9080 | `admin@ecommerce.com` / `Admin@123` |
| Admin panel (Docker) | http://localhost:8081 | `admin@ecommerce.com` / `Admin@123` |
| Gateway / API (Docker) | http://localhost:3080 | — |
| RabbitMQ Management | http://localhost:15672 | `guest` / `guest` |
| Postgres (DBeaver) | `localhost:5432` / `ecommerce_db` | `ecommerce_user` / `password` |
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3100 | `admin` / `admin` |
| Storefront (K8s) | `kubectl port-forward -n ecommerce-dev svc/frontend 9081:80` | same app creds |
| Admin (K8s) | `kubectl port-forward -n ecommerce-dev svc/admin 8082:80` | same app creds |
| ArgoCD UI | `kubectl port-forward -n argocd svc/argocd-server 8083:443` | `admin` / *(see §10)* |

---

## 1. Initial project audit

Mapped the full project structure: 10 microservices, infrastructure manifests, scripts, examples, docs.

**Findings:**
- 10 services scaffolded with real code (frontend, admin, gateway, user-auth, catalog, order-payment, fulfillment, shopping, platform, inventory)
- K8s base + overlays exist under `infrastructure/k8s/`
- Postgres 17 schema in `database/init.sql`
- 19 scripts under `scripts/`
- No active CI in `.github/workflows/` (only example templates under `examples/cicd/`)
- Zero tests across all 10 services

**Decisions made:**
- Picked Kustomize-based deployment (Helm not adopted by project)
- Used GitHub Actions for CI (closest fit to existing template)

---

## 2. Fixed broken `Makefile`

Three targets pointed at paths that don't exist.

| Target | Was | Fixed to |
|---|---|---|
| `deploy-dev` | `./scripts/deploy-dev.sh` (doesn't exist) | `./scripts/deploy local dev` |
| `deploy-prod` | `./scripts/deploy-prod.sh` (doesn't exist) | `./scripts/deploy cloud production all` |
| `k8s-dev` | `kubectl apply -k k8s/overlays/development` | `kubectl apply -k infrastructure/k8s/overlays/development` |
| `k8s-prod` | same problem | `infrastructure/k8s/overlays/production` |
| `build-images` | built `./frontend`, `./admin`, `./backend` (wrong paths, no monolith) | Loop over 10 real services under `./services/` |
| `push-images` | same problem | Loop over 10 real services |

**Also:** every `scripts/*.sh` and `scripts/deploy` had no execute bit. Applied `chmod +x` to all of them.

---

## 3. Created CI pipeline

Wrote `.github/workflows/ci.yml` from scratch.

> Did NOT copy `examples/cicd/.github/workflows/ci-cd.yml` because it referenced fictional services (`auth-service`, `apps/frontend`, `backend/`) that don't exist in this repo.

The new workflow has 4 jobs with matrices over the real service names:

1. **lint** — `npm run lint --if-present` for all 9 services with `package.json`
2. **test** — `npm test --if-present` for the 7 backend services (will run once tests exist)
3. **build** — Docker buildx for all 10 services → push to GHCR with `:branch` and `:sha-xxx` tags
4. **k8s-validate** — `kubectl kustomize` both overlays as a smoke test

---

## 4. Fixed K8s overlay validation (4 bugs)

Initial `kubectl kustomize infrastructure/k8s/overlays/development` failed. Resolved each bug:

### Bug 1 — base referenced non-existent `.env`
`base/kustomization.yaml` had `secretGenerator` reading from `../../../.env` (repo root) — file doesn't exist (only `.env.development`, `.env.production`, `.env.example`).
**Fix:** removed `secretGenerator` from base; moved into each overlay.

### Bug 2 — Kustomize security blocks cross-root file loads
Even after pointing overlays at `../../../../.env.development`, Kustomize refused because files outside the kustomization root are denied for security.
**Fix:** created `secrets.env` *inside* each overlay directory with the values it needs. Added template `.example` files and gitignored the real ones.

### Bug 3 — 3 deployments had no `env:` array
`frontend`, `admin`, `redis` deployment YAMLs had no `env:` field. The overlay's JSON-Patch (`op: add path: /spec/template/spec/containers/0/env/-`) for `LOG_LEVEL` failed against these.
**Fix:** added `env: []` placeholders.

### Bug 4 — deprecated `commonLabels`
Both overlays used the deprecated form.
**Fix:** upgraded to `labels: [{pairs: {...}}]`.

**Result:** both overlays now build clean (`27 resources, exit 0`).

---

## 5. Docker Compose stack — bringing it up

Brought up all 13 containers. Hit and fixed 6 issues in sequence:

### Issue 1 — missing root `.env`
Compose needed it for `${STRIPE_SECRET_KEY}`. `cp .env.development .env`.

### Issue 2 — port 8080 conflict
`admin` wants host port 8080 → conflict with running Jenkins instance (PID 1215). Created `docker-compose.override.yml` to remap → **8081**.

### Issue 3 — port 80 conflict
`frontend` wants host port 80 → another process holding it. Remapped → **9080**.

### Issue 4 — Compose merges lists by appending, not replacing
First override of `ports` produced *both* 8080 and 8081 bindings.
**Fix:** used `!override` YAML tag in override file. Final override:
```yaml
services:
  frontend:
    ports: !override
      - "9080:80"
  admin:
    ports: !override
      - "8081:80"
```

### Issue 5 — port 8088 also taken
Tried 8088 mid-debug, also in use. Switched frontend to **9080**.

### Issue 6 — real source bug in `services/inventory/src/index.js`
Route handler at line 144 was missing its `app.get('/api/inventory/:productId', async (req, res) => {` wrapper. Dangling `try { await ... } catch {}` outside async function caused `SyntaxError: await is only valid in async functions`. Inventory crashed; gateway nginx then refused to start because it couldn't resolve `inventory:3006` upstream.

**Fix:** added the missing `app.get(...)` wrapper.

**Result:** 13/13 containers healthy. All `/health` endpoints return 200.

---

## 6. Frontend showed 404 on API calls

User reported login worked nowhere from the browser, only via curl to port 3080 (gateway).

**Diagnosis:** React's `src/api/client.js` uses `baseURL: '/api'` (relative). Browser sends to `http://localhost:9080/api/auth/login`. Frontend's own nginx had no `/api/` proxy → returned 405. Same problem on admin.

**Fix:** added an `/api/` proxy block to both `services/frontend/nginx.conf` and `services/admin/nginx.conf`:
```nginx
location /api/ {
    proxy_pass http://gateway:80/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
    proxy_send_timeout 60s;
}
```

Login now works in the browser: `admin@ecommerce.com` / `Admin@123` returns a JWT.

---

## 7. RabbitMQ access clarification

User reported "can't connect with same user."

**Diagnosis:** `guest`/`guest` works fine via API:
```
HTTP 200 — {"name":"guest","tags":["administrator"]}
```
User confusion: tried to use **app user** (`admin@ecommerce.com`) as the RabbitMQ user. They're two completely separate user databases — app users live in Postgres, RabbitMQ has its own.

Clarified in docs. No code change needed.

---

## 8. Created `RABBITMQ_EVENTS.md`

Full audit of every RabbitMQ publisher, consumer, queue, and side effect across all 7 backend services.

**Active event flows (8 events):**
- `USER_CREATED`, `PRODUCT_CREATED/UPDATED/DELETED`, `ORDER_CREATED`, `PAYMENT_PROCESSED/FAILED`, `ORDER_PAID`

**Orphans found (2):**
- `SHIPMENT_CREATED` — published by fulfillment, nobody listens
- `STOCK_LOW` — published by inventory, nobody listens

**Phantom queues found (8):**
- `assertQueue` calls in `lib/rabbitmq.js` files that never `consume` — accumulating dead-letter messages

**Architectural issues identified:**
1. Mixed patterns (audit uses topic exchange, everything else uses direct queues)
2. Fulfillment listens to both `ORDER_PAID` and `PAYMENT_COMPLETED` → duplicate shipments
3. Notifications are stubs (mock console.log only)
4. `PAYMENT_PROCESSED` vs `PAYMENT_COMPLETED` — two names for same event
5. `STOCK_LOW` half-built feature

Full ASCII flow diagram included in the doc.

---

## 9. Created `PROJECT_GUIDE.md`

Comprehensive onboarding doc covering:

1. What the project is and the 3 deploy modes
2. Annotated directory layout
3. Every service with port, stack, role
4. Default credentials table (app users, Postgres, RabbitMQ, MinIO, JWT secrets)
5. URLs to open after `docker compose up -d`
6. **§6 What you MUST change before production** — 14 items split into Critical / Important / Recommended
7. **§7 What you need to ADD** — tests, TLS, OpenAPI, migrations, tracing, etc.
8. Common workflows (compose, k8s, db, seed)
9. Known local quirks already fixed
10. Env file reference (which is committed, which is gitignored)
11. Pointers into `docs/` for next reading

---

## 10. DBeaver → Postgres connection details

Verified live against the running container:

```
Host:     localhost
Port:     5432
Database: ecommerce_db
Username: ecommerce_user
Password: password
JDBC URL: jdbc:postgresql://localhost:5432/ecommerce_db
```

Note: `.env.development` line 33 says `DB_USER=root` but that's a stale value — the real Postgres user is `ecommerce_user` (set in `docker-compose.yml`).

16 tables present: `users`, `sessions`, `notifications`, `products`, `reviews`, `product_recommendations`, `orders`, `order_items`, `payments`, `shipments`, `coupons`, `cart_items`, `wishlists`, `audit_logs`, `analytics_events`, `inventory`.

---

## 11. Enabled Prometheus + Grafana

Both were commented out in `docker-compose.yml`. Brought them online via the `docker-compose.override.yml` (cleaner than editing the base file).

### Fixed Prometheus scrape config
Targets in `infrastructure/prometheus/prometheus.yml` used K8s upstream names like `catalog-service:3001`, `user-communication-service:3000` — these don't resolve in the Compose network where services are named `catalog`, `user-auth`, etc.

**Fix:** rewrote targets with the correct compose service names. Also added RabbitMQ scrape job on its built-in Prometheus exporter (port 15692).

### Provisioned Grafana datasource
Created `infrastructure/grafana/provisioning/datasources/prometheus.yml` so Prometheus is auto-registered as the default datasource on Grafana boot. No manual setup needed.

### Imported 2 dashboards
- **NodeJS Application Dashboard** (grafana.com #11159)
- **RabbitMQ-Overview** (grafana.com #10991)

Downloaded JSON into `infrastructure/grafana/dashboards/` and added a dashboards provisioning file.

**Result:** all 9 Prometheus targets `up`, 2 dashboards visible in Grafana, real metrics flowing (2,228 metrics from RabbitMQ alone).

---

## 12. Deployed project to Kubernetes (Docker Desktop)

Status checks first:
- ✅ kubectl context = `docker-desktop`, k8s v1.34.1, single node Ready
- ❌ No project namespaces yet — cluster was empty
- ❌ ArgoCD not installed

### Fixed 6 K8s-specific bugs during deployment

| # | Bug | Fix |
|---|---|---|
| 1 | Overlay's `namePrefix: dev-` renamed all Services to `dev-redis`, `dev-database`, `dev-gateway` — but app code & nginx hardcode names like `redis`, `database`, `gateway` → every DNS lookup broke | Removed `namePrefix` from dev overlay. Namespace `ecommerce-dev` already isolates env. |
| 2 | `secrets.env` missing `DB_NAME`, `DB_USER`, `RABBITMQ_USER`, `RABBITMQ_PASS` → postgres and rabbitmq pods stuck in `CreateContainerConfigError` | Added the 4 missing keys |
| 3 | No `Namespace` resource in overlay → apply errored before kustomize could create anything | `kubectl create namespace ecommerce-dev` explicitly |
| 4 | RabbitMQ Service had two ports without `name:` fields (required when >1 port) | Added `name: amqp` and `name: management` |
| 5 | No `gateway` Deployment in base → frontend/admin nginx crashed trying to resolve `gateway:80` | Created `base/gateway-deployment.yaml` + added to base kustomization |
| 6 | `redis:7-alpine` doesn't include RediSearch → catalog crashed with `unknown command 'FT.CREATE'` | Swapped to `redis/redis-stack-server:latest` |

### Also installed Gateway API CRDs
The overlay references `Gateway` + `HTTPRoute` (gateway.networking.k8s.io/v1) — CRDs not installed by default on Docker Desktop. Installed v1.2.0 standard CRDs.

**Result:** 13/13 project pods Running in `ecommerce-dev` namespace.

### To access from browser
```bash
kubectl port-forward -n ecommerce-dev svc/frontend 9081:80    # storefront
kubectl port-forward -n ecommerce-dev svc/admin 8082:80       # admin
kubectl port-forward -n ecommerce-dev svc/gateway 8084:80     # gateway / API
```

---

## 13. Installed ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

**Result:** 6/7 pods Running. (applicationset-controller crash-loops but is non-essential for sync.)

### Access UI
```bash
kubectl port-forward -n argocd svc/argocd-server 8083:443
# Open https://localhost:8083 (accept self-signed cert)
```

### Login
- Username: `admin`
- Password — retrieve any time:
```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

Initial password generated for this session: `mbOujaXU3Yyfsxu4`

### Next step (not yet done)
Apply `argocd/applications.yaml` to make ArgoCD manage the dev overlay automatically from git.

---

## 14. All files created or modified

### New files
- `.env` *(gitignored)* — copied from `.env.development`
- `.github/workflows/ci.yml` — CI pipeline
- `docker-compose.override.yml` — port remaps + Prometheus + Grafana
- `infrastructure/grafana/provisioning/datasources/prometheus.yml`
- `infrastructure/grafana/provisioning/dashboards/dashboards.yml`
- `infrastructure/grafana/dashboards/nodejs.json`
- `infrastructure/grafana/dashboards/rabbitmq.json`
- `infrastructure/k8s/base/gateway-deployment.yaml`
- `infrastructure/k8s/overlays/development/secrets.env` *(gitignored)*
- `infrastructure/k8s/overlays/development/secrets.env.example`
- `infrastructure/k8s/overlays/production/secrets.env` *(gitignored)*
- `infrastructure/k8s/overlays/production/secrets.env.example`
- `PROJECT_GUIDE.md`
- `RABBITMQ_EVENTS.md`
- `SESSION_LOG.md` *(this file)*

### Modified files
- `Makefile` — fixed deploy/k8s/build-images paths
- `services/inventory/src/index.js` — added missing route handler wrapper
- `services/frontend/nginx.conf` — added `/api/` → gateway proxy
- `services/admin/nginx.conf` — added `/api/` → gateway proxy
- `infrastructure/prometheus/prometheus.yml` — fixed target names for compose context, added RabbitMQ scrape
- `infrastructure/k8s/base/kustomization.yaml` — removed `secretGenerator`, added `gateway-deployment.yaml`
- `infrastructure/k8s/base/frontend-deployment.yaml` — added `env: []`
- `infrastructure/k8s/base/admin-deployment.yaml` — added `env: []`
- `infrastructure/k8s/base/redis-deployment.yaml` — added `env: []`, swapped to `redis/redis-stack-server:latest`
- `infrastructure/k8s/base/rabbitmq-deployment.yaml` — added port `name:` fields
- `infrastructure/k8s/overlays/development/kustomization.yaml` — removed `namePrefix`, added local `secretGenerator`, updated `commonLabels` → `labels`
- `infrastructure/k8s/overlays/production/kustomization.yaml` — added local `secretGenerator`, updated `commonLabels` → `labels`
- `.gitignore` — added `infrastructure/k8s/overlays/*/secrets.env`
- `scripts/*.sh`, `scripts/deploy`, `scripts/cleanup` — `chmod +x` on all

---

## 15. Documents produced this session

| File | Purpose |
|---|---|
| `PROJECT_GUIDE.md` | Onboarding: what the project is, services explained, default creds, what to change for prod, what to add |
| `RABBITMQ_EVENTS.md` | Event audit: publishers, consumers, impacts, orphans, architectural issues, ASCII flow diagram |
| `SESSION_LOG.md` | This file — full record of session work |

---

## 16. What's still pending (from earlier plans)

- **Tests** — zero `*.test.js` files across 10 services. CI test job is a no-op until tests exist.
- **TLS / cert-manager** — gateway serves plain HTTP only.
- **OpenAPI/Swagger** — no API contracts.
- **DB migrations tool** — currently only `init.sql` on first boot. Need node-pg-migrate / Knex / Prisma for ongoing schema changes.
- **ArgoCD application binding** — installed but not yet pointed at `argocd/applications.yaml`.
- **Rotate seeded admin password** — `admin@ecommerce.com` / `Admin@123` is in source.
- **Rotate all production secret placeholders** — `.env.production` still has `CHANGE_ME_IN_PROD`.
- **Architectural fixes from `RABBITMQ_EVENTS.md`** — duplicate fulfillment path, stub notifications, orphan events.

---

## 17. Quick commands cheat-sheet

```bash
# Docker
docker compose up -d                                     # everything
docker compose down                                      # stop
docker compose down -v                                   # stop + wipe volumes
docker compose logs -f gateway                           # follow one service
docker compose ps                                        # status table

# Kubernetes
kubectl apply -k infrastructure/k8s/overlays/development # deploy dev
kubectl get pods -n ecommerce-dev                          # see project pods
kubectl get pods -n argocd                               # see argocd pods
kubectl delete namespace ecommerce-dev                     # tear down project
kubectl logs -n ecommerce-dev deployment/catalog --tail=20

# Database
docker compose exec database psql -U ecommerce_user -d ecommerce_db -c "\dt"
./scripts/seed-demo-data.sh
./scripts/manage-user.sh                                 # interactive user CRUD

# Observability
curl http://localhost:9090/-/ready                       # prometheus
curl -u admin:admin http://localhost:3100/api/health     # grafana
curl 'http://localhost:9090/api/v1/targets?state=any'    # scrape targets

# RabbitMQ
docker compose exec rabbitmq rabbitmqctl list_queues name messages consumers
docker compose exec rabbitmq rabbitmqctl list_users
```
