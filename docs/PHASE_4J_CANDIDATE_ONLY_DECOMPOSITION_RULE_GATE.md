# Phase 4J: Candidate-only Decomposition Rule Gate Boundary

**Status:** Pure Rule Gate Only
**Live Provider Integration:** No-Go
**External Execution:** No-Go

## Summary

Phase 4J gates candidate-only decomposition classifier results:

- `allow_candidate_only_decomposition` — valid workunit_candidate
- `request_candidate_clarification` — clarification needed
- `block_candidate_only_decomposition` — blocked or invalid contract

Covers: classifier result → rule gate → gated candidate decision.

## Gate Rules

| Classifier State | Gate Decision |
|------------------|---------------|
| `workunit_candidate` with valid contract | `allow_candidate_only_decomposition` |
| `clarification_needed` | `request_candidate_clarification` |
| `blocked_candidate` or blocked decision | `block_candidate_only_decomposition` |
| `candidateOnly` false | `block` (contract_invalid) |
| Any inherited safety flag true | `block` (contract_invalid) |
| Inconsistent shapes | `block` (shape_invalid) |

## Invariants

- Single type-only import from Phase 4I
- `candidateOnly: true`, `ruleGateEvaluated: true`
- All safety and disconnected flags: `false`

## Safety

- No runtime SDK, fetch, env, secrets
- No adapter/routing/4F-4I runtime calls
- Never creates providerRequest, providerResponse, approval, or execution payloads
- All boundaries: No-Go
