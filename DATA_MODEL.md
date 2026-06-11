# DATA_MODEL.md

# WorkUnit OS Data Model

## 1. Architecture Overview

WorkUnit OS uses Cloudflare D1 (SQLite-compatible) as its primary database layer.

The architecture follows a **tenant-database isolation** model: each tenant gets their own D1 database for WorkUnit data, while a single **control database** manages global tenant and user registry.

This design provides:

- **Reduced blast radius**: a tenant's data lives in its own database. Corruption, migration failure, or accidental deletion in one tenant DB does not affect others.
- **Storage-layer tenant boundary**: cross-tenant queries are structurally impossible unless explicitly routed through the control DB.
- **Simpler deletion/export**: removing or exporting all data for a tenant is a database-level operation.
- **Independent scaling**: high-activity tenants can be moved to larger databases without affecting others.

### Database Groups

```
Control DB (global)
  ├── users
  ├── tenants
  ├── memberships
  ├── tenant_databases
  ├── usage_daily_summary
  └── global_audit_index

Tenant DB (per-tenant)
  ├── work_units
  ├── source_candidates
  ├── external_signals
  ├── action_previews
  ├── approval_records
  ├── execution_results
  ├── audit_logs
  ├── llm_processing_runs
  ├── integration_metadata
  └── schema_migrations

Object Storage (R2)
  ├── raw source bodies
  ├── attachments
  ├── large LLM archives
  └── exports
```

---

## 2. Design Principles

1. **Structured data → D1.** All domain objects (WorkUnits, candidates, approvals, audit logs) live in D1 as structured rows.

2. **Large raw content → object storage.** Raw Slack bodies, email bodies, document text, attachments, and large LLM responses are stored in R2 or equivalent object storage. D1 stores only a reference (URL/object key) and a content hash.

3. **Tokens/secrets → encrypted external store.** OAuth tokens, API keys, and provider credentials are never stored in D1 in plaintext. They belong in an encrypted credential store (e.g., Cloudflare Workers KV with encryption at rest, or a dedicated secrets manager).

4. **Tenant isolation at storage level.** Every tenant has its own D1 database. Application code resolves the tenant DB via the control DB and connects directly — no cross-tenant joins at the query level.

5. **Migrations per tenant.** Each tenant DB tracks its own schema version in `schema_migrations`. Migrations are applied per-tenant and must be idempotent.

---

## 3. Control Database

### Purpose

The control database manages global identity and routing. It tracks which users belong to which tenants, and which D1 database serves each tenant's WorkUnit data.

### Tables

#### users

