# ANTIGRAVITY — FINAL LLM INSTRUCTION SPEC (AUTO-BUILD EDITION)

**Google Antigravity • Multi-LLM Execution Plan**  
**Bun + Next.js + FastAPI + Supabase PostgreSQL • QR Inventory System**

> This document is the **authoritative system blueprint**.  
> It defines architecture, technology choices, database hosting, schema,
> migrations, workflows, guardrails, and build‑execution rules.  
> The LLM must implement the system **exactly as specified**.

------------------------------------------------------------------------

## 🔹 System Definition

Internal‑only Inventory Management System with **QR‑based Stock‑In / Stock‑Out**
and **immutable log‑driven inventory tracking**.

- Backend → FastAPI (Python)
- Database → **Supabase‑hosted PostgreSQL**
- ORM & Migrations → SQLAlchemy + Alembic
- Frontend → Next.js (App Router) + Tailwind + shadcn/ui
- Access Layer → **Password‑Gate (no accounts, no auth DB)**
- Deployment → Internal business tool

The system must be **transaction‑safe, auditable, and deterministic**.

------------------------------------------------------------------------

## 🎨 UI / Design Instruction (Mandatory)

Before designing UI components, the LLM must **load, read, and interpret
the design language of**:

Captain Insecticide — Coming Soon page (index.html)

Use it as **style inspiration only (do not copy)**.

Preserve:
- minimal layout & spacing
- clean typography
- subtle accents
- calm professional tone

Apply this design direction across dashboard, tables, dialogs, and forms.

------------------------------------------------------------------------

## 🤖 LLM Assignment Policy

### 🟣 Gemini Pro — Planner / Validator

Use Gemini Pro for:
- architecture & workflow reasoning
- database design validation
- migration & constraint logic review
- transaction‑safety & rollback verification
- UI style interpretation from reference
- reviewing Claude outputs for correctness

### 🟡 Claude Sonnet 4.5 — Builder / Coder

Use Claude for:
- backend code implementation
- SQLAlchemy models
- Alembic migration scripts
- service & transaction functions
- API routes & validation
- frontend UI + shadcn components
- QR scanner integration
- analytics & CSV export modules

### 🔁 Execution Loop (Required)

1. Gemini plans step  
2. Claude builds implementation  
3. Gemini validates behavior & rules  
4. Claude revises if required  

No step may proceed without validation approval.

------------------------------------------------------------------------

## 🟢 Tech Stack — Hard Constraints

### Frontend
- Next.js (App Router)
- Tailwind CSS
- shadcn/ui
- Recharts / Chart.js
- Browser QR Scanner
- **Bun — package manager & runtime only**
- ❌ npm / yarn / pnpm

### Backend
- FastAPI
- SQLAlchemy ORM
- Alembic migrations
- pydantic validation
- Atomic transaction handling

### Database & Hosting
- **PostgreSQL hosted on Supabase (cloud)**
- Direct connection via Supabase connection URI
- No local database deployment

------------------------------------------------------------------------

## 🗄 Database Platform Policy (Mandatory)

- Database must be created on Supabase
- Database must start empty
- Tables created via Alembic migrations only
- No manual UI table edits
- Supabase auth / storage / functions not used

------------------------------------------------------------------------

## 🗄 Final Database Schema (Authoritative)

### products — master registry
- id (pk)
- name (required)
- category (optional)
- qr_code_value (**unique**, required)
- created_at (default now)

------------------------------------------------------------------------

### inventory — current stock state
- id (pk)
- product_id (**unique**, fk)
- quantity (>= 0 only)
- last_updated (auto update)

Inventory table must **never** be modified directly.

------------------------------------------------------------------------

### stock_logs — immutable source‑of‑truth
- id (pk)
- product_id (fk)
- action (enum: in / out)
- quantity (> 0)
- previous_quantity
- new_quantity
- timestamp (default now)
- remarks (optional)

------------------------------------------------------------------------

## ⚙️ Stock Transaction Rules (Mandatory)

- Inventory changes occur **only through stock_logs**
- Logs are immutable and auditable
- Reject invalid quantities (≤ 0)
- Reject negative stock results
- Stock‑out cannot exceed available quantity
- QR values must be unique
- Log insert + inventory update must execute in **one atomic transaction**
- Any failure → rollback entire transaction

