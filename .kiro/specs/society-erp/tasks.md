# Implementation Tasks — Society ERP

## Task 1: Monorepo & Project Scaffold

- [x] 1.1 Initialize npm workspace at root with `packages/api`, `packages/scheduled`, `packages/web`, and `infra`
- [x] 1.2 Create `tsconfig.base.json` with shared TypeScript config (strict mode, ES2022, paths)
- [x] 1.3 Set up `packages/api` — package.json with Hono, Drizzle, Zod, aws-lambda types
- [x] 1.4 Set up `packages/scheduled` — package.json with Drizzle, aws-sdk SES client
- [x] 1.5 Set up `packages/web` — Vite + React + TypeScript scaffold (empty app)
- [x] 1.6 Set up `infra` — CDK TypeScript project (`cdk init app --language typescript`)
- [x] 1.7 Configure ESLint + Prettier at root level (shared config)
- [x] 1.8 Configure Vitest at root level (workspace test config)
- [ ] 1.9 Update `.gitignore` for CDK, build artifacts, env files

## Task 2: CDK Infrastructure — Foundation Stacks

- [x] 2.1 Create `network-stack.ts` — VPC with 2 AZs, public + private subnets, security groups for RDS
- [x] 2.2 Create `database-stack.ts` — RDS PostgreSQL 16 db.t3.micro instance, Secrets Manager for master credentials
- [x] 2.3 Create `auth-stack.ts` — Cognito User Pool with custom attributes (`custom:tenant_id`, `custom:role`), app client
- [x] 2.4 Create `tenant-registry-stack.ts` — DynamoDB table (partition key: `tenant_id`)
- [x] 2.5 Create `api-stack.ts` — Lambda function (placeholder handler), API Gateway HTTP API with `/{proxy+}` route
- [x] 2.6 Create `scheduler-stack.ts` — EventBridge rule (daily 08:00 CET), insurance-renewal Lambda (placeholder)
- [x] 2.7 Create `frontend-stack.ts` — S3 bucket + CloudFront distribution + OAI
- [x] 2.8 Create `infra/bin/app.ts` — wire all stacks together with cross-stack references
- [x] 2.9 Verify `cdk synth` succeeds and produces valid CloudFormation

## Task 3: CI/CD Pipeline (GitHub Actions + OIDC)

- [x] 3.1 Create `.github/workflows/deploy-dev.yml` — build, test, lint, type-check, `cdk deploy` to dev
- [x] 3.2 Create `.github/workflows/deploy-prod.yml` — same + manual approval gate, tag-triggered
- [x] 3.3 Document OIDC setup steps (IAM provider, roles, trust policies) in `docs/aws-setup.md`
- [x] 3.4 Document CDK bootstrap command in `docs/aws-setup.md`

## Task 4: Database Schema & Migrations

- [x] 4.1 Create Drizzle schema file (`packages/api/src/db/schema.ts`) matching design section 5
- [x] 4.2 Configure Drizzle Kit for migration generation (`drizzle.config.ts`)
- [x] 4.3 Generate initial migration (all tables: users, projects, workers, cost_rate_history, time_entries, absences, materials, material_allocations, vehicles, insurance_periods)
- [x] 4.4 Create migration runner script that targets a specific database by name
- [x] 4.5 Create seed script (`packages/api/src/db/seed.ts`) for new tenant defaults
- [x] 4.6 Write unit tests for schema validation (Zod schemas match Drizzle schema types)

## Task 5: Tenant Resolution & Multi-Tenancy Core

- [x] 5.1 Create tenant registry client (`packages/api/src/tenant/registry.ts`) — read from DynamoDB, cache in memory
- [x] 5.2 Create tenant DB connection manager (`packages/api/src/db/client.ts`) — pool-per-tenant, connection reuse
- [x] 5.3 Create tenant resolver middleware (`packages/api/src/middleware/tenant-resolver.ts`) — extract tenant_id from JWT, lookup config, attach DB to context
- [x] 5.4 Create module guard middleware (`packages/api/src/middleware/module-guard.ts`) — reject if module disabled for tenant
- [x] 5.5 Write unit tests for tenant resolution (valid tenant, missing tenant, disabled tenant)
- [x] 5.6 Write unit tests for module guard (enabled module passes, disabled module returns 403)

## Task 6: Authentication & Authorization Middleware

