# REAL_LLM_READINESS_GATE.md

## Purpose

Phase 1E defines the readiness gate required before any future real LLM provider integration.

This document does not authorize provider integration. It defines when Phase 2 may be considered for review.

## Go Conditions

Phase 2 readiness is Go only when all conditions are true:

- provider integration is disabled by default
- feature flag is required
- global kill switch is required
- tenant allowlist is required
- budget limit is required
- redaction policy is required
- audit logging policy is required
- P0 exclusion scanner is required
- prompt/context field allowlist is required
- raw provider payload is forbidden
- approvalId, hashes, tenantId, userId, and role are forbidden in model context
- provider output cannot create Formal Node, Approval, or Execution
- human review remains required
- external execution remains disabled

## No-Go Conditions

Phase 2 is No-Go if any condition above is missing or weakened.

Readiness Go is readiness only. It does not connect a provider, create a route, persist candidates, or enable execution.

## Forbidden in Phase 1E

- real provider calls
- provider SDK imports
- live API calls
- external execution
- UI changes
- candidate persistence
- database writes
- migrations
- approval creation
- execution creation
- auto Formalization
