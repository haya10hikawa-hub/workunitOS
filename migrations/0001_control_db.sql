-- Control Database Schema
-- Contains global tenant/user registry and tenant database routing.
-- Run locally: wrangler d1 execute CONTROL_DB --local --file=migrations/0001_control_db.sql

CREATE TABLE IF NOT EXISTS tenants (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_databases (
  tenant_id        TEXT PRIMARY KEY REFERENCES tenants(id),
  database_name    TEXT NOT NULL UNIQUE,
  database_id      TEXT NOT NULL,
  schema_version   TEXT NOT NULL DEFAULT '1',
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','migrating','failed')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
