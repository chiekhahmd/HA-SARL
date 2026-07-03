# Design Document — Society ERP (Multi-Tenant SaaS)

## 1. Architecture Overview

Society ERP is designed as a multi-tenant SaaS platform from day one. It serves multiple business owners through a single shared infrastructure, with per-tenant data isolation at the database level and per-tenant customization via configuration.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AWS — eu-west-3 (Paris)                             │
│                                                                             │
│  ┌────────────────┐                                                         │
│  │  CloudFront    │◄── tenant1.com, tenant2.com (custom domains)            │
│  │  Distribution  │◄── S3 bucket (React SPA static assets)                  │
│  └───────┬────────┘                                                         │
│          │                                                                  │
│          │ /api/*                                                            │
│          ▼                                                                  │
│  ┌────────────────┐       ┌────────────────────────────────────────────┐    │
│  │  API Gateway   │──────►│  Lambda: API (single function)             │    │
│  │  (HTTP API)    │       │  ┌──────────────────────────────────────┐  │    │
│  └────────────────┘       │  │  Hono Router (internal routing)      │  │    │
│                           │  │  - Tenant resolution middleware      │  │    │
│  ┌────────────────┐       │  │  - Auth middleware (Cognito JWT)     │  │    │
│  │   Cognito      │       │  │  - All resource routes               │  │    │
│  │   User Pool    │       │  └──────────────────────────────────────┘  │    │
│  │  (shared,      │       └────────────────┬───────────────────────────┘    │
│  │   custom:      │                        │                                │
│  │   User Pool    │                        │ Connects to tenant's DB        │
│  │  (shared,      │                        ▼                                │
│  │   custom:      │       ┌────────────────────────────────────────────┐    │
│  │   tenant_id)   │       │  RDS PostgreSQL (single instance)          │    │
│  └────────────────┘       │  ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│                           │  │ hasarl_db│ │tenant2_db│ │tenant3_db│   │    │
│                           │  └──────────┘ └──────────┘ └──────────┘   │    │
│  ┌────────────────┐       └────────────────────────────────────────────┘    │
│  │  EventBridge   │                                                         │
│  │  Scheduler     │──────►  Lambda: insurance-renewal-checker               │
│  │  (daily cron)  │         (iterates all tenant DBs)                       │
│  └────────────────┘                        │                                │
│                                            ▼                                │
│                           ┌────────────────────────────────────────────┐    │
│                           │  Amazon SES (email alerts)                  │    │
│                           └────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  Tenant Registry (DynamoDB or table in a shared "platform" DB)     │     │
│  │  - tenant_id, db_name, domain, config (modules, branding, etc.)    │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         GitHub Actions CI/CD                                 │
│  - OIDC federation (no stored AWS keys)                                     │
│  - Build → Test → Deploy (CDK)                                              │
│  - Single deploy updates all tenants (shared code)                          │
│  - DB migrations run per tenant database                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Multi-Tenancy Model

### 2.1 Isolation Strategy

| Layer | Approach | Isolation level |
|-------|----------|-----------------|
| Database | One database per tenant within shared RDS instance | Strong — no cross-tenant queries possible |
| Compute | Shared single Lambda (Hono router) | Shared — tenant resolved per request |
| Auth | Shared Cognito User Pool | Logical — `custom:tenant_id` attribute |
| Frontend | Shared React app, config-driven | Logical — branding/modules per tenant |
| Domain | Custom domain per tenant via CloudFront | Visual — each tenant sees their own URL |

### 2.2 Tenant Resolution Flow

```
Request arrives
    │
    ├─► Extract JWT from Authorization header
    ├─► Verify JWT against Cognito
    ├─► Extract custom:tenant_id from claims
    ├─► Lookup tenant config (from registry/cache)
    ├─► Connect to tenant's database (connection pool per DB)
    │
    ▼
Handler executes against tenant's isolated database
```

### 2.3 Tenant Registry

A lightweight registry stores tenant metadata. Options:
- **DynamoDB table** (zero-cost at low scale, fast lookup)
- **Shared "platform" database** on the same RDS instance

Schema:
```json
{
  "tenant_id": "hasarl",
  "db_name": "hasarl_db",
  "display_name": "HA SARL",
  "custom_domain": "app.hasarl.com",
  "config": {
    "modules": ["projects", "workers", "time-tracking", "absences", "materials", "vehicles", "insurance", "reports"],
    "branding": {
      "logo_url": "https://assets.../hasarl-logo.png",
      "primary_color": "#1a73e8",
      "app_name": "HA SARL - Gestion"
    },
    "locale": "fr-FR",
    "currency": "EUR",
    "alert_lead_time_days": 30
  },
  "created_at": "2026-06-30T00:00:00Z",
  "is_active": true
}
```

### 2.4 Customization Layers

| Type | How it works | When to build |
|------|-------------|---------------|
| Branding (logo, colors, app name) | Tenant config → loaded at frontend startup | Phase 1 (now) |
| Module toggles | Tenant config → frontend shows/hides pages, API enforces | Phase 1 (now) |
| Locale & currency | Tenant config → formatting, labels | Phase 1 (now) |
| Custom fields on entities | JSONB `metadata` column on each table | Schema ready now, UI in phase 2 |
| Custom workflows / rules | Rule engine with per-tenant config | Phase 3 (when demanded) |

## 3. Technology Decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Region | eu-west-3 (Paris) | Low latency for France-based users |
| Backend runtime | Node.js 20 + TypeScript | Team familiarity, strong Lambda support |
| API framework | Hono | Ultrafast, type-safe, native Lambda adapter, 14KB |
| API layer | API Gateway HTTP API + single Lambda | Pay-per-request, one function stays warm, no idle cost |
| IaC | AWS CDK (TypeScript) | Same language as app, handles all AWS resources, composable |
| Database | RDS PostgreSQL 16, db.t3.micro | Free-tier eligible, one instance, multiple DBs |
| Database (scale) | Aurora Serverless v2 (0.5-2 ACU) | Upgrade path when tenant count grows |
| Auth | Amazon Cognito User Pool (shared) | Managed JWT, tenant_id in custom claims |
| Tenant registry | DynamoDB | Zero cost at rest, fast reads, simple KV |
| Frontend | React + Vite, SPA | Fast DX, small bundle, config-driven |
| Hosting | S3 + CloudFront | Global CDN, custom domains, HTTPS |
| Email | Amazon SES | Pay per email, no monthly fee |
| Scheduler | EventBridge Scheduler | Serverless cron, no idle cost |
| CI/CD | GitHub Actions + OIDC | Free tier, no stored keys |
| ORM | Drizzle ORM | Type-safe, lightweight, good Postgres support |
| Validation | Zod + @hono/zod-validator | Runtime + static type inference, Hono integration |
| Testing | Vitest | Fast, native ESM, TypeScript support |
| Connection pooling | RDS Proxy or in-Lambda pool | Manage connections across tenant DBs |

## 4. Project Structure (Monorepo)

```
HA-SARL/
├── .github/
│   └── workflows/
│       ├── deploy-dev.yml
│       └── deploy-prod.yml
├── packages/
│   ├── api/                        # Single Lambda (Hono router)
│   │   ├── src/
│   │   │   ├── index.ts            # Hono app entry + Lambda handler export
│   │   │   ├── routes/             # Route modules (mounted on main app)
│   │   │   │   ├── projects.ts
│   │   │   │   ├── workers.ts
│   │   │   │   ├── time-entries.ts
│   │   │   │   ├── absences.ts
│   │   │   │   ├── materials.ts
│   │   │   │   ├── material-allocations.ts
│   │   │   │   ├── vehicles.ts
│   │   │   │   ├── insurance-periods.ts
│   │   │   │   ├── reports.ts
│   │   │   │   ├── users.ts
│   │   │   │   └── tenant-config.ts
│   │   │   ├── middleware/
│   │   │   │   ├── tenant-resolver.ts   # Extract tenant, get DB connection
│   │   │   │   ├── auth.ts              # JWT verification + role extraction
│   │   │   │   ├── module-guard.ts      # Reject requests to disabled modules
│   │   │   │   └── error-handler.ts     # Centralized error responses
│   │   │   ├── db/
│   │   │   │   ├── schema.ts            # Drizzle schema definitions
│   │   │   │   ├── migrations/          # SQL migration files
│   │   │   │   ├── client.ts            # Tenant-aware DB connection manager
│   │   │   │   └── seed.ts             # Seed data for new tenants
│   │   │   ├── services/                # Business logic layer
│   │   │   ├── tenant/
│   │   │   │   ├── registry.ts          # Read tenant config from DynamoDB
│   │   │   │   └── provisioner.ts       # Create new tenant (DB + config)
│   │   │   └── types/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── scheduled/                  # Separate Lambda for cron jobs
│   │   ├── src/
│   │   │   └── insurance-renewal.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                        # React frontend
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── services/           # API client
│       │   ├── auth/               # Cognito integration
│       │   └── tenant/
│       │       ├── TenantProvider.tsx   # Context: branding, modules, locale
│       │       └── config.ts            # Load tenant config at startup
│       ├── package.json
│       └── vite.config.ts
├── infra/                          # AWS CDK (TypeScript)
│   ├── bin/
│   │   └── app.ts                  # CDK app entry point
│   ├── lib/
│   │   ├── stacks/
│   │   │   ├── network-stack.ts    # VPC, subnets, security groups
│   │   │   ├── database-stack.ts   # RDS PostgreSQL instance
│   │   │   ├── auth-stack.ts       # Cognito User Pool + custom attributes
│   │   │   ├── api-stack.ts        # Lambda (Hono) + API Gateway
│   │   │   ├── frontend-stack.ts   # S3 + CloudFront
│   │   │   ├── scheduler-stack.ts  # EventBridge + insurance renewal Lambda
│   │   │   └── tenant-registry-stack.ts  # DynamoDB tenant table
│   │   └── constructs/
│   │       └── tenant-database.ts  # Reusable construct: create tenant DB
│   ├── cdk.json
│   ├── package.json
│   └── tsconfig.json
├── tenant-configs/                 # Per-tenant configuration (for reference/docs)
│   └── hasarl.json
├── package.json                   # Workspace root (npm workspaces)
├── tsconfig.base.json
└── .gitignore
```

### 4.1 Hono App Structure

```typescript
// packages/api/src/index.ts
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { tenantResolver } from './middleware/tenant-resolver';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { projectRoutes } from './routes/projects';
import { workerRoutes } from './routes/workers';
import { timeEntryRoutes } from './routes/time-entries';
import { absenceRoutes } from './routes/absences';
import { materialRoutes } from './routes/materials';
import { materialAllocationRoutes } from './routes/material-allocations';
import { vehicleRoutes } from './routes/vehicles';
import { insurancePeriodRoutes } from './routes/insurance-periods';
import { reportRoutes } from './routes/reports';
import { userRoutes } from './routes/users';
import { tenantConfigRoutes } from './routes/tenant-config';

const app = new Hono();

// Global middleware (runs on every request)
app.use('*', errorHandler());
app.use('*', authMiddleware());
app.use('*', tenantResolver());

// Mount route modules
app.route('/tenant', tenantConfigRoutes);
app.route('/users', userRoutes);
app.route('/projects', projectRoutes);
app.route('/workers', workerRoutes);
app.route('/time-entries', timeEntryRoutes);
app.route('/absences', absenceRoutes);
app.route('/materials', materialRoutes);
app.route('/material-allocations', materialAllocationRoutes);
app.route('/vehicles', vehicleRoutes);
app.route('/insurance-periods', insurancePeriodRoutes);
app.route('/reports', reportRoutes);

// Export Lambda handler
export const handler = handle(app);
```

```typescript
// packages/api/src/routes/projects.ts (example route module)
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authorize } from '../middleware/auth';
import { moduleGuard } from '../middleware/module-guard';
import { createProjectSchema, updateProjectSchema } from '../types/schemas';

export const projectRoutes = new Hono();

projectRoutes.use('*', moduleGuard('projects'));

projectRoutes.get('/', authorize('manager', 'admin'), async (c) => {
  const db = c.get('tenantDb');
  const projects = await db.select().from(projectsTable);
  return c.json(projects);
});

projectRoutes.post('/',
  authorize('manager', 'admin'),
  zValidator('json', createProjectSchema),
  async (c) => {
    const body = c.req.valid('json');
    const db = c.get('tenantDb');
    const project = await db.insert(projectsTable).values(body).returning();
    return c.json(project[0], 201);
  }
);

projectRoutes.get('/:id', authorize('manager', 'admin'), async (c) => {
  const { id } = c.req.param();
  const db = c.get('tenantDb');
  // ... fetch project with spend calculation
  return c.json(project);
});

projectRoutes.patch('/:id',
  authorize('manager', 'admin'),
  zValidator('json', updateProjectSchema),
  async (c) => {
    // ... update project
  }
);

projectRoutes.delete('/:id', authorize('manager', 'admin'), async (c) => {
  // ... delete if no cost records
});
```

### 4.2 Why Single Lambda + Hono

| Benefit | Explanation |
|---------|-------------|
| Fewer cold starts | One function receives ALL traffic → stays warm more reliably with 2-3 users |
| Shared DB connection | Connection pool lives in the Lambda instance, reused across all routes |
| Simpler deployment | One function to build, bundle, and deploy |
| Local development | `hono/dev-server` or just `tsx watch` — runs as normal Node.js server locally |
| Type-safe routing | Hono provides end-to-end type inference (params, body, response) |
| Middleware chain | Express-like but faster: auth → tenant → module guard → handler |
| Future splitting | If a route needs special config (memory, timeout), extract it to its own Lambda |

### 4.3 Lambda Configuration

| Lambda | Trigger | Memory | Timeout | Purpose |
|--------|---------|--------|---------|---------|
| api | API Gateway HTTP API (catch-all `/{proxy+}`) | 512 MB | 30s | All API routes |
| insurance-renewal | EventBridge (daily 08:00 CET) | 256 MB | 60s | Check & send alerts |

## 5. Database Schema (Per-Tenant Database)

Each tenant database has an identical schema. No `tenant_id` column needed — isolation is at the database level.

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (synced from Cognito, local reference for FK)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cognito_sub VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'worker')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}',              -- future custom fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    budget NUMERIC(12, 2) NOT NULL CHECK (budget >= 0),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workers
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    cost_rate NUMERIC(10, 2) NOT NULL CHECK (cost_rate >= 0),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cost rate history (date-effective labor cost)
CREATE TABLE cost_rate_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    cost_rate NUMERIC(10, 2) NOT NULL CHECK (cost_rate >= 0),
    effective_from DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (worker_id, effective_from)
);

-- Time entries
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES workers(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    entry_date DATE NOT NULL,
    hours NUMERIC(4, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
    labor_cost NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Absences
CREATE TABLE absences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES workers(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    absence_type VARCHAR(50) NOT NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

CREATE INDEX idx_absences_worker_dates ON absences (worker_id, start_date, end_date);

-- Materials
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50),
    purchase_cost NUMERIC(12, 2) NOT NULL CHECK (purchase_cost >= 0),
    purchase_date DATE,
    supplier VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Material allocations
CREATE TABLE material_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES materials(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    allocated_quantity NUMERIC(10, 2) NOT NULL CHECK (allocated_quantity > 0),
    allocated_cost NUMERIC(12, 2) NOT NULL CHECK (allocated_cost >= 0),
    metadata JSONB DEFAULT '{}',
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vehicles
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insurance periods
CREATE TABLE insurance_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    insurer VARCHAR(255),
    policy_number VARCHAR(100),
    alert_sent BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

CREATE INDEX idx_insurance_vehicle_end ON insurance_periods (vehicle_id, end_date DESC);
```

**Note**: Every entity table has a `metadata JSONB` column. This is the hook for future custom fields — tenants can store additional key-value data without schema changes.

## 6. API Surface

Base URL: `https://{tenant-domain}/api/` (routed via CloudFront)

All endpoints return JSON. Auth via `Authorization: Bearer <cognito-jwt>`.
Tenant resolved automatically from JWT `custom:tenant_id` claim.

### 6.1 Tenant Config (loaded by frontend at startup)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /tenant/config | Any authenticated | Returns branding, modules, locale for current tenant |

### 6.2 User Management

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /users | Admin | List all users |
| POST | /users | Admin | Create user |
| PATCH | /users/:id | Admin | Update user role/status |
| DELETE | /users/:id | Admin | Deactivate user |

### 6.3 Projects

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /projects | Manager, Admin | List all projects |
| GET | /projects/:id | Manager, Admin | Get project with budget/spend |
| POST | /projects | Manager, Admin | Create project |
| PATCH | /projects/:id | Manager, Admin | Update project |
| DELETE | /projects/:id | Manager, Admin | Delete (only if no cost records) |

### 6.4 Workers

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /workers | Manager, Admin | List all workers |
| GET | /workers/:id | Manager, Admin | Get worker details |
| POST | /workers | Manager, Admin | Create worker |
| PATCH | /workers/:id | Manager, Admin | Update worker |

### 6.5 Time Entries

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /time-entries | Worker (own), Manager/Admin (all) | List time entries |
| GET | /time-entries?projectId=:id | Manager, Admin | By project |
| POST | /time-entries | Worker, Manager, Admin | Create time entry |
| PATCH | /time-entries/:id | Worker (own), Manager, Admin | Update |
| DELETE | /time-entries/:id | Manager, Admin | Delete |

### 6.6 Absences

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /absences | Worker (own), Manager/Admin (all) | List absences |
| GET | /absences?workerId=:id | Manager, Admin | By worker |
| POST | /absences | Worker, Manager, Admin | Create absence |
| DELETE | /absences/:id | Manager, Admin | Delete |

### 6.7 Materials

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /materials | Manager, Admin | List all |
| POST | /materials | Manager, Admin | Create |
| PATCH | /materials/:id | Manager, Admin | Update |

### 6.8 Material Allocations

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /material-allocations?projectId=:id | Manager, Admin | By project |
| POST | /material-allocations | Manager, Admin | Allocate |
| DELETE | /material-allocations/:id | Manager, Admin | Remove |

### 6.9 Vehicles

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /vehicles | Manager, Admin | List all |
| GET | /vehicles/:id | Manager, Admin | Get with insurance periods |
| POST | /vehicles | Manager, Admin | Create |
| PATCH | /vehicles/:id | Manager, Admin | Update |

### 6.10 Insurance Periods

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /vehicles/:vehicleId/insurance-periods | Manager, Admin | List |
| POST | /vehicles/:vehicleId/insurance-periods | Manager, Admin | Add |
| PATCH | /insurance-periods/:id | Manager, Admin | Update |

### 6.11 Reports

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /reports/projects | Manager, Admin | All projects spend summary |
| GET | /reports/projects/:id | Manager, Admin | Single project detail |

## 7. Authentication & Authorization Flow

```
┌──────────┐      ┌──────────────┐      ┌─────────────────────────────┐
│  Client  │─────►│   Cognito    │─────►│  JWT Token                  │
│ (Web/App)│◄─────│  User Pool   │      │  claims: sub, email,        │
└──────┬───┘      └──────────────┘      │  custom:role,               │
       │                                │  custom:tenant_id           │
       │  Authorization: Bearer <token> └─────────────────────────────┘
       ▼
┌──────────────┐
│  API Gateway │──► Lambda
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  Middleware pipeline:                                 │
│  1. Verify JWT signature (Cognito JWKS)              │
│  2. Extract tenant_id → lookup tenant registry       │
│  3. Get DB connection for tenant's database          │
│  4. Extract role → enforce authorization             │
│  5. Check module access (is this module enabled?)    │
│  6. Pass context { userId, tenantId, role, db } →    │
└──────────────────────────────────────────────────────┘
       │
       ▼
    Handler (executes against tenant's isolated DB)
```

**Cognito attributes per user:**
- `custom:tenant_id` — which company/tenant this user belongs to
- `custom:role` — admin | manager | worker

## 8. Tenant-Aware Connection Management

```typescript
// Simplified concept
class TenantDbManager {
  private pools: Map<string, Pool> = new Map();

  async getConnection(tenantId: string): Promise<DrizzleInstance> {
    const tenant = await tenantRegistry.get(tenantId);
    
    if (!this.pools.has(tenantId)) {
      this.pools.set(tenantId, createPool({
        host: RDS_HOST,          // shared
        database: tenant.db_name, // per-tenant
        user: tenant.db_user,
        password: await getSecret(tenant.secret_arn),
      }));
    }
    
    return drizzle(this.pools.get(tenantId));
  }
}
```

**Connection limits**: RDS db.t3.micro supports ~60 connections. With 5 tenants and Lambda concurrency of ~10, this is fine. Beyond that, use RDS Proxy ($0.015/vCPU-hour).

## 9. Insurance Renewal Alert Flow (Multi-Tenant)

```
EventBridge Scheduler (daily at 08:00 Paris time)
       │
       ▼
Lambda: insurance-renewal-checker
       │
       ├─► Fetch all active tenants from registry
       │
       ├─► For each tenant:
       │     ├─► Connect to tenant's database
       │     ├─► Query: insurance_periods WHERE end_date <= NOW() + lead_time
       │     │         AND alert_sent = false
       │     ├─► For each expiring period:
       │     │     ├─► Send email via SES to tenant's managers
       │     │     └─► UPDATE alert_sent = true
       │     └─► On failure: log, leave alert_sent = false (retry tomorrow)
       │
       └─► Complete
```

## 10. Frontend Multi-Tenancy

### 10.1 Tenant Config Loading

On app startup:
1. User authenticates via Cognito
2. Frontend calls `GET /tenant/config`
3. Response contains: branding, enabled modules, locale, currency
4. `TenantProvider` context makes config available to all components

### 10.2 Module-Based Routing

```typescript
// Only render routes for enabled modules
const routes = useMemo(() => {
  const enabled = tenantConfig.modules;
  return [
    enabled.includes('projects') && <Route path="/projects" ... />,
    enabled.includes('vehicles') && <Route path="/vehicles" ... />,
    enabled.includes('materials') && <Route path="/materials" ... />,
    // ...
  ].filter(Boolean);
}, [tenantConfig]);
```

### 10.3 Custom Domain Handling

- Each tenant has a CNAME pointing to the CloudFront distribution
- CloudFront serves the same React app for all domains
- The app detects the tenant from the authenticated user's claims (not from the URL)
- SSL: ACM certificate with SANs for each tenant domain (or wildcard if using subdomains)

## 11. Environments

| Environment | Database | Purpose |
|-------------|----------|---------|
| dev | RDS db.t3.micro, one test tenant DB | Development and testing |
| prod | RDS db.t3.micro → Aurora Serverless v2 (when scaling) | Live tenants |

For dev: single tenant (`hasarl_dev`). For prod: one DB per real customer.

## 12. CI/CD Pipeline (GitHub Actions + OIDC)

```yaml
# .github/workflows/deploy-dev.yml
# Trigger: push to main → deploy to dev

Jobs:
  1. build-and-test:
     - Checkout
     - Install dependencies (npm ci)
     - Lint (ESLint)
     - Type-check (tsc --noEmit)
     - Unit tests (vitest --run)
     - Build Lambda bundle (esbuild)

  2. deploy-infra:
     - Assume AWS role via OIDC (no stored keys)
     - npx cdk diff (preview changes)
     - npx cdk deploy --all --require-approval never
       (deploys: network, database, auth, api, frontend, scheduler, tenant-registry)

  3. post-deploy:
     - Run DB migrations against all tenant databases
     - Invalidate CloudFront cache
     - Smoke test (curl health endpoint)
```

```yaml
# .github/workflows/deploy-prod.yml
# Trigger: tag v*.*.* → deploy to prod (with manual approval)

Jobs:
  1. build-and-test: (same as dev)
  2. deploy-infra:
     - Assume AWS prod role via OIDC
     - npx cdk deploy --all --require-approval broadening
     - Requires GitHub environment protection rule (manual approval)
  3. post-deploy: (same as dev, targeting prod databases)
```

**OIDC setup** (one-time):
- IAM OIDC provider for `token.actions.githubusercontent.com`
- IAM role `github-actions-society-erp-dev` (trust: repo `chiekhahmd/HA-SARL`, branch `main`)
- IAM role `github-actions-society-erp-prod` (trust: repo `chiekhahmd/HA-SARL`, tags `v*`)
- Permissions: CloudFormation, Lambda, API GW, S3, CloudFront, RDS, VPC, EC2 (for VPC resources), Cognito, DynamoDB, SES, Secrets Manager, IAM (for CDK role creation)

**CDK Bootstrap** (one-time per account/region):
```bash
npx cdk bootstrap aws://{ACCOUNT_ID}/eu-west-3 --profile society-personal
```

### 12.1 Why CDK for CI/CD

CDK handles the entire deployment as a single `cdk deploy --all` command. It:
- Resolves dependencies between stacks automatically (DB created before Lambda that needs it)
- Manages CloudFormation changesets (only updates what changed)
- Creates IAM roles/policies as needed
- Outputs values (API URL, CloudFront domain) for post-deploy steps
- If you later add ECS, SQS, ElastiCache, or any AWS service → same pipeline, same tool

## 13. Security Considerations

- No AWS keys in GitHub — OIDC only
- DB credentials in Secrets Manager, one secret per tenant DB user
- Cognito handles passwords, optional MFA, token lifecycle
- API Gateway throttling: 1000 req/s burst, 500 steady
- RDS: private subnet in VPC (prod); public with security group (dev)
- Input validation on every endpoint (Zod schemas)
- CORS: allowed origins = tenant domains only
- Tenant isolation: impossible to query wrong DB (connection resolved from JWT claim)

## 14. Cost Estimate (Dev Phase)

| Service | Cost |
|---------|------|
| Lambda | $0 (free tier) |
| API Gateway | $0 (free tier) |
| RDS db.t3.micro | $0 (free tier, 12 months) |
| DynamoDB (tenant registry) | $0 (free tier) |
| S3 + CloudFront | $0 (free tier) |
| Cognito | $0 (free tier: 50K MAU) |
| SES | $0 (free from Lambda) |
| EventBridge | $0 (free tier) |
| **Total (year 1)** | **~$0/month** |

After free tier / production with multiple tenants:
- RDS or Aurora: $13-43/month
- NAT Gateway (if VPC): ~$32/month
- Realistic prod: ~$50-80/month for 5 tenants

## 15. Tenant Provisioning (Manual Phase 1)

To onboard a new tenant:

1. Create database: `CREATE DATABASE {tenant_slug}_db;`
2. Run migrations against new DB
3. Seed system config defaults
4. Add entry to DynamoDB tenant registry
5. Create Cognito users with `custom:tenant_id` attribute
6. Configure custom domain in CloudFront + ACM certificate
7. Provide tenant admin credentials

This will be scripted in phase 2.

## 16. Design Decisions & Trade-offs

1. **Single Lambda + Hono router vs multiple Lambdas**: Chose single Lambda because with 2-3 users, keeping one function warm is far more effective than spreading traffic across 10 cold functions. Hono adds only 14KB to the bundle and provides Express-like DX with full type safety. The insurance renewal cron stays as a separate Lambda (different trigger, different timeout). If specific routes later need different memory/timeout, they can be extracted.

2. **Database-per-tenant vs tenant_id column**: Chose DB-per-tenant for strongest isolation and maximum per-tenant flexibility (including future schema customization per tenant). Trade-off: more complex connection management and migrations.

3. **Shared Cognito vs pool-per-tenant**: Shared pool is simpler and cheaper. `custom:tenant_id` attribute provides logical separation. Trade-off: a misconfigured user could theoretically be assigned to the wrong tenant (mitigated by admin-only user creation).

4. **JSONB metadata columns**: Every entity table has a `metadata JSONB` column for future custom fields. Zero cost if unused, unlocks per-tenant field extensions without schema migration.

5. **Module toggles**: Frontend hides disabled modules AND API middleware rejects requests to disabled modules. Defense in depth.

6. **Single CloudFront + custom domains**: One distribution serves all tenants. Simpler than one distribution per tenant. Trade-off: domain setup is manual (ACM cert per domain).

7. **Connection pooling**: Lambda manages a pool per tenant in memory. At low scale (5 tenants, 10 concurrent Lambdas) this is fine. At higher scale, RDS Proxy becomes necessary.

8. **Cost rate history**: Separate table supports Req 5.5 (rate effective on entry date). When rate changes, old entries retain their original cost.

9. **Hono over Express/Fastify**: Hono is purpose-built for serverless (Lambda adapter is first-class), has a smaller bundle, faster routing, and native TypeScript types. AWS featured it at re:Invent 2025 as the recommended framework for Lambda APIs.