- [x] 6.1 Create auth middleware (`packages/api/src/middleware/auth.ts`) — verify Cognito JWT, extract claims (sub, email, role, tenant_id)
- [x] 6.2 Create `authorize()` helper — role-based route guard (returns 403 if role not in allowed set)
- [x] 6.3 Create JWKS caching mechanism (fetch Cognito public keys, cache for token verification)
- [x] 6.4 Create error handler middleware (`packages/api/src/middleware/error-handler.ts`) — consistent error format (code + message)
- [x] 6.5 Write unit tests for auth middleware (valid token, expired token, missing token, wrong role)

## Task 7: Hono App Entry Point & Health Check

- [x] 7.1 Create `packages/api/src/index.ts` — Hono app with middleware chain, route mounting, Lambda handler export
- [x] 7.2 Add `/health` endpoint (public, returns 200 + version)
- [x] 7.3 Configure esbuild bundling for Lambda deployment (single file output)
- [x] 7.4 Verify local development works (`tsx watch` or `hono/dev-server`)
- [x] 7.5 Write integration test: health endpoint returns 200

## Task 8: User Management Routes

- [x] 8.1 Create `packages/api/src/routes/users.ts` — GET /users, POST /users, PATCH /users/:id, DELETE /users/:id
- [x] 8.2 Implement POST /users — create Cognito user + local DB record, assign tenant_id and role
- [x] 8.3 Implement GET /users — list all users for tenant (admin only)
- [x] 8.4 Implement PATCH /users/:id — update role or deactivate
- [x] 8.5 Implement DELETE /users/:id — disable Cognito user + set is_active=false in DB
- [x] 8.6 Create Zod schemas for user requests (createUserSchema, updateUserSchema)
- [ ] 8.7 Write unit tests for user management (CRUD, validation errors, conflict on duplicate email)

## Task 9: Project Management Routes

- [x] 9.1 Create `packages/api/src/routes/projects.ts` — all CRUD endpoints
- [x] 9.2 Implement POST /projects — create with name + budget, validate budget >= 0
- [x] 9.3 Implement GET /projects — list all with budget and actual_spend (computed)
- [x] 9.4 Implement GET /projects/:id — include budget, labor_cost, material_cost, actual_spend, remaining
- [x] 9.5 Implement PATCH /projects/:id — update name or budget
- [x] 9.6 Implement DELETE /projects/:id — only if no associated time_entries or material_allocations
- [x] 9.7 Create Zod schemas (createProjectSchema, updateProjectSchema)
- [x] 9.8 Create project service (`packages/api/src/services/project-service.ts`) — actual_spend computation logic
- [ ] 9.9 Write unit tests (CRUD, negative budget rejection, delete with records conflict)

## Task 10: Worker Management Routes

- [x] 10.1 Create `packages/api/src/routes/workers.ts` — all CRUD endpoints
- [ ] 10.2 Implement POST /workers — create with name + cost_rate, insert initial cost_rate_history entry
- [ ] 10.3 Implement GET /workers — list all with current cost_rate
- [ ] 10.4 Implement GET /workers/:id — worker detail with cost rate history
- [ ] 10.5 Implement PATCH /workers/:id — update name or cost_rate (insert new cost_rate_history record)
- [ ] 10.6 Create Zod schemas (createWorkerSchema, updateWorkerSchema)
- [ ] 10.7 Create cost rate lookup service — resolve effective rate for a given date
- [ ] 10.8 Write unit tests (CRUD, negative rate rejection, rate history insertion)

## Task 11: Time Entry Routes

- [x] 11.1 Create `packages/api/src/routes/time-entries.ts` — all endpoints
- [ ] 11.2 Implement POST /time-entries — create entry, compute labor_cost (hours × effective rate)
- [ ] 11.3 Implement GET /time-entries — worker sees own, manager sees all (filterable by projectId)
- [ ] 11.4 Implement PATCH /time-entries/:id — update hours/project, recompute labor_cost
- [ ] 11.5 Implement DELETE /time-entries/:id — manager/admin only
- [ ] 11.6 Create Zod schemas (createTimeEntrySchema, updateTimeEntrySchema)
- [ ] 11.7 Validate: hours between 0-24, project exists, worker exists
- [ ] 11.8 Write unit tests (CRUD, labor_cost computation, validation errors, role-based access)

## Task 12: Absence Management Routes

- [x] 12.1 Create `packages/api/src/routes/absences.ts` — all endpoints
- [ ] 12.2 Implement POST /absences — create with date validation + overlap check
- [ ] 12.3 Implement GET /absences — worker sees own, manager sees all (filterable by workerId)
- [ ] 12.4 Implement DELETE /absences/:id — manager/admin only
- [ ] 12.5 Create absence overlap detection service (query existing absences, check date range intersection)
- [ ] 12.6 Create Zod schemas (createAbsenceSchema)
- [ ] 12.7 Write unit tests (CRUD, end < start rejection, overlap conflict, role-based access)

