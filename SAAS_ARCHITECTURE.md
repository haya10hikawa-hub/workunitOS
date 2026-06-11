# SaaS Architecture

## Layered Architecture

```
┌─────────────────────────────────────────┐
│              Frontend (React)            │
│  WorkUnitOSDashboard, HopperMobileTui   │
│  Hooks: useWorkUnits, useStudio          │
│  Data: mockWorkUnits, mockHopperInputs   │
├─────────────────────────────────────────┤
│              API Layer (Next.js)          │
│  /api/workunit/tools                     │
│  Validation, kill switch, safe errors    │
├─────────────────────────────────────────┤
│           Security Boundary              │
│  Session, RBAC, Tenant, Audit, Approval  │
│  app/lib/security/                       │
├─────────────────────────────────────────┤
│           Domain Logic (app/lib)          │
│  toolBackend, workUnitSafety,            │
│  workUnitExecution, workUnitDrafts,      │
│  sourceHoppers, hopperEngine,            │
│  hopperAdaptiveFilter, hopperActionRouter│
├─────────────────────────────────────────┤
│          Integration Boundary            │
│  Slack, Gmail, GitHub, Google Calendar   │
│  externalToolClients, integrations/types │
├─────────────────────────────────────────┤
│         Persistence Layer (D1)           │
│  Control DB (users, tenants, memberships)│
│  Tenant DBs (work units, approvals, etc) │
│  Object Storage (raw bodies, exports)    │
│  app/lib/persistence/                    │
└─────────────────────────────────────────┘
```

## Module Map

### Security Layer (`app/lib/security/`)

| Module | Responsibility |
|--------|---------------|
| `externalActions.ts` | Kill switch, external op detection |
| `policy.ts` | Role/permission vocabulary |
| `rbac.ts` | Permission enforcement, policy functions |
| `session.ts` | Session resolution (dev placeholder) |
| `actionApproval.ts` | Server-side approval model |
| `auditLog.ts` | Audit event types + no-op logger |
| `safeErrors.ts` | Safe error response helpers |

### Domain Layer (`app/lib/`)

| Module | Responsibility |
|--------|---------------|
| `toolBackend.ts` | Tool backend router (ingest, draft, execute) |
| `toolBackendValidation.ts` | Runtime input validation |
| `workUnitSafety.ts` | Privacy regression, injection detection, approval check |
| `workUnitExecution.ts` | External action draft creation (GitHub, Slack, Gmail, Calendar) |
| `workUnitDrafts.ts` | Candidate→Draft conversion, draft lifecycle |
| `workUnitRanking.ts` | ROI calculation, push decision |
| `workUnitVoicePush.ts` | Proactive voice prompt, interruptibility |
| `sourceHoppers.ts` | Source event sanitization |
| `hopperEngine.ts` | Hopper processing pipeline |
| `hopperAdaptiveFilter.ts` | Adaptive threshold filter |
| `hopperActionRouter.ts` | Hopper→WorkUnit routing |
| `externalToolClients.ts` | HTTP clients for external APIs |
| `trustBoundaries.ts` | Trust level types and assertions |

### Persistence Layer (`app/lib/persistence/`)

| Module | Responsibility |
|--------|---------------|
| `types.ts` | Row types, TenantDbContext, ControlDbContext, TenantDatabaseRef |
| `repositories.ts` | Repository interfaces (WorkUnit, SourceCandidate, Approval, Audit, etc.) |

See `DATA_MODEL.md` for full D1 schema design.

### Tenant & Integration (`app/lib/tenant/`, `app/lib/integrations/`)

| Module | Responsibility |
|--------|---------------|
| `tenant/types.ts` | Branded TenantId, UserId, WorkUnitId, TenantContext |
| `integrations/types.ts` | Provider types, tenant-owned integration config |

### Type Definitions (`app/types/`)

| Module | Responsibility |
|--------|---------------|
| `sourceHopper.ts` | SourceHopperEvent, SanitizedWorkUnitCandidate, WorkUnitDraft |
| `toolBackend.ts` | ToolBackendRequest, ToolBackendResponse, ToolBackendOperation |
| `workunit.ts` | WorkUnit, Task, WorkUnitStatus, WorkUnitPriority |
| `decision.ts` | Decision-related types |
| `inbox.ts` | Inbox event types |
| `studio.ts` | Studio document types |
| `ui.ts` | App language, theme, timezone |

## Data Flow

```
1. External Source (Slack/Gmail/GitHub/Calendar/Drive/Notion)
   │  Untrusted raw content
   ▼
2. Source Hopper (sourceHoppers.ts)
   │  Strips raw body, extracts metadata only
   ▼
3. SanitizedWorkUnitCandidate
   │  Trust level: sanitized
   ▼
4. WorkUnit Draft Generator (workUnitDrafts.ts)
   │  AI/system generates structured draft
   ▼
5. WorkUnitDraft
   │  Trust level: draft — human review required
   ▼
6. Human Approval (server-side)
   │  PM approves/rejects via server-side record
   ▼
7. Execution (toolBackend.ts → externalToolClients.ts)
   │  Only after: kill switch ON, approval verified, RBAC passed
   ▼
8. External Execution Result
   │  Logged, auditable
```

## Key Design Decisions

1. **D1-first storage** — tenant-database isolation, structured data in D1, raw content in R2
2. **Branded types** — TenantId, UserId, WorkUnitId prevent accidental mixing
3. **Double guard** — kill switch checked at both API and backend layers
4. **Default deny** — external actions, approvals, and RBAC all default to deny
5. **Centralized policy** — permission checks in one place (rbac.ts)
6. **Safe errors only** — no internal details leaked in error responses
7. **Mock data for development** — real integrations deferred

## Extensibility Points

- **Add auth**: wire `requireSession()` to real token validation
- **Add database**: implement `writeAuditLog()` and `verifyServerSideApproval()` with real storage
- **Add tenant**: brand real tenant IDs and enforce in middleware
- **Add rate limiting**: hook into middleware or API routes
- **Add OAuth**: implement per-tenant token vault in `integrations/types.ts`
- **New integrations**: add to `IntegrationProvider` union, implement client
