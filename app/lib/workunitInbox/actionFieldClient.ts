/**
 * Action Field Client Helpers
 *
 * Client-side API call functions for the WorkUnit Inbox Action Field.
 * Never sends hashes, tenantId, or secrets.
 *
 * Legacy path: kept for the standalone WorkUnitActionField component.
 * Canonical dashboard Preview / Approval client lives in app/lib/application/actionField/.
 */

import type { InboxWorkUnit } from "./types"
import { buildActionPreviewFromInboxWorkUnit } from "./actionPreviewMapping"

// ─── Types ──────────────────────────────────────────────────────

export type PreviewResult =
  | { ok: true; preview: Record<string, unknown> }
  | { ok: false; error: string }

export type ApprovalResult =
  | { ok: true; approval: Record<string, unknown> }
  | { ok: false; error: string }

// ─── Create Preview ─────────────────────────────────────────────

export async function createActionPreview(wu: InboxWorkUnit): Promise<PreviewResult> {
  const mapping = buildActionPreviewFromInboxWorkUnit(wu)

  try {
    const res = await fetch(`/api/workunit/${wu.id}/action-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionType: mapping.actionType,
        target: mapping.targetPreview,
        payload: mapping.payloadPreview,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: (data.error ?? "Preview creation failed") as string }
    }

    const data = await res.json()
    return { ok: true, preview: data.preview }
  } catch {
    return { ok: false, error: "Network error creating preview" }
  }
}

// ─── Approve Preview ────────────────────────────────────────────

export async function approveActionPreview(
  workUnitId: string,
  actionPreviewId: string,
  decision: "approve" | "reject" = "approve",
): Promise<ApprovalResult> {
  try {
    const res = await fetch(`/api/workunit/${workUnitId}/approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionPreviewId, decision }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: (data.error ?? "Approval failed") as string }
    }

    const data = await res.json()
    return { ok: true, approval: data.approval }
  } catch {
    return { ok: false, error: "Network error approving preview" }
  }
}
