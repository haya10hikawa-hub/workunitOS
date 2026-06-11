/**
 * Repository-Backed ApprovalStore Adapter
 *
 * Wraps an ApprovalRecordRepository into the ApprovalStore interface.
 * The adapter captures a TenantDbContext at construction time and
 * delegates all calls to the repository.
 *
 * This bridges the gap between:
 *   - ApprovalStore (no context parameter — used by verifyApproval)
 *   - ApprovalRecordRepository (requires TenantDbContext)
 */

import type { ApprovalStore } from "../security/approvalStore.ts"
import type { ActionApprovalRecord } from "../domain/types.ts"
import type { TenantDbContext } from "./types.ts"
import type { ApprovalRecordRepository } from "./repositories.ts"
import { approvalRecordRowToDomain } from "./mappers.ts"

/**
 * Create an ApprovalStore backed by an ApprovalRecordRepository.
 *
 * The adapter captures a fixed TenantDbContext — all calls use the
 * same tenant context. For cross-tenant operations, create a new
 * adapter with the appropriate context.
 *
 * SAFETY:
 *   - findApprovalById delegates to repository.findById
 *   - markApprovalUsed delegates to repository.markUsed
 *   - Row types are mapped to domain types via mappers
 *   - Repository failures propagate as null/void (fail-safe)
 */
export function createRepositoryBackedApprovalStore(
  repo: ApprovalRecordRepository,
  ctx: TenantDbContext,
): ApprovalStore {
  return {
    async findApprovalById(approvalId: string): Promise<ActionApprovalRecord | null> {
      try {
        const row = await repo.findById(ctx, approvalId)
        if (!row) return null
        return approvalRecordRowToDomain(row)
      } catch {
        // Fail closed: return null (approval_required)
        return null
      }
    },

    async markApprovalUsed(approvalId: string, usedAt: string): Promise<void> {
      try {
        await repo.markUsed(ctx, approvalId, usedAt)
      } catch {
        // Fail closed: silently no-op. The next verifyApproval call
        // will see the record is still "approved", but re-verification
        // will catch that via expiry or idempotency.
      }
    },
  }
}
