-- Tenant Database Core Schema
-- Contains ActionPreview and ApprovalRecord tables.
-- Run locally: wrangler d1 execute TENANT_DB_DEFAULT --local --file=migrations/0002_tenant_core.sql

CREATE TABLE IF NOT EXISTS action_previews (
  id               TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  work_unit_id     TEXT NOT NULL,
  action_type      TEXT NOT NULL CHECK (action_type IN ('internal_task','slack_reply','gmail_reply','github_issue','calendar_event')),
  target_preview   TEXT NOT NULL DEFAULT '{}',
  payload_preview  TEXT NOT NULL DEFAULT '{}',
  requires_approval INTEGER NOT NULL DEFAULT 1,
  status           TEXT NOT NULL DEFAULT 'preview',
  target_hash      TEXT NOT NULL,
  payload_hash     TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_action_previews_work_unit ON action_previews(work_unit_id);

CREATE TABLE IF NOT EXISTS approval_records (
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

CREATE INDEX IF NOT EXISTS idx_approval_records_preview ON approval_records(action_preview_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_status ON approval_records(status);
CREATE INDEX IF NOT EXISTS idx_approval_records_expires ON approval_records(expires_at);