------------------------------------------------------------------------

## 🧮 Transaction Workflow (Required)

1. Resolve product via qr_code_value
2. Read current inventory quantity
3. Validate rule constraints
4. Insert stock log entry
5. Update inventory quantity
6. Commit transaction
7. On failure → rollback

------------------------------------------------------------------------

## 🟣 Backend Implementation Requirements

- SQLAlchemy models: Product, Inventory, StockLog
- Enum: StockAction(in, out)
- Relationships configured
- Alembic migration with constraints
- psycopg2 engine via DATABASE_URL

------------------------------------------------------------------------

## 🌍 Environment Variables (.env)

### Backend
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DB  
APP_ENV=production  
LOG_LEVEL=info  

### Frontend
NEXT_PUBLIC_BACKEND_URL=https://<backend-domain>  
APP_PASSWORD=<internal_password>

------------------------------------------------------------------------

## 🔌 API Contract (Fixed)

- POST /stock/in
- POST /stock/out
- GET /inventory
- GET /logs
- GET /analytics/stock-trends

------------------------------------------------------------------------

## 🧩 Required Modules

- Dashboard
- Inventory
- QR Scan
- Stock Logs
- Analytics
- CSV Export

------------------------------------------------------------------------

## 🖥 Frontend Pages (Required)

- /unlock
- /
- /inventory
- /qr-scan
- /logs
- /analytics

Unauthorized → redirect to /unlock

------------------------------------------------------------------------

## 🔐 Password‑Gate Rules

- Password stored in .env
- Never hard‑coded
- sessionStorage unlock flag
- Reset on tab close
- No auth DB, users, or roles

------------------------------------------------------------------------

## 🛠 Build Execution Sequence

1. Architecture plan → Gemini
2. Supabase DB created (empty)
3. Backend models → Claude, validated by Gemini
4. Alembic migration → Claude, validated by Gemini
5. Apply migration
6. Stock services → Claude, validated by Gemini
7. API routes → Claude, validated by Gemini
8. Password‑Gate → Claude, validated by Gemini
9. QR scanner → Claude, validated by Gemini
10. Dashboard & Analytics → Claude, validated by Gemini
11. CSV export → Claude, validated by Gemini
12. UI styling → Claude, validated by Gemini
13. Final audit → Gemini Pro

------------------------------------------------------------------------

## ⚠️ Guardrail Rules

- Do not modify inventory directly
- Do not bypass transactions
- Do not compute stock in frontend
- Do not expose credentials
- Do not skip migrations
- Do not change DB platform

------------------------------------------------------------------------

## 🧪 Testing & Quality Assurance (MANDATORY)

This section defines the **explicit SDLC Testing Phase**.
Testing is **first‑class and non‑optional**.
LLM validation **does not replace** software testing.

### Testing Responsibility Matrix

| Layer | Responsibility |
|-----|---------------|
| Backend unit & service tests | Claude |
| Database & migrations | Gemini |
| API contract tests | Claude |
| Frontend UI tests | Claude |
| End‑to‑End workflows | Gemini |
| Final sign‑off | Gemini Pro |

### Backend Testing
- Syntax & runtime validation
- Pydantic enforcement
- Enum enforcement
- Atomicity & rollback tests
- Unit, integration, negative tests

### Business Logic Testing
- Inventory never negative
- Only log‑driven updates
- Correct quantity math
- Concurrency safety
- Log immutability

### Database Testing
- Clean migrations
- Constraint enforcement
- FK integrity
- Rollback correctness

### Frontend ↔ Backend Testing
- API correctness
- Error propagation
- Loading/failure states
- sessionStorage & route guards

### UI / Design Validation
- Design consistency
- Responsive layout
- Table scalability
- QR UX clarity

### End‑to‑End Scenarios
1. Product → QR → stock‑in
2. QR → stock‑out
3. Invalid QR rejected
4. Over‑stock‑out rejected
5. Refresh preserves access
6. Tab close resets access

### Deployment Smoke Tests
- Backend reachable
- Frontend connects
- Supabase reachable
- .env not exposed

### Release Acceptance Criteria
System is **NOT production‑ready** unless all tests pass.

------------------------------------------------------------------------