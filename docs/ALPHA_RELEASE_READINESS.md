# Alpha Release Readiness

**Phase:** 7C (final consolidation)
**Status:** Conditional alpha only — not production, not Electron

## Executive Summary

WorkUnit OS / Atra has completed safety-hardening Phases 5B–7B. The system is
**conditionally safe for a constrained alpha** (local technical demo, closed alpha,
customer-observed pilot) **only** while external execution is disabled, real provider
writes are disabled, no production secrets are packaged, human approval is required,
the validation suite passes, the alpha safety gate passes, and limitations are
disclosed. It is **not** ready for commercial SaaS production or any Electron release.

## Product Principle

> **AI proposes. Rules guard. Humans decide.**

- AI must not approve.
- AI must not execute external actions.

## Final Readiness Verdict

**Conditional alpha only.** External execution, real provider writes, commercial SaaS
production, and all Electron release modes remain **No-Go**.

## Release Mode Matrix

| Release mode | Status |
|--------------|--------|
| Local technical demo | **Conditional Go** |
| Closed alpha | **Conditional Go** |
| Customer-observed pilot | **Conditional Go** |
| Commercial SaaS production | **No-Go** |
| Electron desktop alpha | **No-Go** |
| Electron production release | **No-Go** |

## Conditional Go Modes

Local technical demo, closed alpha, and customer-observed pilot are **Conditional Go
only** while all of these hold:

- External execution is disabled (kill switch off).
- Real provider writes are disabled.
- No production secrets / provider tokens / tenant-secret material are packaged.
- Human approval is required.
- `npm test` / `npm run alpha:safety-gate` / `lint` / `build` / `cf:build` pass.
- The audit-log path is present.
- Known limitations are disclosed to participants.

If any condition fails, the mode drops to **No-Go**.

## No-Go Modes

- Commercial SaaS production: **No-Go**.
- Electron desktop alpha: **No-Go**.
- Electron production release: **No-Go**.
- External execution: **No-Go**.
- Live provider writes: **No-Go**.
- OAuth/token vault: **No-Go**.
- Billing: **No-Go**.
- Real provider writes: **No-Go**.

## Required Validation Commands

```
npm test
npm run alpha:safety-gate
npm run lint
npm run build
npm run cf:build
git diff --check
```

The alpha safety gate must pass before any alpha demo/pilot claim.

## Required Evidence Before Alpha Use

- `npm test`: exact count, 0 failures.
- `npm run alpha:safety-gate`: pass.
- `npm run lint`: 0 errors, 0 warnings.
- `npm run build`: pass.
- `npm run cf:build`: pass.
- `git diff --check`: pass.
- External execution confirmed disabled (`EXTERNAL_ACTIONS_ENABLED` unset/false).
- Disclosed limitations acknowledged by participants.

## Completed Safety Layers

| Phase | Layer |
|-------|-------|
| 5B | Approval `markUsed` atomic compare-and-set (one-time-use) |
| 5C | Approval ↔ ActionPreview explicit binding |
| 5D | ActionPreview D1 JSON mapping hardening (fail-safe) |
| 5E | Tenant-secret HMAC-SHA256 helper + explicit legacy SHA-256 |
| 6A | D1 schema integrity inventory + Electron constraints |
| 6B | Tenant-scoped composite D1 indexes (additive) |
| 6C | Repository tenant-boundary invariant enforcement |
| 7A | Alpha safety checklist + Go/No-Go matrix |
| 7B | Automated alpha safety gate + PR validation contract |

## Phase 5B: Approval markUsed CAS

One-time-use is enforced by an atomic compare-and-set
(`status='approved' AND used_at IS NULL AND expires_at > now`, tenant-scoped). No
TOCTOU; concurrent callers yield exactly one success.

## Phase 5C: Approval-Preview Explicit Binding

Verification binds an approval to a specific ActionPreview
(`approval.actionPreviewId === actionPreviewId`), with server-side hash matching and
tenant/workUnit scope. No latest/workUnit-only approval lookup is used for
verification.

