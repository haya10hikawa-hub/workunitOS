/**
 * Phase 5E: Tenant-secret provider contract (interface only).
 *
 * This declares the shape of a future tenant-secret provider used to key
 * HMAC-SHA256 hash binding (see hash.ts: computeTenantHmacSha256Hash /
 * verifyHashBinding). It is intentionally an interface with NO implementation:
 *
 *   - Real tenant-secret storage is future OAuth / token-vault / security
 *     infrastructure work and remains No-Go for commercial SaaS production.
 *   - There is no production resolver here, and there is deliberately no default
 *     or fallback secret — production must never silently use an unkeyed digest.
 *   - This module reads no environment, performs no I/O, and holds no secret.
 *
 * Low-level hashing stays pure: callers inject the resolved secret into the hash
 * helpers as an argument; the helpers never read it from the environment.
 */

import type { TenantId } from "../tenant/types.ts"

/**
 * Resolves the per-tenant secret used to key HMAC-SHA256 hash binding.
 *
 * A real implementation must source the secret from secure tenant-scoped storage
 * (future work). Implementations must never log, serialize, or otherwise expose
 * the returned secret. Returning null/undefined means "no secret available" — the
 * caller must fail closed (no unkeyed fallback).
 */
export interface TenantSecretProvider {
  resolveTenantSecret(tenantId: TenantId): Promise<string | null>
}
