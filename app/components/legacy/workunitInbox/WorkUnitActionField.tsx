"use client"

/**
 * Legacy standalone Action Field.
 * Canonical Action Field ownership is the dashboard drawer path.
 */

import { useState } from "react"
import type { InboxWorkUnit } from "@/app/lib/workunitInbox/types"
import { createActionPreview, approveActionPreview } from "@/app/lib/workunitInbox/actionFieldClient"

// ─── Props ──────────────────────────────────────────────────────

type Props = {
  wu: InboxWorkUnit | null
}

type PreviewState =
  | { status: "idle" }
  | { status: "creating" }
  | { status: "failed"; error: string }
  | { status: "ready"; previewId: string; targetHash: string; payloadHash: string }

type ApprovalState =
  | { status: "idle" }
  | { status: "approving" }
  | { status: "approved"; approvalId: string; expiresAt?: string }
  | { status: "rejected" }
  | { status: "failed"; error: string }

// ─── Component ──────────────────────────────────────────────────

export function WorkUnitActionField({ wu }: Props) {
  const [previewState, setPreviewState] = useState<PreviewState>({ status: "idle" })
  const [approvalState, setApprovalState] = useState<ApprovalState>({ status: "idle" })

  if (!wu) {
    return (
      <div style={{ padding: 16, border: "1px solid #333", borderRadius: 8, background: "#111" }}>
        <div style={{ fontSize: 12, color: "#555" }}>
          Select a WorkUnit to see recommended actions
        </div>
      </div>
    )
  }

  async function handleCreatePreview() {
    setPreviewState({ status: "creating" })
    const result = await createActionPreview(wu!)
    if (result.ok) {
      setPreviewState({
        status: "ready",
        previewId: result.preview.id as string,
        targetHash: result.preview.targetHash as string,
        payloadHash: result.preview.payloadHash as string,
      })
    } else {
      setPreviewState({ status: "failed", error: result.error })
    }
  }

  async function handleApprove() {
    if (previewState.status !== "ready") return
    setApprovalState({ status: "approving" })
    const result = await approveActionPreview(wu!.id, previewState.previewId)
    if (result.ok) {
      setApprovalState({
        status: "approved",
        approvalId: result.approval.id as string,
        expiresAt: result.approval.expiresAt as string | undefined,
      })
    } else {
      setApprovalState({ status: "failed", error: result.error })
    }
  }

  async function handleReject() {
    if (previewState.status !== "ready") return
    setApprovalState({ status: "approving" })
    const result = await approveActionPreview(wu!.id, previewState.previewId, "reject")
    if (result.ok) {
      setApprovalState({ status: "rejected" })
    } else {
      setApprovalState({ status: "failed", error: result.error })
    }
  }

  return (
    <div style={{ padding: 16, border: "1px solid #333", borderRadius: 8, background: "#16161e" }}>
      <div style={{ fontSize: 13, color: "#aaa", marginBottom: 4 }}>
        Action Field
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, color: "#ddd", marginBottom: 8 }}>
        {wu.title}
      </div>

      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
        Kind: {wu.kind.replace(/_/g, " ")} · Source: {wu.sourceProvider}
      </div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
        Recommended: {wu.nextAction}
      </div>
      <div style={{
        padding: "8px 10px", fontSize: 12, color: "#777",
        border: "1px solid #333", borderRadius: 4, background: "#111",
        marginBottom: 10,
      }}>
        Draft workspace for {wu.kind.replace(/_/g, " ")} action
        {wu.repository && <div style={{ marginTop: 4 }}>Repo: {wu.repository}</div>}
        {wu.sourceUrl && <div style={{ marginTop: 2, wordBreak: "break-all" }}>{wu.sourceUrl}</div>}
      </div>

      {/* ── Preview State Machine ──────────────────────────── */}
      {previewState.status === "idle" && (
        <button onClick={handleCreatePreview} style={primaryBtn}>
          Create Preview
        </button>
      )}

      {previewState.status === "creating" && (
        <div style={{ fontSize: 12, color: "#aaa" }}>Creating preview…</div>
      )}

      {previewState.status === "failed" && (
        <div>
          <div style={{ fontSize: 12, color: "#d44", marginBottom: 6 }}>{previewState.error}</div>
          <button onClick={handleCreatePreview} style={secondaryBtn}>
            Retry
          </button>
        </div>
      )}

      {previewState.status === "ready" && (
        <div>
          <div style={{
            padding: "8px 10px", fontSize: 11, color: "#5a5",
            border: "1px solid #2a2", borderRadius: 4, background: "#111", marginBottom: 8,
            wordBreak: "break-all",
          }}>
            Preview ready: {previewState.previewId.slice(0, 40)}…
          </div>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>
            targetHash: {previewState.targetHash.slice(0, 16)}…
          </div>

          {/* ── Approval ────────────────────────────────────── */}
          {approvalState.status === "idle" && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleApprove} style={approveBtn}>
                ✓ Approve
              </button>
              <button onClick={handleReject} style={rejectBtn}>
                ✗ Reject
              </button>
            </div>
          )}

          {approvalState.status === "approving" && (
            <div style={{ fontSize: 12, color: "#aaa" }}>Submitting approval…</div>
          )}

          {approvalState.status === "approved" && (
            <div>
              <div style={{
                padding: "8px 10px", fontSize: 11, color: "#5af",
                border: "1px solid #24f", borderRadius: 4, background: "#111", marginBottom: 8,
              }}>
                ✓ Approved: {approvalState.approvalId.slice(0, 30)}…
              </div>
              <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>
                External execution is not enabled in this MVP step.
              </div>
              {approvalState.expiresAt && (
                <div style={{ fontSize: 11, color: "#555" }}>
                  Expires: {new Date(approvalState.expiresAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {approvalState.status === "rejected" && (
            <div style={{
              padding: "8px 10px", fontSize: 11, color: "#d84",
              border: "1px solid #d84", borderRadius: 4, background: "#111", marginBottom: 8,
            }}>
              ✗ Rejected
            </div>
          )}

          {approvalState.status === "failed" && (
            <div>
              <div style={{ fontSize: 12, color: "#d44", marginBottom: 6 }}>{approvalState.error}</div>
              <button onClick={handleApprove} style={secondaryBtn}>
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────

const primaryBtn: React.CSSProperties = {
  padding: "6px 14px", fontSize: 12, border: "1px solid #4af",
  borderRadius: 4, background: "#1a2030", color: "#8cf", cursor: "pointer",
}

const secondaryBtn: React.CSSProperties = {
  padding: "6px 14px", fontSize: 12, border: "1px solid #444",
  borderRadius: 4, background: "#1a1a1a", color: "#aaa", cursor: "pointer",
}

const approveBtn: React.CSSProperties = {
  padding: "6px 14px", fontSize: 12, border: "1px solid #2a2",
  borderRadius: 4, background: "#1a2a1a", color: "#5a5", cursor: "pointer",
}

const rejectBtn: React.CSSProperties = {
  padding: "6px 14px", fontSize: 12, border: "1px solid #a22",
  borderRadius: 4, background: "#2a1a1a", color: "#d64", cursor: "pointer",
}
