# RabbitMQ — Event Map & Architecture

Complete audit of every publish, every consumer, every queue, and the side effect each handler performs across the 7 backend services.

> All file references are relative to `services/` and use the format `file:line` so you can click directly to source in your IDE.

---

## 1. Quick reference

- **Broker:** RabbitMQ 4.2 (`rabbitmq:4.2-management-alpine`)
- **AMQP port:** 5672 (container-to-container, used by all services)
- **Management UI:** http://localhost:15672 — login `guest` / `guest`
- **Connection URL services use:** `amqp://guest:guest@rabbitmq:5672` (`.env.development`)

### Live queue inspection

```bash
# List queues + how many messages waiting + how many consumers attached
docker compose exec rabbitmq rabbitmqctl list_queues name messages consumers

# Number of unacked + ready messages per queue
docker compose exec rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged

# All exchanges
docker compose exec rabbitmq rabbitmqctl list_exchanges
```

Queues with `consumers = 0` are orphans (see §4).

---

## 2. Publishers — events emitted

### user-auth

| Event | Source | Trigger | Payload |
|---|---|---|---|
| `USER_CREATED` | `user-auth/src/modules/auth/routes.js:27` | `POST /api/auth/register` | `{ id, email, name }` |

### catalog

| Event | Source | Trigger | Payload |
|---|---|---|---|
| `PRODUCT_CREATED` | `catalog/src/modules/product/routes.js:45` | `POST /api/products` | Full product (`id, name, description, price, category, stock, image_url`) |
| `PRODUCT_UPDATED` | `catalog/src/modules/product/routes.js:74` | `PUT /api/products/:id` | Updated product |
| `PRODUCT_DELETED` | `catalog/src/modules/product/routes.js:98` | `DELETE /api/products/:id` | `{ id }` |

### order-payment

| Event | Source | Trigger | Payload |
|---|---|---|---|
| `ORDER_CREATED` | `order-payment/src/modules/order/routes.js:66` | `POST /api/orders` | `{ orderId, userId, products, timestamp }` |
| `PAYMENT_PROCESSED` | `order-payment/src/modules/payment/routes.js:31` | `POST /api/payments` (success) | `{ orderId, paymentId, success: true }` |
| `PAYMENT_FAILED` | `order-payment/src/modules/payment/routes.js:53` | `POST /api/payments` (failure) | `{ orderId, error }` |
| `ORDER_PAID` | `order-payment/src/modules/order/events.js:30` | After `PAYMENT_PROCESSED` consumed | `{ orderId }` |

### fulfillment

| Event | Source | Trigger | Payload |
|---|---|---|---|
| `SHIPMENT_CREATED` | `fulfillment/src/modules/shipping/index.js:78` | After `ORDER_PAID` received | `{ shipmentId, orderId, trackingNumber, carrier, status }` |

### inventory

| Event | Source | Trigger | Payload |
|---|---|---|---|
| `STOCK_LOW` | `inventory/src/index.js:88` | After `ORDER_CREATED` decrement makes stock < 10 | `{ productId, quantity, timestamp }` |

---

## 3. Consumers — who listens, what happens

### user-auth → `ORDER_PAID`
- **File:** `user-auth/src/modules/notification/events.js:24`
- **Impact:** Creates a mock notification row. **Email/SMS not actually sent** — placeholder code only.

### catalog → `PRODUCT_CREATED` / `PRODUCT_UPDATED` / `PRODUCT_DELETED`
- **File:** `catalog/src/modules/search/events.js:19, 45, 71`
- **Impact:** `JSON.SET` / `JSON.DEL` against RediSearch — keeps product search index synced with the DB.

### catalog → `ORDER_CREATED`
- **File:** `catalog/src/modules/recommendation/index.js:44`
- **Impact:** Logs a "learning event" for recommendations. **Recommendation model update is a stub** — nothing actually updates.

### order-payment → `PAYMENT_PROCESSED`
- **File:** `order-payment/src/modules/order/events.js:23`
- **Impact:** Updates `orders.status` → `PAID`. Publishes `ORDER_PAID`.

