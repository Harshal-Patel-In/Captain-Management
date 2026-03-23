# 📦 Captain Insecticide v2.0

## **Single‑Source‑of‑Truth LLM Master Build Instructions**

> **Audience:** Large Language Model (LLM) acting as a **senior full‑stack engineer**\
> **Repository Model:** **Single Monorepo** – Admin + Customer in one Next.js app\
> **Rule:** This document is the **final authority**. If code conflicts with this file, **this file wins**.

---

## 🧠 CORE DIRECTIVE (NON‑NEGOTIABLE)

1. **FIRST:** Read the entire existing codebase.
2. **SECOND:** Understand current data flow, APIs, database schema, and UI routing.
3. **THIRD:** Identify **v1.0 features** and treat them as **immutable contracts**.
4. **FOURTH:** Implement v2.0 features **without breaking, rewriting, or refactoring v1.0**.
5. **RULE:** Backward compatibility is mandatory.
6. **RULE:** New features must be **additive and isolated**.

If any v1.0 feature fails → **implementation is invalid**.

---

## 🏗️ PROJECT OVERVIEW

**Captain Insecticide** is an **internal inventory + order management system** for a chemical/insecticide company.

- v1.0 → Internal inventory & management system (already live)
- v2.0 → Adds **customer e‑commerce + order lifecycle** on top of v1.0

This is **not a SaaS**, **not a marketplace**, and **not consumer‑scale ecommerce**.

---

## 🧱 LOCKED TECH STACK

### Frontend

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Bun (package manager)
- Single monorepo deployment (Vercel)

### Backend

- FastAPI (Python)
- PostgreSQL
- SQLAlchemy ORM
- Alembic migrations

### Authentication

- **Password‑based admin access (v1.0 – MUST STAY)**
- Optional identity layer (v2.0) may be added **without breaking password gate**

---

## 📂 MONOREPO STRUCTURE (EXPECTED)

```
captain_insecticide.v2.0/
│
├─ backend/
│  ├─ alembic/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ routes/
│  │  │  │  ├─ inventory.py
│  │  │  │  ├─ qr.py
│  │  │  │  ├─ logs.py
│  │  │  │  │  ├─ analytics.py
│  │  │  │  ├─ orders.py        # v2.0
│  │  │  │  ├─ customers.py     # v2.0
│  │  │  │  ├─ payments.py      # v2.0
│  │  │  ├─ models/
│  │  │  ├─ schemas/
│  │  │  ├─ services/
│  │  │  ├─ core/
│  │  │  └─ main.py
│
├─ frontend/
│  ├─ app/
│  │  ├─ admin/                 # internal dashboard
│  │  ├─ shop/                  # customer ecommerce
│  │  ├─ login/
│  │  ├─ orders/
│  │  └─ page.tsx
│  ├─ components/
│  ├─ lib/
│  └─ styles/
```

---

## ✅ ALREADY IMPLEMENTED — v1.0 (DO NOT BREAK)

These features are **stable, live, and business‑critical**.

### 🏭 Inventory Management

- Inventory management system
- Product add / update / delete
- Stock tracking:
  - In‑stock
  - Low‑stock
  - Out‑stock

### 📷 QR‑Based Operations

- QR‑based stock **IN**
- QR‑based stock **OUT**
- Real‑time inventory update

### 🧾 Activity Logs

- All stock actions logged
- Append‑only
- Timestamped

### 📊 Analytics Dashboard

- Inventory trends
- Usage analytics

### 📤 CSV Export

- Inventory & activity export

### 🔐 Security & Access Control (v2.0)

- **Clerk-based role authentication** implemented in **v2.0**
- Roles:
  - `admin`
  - `customer`
- Admin access granted explicitly via:
  - Clerk user metadata **or**
  - Email allowlist
- Customer access restricted to ecommerce routes
- No shared passwords
- No password gates

Admin privileges are **identity-based and enforced in v2.0**.

⚠️ **Any regression here = failure**.

---

## 🚀 TO BE IMPLEMENTED — v2.0 (ADD ONLY)

v2.0 **extends** v1.0. It does NOT replace it.

---

## 🌐 CUSTOMER E‑COMMERCE WEBSITE

### Product Display (Read‑Only from Inventory)

