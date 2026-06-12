-- Tenant Persistence Foundation
-- Phase 2: WorkUnits, feedback, integration connections, audit logs, usage tracking
-- Run locally: wrangler d1 execute TENANT_DB_DEFAULT --local --file=migrations/0003_tenant_persistence_foundation.sql

-- ── WorkUnits ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS work_units (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  source_signal_id  TEXT,
  title             TEXT NOT NULL,
  kind              TEXT NOT NULL,
  priority          TEXT NOT NULL DEFAULT 'medium',
  source_provider   TEXT NOT NULL,
  reason            TEXT NOT NULL,
  evidence          TEXT NOT NULL,
  next_action       TEXT NOT NULL,
  source_url        TEXT,
  actor             TEXT,
  assignee          TEXT,
  repository        TEXT,
  due_at            TEXT,
  status            TEXT NOT NULL DEFAULT 'open',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_work_units_tenant ON work_units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_units_created ON work_units(created_at);
CREATE INDEX IF NOT EXISTS idx_work_units_provider ON work_units(source_provider);

-- ── WorkUnit Feedback ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workunit_feedback (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  work_unit_id      TEXT NOT NULL REFERENCES work_units(id),
  feedback          TEXT NOT NULL,
  actor_user_id     TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_work_unit ON workunit_feedback(work_unit_id);
CREATE INDEX IF NOT EXISTS idx_feedback_tenant ON workunit_feedback(tenant_id);

-- ── Integration Connections ────────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_connections (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  provider          TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'disconnected',
  mode              TEXT NOT NULL DEFAULT 'fake',
  display_name      TEXT,
  external_account_id TEXT,
  scopes_json       TEXT,
  metadata_json     TEXT,
  connected_at      TEXT,
  disconnected_at   TEXT,
  last_sync_at      TEXT,
  last_error_code   TEXT,
  last_error_message TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_connections_tenant ON integration_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_connections_provider ON integration_connections(tenant_id, provider);

-- ── Audit Logs ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  actor_user_id     TEXT,
  event_type        TEXT NOT NULL,
  resource_type     TEXT,
  resource_id       TEXT,
  status            TEXT,
  metadata_json     TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(tenant_id, event_type);

-- ── Usage Events ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usage_events (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  event_type        TEXT NOT NULL,
  quantity          INTEGER NOT NULL DEFAULT 1,
  resource_type     TEXT,
  resource_id       TEXT,
  metadata_json     TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usage_tenant ON usage_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_events(tenant_id, event_type, created_at);

-- ── Usage Daily Summary ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usage_daily_summary (
  tenant_id         TEXT NOT NULL,
  date              TEXT NOT NULL,
  event_type        TEXT NOT NULL,
  quantity          INTEGER NOT NULL DEFAULT 0,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, date, event_type)
);

CREATE INDEX IF NOT EXISTS idx_summary_date ON usage_daily_summary(date);