### order-payment → `PAYMENT_FAILED`
- **File:** `order-payment/src/modules/order/events.js:41`
- **Impact:** Updates `orders.status` → `PAYMENT_FAILED`.

### fulfillment → `ORDER_PAID`
- **File:** `fulfillment/src/modules/shipping/events.js:33`
- **Impact:** Inserts a row into `shipments` (generates tracking number + carrier), publishes `SHIPMENT_CREATED`.

### fulfillment → `PAYMENT_COMPLETED`
- **File:** `fulfillment/src/index.js:46`
- **Impact:** Also calls `createShipment` if `status === COMPLETED`. **Duplicates the `ORDER_PAID` path** → see §5 issue #2.

### inventory → `ORDER_CREATED`
- **File:** `inventory/src/index.js:56`
- **Impact:** Decrements `inventory.quantity` for each line item. If any product drops below 10, publishes `STOCK_LOW` (which nobody listens to).

### platform → audit (topic exchange)
- **File:** `platform/src/index.js:77-87`
- **Exchange:** `ecommerce_events` (topic), routing key `#`
- **Impact:** Inserts a row into `audit_logs` (`event_type`, `entity_id`, `details`) for every message routed through the exchange.
- **Caveat:** Only events explicitly published to `ecommerce_events` are seen — most publishers above use direct queues, so audit silently misses them. See §5 issue #1.

### platform → analytics → `ORDER_CREATED`
- **File:** `platform/src/modules/analytics/index.js:55`
- **Impact:** Redis `INCR metrics:total_orders`, adds order total to `metrics:total_revenue`.

### platform → analytics → `PAYMENT_COMPLETED`
- **File:** `platform/src/modules/analytics/index.js:75`
- **Impact:** Redis `INCR metrics:successful_payments`.

---

## 4. Orphans & phantom queues

### Events published with no consumer (dead-letter messages)

| Event | Publisher | Result |
|---|---|---|
| `SHIPMENT_CREATED` | `fulfillment/src/modules/shipping/index.js:78` | Customer never gets a "shipment created" notification. Front-end can only poll. |
| `STOCK_LOW` | `inventory/src/index.js:88` | No admin alert, no email, no badge. The whole low-stock feature is half-built. |

### Queues `assertQueue`-d but never `consume`-d

Each line below creates an empty queue that accumulates messages forever:

| Queue | Declared in |
|---|---|
| `PAYMENT_FAILED` | `user-auth/src/lib/rabbitmq.js:15` |
| `USER_CREATED` | `user-auth/src/lib/rabbitmq.js:13` |
| `ORDER_CREATED` | `order-payment/src/lib/rabbitmq.js:13` |
| `ORDER_PAID` | `order-payment/src/lib/rabbitmq.js:16` |
| `PRODUCT_CREATED` | `inventory/src/lib/rabbitmq.js:13` |
| `PRODUCT_UPDATED` | `inventory/src/lib/rabbitmq.js:14` |
| `SHIPMENT_CREATED` | `inventory/src/lib/rabbitmq.js:16`, `fulfillment/src/lib/rabbitmq.js:14` |
| `STOCK_LOW` | `inventory/src/lib/rabbitmq.js:51` |

Verify in management UI → **Queues** tab → look for `Consumers: 0` with rising `Ready` count.

---

## 5. Architectural issues

### #1 — Mixed messaging patterns
Platform audit uses a **topic exchange** (`ecommerce_events`, routing `#`). Everything else uses **direct named queues** with no exchange binding. The audit log silently misses events that go to direct queues.

**Fix:** publish every event to `ecommerce_events` *and* the direct queue (or migrate everything to the exchange).

### #2 — Fulfillment has two paths for the same business event
Both `ORDER_PAID` (`events.js:33`) and `PAYMENT_COMPLETED` (`index.js:46`) call `createShipment`. A successful order produces **two shipment rows** unless the route is made idempotent.

