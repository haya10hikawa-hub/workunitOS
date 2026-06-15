# WorkUnit OS Docs

## Core Specs

- `ACTION_FIELD_SPEC.md` — Action Field UI/state model, trust levels, information separation
- `WORKUNIT_DOMAIN_MODEL.md` — domain types, lifecycle states
- `API_CONTRACT.md` — endpoint definitions, request/response shapes
- `ERROR_MODEL.md` — 14 safe error codes with HTTP statuses
- `DATA_MODEL.md` — D1 schema and persistence model
- `LLM_PROCESSING_MODEL.md` — LLM pipeline stages, prompts, trust boundaries

## Architecture

- `SAAS_ARCHITECTURE.md` — layered architecture, module map, dependency direction
- `docs/DEPENDENCY_MAP.md` — canonical file ownership and dependency chain
- `docs/CONTEXT_INDEX.md` — first-read context map for AI agents

## Security

- `SECURITY_MODEL.md` — trust architecture, kill switch, RBAC, session behavior, hash policy
- `TRUST_BOUNDARIES.md` — trust level enforcement
- `DEVELOPMENT_SECURITY_CHECKLIST.md` — pre-commit/pre-merge checklist

## Context Maps

- `docs/CONTEXT_INDEX.md` — minimal context bundles by task type
- `docs/DEPENDENCY_MAP.md` — canonical ownership, architecture debt, future reorganization

## Future Reorganization

A later docs tree cleanup may move root-level files into:

- `docs/specs/` — Core spec documents
- `docs/security/` — Security model, boundaries, checklist
- `docs/architecture/` — Architecture, dependency maps
- `docs/operations/` — Deployment, setup, hygiene
- `docs/context/` — AI agent first-read maps