- Product image
- Product name
- MRP price
- Available quantity
- Ingredients

Inventory remains the **single source of truth**.

---

## 👤 AUTHENTICATION & ROLES

### Roles

- Admin
- Customer

### Access Rules

- Admin → internal dashboard
- Customer → ecommerce site

### First‑Time Customer Details (Mandatory)

Collected once and persisted:

- Organization name
- Address
- Phone number
- PIN code

---

## 📦 INVENTORY UNITS (v2.0)

Supported units:

- PCS
- Liter
- ML

Units must integrate with:

- Orders
- Partial delivery
- Formulation logic

---

## 🛒 ORDER MANAGEMENT SYSTEM

### Order Placement

- Unique Order ID (system generated)
- Linked to customer & organization

### Order Search

- By Order ID
- By Customer name
- By Organization name

---

## 🚚 PARTIAL ORDER DELIVERY (CRITICAL)

If ordered quantity > available stock:

- Deliver available quantity
- Remaining quantity → Pending
- Inventory deducted **only for delivered amount**
- Customer notified of partial delivery

Transaction safety is mandatory.

---

## 💰 PAYMENT TRACKING (NO ONLINE PAYMENTS)

- Total amount calculated via MRP
- Track:
  - Amount paid
  - Amount pending

No payment gateway integration.

---

## 🧪 CHEMICAL PRODUCT FORMULATION

### Feature Behavior

- Combine existing products
- Auto‑reduce source product quantities
- Create new derived product
- Add derived product to inventory

This feature must:

- Log all deductions
- Be fully reversible via audit trail

---

## 🧭 CENTRAL MANAGEMENT VIEW

Admin dashboard must provide:

- All orders
- All customers
- All payments
- Pending deliveries
- Outstanding amounts

---

## 🛡️ NON‑INTERFERENCE RULES

- v1.0 APIs must not change
- v1.0 DB tables must not be altered destructively
- All schema changes require Alembic migrations
- New logic must be isolated in new modules

---

## 🧪 TESTING REQUIREMENTS

Before marking v2.0 complete:

- Inventory stock IN/OUT still works
- QR flows still work
- Analytics unchanged
- CSV export unchanged
- Orders do not corrupt inventory

---

## 🧠 FINAL LLM INSTRUCTION

You are operating as a **senior software engineer**.

Your job is **safe evolution**, not rewriting.

If something is unclear → assume **stability over features**.

This document is the **only instruction you follow**.

---

# 📑 APPENDIX A — API CONTRACTS (AUTHORITATIVE)

> These contracts define **behavioral guarantees**. Existing endpoints must not change. New endpoints must not reuse old paths.

## Inventory (v1.0 — EXISTING)

### GET /inventory

- Returns list of products with stock & unit

### POST /inventory/stock-in

- Input: product\_id, quantity
- Effect: increases stock

### POST /inventory/stock-out

- Input: product\_id, quantity
- Effect: decreases stock (validated)

---

## Orders (v2.0 — NEW)

### POST /orders

Creates a new order.

- Generates unique Order ID
- Does NOT deduct inventory yet

### POST /orders/{order\_id}/deliver

Handles full or partial delivery.

- Deducts inventory **only for delivered quantity**
- Updates order status:
  - DELIVERED
  - PARTIALLY\_DELIVERED

### GET /orders/search

Search by:

- order\_id
- customer\_name
- organization\_name
- address
- phone
- gmail
- pin\_code
- created\_at

## orders

- id (PK)
- order\_id (UNIQUE, human-readable)
- customer\_id (FK)
- status (CREATED | PARTIALLY\_DELIVERED | DELIVERED | CLOSED)
- total\_amount
- created\_at

## order\_items

- id (PK)
- order\_id (FK)
- product\_id (FK)
- ordered\_quantity
- delivered\_quantity
- pending\_quantity

## payments

- id (PK)
- order\_id (FK)
- amount\_paid
- amount\_pending
- updated\_at

---

# 📑 APPENDIX F — TRANSACTION BOUNDARY RULES

Critical operations MUST be wrapped in DB transactions:

### Partial Delivery

1. BEGIN TRANSACTION
2. Lock inventory rows
3. Validate available stock
4. Deduct delivered quantity
5. Update order\_items
6. Update order status
7. Insert logs
8. COMMIT

