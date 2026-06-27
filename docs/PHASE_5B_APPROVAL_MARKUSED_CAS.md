# Phase 5B: Approval `markUsed` Atomic Compare-and-Set Hardening

**Status:** Alpha Hardening Only
**Commercial SaaS Production:** No-Go
**External Execution:** No-Go
**Live Provider Integration:** No-Go

## Problem

One-time-use enforcement previously had a check-then-act (TOCTOU) gap:

1. `verifyApproval(...)` **read** the record and confirmed it was approved, unused, and unexpired.
2. `markApprovalUsed(...)` then issued an **unconditional** `UPDATE ... SET status='used'`.

Between the read and the write, a second concurrent (or replayed) request could pass the
same verification, and the unconditional update could not detect that the approval had
already been consumed — so two requests could both proceed. The update could also revive a
`rejected`/`expired` record to `used`.

## Change

`markUsed` is now an **atomic compare-and-set (CAS)**. The row transitions to `used` only
when, at the moment of the write, it is:

- `tenant_id` matched (tenant-scoped), and
- `status = 'approved'`, and
- `used_at IS NULL` (not already used), and
- `expires_at > <now>` (not expired).

```sql
UPDATE approval_records
   SET status = 'used', used_at = ?
 WHERE tenant_id = ? AND id = ?
   AND status = 'approved'
   AND used_at IS NULL
   AND expires_at > ?
```

The repository reports whether **this** call won the claim:

- D1 repo: `meta.rows_written === 1` → claimed (returns the row); `0` → not claimed (returns `null`).
- In-memory repo: same guards, returns the row or `null`.
- `ApprovalStore.markApprovalUsed` now returns `boolean` (`true` = claimed). `defaultDenyApprovalStore`
  always returns `false`.

The execute path (`toolBackend.ts`) **fails closed**: if the claim is not won (already used,
expired, or a concurrent winner), it returns `approval_used` instead of proceeding. This makes
the CAS — not the earlier read — the point that actually authorizes a single use.

## Safety properties

- An approval can be consumed **at most once**, even under concurrency or replay.
- Cross-tenant `markUsed` cannot consume another tenant's approval.
- Expired / non-approved records cannot be marked used.
- Dry-run is unchanged and still never marks approvals used.
- No new execution, no provider calls, no secrets, no network. The kill switch and all upstream
  gates remain in force.

## Scope / boundaries

- This is alpha hardening of approval one-time-use semantics only.
- Commercial SaaS production remains **No-Go**.
- External execution remains **No-Go**.
- Live provider integration remains **No-Go**.
- OAuth/token vault and billing remain **No-Go**.

## Tests

`tests/approvalMarkUsedCas.test.mts` covers the D1 and in-memory CAS matrices (claim, replay,
expiry, non-approved, wrong-tenant, concurrent single-claim), the store-level one-time claim,
and source-scan guards. The D1 fake (`tests/helpers/fakeD1.ts`) was upgraded to model
conditional `UPDATE` semantics and `rows_written` so the CAS is exercised faithfully.

## Follow-on phases

| Item | Phase |
|------|-------|
| Explicit `approvalId` + `actionPreviewId` binding (no "latest approval" ambiguity) | 5C |
| ActionPreview D1 `mapRow` JSON parse/serialize hardening | 5D |
| Tenant-secret HMAC-SHA256 hash binding + migration | 5E |