## Task 13: Material Purchase Routes

- [x] 13.1 Create `packages/api/src/routes/materials.ts` — all endpoints
- [ ] 13.2 Implement POST /materials — create with name, quantity, purchase_cost, optional supplier/date
- [ ] 13.3 Implement GET /materials — list all with quantity and cost
- [ ] 13.4 Implement PATCH /materials/:id — update name, supplier, etc.
- [ ] 13.5 Create Zod schemas (createMaterialSchema, updateMaterialSchema)
- [ ] 13.6 Validate: quantity > 0, purchase_cost >= 0
- [ ] 13.7 Write unit tests (CRUD, validation errors)

## Task 14: Material Allocation Routes

- [x] 14.1 Create `packages/api/src/routes/material-allocations.ts` — all endpoints
- [ ] 14.2 Implement POST /material-allocations — allocate material to project, validate unallocated quantity
- [ ] 14.3 Implement GET /material-allocations?projectId=:id — list allocations for a project
- [ ] 14.4 Implement DELETE /material-allocations/:id — remove allocation
- [ ] 14.5 Create allocation service — compute unallocated quantity for a material
- [ ] 14.6 Create Zod schemas (createMaterialAllocationSchema)
- [ ] 14.7 Write unit tests (allocate, over-allocate rejection, delete, project spend update)

## Task 15: Vehicle Management Routes

- [x] 15.1 Create `packages/api/src/routes/vehicles.ts` — all endpoints
- [ ] 15.2 Implement POST /vehicles — create with identifier + description, reject duplicate identifier
- [ ] 15.3 Implement GET /vehicles — list all with current insurance period
- [ ] 15.4 Implement GET /vehicles/:id — detail with all insurance periods
- [ ] 15.5 Implement PATCH /vehicles/:id — update description
- [ ] 15.6 Create Zod schemas (createVehicleSchema, updateVehicleSchema)
- [ ] 15.7 Write unit tests (CRUD, duplicate identifier conflict)

## Task 16: Insurance Period Routes

- [x] 16.1 Create `packages/api/src/routes/insurance-periods.ts` — all endpoints
- [ ] 16.2 Implement POST /vehicles/:vehicleId/insurance-periods — add period, validate dates
- [ ] 16.3 Implement GET /vehicles/:vehicleId/insurance-periods — list ordered by start_date
- [ ] 16.4 Implement PATCH /insurance-periods/:id — update dates/insurer/policy
- [ ] 16.5 Create current-period resolution logic (latest end_date = current)
- [ ] 16.6 Create Zod schemas (createInsurancePeriodSchema, updateInsurancePeriodSchema)
- [ ] 16.7 Write unit tests (CRUD, end < start rejection, current period identification)

## Task 17: Insurance Renewal Alert (Scheduled Lambda)

- [x] 17.1 Create `packages/scheduled/src/insurance-renewal.ts` — Lambda handler
- [ ] 17.2 Implement: fetch all active tenants from DynamoDB
- [ ] 17.3 Implement: for each tenant, connect to DB, query expiring insurance periods
- [ ] 17.4 Implement: send SES email for each expiring period (vehicle + end date + tenant managers)
- [ ] 17.5 Implement: set `alert_sent = true` on success, log failure on SES error
- [ ] 17.6 Create email template (HTML + text) for renewal alert
- [ ] 17.7 Write unit tests (identifies correct periods, respects lead_time, skips already-sent)

## Task 18: Project Spend Reports

- [x] 18.1 Create `packages/api/src/routes/reports.ts` — report endpoints
- [ ] 18.2 Implement GET /reports/projects — all projects with budget, labor_cost, material_cost, actual_spend, remaining, over_budget flag
- [ ] 18.3 Implement GET /reports/projects/:id — detailed single project breakdown
- [ ] 18.4 Create reporting service — aggregate labor_cost from time_entries + allocated_cost from material_allocations
- [ ] 18.5 Write unit tests (correct aggregation, over-budget detection, empty project report)

## Task 19: Tenant Config Endpoint

- [x] 19.1 Create `packages/api/src/routes/tenant-config.ts` — GET /tenant/config
- [ ] 19.2 Return: branding (logo, colors, app_name), enabled modules, locale, currency from DynamoDB config
- [ ] 19.3 Write unit test (returns correct config for tenant)

## Task 20: Frontend — Auth & Shell