**Fix:** delete one of the listeners — `ORDER_PAID` is more semantically correct since it includes the order-level commitment.

### #3 — Notifications are stubs
`user-auth/notification/events.js:24` consumes `ORDER_PAID` but only logs a mock notification. The customer never hears anything.

**Fix:** at minimum, insert a real row into `notifications` so the in-app bell shows it. Email is a follow-up.

### #4 — Two names for the same event
`PAYMENT_PROCESSED` (published by `order-payment`) and `PAYMENT_COMPLETED` (published by `fulfillment`) are conceptually the same. Inconsistent naming = bugs.

**Fix:** standardize on `PAYMENT_PROCESSED`. Remove `PAYMENT_COMPLETED`.

### #5 — `STOCK_LOW` is a one-way street
Inventory bothers to compute and publish it, but no admin alerting subscribes.

**Fix:** add a consumer in `platform` that writes a row into `notifications` for admin users (or sends an email).

---

## 6. Event flow at a glance

```
register user                   POST /api/products            POST /api/orders
       │                              │                              │
       ▼                              ▼                              ▼
   USER_CREATED              PRODUCT_CREATED                 ORDER_CREATED
       │                              │                              │
       ▼                              ▼                       ┌──────┼─────────┐
   (audit only)              catalog/search ─► RediSearch     ▼      ▼         ▼
                             platform/audit ─► audit_logs  inventory analytics catalog
                                                              │     metrics    recs
                                                              │  (Redis INCR)  (stub)
                                                              ▼
                                                          STOCK_LOW
                                                          (orphan ✗)

                          POST /api/payments
                                  │
                  ┌───────────────┴──────────────────┐
                  ▼ success                          ▼ fail
          PAYMENT_PROCESSED                   PAYMENT_FAILED
                  │                                  │
                  ▼                                  ▼
        order status = PAID                 order status = PAYMENT_FAILED
                  │                                  │
                  ▼                                  ▼
              ORDER_PAID                       (notification stub)
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
   fulfillment           user-auth/notif
   createShipment        (mock — no email)
       │
       ▼
   SHIPMENT_CREATED
   (orphan ✗)
```

---

## 7. Cross-reference summary

| Event | Producer | Active consumers | Impact |
|---|---|---|---|
| USER_CREATED | user-auth | platform/audit | Audit row |
| PRODUCT_CREATED | catalog | catalog/search, platform/audit | RediSearch index, audit row |
| PRODUCT_UPDATED | catalog | catalog/search | RediSearch index update |
| PRODUCT_DELETED | catalog | catalog/search | RediSearch removal |
| ORDER_CREATED | order-payment | inventory, platform/analytics, catalog/recs | Stock decrement, metrics, recs stub |
| PAYMENT_PROCESSED | order-payment | order-payment/order (self) | Order → PAID, emits ORDER_PAID |
| PAYMENT_FAILED | order-payment | order-payment/order (self) | Order → PAYMENT_FAILED |
| ORDER_PAID | order-payment | fulfillment, user-auth/notification | Shipment created, mock notification |
| PAYMENT_COMPLETED | fulfillment (duplicate) | fulfillment (self), platform/analytics | Duplicate shipment, metric INCR |
| SHIPMENT_CREATED | fulfillment | — none — | Orphan |
| STOCK_LOW | inventory | — none — | Orphan |

---

## 8. Connecting to RabbitMQ from outside the cluster

### Management UI (browser)
```
URL:      http://localhost:15672
Username: guest
Password: guest
```

> If the browser shows "invalid credentials", clear the saved password for `localhost:15672` and retry.
> If you hit "Login failed" because of the loopback restriction, see `docker-compose.yml` line 65-72 — the dev image is built so `guest` is allowed from any host (the bug normally hits production-tuned images only).

### AMQP from a host script
```
amqp://guest:guest@localhost:5672
```

### From inside another container on the `auraweb` compose network
```
amqp://guest:guest@rabbitmq:5672
```