## Phase 5D: ActionPreview JSON Hardening

`target_preview` / `payload_preview` JSON columns are serialized once and read
verbatim only when valid; malformed rows are treated as absent (never fabricated).

## Phase 5E: Tenant-Secret HMAC Helper / Legacy Compatibility

A tenant-secret HMAC-SHA256 helper/verifier exists with explicit legacy SHA-256
compatibility. Low-level helpers read no runtime environment and never expose the
raw secret. Record generation is **not** wired to HMAC yet (pending a tenant-secret
provider).

## Phase 6A: D1 Schema Inventory / Electron Constraint

The D1 schema, repository read/write paths, and code-enforced vs DB-enforced
invariants are inventoried. Electron constraints are documented (server-authoritative
approval; local state not an approval source).

## Phase 6B: Tenant-Scoped D1 Indexes

Additive, migration-safe tenant-prefixed composite indexes match repository query
patterns (including the markUsed CAS path). No destructive rebuild; missing FKs and
approval uniqueness deferred.

## Phase 6C: Repository Tenant Invariants

Every tenant-owned repository read/write is tenant-scoped; wrong-tenant reads return
null/[], wrong-tenant writes mutate nothing (`work_units.updateStatus` fixed to be
tenant-scoped).

## Phase 7A: Alpha Safety Checklist / Matrix

The release-mode Go/No-Go matrix and per-mode checklists are defined, with a
machine-readable `ALPHA_RELEASE_MATRIX.json`.

## Phase 7B: Automated Alpha Safety Gate

A dependency-free, read-only gate (`scripts/alpha-safety-gate.mjs`, 34 checks) fails
closed if any No-Go boundary or Phase 5B–6C guard is weakened. Invoke via
`npm run alpha:safety-gate`.

## External Action Policy

External execution is disabled by default and remains **No-Go**. Enabling it requires
a future explicit execution phase with provider write controls and preserved human
approval gating. Real provider writes remain **disabled**.

## Human Approval Policy

Human approval is **required**. AI proposes; rules guard; humans decide. LLM
confidence never skips Human Review.

## Preview / Approval / Execution Separation

- **Preview is not approval.**
- **Approval is not execution.**
- **Dry-run is not execution.**

## Dry-run Policy

Dry-run verifies readiness against the exact approval/preview binding and **never**
marks an approval used, never enables the Execute CTA, and never creates provider
request/response/execution payloads.

## D1 / Tenant Boundary Policy

- Approval records remain **server-authoritative**.
- ActionPreview verification remains **server/database-authoritative**.
- Every tenant-owned read/write is tenant-scoped; wrong-tenant access fails closed.

## Electron Policy

- Electron is **not implemented**; Electron desktop alpha and production release
  remain **No-Go**.
- Local desktop state is **not** an approval source.
- The renderer must not own tenant/user/role decisions.
- IPC/preload boundaries are future design work.
- Desktop packaging must not include secrets, provider tokens, tenant secrets, API
  keys, or live provider credentials.

## Secrets / Tokens / Provider Credentials Policy

No production secrets, provider tokens, tenant-secret material, API keys, or live
provider credentials are packaged or committed. Low-level hash helpers read no
runtime environment.

## Customer-Observed Pilot Disclosure

Participants must be told:

- The system **proposes** only; humans approve and execute **outside** the system.
- No external writes are performed on the customer's behalf.
- No customer production secrets are stored.
- Data handling is alpha-grade: no formal retention/deletion policy yet; durability
  is not guaranteed.
- Incident contact and rollback expectations are provided.

## Known Limitations

- HMAC keying is helper-only (records still use legacy SHA-256).
- Tenant isolation for several read paths is code-enforced (post-filter), not
  SQL-scoped.
- The in-memory rate limiter is dev/alpha-safe only.
- The FakeD1 test double does not enforce DB FK/CHECK/UNIQUE.
- No production monitoring/alerting, backup/restore, or retention policy yet.

