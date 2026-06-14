import type { InboxWorkUnit } from "@/lib/application/workunitInbox/types"

export type DashboardIntegrationProviderStatus = {
  provider: string
  status: string
  mode: string
  scopes: string[]
  lastSyncedAt: string | null
  lastErrorCode: string | null
}

export type DashboardAuditLog = {
  id: string
  eventKind: string
  targetType?: string
  targetId?: string
  actorUserId?: string
  createdAt: string
  metadata: Record<string, unknown>
}

export async function fetchDashboardWorkUnits(
  source = "all",
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; workUnits: InboxWorkUnit[] } | { ok: false; error: string }> {
  const query = source.length > 0 ? `?source=${encodeURIComponent(source)}` : ""
  const response = await fetchImpl(`/api/workunit/inbox${query}`, { cache: "no-store" })
  if (!response.ok) return { ok: false, error: await readSafeError(response, "dashboard_workunits_failed") }
  const data = await response.json()
  return { ok: true, workUnits: Array.isArray(data.workUnits) ? data.workUnits.map(normalizeWorkUnit) : [] }
}

export async function fetchIntegrationStatus(
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; providers: DashboardIntegrationProviderStatus[] } | { ok: false; error: string }> {
  const response = await fetchImpl("/api/integrations/status", { cache: "no-store" })
  if (!response.ok) return { ok: false, error: await readSafeError(response, "integration_status_failed") }
  const data = await response.json()
  return { ok: true, providers: Array.isArray(data.providers) ? data.providers.map(normalizeProvider) : [] }
}

export async function fetchRecentAuditLogs(
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; auditLogs: DashboardAuditLog[] } | { ok: false; error: string }> {
  const response = await fetchImpl("/api/audit/recent", { cache: "no-store" })
  if (!response.ok) return { ok: false, error: await readSafeError(response, "audit_recent_failed") }
  const data = await response.json()
  return { ok: true, auditLogs: Array.isArray(data.auditLogs) ? data.auditLogs.map(normalizeAuditLog) : [] }
}

function normalizeWorkUnit(value: unknown): InboxWorkUnit {
  const row = isRecord(value) ? value : {}
  return {
    id: asString(row.id, ""),
    signalId: asString(row.signalId, ""),
    tenantId: asString(row.tenantId, ""),
    title: asString(row.title, "Untitled WorkUnit"),
    kind: asInboxKind(row.kind),
    priority: asPriority(row.priority),
    sourceProvider: asProvider(row.sourceProvider),
    reason: asString(row.reason, ""),
    evidence: asString(row.evidence, ""),
    nextAction: asString(row.nextAction, ""),
    sourceUrl: asOptionalString(row.sourceUrl),
    actor: asOptionalString(row.actor),
    assignee: asOptionalString(row.assignee),
    repository: asOptionalString(row.repository),
    dueAt: asOptionalString(row.dueAt),
    createdAt: asString(row.createdAt, new Date(0).toISOString()),
    status: asStatus(row.status),
  }
}

function normalizeProvider(value: unknown): DashboardIntegrationProviderStatus {
  const row = isRecord(value) ? value : {}
  return {
    provider: asString(row.provider, "unknown"),
    status: asString(row.status, "unknown"),
    mode: asString(row.mode, "unknown"),
    scopes: Array.isArray(row.scopes) ? row.scopes.map(String) : [],
    lastSyncedAt: asNullableString(row.lastSyncedAt),
    lastErrorCode: asNullableString(row.lastErrorCode),
  }
}

function normalizeAuditLog(value: unknown): DashboardAuditLog {
  const row = isRecord(value) ? value : {}
  return {
    id: asString(row.id, ""),
    eventKind: asString(row.eventKind, "unknown"),
    targetType: asOptionalString(row.targetType),
    targetId: asOptionalString(row.targetId),
    actorUserId: asOptionalString(row.actorUserId),
    createdAt: asString(row.createdAt, ""),
    metadata: isRecord(row.metadata) ? row.metadata : {},
  }
}

function asProvider(value: unknown): InboxWorkUnit["sourceProvider"] {
  return value === "github" || value === "slack" || value === "calendar" ? value : "github"
}

function asPriority(value: unknown): InboxWorkUnit["priority"] {
  return value === "high" || value === "medium" || value === "low" ? value : "medium"
}

function asStatus(value: unknown): InboxWorkUnit["status"] {
  return value === "open" || value === "useful" || value === "not_useful" || value === "later" || value === "done"
    ? value
    : "open"
}

function asInboxKind(value: unknown): InboxWorkUnit["kind"] {
  return value === "missed_response" || value === "review_waiting" || value === "blocker" || value === "deadline" || value === "assigned_issue"
    ? value
    : "assigned_issue"
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

async function readSafeError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({}))
  return isRecord(data) && typeof data.error === "string" ? data.error : fallback
}