```sql
CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### tenants

```sql
CREATE TABLE tenants (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### memberships

```sql
CREATE TABLE memberships (
  user_id     TEXT NOT NULL REFERENCES users(id),
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','pm','member','viewer')),
  joined_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, tenant_id)
);
```

#### tenant_databases

```sql
CREATE TABLE tenant_databases (
  tenant_id        TEXT PRIMARY KEY REFERENCES tenants(id),
  database_name    TEXT NOT NULL UNIQUE,
  database_id      TEXT NOT NULL,
  schema_version   TEXT NOT NULL DEFAULT '1',
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','migrating','failed')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### usage_daily_summary

```sql
CREATE TABLE usage_daily_summary (
  tenant_id        TEXT NOT NULL REFERENCES tenants(id),
  date             TEXT NOT NULL,
  llm_requests     INTEGER NOT NULL DEFAULT 0,
  llm_tokens_in    INTEGER NOT NULL DEFAULT 0,
  llm_tokens_out   INTEGER NOT NULL DEFAULT 0,
  external_actions INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, date)
);
```

#### global_audit_index

```sql
CREATE TABLE global_audit_index (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  event_kind  TEXT NOT NULL,
  actor_id    TEXT,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 4. Tenant Database

### Purpose

Each tenant database stores all WorkUnit domain objects, approvals, audit logs, LLM processing records, and integration metadata for a single tenant.

### Tables

#### WorkUnits

```sql
CREATE TABLE work_units (
  id               TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  title            TEXT NOT NULL,
  situation        TEXT NOT NULL DEFAULT '',
  problem          TEXT NOT NULL DEFAULT '',
  actors           TEXT NOT NULL DEFAULT '[]',       -- JSON array
  urgency          INTEGER NOT NULL DEFAULT 3 CHECK (urgency BETWEEN 1 AND 5),
  impact           INTEGER NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  effort           INTEGER NOT NULL DEFAULT 3 CHECK (effort BETWEEN 1 AND 5),
  priority_score   INTEGER NOT NULL DEFAULT 0,
  next_action      TEXT NOT NULL DEFAULT '',
  tasks            TEXT NOT NULL DEFAULT '[]',       -- JSON array
  missing_fields   TEXT NOT NULL DEFAULT '[]',       -- JSON array
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed')),
  trust_level      TEXT NOT NULL DEFAULT 'draft' CHECK (trust_level IN ('draft','reviewed','approved','executed')),
  source_candidate_ids TEXT NOT NULL DEFAULT '[]',   -- JSON array
  created_by       TEXT NOT NULL DEFAULT 'system',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### Source Candidates

```sql
CREATE TABLE source_candidates (
  id               TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  source_signal_ids TEXT NOT NULL DEFAULT '[]',      -- JSON array
  source_type      TEXT NOT NULL,
  extracted_summary TEXT NOT NULL DEFAULT '',
  detected_actors  TEXT NOT NULL DEFAULT '[]',       -- JSON array
  detected_problem TEXT,
  detected_deadline TEXT,
  detected_intent  TEXT,
  confidence       REAL NOT NULL DEFAULT 0.5,
  trust_level      TEXT NOT NULL DEFAULT 'sanitized_candidate',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### External Signals

```sql
CREATE TABLE external_signals (
  id               TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  source_type      TEXT NOT NULL,
  source_ref       TEXT NOT NULL DEFAULT '{}',       -- JSON object
  received_at      TEXT NOT NULL DEFAULT (datetime('now')),
  trust_level      TEXT NOT NULL DEFAULT 'untrusted',
  raw_content_ref  TEXT,                              -- R2 object key
  metadata         TEXT NOT NULL DEFAULT '{}'         -- JSON object
);
```

#### Action Previews

```sql
CREATE TABLE action_previews (
  id               TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL REFERENCES work_units(tenant_id),
  work_unit_id     TEXT NOT NULL REFERENCES work_units(id),
  action_type      TEXT NOT NULL CHECK (action_type IN ('internal_task','slack_reply','gmail_reply','github_issue','calendar_event')),
  target_preview   TEXT NOT NULL DEFAULT '{}',       -- JSON object
  payload_preview  TEXT NOT NULL DEFAULT '{}',       -- JSON object
  requires_approval INTEGER NOT NULL DEFAULT 1,
  status           TEXT NOT NULL DEFAULT 'preview',
  target_hash      TEXT NOT NULL,
  payload_hash     TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at       TEXT
);
```

#### Approval Records

```sql
CREATE TABLE approval_records (
  id               TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  work_unit_id     TEXT NOT NULL,
  action_preview_id TEXT NOT NULL REFERENCES action_previews(id),
  action_type      TEXT NOT NULL,
  target_hash      TEXT NOT NULL,
  payload_hash     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired','used')),
  approved_by_user_id TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at      TEXT,
  expires_at       TEXT NOT NULL,
  used_at          TEXT
);
```

#### Execution Results

```sql
CREATE TABLE execution_results (
  id                 TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  work_unit_id       TEXT NOT NULL,
  execution_command_id TEXT NOT NULL,
  status             TEXT NOT NULL CHECK (status IN ('succeeded','failed','blocked','skipped')),
  provider           TEXT,
  provider_result_ref TEXT,
  safe_message       TEXT NOT NULL DEFAULT '',
  error_code         TEXT,
  executed_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### Audit Logs

```sql
CREATE TABLE audit_logs (
  id          TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL,
  event_kind  TEXT NOT NULL,
  actor_id    TEXT,
  request_id  TEXT,
  work_unit_id TEXT,
  operation   TEXT,
  target      TEXT,
  reason      TEXT,
  metadata    TEXT,                                   -- JSON object, never raw source content
  occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### LLM Processing Runs

```sql
CREATE TABLE llm_processing_runs (
  id               TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  signal_id        TEXT,
  candidate_id     TEXT,
  work_unit_id     TEXT,
  stage            TEXT NOT NULL,
  provider         TEXT NOT NULL,
  model            TEXT NOT NULL,
  prompt_tokens    INTEGER,
  completion_tokens INTEGER,
  duration_ms      INTEGER,
  status           TEXT NOT NULL CHECK (status IN ('started','completed','failed','blocked')),
  error_code       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### Integration Metadata

```sql
CREATE TABLE integration_metadata (
  id               TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  provider         TEXT NOT NULL CHECK (provider IN ('slack','gmail','github','google_calendar','notion','google_drive')),
  status           TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','inactive','error','pending_oauth')),
  external_account_id TEXT,
  scopes           TEXT,                               -- JSON array
  connected_at     TEXT,
  token_expires_at TEXT,
  config           TEXT NOT NULL DEFAULT '{}',         -- JSON object; NEVER stores plain tokens
  UNIQUE (tenant_id, provider)
);
```

#### Schema Migrations

```sql
CREATE TABLE schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TEXT NOT NULL DEFAULT (datetime('now')),
  checksum    TEXT NOT NULL
);
```

---

## 5. Object Storage Policy

Large or binary content must not be stored in D1.

| Content Type | Storage | D1 Column |
|-------------|---------|-----------|
| Raw Slack message body | R2 | `external_signals.raw_content_ref` |
| Raw email body | R2 | `external_signals.raw_content_ref` |
| Raw document text | R2 | `external_signals.raw_content_ref` |
| Attachments / files | R2 | separate object key table |
| LLM prompt archive | R2 | `llm_processing_runs` references only |
| Full LLM response | R2 | `llm_processing_runs` references only |
| Exports | R2 | generated on demand |

Content hashes should be stored in D1 alongside object references for integrity verification.

---

## 6. Token and Secret Policy

| Type | Storage | Notes |
|------|---------|-------|
| OAuth tokens | Encrypted credential store | Not in D1 |
| API keys | Encrypted credential store | Not in D1 |
| Provider credentials | Encrypted credential store | Not in D1 |
| JWT signing keys | Secrets manager | Not in D1 |
| Encryption keys | Secrets manager | Not in D1 |
| `integration_metadata.config` | D1 | Provider settings only (default channel, calendar ID) — no tokens |

`integration_metadata.config` stores provider-specific configuration (default channel, repository, calendar ID, sender address) but MUST NOT store tokens, API keys, or secrets.

---

## 7. Migration Strategy

### Design

- Every tenant database has a `schema_migrations` table.
- The control database has its own migrations (managed separately).
- Migrations are versioned and applied per-tenant.
- No destructive migration (DROP COLUMN, DROP TABLE) without explicit backup/export first.

### Migration Rules

1. **Idempotent:** each migration must be safe to re-run.
2. **Versioned:** migrations are numbered (`001`, `002`, `003`...).
3. **Per-tenant:** a migration runner applies pending migrations to each active tenant DB.
4. **Failed migration = isolate:** if a migration fails on one tenant DB, that tenant's database is flagged as `failed` in `tenant_databases`. Other tenants continue unaffected.
5. **Rollback:** not supported automatically. Rollback requires a forward-fix migration.
6. **No downtime:** D1 does not support online schema changes natively. Prefer additive changes (new columns, new tables).

### Example Migration Runner Flow

```
1. Read schema_version from control DB
2. For each active tenant DB:
   a. Read current version from tenant DB schema_migrations
   b. Apply pending migrations in order
   c. On success: insert into tenant DB schema_migrations, update tenant_databases
   d. On failure: set tenant_databases.status = 'failed', log error, continue to next tenant
```

---

## 8. D1 Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| 10GB per database | Large tenants may need archival | Archive old data to R2, use summary tables |
| No concurrent write scaling | Single writer | Acceptable for per-tenant isolation |
| No cross-database queries | Cannot join control+tenant DB | Application-level orchestration |
| SQLite semantics | No Postgres features | Compatible with current schema design |
| Row size limit (~1GB) | Giant rows impossible | Store large content in R2 |

---

## 9. Security and Privacy Benefits

### Tenant Database Isolation

- Each tenant's WorkUnit data is physically separate.
- A SQL injection in one tenant DB cannot read another tenant's data.
- Queries cannot accidentally join across tenants because the databases are separate.

### Reduced Blast Radius

- If a tenant DB is corrupted, only that tenant is affected.
- If a migration fails, only that tenant is blocked.
- Backup/restore can target a single tenant.

### Data Deletion / Export

- Deleting a tenant's data is a database-level operation.
- Exporting a tenant's data is a database dump.
- GDPR/CCPA compliance is simpler.

### Cross-Tenant Analytics

- Analytics across tenants requires explicit aggregation in the application layer.
- The global audit index in the control DB is intentionally minimal (no payload data).
- No single query can expose all tenants' WorkUnit content.

---

## 10. Operational Tradeoffs

| Tradeoff | Impact |
|----------|--------|
| Many small databases | More D1 databases to manage. D1 is designed for this pattern. |
| Per-tenant migrations | Migration time scales with tenant count. Batch apply. |
| Tenant registry required | Control DB is a single point of routing. Keep it simple and cacheable. |
| No cross-tenant queries | Analytics requires application-level aggregation. Acceptable for privacy. |