On ANY failure → ROLLBACK.

---

# 📑 APPENDIX G — FAILURE & RECOVERY SCENARIOS

## Inventory Mismatch

- Abort transaction
- Log error
- Do NOT modify stock

## Partial Delivery Failure

- Order remains unchanged
- No inventory deduction

## Payment Update Failure

- Payment state unchanged
- Order remains valid

---

# 📑 APPENDIX H — VERSIONING STRATEGY

### v1.0

- Internal inventory system (stable)

### v2.0

- Customer ecommerce
- Orders
- Payments
- Partial delivery

### v2.1 (PLANNED)

- Notification system

---

# 📑 APPENDIX I — NOTIFICATION SYSTEM (v2.1 DESIGN NOTE)

The notification system is a **GOOD and CORRECT decision**.

### Supported Channels (Start Simple)

- Email (Gmail-based)
- SMS (optional, later)

### Notification Triggers

- Order created
- Partial delivery
- Full delivery
- Payment update

### Design Rules

- Notifications are **side-effects**
- Notifications must NEVER block transactions
- Use async/background tasks

### Implementation Guidance

- Event-driven approach
- Store notification logs
- Retry failed notifications

---

# 📑 APPENDIX J — DOMAIN EVENT MODEL (v2.1)

Domain Events represent **facts that already happened**.

### Core Events

- OrderCreated
- OrderPartiallyDelivered
- OrderDelivered
- PaymentUpdated

### Event Rules

- Events are immutable
- Events are emitted AFTER transaction commit
- Events contain minimal data (IDs, not full objects)

### Example Event Payload

```
{
  "event_type": "OrderPartiallyDelivered",
  "order_id": "ORD-2026-0012",
  "customer_id": 42,
  "timestamp": "2026-01-12T14:30:00Z"
}
```

Events are consumed by notification workers.

---

# 📑 APPENDIX K — BACKGROUND WORKER DESIGN

### Architecture

- FastAPI API → emits events
- Background worker → processes events

### Recommended Approach (Simple & Stable)

- FastAPI + BackgroundTasks (initial)
- Upgrade path:
  - Redis + RQ / Celery (later)

### Worker Responsibilities

- Send emails
- Retry failed notifications
- Log notification attempts

### Failure Rules

- Worker failure must NOT affect API response
- Failed jobs are retried

---

# 📑 APPENDIX L — ADMIN AUDIT & COMPLIANCE RULES

Admin actions must be auditable.

### Audited Actions

- Product creation
- Product deletion
- Stock adjustments
- Order delivery
- Payment updates

### Audit Log Requirements

- Actor (admin ID)
- Action type
- Target entity
- Timestamp

Audit logs are append-only.

---

# 📑 APPENDIX M — PERFORMANCE & SCALING NOTES

### Expected Load

- Low to moderate concurrency
- Internal admin usage + limited customer usage
- Predictable traffic patterns

### Performance Rules

- Avoid N+1 DB queries
- Index critical fields:
  - order\_id
  - customer\_id
  - organization\_name
  - created\_at (logs)

### Scaling Strategy

- Vertical scaling first
- Separate background workers for async tasks
- Archive or purge old logs periodically

### What NOT to Do

- Do not introduce microservices prematurely
- Do not auto-delete data without explicit admin confirmation

---

# 📑 APPENDIX N — LOG MANAGEMENT, RETENTION & PURGE POLICY (v2.0 — MANDATORY)

> ⚠️ **VERSION LOCK:** This entire appendix is part of **v2.0**.
> 
> ❌ Must NOT be moved to v2.1
> ❌ Must NOT depend on notifications
> ❌ Must NOT be optional
> 
> Any implementation that classifies log management outside v2.0 is **INVALID**.

---

## 🗂️ Log Categories (v2.0)

Logs are separated into **four independent categories**:

1. **Stock Logs**
   - Stock IN
   - Stock OUT

2. **Order Logs**
   - Order lifecycle events
   - Status changes

3. **Order Placement Logs**
   - New order creation
   - Customer & organization reference

4. **Payment Logs**
   - Payment updates
   - Amount paid / pending changes

Each log type has:
- Its own DB table
- Independent retention & purge
- Independent CSV export

---

