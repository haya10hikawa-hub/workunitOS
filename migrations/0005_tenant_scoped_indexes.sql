-- Phase 6B: Tenant-scoped index hardening (Tenant DB)
--
-- Additive, migration-safe. Adds tenant-prefixed composite indexes that match the
-- repository query patterns (every approval/preview/work-unit lookup is scoped by
-- `WHERE tenant_id = ?`). All statements are CREATE INDEX IF NOT EXISTS — no table
-- rebuilds, no column/table drops, no data backfill, no rows inserted, no
-- secrets/default tenants/default users.
--
-- Run locally: wrangler d1 execute TENANT_DB_DEFAULT --local --file=migrations/0005_tenant_scoped_indexes.sql
--
-- Deferred (NOT in this migration — see docs/PHASE_6B_D1_SCHEMA_INDEX_CONSTRAINT_HARDENING.md):
--   - action_previews.work_unit_id / approval_records.work_unit_id FKs (require an
--     unsafe table rebuild on SQLite/D1).
--   - Any uniqueness rule for approvals per preview (could conflict with existing rows).

-- ── action_previews ────────────────────────────────────────────
-- findById:        WHERE tenant_id = ? AND id = ?
-- findByWorkUnitId: WHERE tenant_id = ? AND work_unit_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_action_previews_tenant_id
  ON action_previews (tenant_id, id);

CREATE INDEX IF NOT EXISTS idx_action_previews_tenant_work_unit_created
  ON action_previews (tenant_id, work_unit_id, created_at);

-- ── approval_records ───────────────────────────────────────────
-- findById:         WHERE tenant_id = ? AND id = ?
-- findByPreviewId:  WHERE tenant_id = ? AND action_preview_id = ? ORDER BY created_at DESC
-- findByWorkUnitId: WHERE tenant_id = ? AND work_unit_id = ? ORDER BY created_at DESC
-- markUsed (CAS):   WHERE tenant_id = ? AND id = ? AND status = 'approved'
--                     AND used_at IS NULL AND expires_at > ?
CREATE INDEX IF NOT EXISTS idx_approval_records_tenant_id
  ON approval_records (tenant_id, id);

CREATE INDEX IF NOT EXISTS idx_approval_records_tenant_action_preview_created
  ON approval_records (tenant_id, action_preview_id, created_at);

CREATE INDEX IF NOT EXISTS idx_approval_records_tenant_work_unit_created
  ON approval_records (tenant_id, work_unit_id, created_at);

CREATE INDEX IF NOT EXISTS idx_approval_records_tenant_status_used_expires
  ON approval_records (tenant_id, status, used_at, expires_at);

-- ── work_units ─────────────────────────────────────────────────
-- tenant-scoped lookups; existing single-column idx_work_units_tenant /
-- idx_work_units_created / idx_work_units_provider are preserved (not dropped).
CREATE INDEX IF NOT EXISTS idx_work_units_tenant_id
  ON work_units (tenant_id, id);

CREATE INDEX IF NOT EXISTS idx_work_units_tenant_created
  ON work_units (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_work_units_tenant_source_provider
  ON work_units (tenant_id, source_provider);
