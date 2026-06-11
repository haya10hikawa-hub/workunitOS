# Security Model

## Trust Architecture

WorkUnit OS has a strict trust boundary model. Nothing from the client,
external sources, or AI output is trusted by default.

### Trust Levels

```
Untrusted Source → Sanitized Candidate → WorkUnit Draft → Server Approval → Execution
```

Each level carries a different trust:

| Level | Trust | Source |
|-------|-------|--------|
| Untrusted Source | Zero | Slack, Gmail, GitHub, Calendar, Notion, Drive |
| Sanitized Candidate | Low | Extracted metadata only — no raw body |
| WorkUnit Draft | Medium | AI/system-generated, human-reviewable |
| Server Approval | High | Server-side record, not client flag |
| Execution | Controlled | Server-generated, approved, audited |

### What Is Never Trusted

1. **Client-provided `approvedByPm`** — stripped before reaching backend
2. **Client-provided `externalConfig`** — stripped; targets resolve server-side
3. **Raw source content** — Slack body, Gmail body, Notion page body, Drive file content
4. **AI output** — always treated as draft until human review
5. **Frontend state** — any React state can be tampered with

## Session and Authentication

### Production

In production (`NODE_ENV === "production"`), `requireSession()` returns `unauthorized`.
No anonymous or dev session is allowed. Real authentication must be implemented
before deploying to production.

### Development

In development, `requireSession()` requires explicit opt-in:

```bash
ALLOW_DEV_SESSION="true"  # Required for local development
```

Without this env var, dev also returns `unauthorized`.

To test RBAC enforcement locally, set the dev session role:

```bash
DEV_SESSION_ROLE="viewer"  # Default: owner
```

### Session Resolution

`requireSession()` is the single integration point for authentication.
When real auth is added:
1. Extract session token from cookie or Authorization header
2. Validate token (JWT or opaque token lookup)
3. Resolve user's tenant and role
4. Return typed Session

Current dev session:
- userId: `dev-user`
- tenantId: `dev-tenant`
- role: configurable via `DEV_SESSION_ROLE` (default: `owner`)

## RBAC Enforcement

Every mutating operation on `/api/workunit/tools` is checked against RBAC.

### Operation → Permission Mapping

| Operation      | Required Permission                    |
| -------------- | -------------------------------------- |
| ingest         | `workunit.create`                      |
| draft          | `workunit.create`                      |
| create_task    | `workunit.create`                      |
| reply          | `workunit.execute_external_action`     |
| schedule       | `workunit.execute_external_action`     |
| create_issue   | `workunit.execute_external_action`     |

### Enforcement Order

The route enforces in this order:
1. Resolve requestId
2. Write audit: `tool_request_received`
3. Require session → `401 unauthorized` if missing
4. Parse JSON as unknown
5. Validate request body → `400 invalid_request`
6. Write audit: validation result
7. Map operation to required permission
8. Assert permission → `403 forbidden` if denied
9. Write audit: `rbac_denied` if denied
10. Check kill switch for external ops → `403 external_actions_disabled`
11. Execute via `runToolBackendRequest`
12. Map backend errors to safe codes
13. Write audit: result
14. Return safe response

## External Action Kill Switch

All external actions (reply, schedule, create_issue) are blocked by default.

```bash
EXTERNAL_ACTIONS_ENABLED="true"  # Required for any external execution
```

Without this env var set to exactly `"true"`, the system returns `403 external_actions_disabled`.

The kill switch is checked in **two places** (double guard):
1. `app/api/workunit/tools/route.ts` — API boundary
2. `app/lib/toolBackend.ts` — backend function (safe even if called from elsewhere)

## Server-Side Approval

External actions require server-side approval. The approval model:

- Each external action creates an `ActionApprovalRecord`
- Record is stored server-side (database — deferred)
- Record includes: tenant ID, work unit ID, action type, target hash, payload hash
- Status transitions: `pending → approved → used` or `pending → rejected`
- Records expire (configurable TTL, default 60 minutes)
- Client `approvedByPm` flag is ignored — only server-side records authorize execution

Current state: `verifyServerSideApproval` defaults to deny. Returns `approval_required`.

## RBAC

Role-based access control with five roles:

| Role | Permissions |
|------|------------|
| owner | All permissions including tenant management |
| admin | Read, create, edit, approve, execute, manage integrations, read audit |
| pm | Read, create, edit, approve external actions |
| member | Read, create, edit work units |
| viewer | Read only |

Permission checks are centralized in `app/lib/security/rbac.ts`. No ad-hoc role checks elsewhere.

## Tenant Isolation

Multi-tenant isolation via branded types (`TenantId`, `UserId`, `WorkUnitId`):

- Every resource is owned by a tenant
- `assertTenantBoundary()` enforces cross-tenant access prevention
- Development mode uses `"dev-tenant"` — explicitly marked unsafe for production

## Validation

All API input is validated at runtime:

- `app/lib/toolBackendValidation.ts` — validates tool backend requests
- Treats `request.json()` as `unknown`, not `ToolBackendRequest`
- Validates: id, source, operation, operation/source combo, draft shape, event presence
- Enforces string length (10K) and array length (500) limits
- Strips `approvedByPm` and `externalConfig` before backend dispatch
- Returns `400 invalid_request` with no internal detail

## Error Handling

Only safe error codes are returned to clients:

- `400 invalid_request` — malformed payload
- `403 external_actions_disabled` — kill switch active
- `403 forbidden` — RBAC denied
- `500 internal_error` — unexpected server error

No stack traces, environment values, tokens, or implementation details are leaked.

## Audit Logging

Audit event vocabulary is defined in `app/lib/security/auditLog.ts`:

- `tool_request_received`, `tool_request_validated`, `tool_request_rejected`
- `external_action_blocked`, `external_action_approved`, `external_action_executed`, `external_action_failed`
- `tenant_boundary_violation`, `rbac_denied`

Current implementation is no-op (console in dev with `AUDIT_LOG_VERBOSE=true`).
Database persistence is deferred.

## Production Blockers

Before production SaaS:

- [ ] Authentication (session management, OAuth/OIDC)
- [ ] Tenant isolation enforcement (not just types)
- [ ] RBAC enforcement wired to every endpoint
- [ ] Server-side approval persistence (database)
- [ ] Per-tenant OAuth token vault (encrypted at rest)
- [ ] Rate limiting
- [ ] CSRF / session hardening
- [ ] Audit log storage (database or SIEM)
- [ ] External action review UI
- [ ] Prompt injection red-team testing
- [ ] Penetration testing

## What Is Safe Today

- Ingest and draft operations work without external execution risk
- External actions cannot run without `EXTERNAL_ACTIONS_ENABLED="true"`
- Client cannot authorize execution via `approvedByPm`
- Client cannot choose arbitrary execution targets via `externalConfig`
- API input is runtime-validated, not just TypeScript-cast
- Error responses don't leak internals
- Security boundaries exist in code, not just comments
