# Project Context & Handoff — HA-SARL / Society ERP

> This is a steering file (auto-included in every session). It exists to hand off full
> context to a fresh Kiro session running under a **dedicated personal Ubuntu user**.
> Read this first.

## Why this file exists (the situation)

- This project was started under the Ubuntu user `ahmed`, whose machine is also configured
  for **Redspher (work)** accounts: the global git identity is `Ahmedchiekh <a.cheikh@redspher.com>`
  and there are ~30 work-related AWS CLI profiles, with `AWS_PROFILE=default` pointing at a
  work account.
- To keep this **personal** project fully separate from work, the project is being moved to a
  **new, dedicated Ubuntu user** (placeholder name: `hasarl`) with its own home directory,
  its own `~/.gitconfig`, its own `~/.aws/` credentials, and its own SSH keys.
- If you (Kiro) are reading this in a session where `whoami` returns the new user and the
  project lives under that user's home (e.g. `/home/hasarl/projects/HA-SARL`), the move
  succeeded. Confirm isolation before doing any git/AWS work.

## Isolation rules (IMPORTANT — verify before acting)

1. **Git identity**: Must NOT use `a.cheikh@redspher.com`. Set a per-repo (or this user's
   global) identity to the user's PERSONAL GitHub name + email. Verify with
   `git config user.email` before the first commit.
2. **AWS**: Must NOT use any Redspher profile (`default`, `plat-test`, `rtech-*`, `upela-*`,
   `rubiwin-*`, `core-security`, etc.). Create and use a dedicated personal profile
   (planned name: `society-personal`). Always pass `--profile society-personal` or set
   `AWS_PROFILE=society-personal` scoped to this project. Verify with
   `aws sts get-caller-identity --profile society-personal` and confirm the account ID is the
   user's PERSONAL account.
3. Never paste secret keys into chat. Give the user the command to run themselves.

## What we're building

**Society ERP** — a web ERP for a small company (2-3 users initially, owned by the user's friend)
to manage spending per project, workers (time + absences + labor cost), materials and their
allocation to projects, and vehicle insurance periods with renewal email alerts. Full functional
requirements are in `.kiro/specs/society-erp/requirements.md` (16 EARS requirements).

A React Native (Expo) mobile app is planned for a LATER phase and must reuse the same API + auth.

## Agreed tech stack (decided during brainstorming)

- **Backend**: AWS Lambda + API Gateway (HTTP API), TypeScript/Node.js, IaC via AWS SAM or
  Serverless Framework. Must scale to zero / cost ~nothing while idle.
- **Database**: PostgreSQL. Start on a free-tier Postgres (Neon/Supabase free tier or RDS
  free tier) to stay near $0; migrate to Aurora Serverless v2 later if the company grows.
- **Auth**: Amazon Cognito (roles: admin, manager, worker).
- **Frontend (web)**: React + Vite (or Next.js), hosted on S3 + CloudFront or Amplify Hosting.
- **Insurance renewal alerts**: EventBridge Scheduler + Lambda + Amazon SES (email).
- **Cost constraint**: do not incur meaningful spend until the product is productive.

## Roadmap (what we want to do next, in order)

1. **Link the project to the user's PERSONAL GitHub** (new repo, personal account — NOT Redspher).
   - Decide auth method (SSH with a dedicated key is recommended).
   - `git init`, add a `.gitignore`, set the personal git identity, first commit, create repo,
     push to a `main` branch (and work on feature branches, not directly on main).
2. **Define the architecture** (this becomes the spec's `design.md`):
   - Serverless AWS architecture diagram, components, data model (PostgreSQL schema),
     API surface, auth flow, environments (dev/prod), region selection.
3. **Set up CI/CD with an AWS pipeline**:
   - Pipeline to build/test/deploy the serverless backend and the web frontend.
   - Option A: AWS-native (CodePipeline + CodeBuild) connected to GitHub.
   - Option B: GitHub Actions deploying to AWS via OIDC (no long-lived keys).
   - Keep cost near zero; use OIDC federation rather than stored AWS keys where possible.
4. Then proceed to the spec `tasks.md` and implementation.

## Confirmed decisions

- **GitHub**: username `chiekhahmd`, email `chiekhahmd@gmail.com`, repo `chiekhahmd/HA-SARL` (SSH).
- **AWS region**: eu-west-3 (Paris).
- **Multi-tenancy**: Database-per-tenant on shared RDS instance. Shared Lambda/API/Cognito.
- **Database**: RDS PostgreSQL db.t3.micro (free tier), one DB per tenant. Aurora Serverless v2 later.
- **Tenant registry**: DynamoDB (config, branding, modules per tenant).
- **Auth**: Shared Cognito User Pool with `custom:tenant_id` and `custom:role` attributes.
- **CI/CD**: GitHub Actions + OIDC (no stored AWS keys).
- **IaC**: AWS CDK (TypeScript) — handles Lambda, RDS, VPC, and any future resource.
- **API framework**: Hono (single Lambda with internal routing + separate Lambda for cron).
- **ORM**: Drizzle ORM.
- **Validation**: Zod + @hono/zod-validator.
- **Testing**: Vitest.
- **Frontend**: Config-driven (branding, module toggles, locale, currency per tenant).
- **Custom domains**: Each tenant has their own domain → shared CloudFront distribution.
- **Customization roadmap**: Phase 1 = branding + modules. Phase 2 = custom fields (JSONB). Phase 3 = custom workflows.

## Current state

- Git initialized, first commit pushed to `origin/main` on GitHub.
- `requirements.md` is complete (16 EARS requirements).
- `design.md` is complete (multi-tenant SaaS architecture with Hono + CDK).
- `tasks.md` is complete (30 tasks covering infra through frontend).
- Client overview document created (`docs/client-overview.md`).
- No application code yet — ready to begin implementation.
- The user intends to adjust requirement details (absence overlap, project deletion rules,
  date-effective cost rate) once development starts.
