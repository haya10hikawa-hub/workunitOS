# Cloudflare D1 Setup Guide

## 1. Overview

WorkUnit OS uses Cloudflare D1 for production persistence. This document covers
how to set up local and production D1 databases, run migrations, and configure
the required bindings.

## 2. Prerequisites

- Cloudflare account with Workers/Pages enabled
- Wrangler CLI installed (or `npx wrangler`)
- Authenticated: `wrangler login`
- Next.js >= 16.2.6 (project: 16.2.9)
- @opennextjs/cloudflare 1.19.11 installed

## 3. Local Development

### Create local D1 databases

```bash
wrangler d1 create workunit-control-db
wrangler d1 create workunit-tenant
```

Copy the database IDs from the output.

### Update wrangler.toml

Replace the placeholder IDs:

```toml
[[d1_databases]]
binding = "CONTROL_DB"
database_name = "workunit-control-db"
database_id = "YOUR_CONTROL_DB_ID_HERE"

[[d1_databases]]
binding = "TENANT_DB_DEFAULT"
database_name = "workunit-tenant"
database_id = "YOUR_TENANT_DB_ID_HERE"
```

### Run migrations locally

```bash
wrangler d1 execute CONTROL_DB --local --file=migrations/0001_control_db.sql
wrangler d1 execute TENANT_DB_DEFAULT --local --file=migrations/0002_tenant_core.sql
```

### Start dev server

```bash
PERSISTENCE_MODE=d1 npm run dev
```

## 4. Production Deployment

### Create production databases

```bash
wrangler d1 create workunit-control-db
wrangler d1 create workunit-tenant
```

Update `wrangler.toml` with production database IDs.

### Run migrations on production

```bash
wrangler d1 execute CONTROL_DB --env production --file=migrations/0001_control_db.sql
wrangler d1 execute TENANT_DB_DEFAULT --env production --file=migrations/0002_tenant_core.sql
```

### Set environment variables

```bash
wrangler secret put DEEPSEEK_API_KEY
# Enter API key at prompt

# Production flags in wrangler.toml [vars]:
# EXTERNAL_ACTIONS_ENABLED = "false" (enable only after auth + RBAC)
# ALLOW_LEGACY_INGEST_FALLBACK = "false"
```

## 5. Required Bindings

| Binding | Purpose | Table |
|---------|---------|-------|
| `CONTROL_DB` | Tenant registry, user registry, DB routing | `tenants`, `tenant_databases` |
| `TENANT_DB_DEFAULT` | WorkUnit data per-tenant | `action_previews`, `approval_records` |

Future: additional tenant databases for multi-tenant isolation.

## 6. Migration Files

| File | Contents |
|------|----------|
| `migrations/0001_control_db.sql` | Control DB: tenants, tenant_databases |
| `migrations/0002_tenant_core.sql` | Preview and approval tables, indexes |

Future migrations should be additive. Use `CREATE TABLE IF NOT EXISTS`
for idempotency. Never drop tables without backup.

## 7. Production Safety Checklist

Before enabling `EXTERNAL_ACTIONS_ENABLED=true` in production:

- [ ] Real authentication configured (OAuth/OIDC)
- [ ] D1 databases created and migrations run
- [ ] Wrangler secrets set (DEEPSEEK_API_KEY)
- [ ] RBAC enforced on all API endpoints
- [ ] In-memory flags ALL set to false
- [ ] Audit logging wired to D1
- [ ] Rate limiting configured

## 9. Runtime Env Wiring

The OpenNext Cloudflare adapter provides Cloudflare runtime env
(including D1 bindings) to the application.

### Adapter Chain

```
Cloudflare Pages request
  → OpenNext request handler (functions/[[path]].ts)
  → extractCloudflareEnv(context)  [app/lib/runtime/openNextCloudflareEnv.ts]
  → setRequestRuntimeEnvInProd(env)  [app/lib/runtime/cloudflareRuntimeEnv.ts]
  → resolveRouteRepositories() uses runtimeEnv
  → D1 repositories
```

### Local Dev

When running locally (`npm run dev`), no Cloudflare runtime exists.
`getRequestRuntimeEnv()` returns `null`. The repository resolver
falls back to in-memory (if `ALLOW_IN_MEMORY_PERSISTENCE=true`)
or returns `integration_missing`.

### Required for Production

1. Install dependencies (already done):
   ```bash
   npm install
   ```
   Next.js 16.2.9, @opennextjs/cloudflare 1.19.11, wrangler ^4.99.0 are installed.

2. Create real D1 databases:
   ```bash
   wrangler d1 create workunit-control-db
   wrangler d1 create workunit-tenant
   ```
   Copy the database IDs into `wrangler.toml` (replace `REPLACE_*` placeholders).

3. Run migrations:
   ```bash
   wrangler d1 execute CONTROL_DB --local --file=migrations/0001_control_db.sql
   wrangler d1 execute TENANT_DB_DEFAULT --local --file=migrations/0002_tenant_core.sql
   ```

4. Set secrets:
   ```bash
   wrangler secret put DEEPSEEK_API_KEY
   ```

5. Deploy:
   ```bash
   npm run cf:deploy
   ```

Local tests use `FakeD1Database` and do NOT require real D1.
Set `PERSISTENCE_MODE=d1` only for manual integration testing.

In-memory persistence (`ALLOW_IN_MEMORY_PERSISTENCE=true`) is sufficient
for all automated tests and local development.