- [x] 20.1 Install and configure AWS Amplify Auth library (Cognito integration)
- [x] 20.2 Create login page (email + password form, Cognito sign-in)
- [x] 20.3 Create `TenantProvider` — fetch /tenant/config after login, provide via React context
- [x] 20.4 Create app shell layout (sidebar navigation, header with user info, content area)
- [x] 20.5 Implement module-based routing (only show nav items for enabled modules)
- [x] 20.6 Implement role-based UI (hide admin features for workers, etc.)
- [x] 20.7 Apply tenant branding (logo, primary color, app name from config)
- [x] 20.8 Create API client service (Axios/fetch wrapper with JWT token injection)

## Task 21: Frontend — Project Pages

- [x] 21.1 Create projects list page (table: name, budget, spent, remaining, status badge)
- [ ] 21.2 Create project detail page (budget breakdown: labor + materials, time entries list)
- [ ] 21.3 Create project create/edit form (name, budget, description)
- [ ] 21.4 Create project delete with confirmation (only shown if no records)

## Task 22: Frontend — Worker Pages

- [ ] 22.1 Create workers list page (table: name, cost rate)
- [ ] 22.2 Create worker detail page (cost rate history, linked time entries)
- [ ] 22.3 Create worker create/edit form (name, cost rate)

## Task 23: Frontend — Time Entry Pages

- [ ] 23.1 Create time entry list page (filterable by project, date range)
- [ ] 23.2 Create time entry form (select project, date picker, hours input)
- [ ] 23.3 Show computed labor cost in real-time as user enters hours
- [ ] 23.4 Worker view: only own entries. Manager view: all entries with worker column

## Task 24: Frontend — Absence Pages

- [ ] 24.1 Create absence list page (calendar or table view, filterable by worker)
- [ ] 24.2 Create absence form (date range picker, absence type dropdown)
- [ ] 24.3 Show validation errors (overlap, end < start) inline

## Task 25: Frontend — Material Pages

- [ ] 25.1 Create materials list page (table: name, quantity, cost, supplier)
- [ ] 25.2 Create material form (name, quantity, unit, cost, supplier, date)
- [ ] 25.3 Create material allocation page (select material, select project, enter quantity + cost)
- [ ] 25.4 Show unallocated quantity remaining on allocation form

## Task 26: Frontend — Vehicle & Insurance Pages

- [ ] 26.1 Create vehicles list page (table: identifier, description, current insurance status)
- [ ] 26.2 Create vehicle detail page (insurance period timeline/list)
- [ ] 26.3 Create vehicle form (identifier, description)
- [ ] 26.4 Create insurance period form (start date, end date, insurer, policy number)
- [ ] 26.5 Visual indicator: expired, active, expiring soon

## Task 27: Frontend — Reports Page

- [ ] 27.1 Create all-projects report page (table with budget vs spend comparison)
- [ ] 27.2 Create single-project report page (detailed breakdown: labor + materials)
- [ ] 27.3 Add over-budget visual indicator (red highlight, warning icon)
- [ ] 27.4 Add export to CSV functionality

## Task 28: Frontend — User Management (Admin)

- [ ] 28.1 Create users list page (table: name, email, role, status)
- [ ] 28.2 Create user invite form (email, role selection)
- [ ] 28.3 Create user edit form (change role, activate/deactivate)

## Task 29: First Tenant Provisioning (HA SARL)

- [ ] 29.1 Create tenant database `hasarl_db` on RDS instance
- [ ] 29.2 Run migrations against `hasarl_db`
- [ ] 29.3 Seed system defaults (alert_lead_time = 30 days)
- [ ] 29.4 Add HA SARL entry to DynamoDB tenant registry (modules: all, currency: TND, locale: fr-FR)
- [ ] 29.5 Create Cognito admin user for the business owner
- [ ] 29.6 Verify end-to-end: login → see dashboard → create a project

## Task 30: End-to-End Testing & Polish

- [ ] 30.1 Write E2E tests for critical flows (login, create project, log time, view report)
- [ ] 30.2 Test role-based access (worker cannot create projects, admin can manage users)
- [ ] 30.3 Test tenant isolation (request with tenant A token cannot access tenant B data)
- [ ] 30.4 Performance test: cold start time < 1.5s, warm response < 200ms
- [ ] 30.5 Security review: no leaked secrets, proper CORS, JWT validation
- [ ] 30.6 Accessibility audit (WCAG 2.1 AA basics: contrast, keyboard nav, ARIA labels)
- [ ] 30.7 Create `README.md` with setup instructions, architecture overview, local development guide
