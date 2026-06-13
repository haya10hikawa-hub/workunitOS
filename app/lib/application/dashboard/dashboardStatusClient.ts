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

export async function fetchIntegrationStatus(fetchImpl: typeof fetch = fetch): Promise<{ ok: true; providers: DashboardIntegrationProviderStatus[] } | { ok: false; error: string }> {
  const response = await fetchImpl("/api/integrations/status", { cache: "no-store" })
  if (!response.ok) return { ok: false, error: await readSafeError(response, "integration_status_failed") }
  const data = await response.json()
  return { ok: true, providers: Array.isArray(data.providers) ? data.providers.map(normalizeProvider) : [] }
}

export async function fetchRecentAuditLogs(fetchImpl: typeof fetch = fetch): Promise<{ ok: true; auditLogs: DashboardAuditLog[] } | { ok: false; error: string }> {
  const response = await fetchImpl("/api/audit/recent", { cache: "no-store" })
  if (!response.ok) return { ok: false, error: await readSafeError(response, "audit_recent_failed") }
  const data = await response.json()
  return { ok: true, auditLogs: Array.isArray(data.auditLogs) ? data.auditLogs.map(normalizeAuditLog) : [] }
}

function normalizeProvider(value: unknown): DashboardIntegrationProviderStatus {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {}
  return { provider: String(row.provider ?? "unknown"), status: String(row.status ?? "unknown"), mode: String(row.mode ?? "unknown"), scopes: Array.isArray(row.scopes) ? row.scopes.map(String) : [], lastSyncedAt: typeof row.lastSyncedAt === "string" ? row.lastSyncedAt : null, lastErrorCode: typeof row.lastErrorCode === "string" ? row.lastErrorCode : null }
}

function normalizeAuditLog(value: unknown): DashboardAuditLog {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {}
  return { id: String(row.id ?? ""), eventKind: String(row.eventKind ?? "unknown"), targetType: typeof row.targetType === "string" ? row.targetType : undefined, targetId: typeof row.targetId === "string" ? row.targetId : undefined, actorUserId: typeof row.actorUserId === "string" ? row.actorUserId : undefined, createdAt: String(row.createdAt ?? ""), metadata: row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {} }
}

async function readSafeError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({}))
  return typeof data?.error === "string" ? data.error : fallback
}
