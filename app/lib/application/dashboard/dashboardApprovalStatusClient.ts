/**
 * Dashboard Approval Status Client
 *
 * Client-safe helper for fetching the approval status summary for a WorkUnit.
 * No client-owned hashes, tenantId, or approval internals are ever sent.
 * No React imports, no D1 imports, no repositoryResolver imports.
 */

// ─── Types ──────────────────────────────────────────────────────

export type DashboardApprovalStatus = {
  workUnitId: string
  latestApprovalId: string | null
  latestActionPreviewId: string | null
  status: "none" | "pending" | "approved" | "rejected" | "expired" | "used"
  approved: boolean
  rejected: boolean
  expired: boolean
  used: boolean
  createdAt: string | null
  expiresAt: string | null
  usedAt: string | null
}

// ─── Client ─────────────────────────────────────────────────────

export async function fetchDashboardApprovalStatus(
  workUnitId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; approvalStatus: DashboardApprovalStatus } | { ok: false; error: string }> {
  const response = await fetchImpl(
    `/api/workunit/${encodeURIComponent(workUnitId)}/approval/status`,
    { cache: "no-store" },
  )
  if (!response.ok) {
    return { ok: false, error: await readSafeError(response, "approval_status_failed") }
  }
  let data: unknown
  try { data = await response.json() } catch {
    return { ok: false, error: "Invalid approval status response from server." }
  }
  if (!isRecord(data) || typeof data.workUnitId !== "string" || typeof data.status !== "string") {
    return { ok: false, error: "Invalid approval status response from server." }
  }
  return {
    ok: true,
    approvalStatus: normalizeApprovalStatus(data),
  }
}

// ─── Normalization ──────────────────────────────────────────────

function normalizeApprovalStatus(data: Record<string, unknown>): DashboardApprovalStatus {
  return {
    workUnitId: asString(data.workUnitId, ""),
    latestApprovalId: asStringOrNull(data.latestApprovalId),
    latestActionPreviewId: asStringOrNull(data.latestActionPreviewId),
    status: asStatusValue(data.status),
    approved: Boolean(data.approved),
    rejected: Boolean(data.rejected),
    expired: Boolean(data.expired),
    used: Boolean(data.used),
    createdAt: asStringOrNull(data.createdAt),
    expiresAt: asStringOrNull(data.expiresAt),
    usedAt: asStringOrNull(data.usedAt),
  }
}

function asStatusValue(value: unknown): DashboardApprovalStatus["status"] {
  if (value === "none" || value === "pending" || value === "approved" || value === "rejected" || value === "expired" || value === "used") {
    return value
  }
  return "none"
}

// ─── Helpers ────────────────────────────────────────────────────

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

async function readSafeError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({}))
  return isRecord(data) && typeof data.error === "string" ? data.error : fallback
}
