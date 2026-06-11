/**
 * Shared In-Memory Stores (Dev/Test Only)
 *
 * Provides shared in-memory storage for ActionPreview and ApprovalRecord
 * objects so that the lifecycle endpoints and the tools execution path
 * can share state during development and testing.
 *
 * NOT SAFE FOR PRODUCTION:
 *   - No persistence
 *   - No atomicity
 *   - State lost on restart
 *   - Not tenant-isolated
 *
 * PRODUCTION requires D1-backed repositories.
 */

// ─── Stores ──────────────────────────────────────────────────────

let previewStore: Map<string, Record<string, unknown>> | null = null
let approvalStore: Map<string, Record<string, unknown>> | null = null

function getPreviewStore(): Map<string, Record<string, unknown>> {
  if (!previewStore) previewStore = new Map()
  return previewStore
}

function getApprovalStore(): Map<string, Record<string, unknown>> {
  if (!approvalStore) approvalStore = new Map()
  return approvalStore
}

// ─── Preview Operations ─────────────────────────────────────────

export function savePreview(preview: Record<string, unknown>): void {
  getPreviewStore().set(preview.id as string, preview)
}

export function findPreviewById(id: string): Record<string, unknown> | null {
  return getPreviewStore().get(id) ?? null
}

export function findPreviewsByWorkUnitId(workUnitId: string): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = []
  getPreviewStore().forEach((v) => {
    if (v.workUnitId === workUnitId) result.push(v)
  })
  return result
}

// ─── Approval Operations ────────────────────────────────────────

export function saveApproval(approval: Record<string, unknown>): void {
  getApprovalStore().set(approval.id as string, approval)
}

export function findApprovalById(id: string): Record<string, unknown> | null {
  return getApprovalStore().get(id) ?? null
}

// ─── Test Helpers ───────────────────────────────────────────────

export function resetSharedStoresForTests(): void {
  previewStore = null
  approvalStore = null
}