## 📑 APPENDIX O — DATABASE TABLE DESIGNS (LOGS) (v2.0)

> These schemas are **append-only**. No UPDATE or DELETE except via purge workflow.

### stock_logs
- id (PK)
- product_id (FK)
- action_type (IN | OUT)
- quantity
- performed_by (admin_id)
- created_at

### order_logs
- id (PK)
- order_id (FK)
- previous_status
- new_status
- changed_by (admin_id)
- created_at

### order_placement_logs
- id (PK)
- order_id (FK)
- customer_id (FK)
- organization_name
- created_at

### payment_logs
- id (PK)
- order_id (FK)
- amount_paid
- amount_pending
- updated_by (admin_id)
- created_at

---

## 📑 APPENDIX P — LOG INDEXING & PARTITION STRATEGY (v2.0)

### Indexing (MANDATORY)

Each log table must have indexes on:
- created_at
- primary foreign key (order_id / product_id)

Example:
- stock_logs(product_id, created_at)
- order_logs(order_id, created_at)

---

### Partition Strategy (OPTIONAL, FUTURE-PROOF)

If supported by the database:
- Partition logs by **created_at (monthly)**
- Old partitions can be purged safely

Rules:
- Never partition core inventory tables
- Partition logs only

---

## 📑 APPENDIX Q — UI FLOW FOR LOG PURGE CONFIRMATION (v2.0)

### Step-by-Step Admin Flow

1. Admin opens **Log Management** section
2. Selects:
   - Log type
   - Date range (older than 7 days only)
3. System displays:
   - Record count
   - Estimated CSV size

---

### Confirmation Modal (MANDATORY)

Modal must show:
- ⚠️ Warning message
- Log type
- Date range
- Record count

Admin actions:
- 📄 Export CSV & Delete
- 🗑️ Delete Without Export
- ❌ Cancel

---

### Post-Action Behavior

- If export selected → generate CSV → allow download
- After export → perform deletion
- On success → show summary
- On failure → no deletion

All purge actions are logged in audit logs.

---



---

# 📑 APPENDIX R — API ENDPOINTS FOR LOG QUERIES & PURGE (v2.0)

> These endpoints are **v2.0 only** and must respect retention, permission, and confirmation rules.

---

## 🔍 Log Query APIs (Read-Only)

### GET /logs/stock
Query stock IN / OUT logs.

Query params:
- start_date
- end_date
- product_id (optional)

---

### GET /logs/orders
Query order lifecycle logs.

Query params:
- start_date
- end_date
- order_id (optional)

---

### GET /logs/order-placements
Query order placement logs.

Query params:
- start_date
- end_date
- customer_id (optional)

---

### GET /logs/payments
Query payment logs.

Query params:
- start_date
- end_date
- order_id (optional)

---

## 🧹 Log Purge APIs (Restricted)

### POST /logs/purge/preview

Returns:
- log_type
- date_range
- record_count
- estimated_csv_size

No data mutation allowed.

---

### POST /logs/purge/execute

Request body:
- log_type
- start_date
- end_date
- export_csv (true | false)

Rules:
- Requires explicit confirmation flag
- Runs in background task
- Transaction-safe deletion

---

# 📑 APPENDIX S — PERMISSION RULES PER LOG TYPE (v2.0)

| Log Type              | View | Export CSV | Delete |
|-----------------------|------|------------|--------|
| Stock Logs            | Admin | Admin | Owner/Admin |
| Order Logs            | Admin | Admin | Owner/Admin |
| Order Placement Logs  | Admin | Admin | Owner/Admin |
| Payment Logs          | Admin | Admin | Owner/Admin |

Notes:
- Customers have **NO access** to logs
- Owner role is the highest privilege

---

# 📑 APPENDIX T — SAMPLE CSV COLUMN DEFINITIONS (v2.0)

### stock_logs.csv
- log_id
- product_id
- action_type
- quantity
- performed_by
- created_at

---

### order_logs.csv
- log_id
- order_id
- previous_status
- new_status
- changed_by
- created_at

---

### order_placement_logs.csv
- log_id
- order_id
- customer_id
- organization_name
- created_at

---

### payment_logs.csv
- log_id
- order_id
- amount_paid
- amount_pending
- updated_by
- created_at

---