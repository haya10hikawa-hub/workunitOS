/**
 * Dashboard Execution Dry-Run Client
 *
 * Client-safe helper for running execution dry-run verification.
 * Sends only safe fields — no approvalId, hashes, tenant/user/role,
 * tokens, secrets, or raw payloads.
 *
 * Security:
 * - No React, D1, repository, or route imports.
 * - No client-owned hashes or approval internals.
 * - Handles non-JSON responses safely.
 * - Raw server errors are never exposed to callers.
 */

// ─── Types ──────────────────────────────────────────────────────

export type DryRunRequest = {
  readonly workUnitId: string
  readonly previewRefs: readonly { readonly actionId: string; readonly previewId: string }[]
  readonly requestedActionType: string | null
}

export type DryRunResult =
  | { readonly ok: true; readonly status: "verified"; readonly reason: string; readonly actionCount: number }
  | { readonly ok: true; readonly status: "blocked"; readonly reason: string; readonly actionCount: number }
  | { readonly ok: true; readonly status: "not_ready"; readonly reason: string; readonly actionCount: number }
  | { readonly ok: false; readonly error: string }

// ─── Client ─────────────────────────────────────────────────────

export async function runDashboardExecutionDryRun(
  input: DryRunRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<DryRunResult> {
  const response = await fetchImpl(
    `/api/workunit/${encodeURIComponent(input.workUnitId)}/execution/dry-run`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workUnitId: input.workUnitId,
        previewRefs: input.previewRefs.map((ref) => ({
          actionId: ref.actionId,
          previewId: ref.previewId,
        })),
        requestedActionType: input.requestedActionType,
        // NEVER send: approvalId, targetHash, payloadHash,
        // tenantId, userId, approvedByUserId, role,
        // status, usedAt, tokens, secrets, rawPayload, rawBody
      }),
    },
  )

  if (!response.ok) {
    const errorText = await readSafeError(response)
    return { ok: false, error: errorText }
  }

  let data: Record<string, unknown>
  try {
    data = await response.json()
  } catch {
    return { ok: false, error: "Invalid dry-run response from server." }
  }

  // Validate response shape
  if (data.ok !== true || typeof data.status !== "string" || typeof data.reason !== "string") {
    return { ok: false, error: "Invalid dry-run response from server." }
  }

  const status = data.status as string
  if (status !== "verified" && status !== "blocked" && status !== "not_ready") {
    return { ok: false, error: "Invalid dry-run response from server." }
  }

  return {
    ok: true,
    status,
    reason: data.reason as string,
    actionCount: typeof data.actionCount === "number" ? data.actionCount : 0,
  }
}

// ─── Helpers ────────────────────────────────────────────────────

async function readSafeError(response: Response): Promise<string> {
  const data = await response.json().catch(() => ({}))
  if (typeof data === "object" && data !== null && typeof (data as Record<string, unknown>).error === "string") {
    return (data as Record<string, unknown>).error as string
  }
  return "Dry-run verification failed."
}