## Remaining Blockers

See the next three sections.

## Required Next Work Before SaaS Production

- OAuth / token vault.
- Billing / usage enforcement.
- Production-grade tenant-secret storage (HMAC keying wired to records).
- Live provider write controls (explicit execution phase).
- Legal / privacy / security review.
- Production monitoring / alerting.
- Incident response process.
- Backup / restore.
- Data retention / deletion policy.
- Durable rate limiter (replace in-memory).

## Required Next Work Before Electron Alpha

- Electron architecture decision record (ADR).
- main / preload / renderer trust boundaries.
- `nodeIntegration` disabled; `contextIsolation` required.
- IPC allowlist (narrow commands only).
- Local storage policy (not an approval source).
- Packaged secrets forbidden.
- Update / code-signing strategy.
- Server-authoritative approval verification preserved.

## Required Next Work Before Electron Production

All Electron Alpha items **and** all SaaS Production items, plus a desktop-specific
security review (renderer sandbox, auto-update integrity, local data encryption).

## Final Go / No-Go Matrix

| Item | Status |
|------|--------|
| Local technical demo | Conditional Go |
| Closed alpha | Conditional Go |
| Customer-observed pilot | Conditional Go |
| Commercial SaaS production | No-Go |
| Electron desktop alpha | No-Go |
| Electron production release | No-Go |
| External execution | No-Go |
| Live provider writes | No-Go |
| Live Real LLM integration | No-Go |
| Live provider adapter | No-Go |
| OAuth/token vault | No-Go |
| Billing | No-Go |
| Real provider writes | No-Go |

## Appendix: Commands

```
npm test
npm run alpha:safety-gate
npm run lint
npm run build
npm run cf:build
git diff --check
```

---

Phase 5B CAS, Phase 5C approval-preview binding, Phase 5D ActionPreview JSON
hardening, Phase 5E HMAC helper / explicit legacy compatibility, Phase 6A Electron
constraints, Phase 6B migration/index contract, Phase 6C repository tenant invariant
enforcement, Phase 7A release matrix, and Phase 7B alpha safety gate all remain
intact and unchanged by this phase.

## Subagent Audits (Phase 7C merge gate)

Named specialized subagents are unavailable in this environment; equivalent
independent audits were performed with evidence against the committed diff.

- **SecurityAuditSubAgent — Go:** readiness verdict is "conditional alpha only" and
  does not overclaim; commercial SaaS production / Electron alpha / Electron
  production remain No-Go; external execution and live provider writes disabled; human
  approval required; dry-run ≠ execution; preview ≠ approval; approval ≠ execution;
  local desktop state untrusted; alpha safety gate still passes; no Electron
  implementation; no provider SDK / `fetch` / secrets; HMAC helper reads no runtime
  env; `approvedByPm` not trusted.
- **ArchitectureAuditSubAgent — Go:** Phase 7C scope only (docs + JSON + tests); no
  new phase, no Electron, no migration, no repository rewrite, no app runtime change,
  no release/deployment automation; no Supabase; consolidates existing layers
  accurately; the JSON is static governance data only.
- **TestAuditSubAgent — Go:** the readiness doc, the summary JSON, and an actual gate
  invocation (exit 0) are tested; No-Go states, Conditional-Go caveats, and Electron
  blockers tested; Phase 5B/5C/5D/5E/6A/6B/6C/7A/7B guards still pass; full validation
  passes.
- **ProductGovernanceAuditSubAgent — Go:** commercial SaaS production / Electron modes
  No-Go; closed alpha Conditional-Go only with external execution disabled; pilot
  limitations explicit; verdict reviewer-understandable; known blockers explicit; no
  readiness overclaim.
- **GitHygieneAuditSubAgent — Go:** branch from latest `main` after PR #49 merge; no
  unrelated/generated files committed; `desktop/` not committed; commit message
  matches Phase 7C.
