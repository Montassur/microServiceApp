# Ecommerce — Project Guide

A complete walkthrough of what's in this project, how the pieces fit together, and what you must change before going to production.

---

## 1. What this project is

**Ecommerce** is a microservices e-commerce platform packaged as a DevOps demo. It runs in three modes:

| Mode | Tool | Use for |
|---|---|---|
| Local dev | Docker Compose | Day-to-day development on your laptop |
| Local K8s | minikube / kind / k3d | Testing K8s manifests before pushing |
| Cloud | Kubernetes + Kustomize + ArgoCD | Staging / production deploys |

The stack is **2 React frontends + 7 Node/Express microservices + 1 Nginx gateway**, backed by **PostgreSQL 17, Redis, RabbitMQ**, and optional **MinIO** for S3-compatible object storage.

---

## 2. Top-level layout

```
.
├── services/              ← 10 microservice source trees (1 Dockerfile each)
├── infrastructure/
│   ├── k8s/
│   │   ├── base/          ← Kustomize base (deployments, services, statefulset)
│   │   ├── overlays/
│   │   │   ├── development/  ← namespace ecommerce-dev, dev- prefix, LOG_LEVEL=debug
│   │   │   └── production/   ← namespace ecommerce-prod, replicas=2, LOG_LEVEL=info
│   │   └── gateway-api/   ← Gateway API CRDs (HTTPRoute, Gateway)
│   ├── docker/            ← Shared node-service.Dockerfile template
│   └── prometheus/        ← prometheus.yml scrape config
├── database/
│   ├── init.sql           ← Schema + seed users (run on first Postgres start)
│   └── seed_demo_data.sql ← Demo products/orders/inventory
├── scripts/               ← Deploy, health-check, backup, secret-gen, etc.
├── argocd/                ← ArgoCD Application manifest for GitOps
├── docs/                  ← 11 markdown guides (CI/CD comparison, deployment, etc.)
├── examples/cicd/         ← Reference pipelines (GHA, GitLab, Jenkins, CircleCI)
├── .github/workflows/ci.yml         ← Active CI pipeline (lint, test, build, push GHCR)
├── docker-compose.yml               ← Base compose (all 13 containers)
├── docker-compose.dev.yml           ← Dev override
├── docker-compose.prod.yml          ← Prod override (hardened env)
├── docker-compose.override.yml      ← Local port remap (admin→8081, frontend→9080)
├── .env / .env.development / .env.production / .env.example
├── Makefile                          ← 17 convenience targets
└── PROJECT_GUIDE.md                  ← This file
```

---

## 3. The 10 services

Each service has its own `Dockerfile`, `package.json`, `nginx.conf` (for React), and `src/`.

### Frontend tier

| Service | Port (host → container) | Stack | Purpose |
|---|---|---|---|
| `frontend` | **9080** → 80 | React 19 + Vite + nginx | Customer-facing storefront — browse, cart, checkout |
| `admin` | **8081** → 80 | React 19 + Vite + nginx | Admin dashboard — manage products, orders, users |
| `gateway` | **3080** → 80 | Nginx (no Node) | Reverse proxy. Routes `/api/*` to the right backend, terminates TLS (in prod), rate-limits, adds security headers |

### Backend services (all Node.js 22 + Express)

| Service | Port | Talks to | Purpose |
|---|---|---|---|
| `user-auth` | **3000** | Postgres | Auth + RBAC. JWT access + refresh tokens, sessions, notifications. **The "user" service** for login/register/me/refresh |
| `catalog` | **3001** | Postgres, Redis | Products, categories, reviews, search (Redis Search), recommendations |
| `order-payment` | **3002** | Postgres, RabbitMQ, Stripe | Orders + payments. Implements Saga pattern across cart → order → payment → fulfillment |
| `fulfillment` | **3003** | Postgres, RabbitMQ | Shipping, tracking, coupon validation |
| `shopping` | **3004** | Redis | Cart + wishlist (Redis-backed for speed). Items move from cart to `order-payment` at checkout |
| `platform` | **3005** | Postgres, MinIO/S3 | Analytics, audit logs, reporting, file uploads, admin operations |
| `inventory` | **3006** | Postgres | Stock levels, reservations, low-stock alerts |

### Infrastructure containers

| Container | Port | Why it's there |
|---|---|---|
| `database` (Postgres 17.2) | 5432 | All persistent data — users, products, orders, inventory |
| `redis` | 6379 | Cart/wishlist storage, search indexes, session cache |
| `rabbitmq` | 5672 (AMQP) / 15672 (mgmt UI) | Async events between services (order placed → fulfillment, etc.) |
| `minio` *(commented out)* | 9000 / 9001 | S3-compatible storage for product images, exports |

---

## 4. Default credentials (what's there out-of-the-box)

These are seeded by `database/init.sql` and `.env.development` when you first start the stack.

### Application users (login at http://localhost:9080)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ecommerce.com` | `Admin@123` |
| User | `user@example.com` | `Admin@123` |
| Editor | `editor@example.com` | `Admin@123` |

> All three use the same dev password. **Rotate before any non-local use.**

### Infrastructure (from `.env.development`)

| Service | User | Password |
|---|---|---|
| PostgreSQL | `ecommerce_user` | `password` |
| RabbitMQ (mgmt UI at http://localhost:15672) | `guest` | `guest` |
| MinIO | `minio` | `minio123` |

### Dev JWT / secret values (from `.env.development`)

```
SECRET_KEY=dev_secret_key_8x92m293
JWT_SECRET=dev_jwt_secret_92837482
JWT_REFRESH_SECRET=dev_refresh_secret_29384723
STRIPE_SECRET_KEY=sk_test_random_stripe_key_mock_12345   ← fake, no real Stripe
```

---

## 5. URLs to open once the stack is up

```bash
docker compose up -d
```

| URL | What it is |
|---|---|
| http://localhost:9080 | Storefront (frontend) |
| http://localhost:8081 | Admin dashboard |
| http://localhost:3080 | Nginx gateway (all `/api/*` requests) |
| http://localhost:3080/api/products | Catalog API through gateway |
| http://localhost:15672 | RabbitMQ management (guest/guest) |
| http://localhost:5432 | Postgres (any client) |

---

## 6. What you MUST change before production

These are the items that will get you breached / pwned / fined if left at defaults.

### 🔴 Critical — security

1. **Rotate every secret in `.env.production`.** Currently they're all `CHANGE_ME_IN_PROD` placeholders. The same applies to `infrastructure/k8s/overlays/production/secrets.env`:
   - `SECRET_KEY`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `DB_PASSWORD`
   - `RABBITMQ_URL` (the `CHANGE_ME_IN_PROD` segment)
   - `STRIPE_SECRET_KEY` (real Stripe live key, not test)
   - `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`
   Generate with: `./scripts/generate-secrets.sh`
2. **Change the default admin password.** `admin@ecommerce.com / Admin@123` is public knowledge once this repo is cloned. Either reset via `./scripts/manage-user.sh` or remove the seed in `database/init.sql` and create the first admin manually.
3. **Change RabbitMQ `guest`/`guest`.** RabbitMQ refuses `guest` from non-localhost by default, but if you expose port 5672 externally this becomes a hole.
4. **Replace MinIO `minio`/`minio123`** if you keep MinIO instead of moving to real S3 in prod.
5. **Move secrets out of env files into a real manager.** Options: AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, Sealed Secrets, or External Secrets Operator for K8s.

### 🟠 Important — configuration

6. **Replace dev domains in `.env.production`:**
   - `DOMAIN=ecommerce.com` → your real domain
   - `FRONTEND_URL`, `ADMIN_URL`, `API_URL` → match your DNS
7. **TLS certificates.** Gateway currently terminates plain HTTP. For prod:
   - Use cert-manager + Let's Encrypt on K8s, or
   - Put a managed LB (ALB/Cloudflare) in front of the gateway
8. **Update `infrastructure/k8s/overlays/production/secrets.env`** with real values (currently all `REPLACE_ME`).
9. **Image registry.** `Makefile` pushes to `ecommerce/*:latest`. Change to your real registry: `ghcr.io/<your-org>/*` or ECR/GCR/ACR.
10. **`STRIPE_SECRET_KEY`.** Test key in dev, **live key** (`sk_live_…`) only in prod, only via secret manager.

### 🟡 Recommended — operations

11. **Resource limits in K8s.** `base/*-deployment.yaml` has tight `requests`/`limits` (64–128Mi memory). Tune to your real traffic profile.
12. **Replicas.** Prod overlay sets all deployments to 2 replicas. Bump high-traffic services (`catalog`, `order-payment`, `user-auth`).
13. **Backups.** Postgres is a StatefulSet with a PVC, but there's no scheduled backup. Add a CronJob using `pg_dump` → S3, or use a managed DB (RDS/Cloud SQL) instead.
14. **Monitoring.** Prometheus config exists at `infrastructure/prometheus/prometheus.yml` but Prometheus/Grafana are **commented out** in `docker-compose.yml`. Uncomment for local observability; deploy kube-prometheus-stack for K8s.

---

## 7. What you need to ADD (not present yet)

### Required for a credible production deploy

1. **Tests.** Zero `*.test.js` files exist across the 10 services. Add at minimum:
   - One smoke test per backend service (Jest + supertest hitting `/health`)
   - Frontend component tests (Vitest)
   - The `test` job in `.github/workflows/ci.yml` already has the matrix wired — it just runs `npm test --if-present`, so it's a no-op until tests exist.
2. **TLS / cert-manager.** No ingress TLS configuration anywhere. Either:
   - Add cert-manager + ClusterIssuer + TLS section on the Gateway resource, or
   - Use a cloud LB that does TLS termination upstream
3. **API documentation.** No OpenAPI/Swagger specs. Add `swagger-jsdoc` or `@fastify/swagger` per service so the frontend team has a contract.
4. **`.dockerignore` per service.** Some services may not have one — verify with `ls services/*/.dockerignore`. Without it, `node_modules` gets pushed into build context (slow).
5. **Database migrations.** Currently `init.sql` is run once on first container start. For schema changes you need a real migration tool: `node-pg-migrate`, `Knex`, or `Prisma Migrate`.

### Nice-to-have

6. **Distributed tracing.** Add OpenTelemetry SDK to each Node service and wire to Jaeger/Tempo.
7. **Centralized logging.** Add Loki + Promtail (lightweight) or ELK.
8. **Rate limiting at gateway.** Nginx has rate-limit zones but they're not configured for individual API routes.
9. **CSP / security headers audit.** Run securityheaders.com once the gateway is on a real domain.
10. **Load tests.** Add `k6` scripts under `tests/load/`.
11. **Renovate / Dependabot.** No dependency auto-update configured.

---

## 8. Common workflows

### Start / stop the local stack

```bash
docker compose up -d              # start everything
docker compose down               # stop and remove containers
docker compose down -v            # also wipe volumes (Postgres data, etc.)
docker compose logs -f gateway    # follow logs for one service
docker compose restart catalog    # restart a single service
```

### Rebuild after changing code

```bash
docker compose up -d --build catalog   # rebuild just one service
docker compose up -d --build           # rebuild everything (slow)
```

### Seed demo data

```bash
./scripts/seed-demo-data.sh
```

### Health check

```bash
./scripts/health-check.sh dev
```

### Manage users

```bash
./scripts/manage-user.sh        # interactive: create, reset password, deactivate
```

### Deploy to Kubernetes

```bash
make k8s-dev                     # apply infrastructure/k8s/overlays/development
make k8s-prod                    # apply infrastructure/k8s/overlays/production
make k8s-status-dev              # see pods/services in ecommerce-dev
make health-dev                  # smoke-test cluster endpoints
```

---

## 9. Known local quirks (already fixed in this checkout)

| Issue | Fix applied |
|---|---|
| `Makefile` referenced non-existent `scripts/deploy-dev.sh` and wrong paths | Pointed at real `scripts/deploy` + `infrastructure/k8s/...` |
| All `*.sh` scripts had no execute bit | `chmod +x` applied |
| `base/kustomization.yaml` pointed at `.env` at repo root (which doesn't exist) | Moved `secretGenerator` into each overlay with its own `secrets.env` |
| `frontend`, `admin`, `redis` deployments had no `env:` array, breaking the `LOG_LEVEL` JSON patch | Added `env: []` placeholders |
| Local ports 80 + 8080 conflict with macOS web server + Jenkins | `docker-compose.override.yml` remaps to 9080 and 8081 |
| `services/inventory/src/index.js` had a route handler missing its `app.get(...)` wrapper → `SyntaxError` | Added the wrapper |

---

## 10. Quick reference — env files

| File | Purpose | Committed? |
|---|---|---|
| `.env.example` | Template showing every required variable | ✅ yes |
| `.env.development` | Dev defaults (used for local Docker) | ✅ yes |
| `.env.production` | Prod template with `CHANGE_ME_IN_PROD` placeholders | ✅ yes |
| `.env` | **Active** env Compose reads — copy from `.env.development` for local | ❌ gitignored |
| `infrastructure/k8s/overlays/development/secrets.env` | Dev K8s secrets | ❌ gitignored |
| `infrastructure/k8s/overlays/production/secrets.env` | Prod K8s secrets | ❌ gitignored |
| `*/secrets.env.example` | Templates for the above | ✅ yes |

---

## 11. Where to look next

- `docs/00-CICD-Platform-Comparison.md` — which CI platform to pick
- `docs/` — 11 other guides on deployment, HTTPS, architecture
- `README.md` — high-level project pitch and architecture diagrams
- `.github/workflows/ci.yml` — what runs on every PR

---

**TL;DR for getting started:**

```bash
cp .env.development .env
docker compose up -d
open http://localhost:9080       # storefront
open http://localhost:8081       # admin (login: admin@ecommerce.com / Admin@123)
```
