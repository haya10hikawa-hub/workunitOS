# ACTION_FIELD_SPEC.md

# WorkUnit OS Action Field Specification

## 1. Purpose

The Action Field is the central workspace attached to a WorkUnit.

Current canonical UI location:

* `app/components/workunit-os/WorkUnitOSDashboard.tsx`
* `app/components/workunit-os/adopted/AdoptedWorkUnitDashboard.tsx`

The adopted v0 dashboard shell is now the official frontend design. It preserves the existing Preview / Approval API client boundary while keeping the accepted visual shell intact.
The adopted shell now binds the left WorkUnit list to `/api/workunit/inbox` and derives center/right pane content from the selected WorkUnit through application-level view-model mapping. This changes frontend data binding only; it does not change server trust boundaries.

It is where the user:

* reviews the WorkUnit context
* develops next actions
* drafts internal notes and task breakdowns
* sees AI-generated suggestions
* reviews external action payload previews before approval
* approves or rejects external actions
* sees execution results after actions complete

The Action Field is **not** an automatic execution field.

Editing workspace text in the Action Field must **never** silently trigger an external side effect.

---

## 2. Non-Goals

The Action Field is not:

* a raw prompt box for LLM queries
* a direct external send field (Slack send, email send, etc.)
* an approval record itself (approval is server-side)
* an execution command itself (execution is server-side)
* a hidden automation runner
* a data entry form for external API configuration

---

## 3. Information Separation Model

The Action Field must clearly separate the following information types.

Each type has a different trust level, editability, and relationship to external execution.

| Content Type             | Trust Level   | Editable | Can Trigger External | Domain Object         |
| ------------------------ | ------------- | -------- | -------------------- | --------------------- |
| Workspace text           | draft         | Yes      | **No**               | WorkUnitDraft         |
| AI suggestion            | draft         | Read-only| **No**               | WorkUnitDraft         |
| User-edited draft        | draft         | Yes      | **No**               | WorkUnitDraft         |
| External payload preview | reviewed      | Yes      | **No**               | ActionPreview         |
| Approval-bound payload   | approved      | Read-only| **No**               | ActionApprovalRecord  |
| Execution result         | executed      | Read-only| Already happened     | ExecutionResult       |
| System/security status   | system        | Read-only| N/A                  | policy.ts / safeErrors|

These information types must never be silently merged.

Example violation:

```txt
User writes "Please tell the team we're done" in workspace text.
System treats this as an approved Slack send payload.
```

This must never happen.

---

## 4. Action Field Sections

The Action Field is composed of distinct sections.

### 4.1 Context Summary

| Attribute    | Value                     |
| ------------ | ------------------------- |
| Purpose      | Show the WorkUnit context |
| Editable     | No                        |
| Trust level  | reviewed                  |
| External use | **No**                    |
| Domain type  | ReviewedWorkUnit          |

Content:

* WorkUnit title
* Situation summary
* Actors involved
* Source references
* Priority score

### 4.2 Problem / Decision

| Attribute    | Value                     |
| ------------ | ------------------------- |
| Purpose      | Define what needs to be decided or solved |
| Editable     | Yes                       |
| Trust level  | draft                     |
| External use | **No**                    |
| Domain type  | WorkUnitDraft             |

Content:

* Problem statement
* Decision required
* Impact if not addressed

### 4.3 Next Action

| Attribute    | Value                     |
| ------------ | ------------------------- |
| Purpose      | Define the immediate next step |
| Editable     | Yes                       |
| Trust level  | draft                     |
| External use | **No**                    |
| Domain type  | WorkUnitDraft             |

### 4.4 Task Breakdown

| Attribute    | Value                     |
| ------------ | ------------------------- |
| Purpose      | Break work into concrete tasks |
| Editable     | Yes                       |
| Trust level  | draft                     |
| External use | **No**                    |
| Domain type  | WorkUnitDraft             |

### 4.5 Draft Workspace

| Attribute    | Value                     |
| ------------ | ------------------------- |
| Purpose      | Free-form workspace for user notes, drafts, thinking |
| Editable     | Yes                       |
| Trust level  | draft                     |
| External use | **No**                    |
| Domain type  | WorkUnitDraft             |

Rules:

* User may write anything here
* AI may suggest content here
* Content is never treated as an execution command
* Saving workspace text does not trigger any action
* Workspace text is not automatically converted to an external payload

### 4.6 External Action Preview

| Attribute    | Value                     |
| ------------ | ------------------------- |
| Purpose      | Preview what would happen if the action executes |
| Editable     | Yes (before approval)     |
| Trust level  | reviewed → approved       |
| External use | **No** (preview only)     |
| Domain type  | ActionPreview            |

Content:

* Action type label (Slack Reply, GitHub Issue, etc.)
* Target destination (channel, repository, recipient, calendar)
* Payload content (message body, issue body, email body, event description)
* Labels, assignees, attendees, time hints

Rules:

* Preview must show the exact target and payload
* User may edit the preview before approval
* Editing a preview after approval invalidates the approval
* Preview creation must never perform the action

### 4.7 Approval Status

| Attribute    | Value                     |
| ------------ | ------------------------- |
| Purpose      | Show current approval state |
| Editable     | No                        |
| Trust level  | approved (server-side)    |
| External use | **No**                    |
| Domain type  | ActionApprovalRecord     |

States shown:

* `pending` — action requires approval
* `approved` — action is approved (shows when/whom)
* `rejected` — action was rejected (shows reason)
* `expired` — approval expired (requires re-request)
* `used` — approval was consumed by execution

The adopted dashboard now includes minimal Approve/Reject controls in the
CTA area. They appear only after a real Action Preview has been created and
the server approval status is `none` or `pending`. Controls are hidden for
approved, rejected, expired, used, and error states. Approve/Reject actions
call the existing `approveDashboardActionPreviews` client helper which sends
only `actionPreviewId` and `decision` — no hashes, tenant, role, or status.
After approve/reject, approval status is refreshed from the server and the
Decision Trace and Readiness Gates reflect the server-derived state.

External execution remains blocked by default regardless of approval state.

Dashboard Readiness Gates now include dynamic execution readiness through
`executionReadinessModel.ts`. The "External Execution" gate shows the current
readiness state from `computeExecutionReadiness()`. The model accepts an
`externalExecutionEnabled` flag (set to `false` in the view model by default).
When the flag is `false`, readiness always shows `execution_blocked` after
approval completes. A disabled Execute placeholder CTA appears only when
approval is complete but external execution is blocked. No real execution is
triggered — the placeholder explains: "Execution is ready but external
execution is disabled in this release." No `/api/workunit/tools` calls are
made from the dashboard.

A safe, non-executing Execution Command envelope is displayed near the
disabled Execute CTA. The envelope is built from `executionCommandModel.ts`
in the view model and shows only display-safe metadata: mode, reason,
previewRefCount, and requestedActionType. Approval IDs are not displayed.
No hashes, tenant/user/role, tokens, secrets, or raw payloads are rendered.
The envelope is for transparency/debuggability only and does not trigger
execution or call any server APIs. The `requestedActionType` is derived from
canonical preview action type codes (e.g., `slack_reply`, `github_issue`) via
`requestedActionTypeModel.ts`, not from natural-language `workUnit.nextAction`
text. If no canonical action type is available, `requestedActionType` is null.

### 4.8 Execution Result

| Attribute    | Value                     |
| ------------ | ------------------------- |
| Purpose      | Show result of a completed action |
| Editable     | No                        |
| Trust level  | executed                  |
| External use | Already happened          |
| Domain type  | ExecutionResult          |

Content:

* Execution status (succeeded, failed, blocked, skipped)
* Provider reference (Slack message ts, GitHub issue URL, etc.)
* Safe result message
* Error code if failed

### 4.9 Missing Information

| Attribute    | Value                     |
| ------------ | ------------------------- |
| Purpose      | Highlight required fields not yet filled |
| Editable     | No                        |
| Trust level  | draft                     |
| External use | **No**                    |
| Domain type  | WorkUnitDraft (missingFields) |

---

## 5. State Model

### 5.1 Action Field States

```
empty
  ↓
draft_workspace     ← user opens Action Field, sees context
  ↓
ai_suggested        ← AI generates suggestions (optional)
  ↓
user_editing        ← user edits workspace/preview content
  ↓
preview_ready       ← user has an external action payload ready for review
  ↓
approval_required   ← external action requires server-side approval
  ↓
approved            ← server-side approval granted
  ↓
executing           ← execution command is in progress
  ↓
executed            ← execution completed successfully
  ↓
blocked             ← execution blocked (kill switch, RBAC, tenant boundary)
  ↓
failed              ← execution failed with error
```

### 5.2 Allowed Transitions

| From               | To                  | Trigger                                      |
| ------------------ | ------------------- | -------------------------------------------- |
| empty              | draft_workspace     | User opens Action Field                      |
| draft_workspace    | ai_suggested        | AI generates content suggestion              |
| draft_workspace    | user_editing        | User starts editing                          |
| ai_suggested       | user_editing        | User modifies AI suggestion                  |
| user_editing       | preview_ready       | User completes external payload draft        |
| preview_ready      | approval_required   | User requests approval                       |
| preview_ready      | user_editing        | User continues editing                       |
| approval_required  | approved            | Server-side approval granted                 |
| approval_required  | user_editing        | User edits preview (invalidates approval)    |
| approved           | executing           | Execution command created                    |
| executing          | executed            | Execution succeeds                           |
| executing          | failed              | Execution fails                              |
| executing          | blocked             | Execution blocked by policy                  |
| blocked            | user_editing        | User returns to fix payload                  |
| failed             | user_editing        | User returns to fix and retry                |

### 5.3 Forbidden Transitions

| From        | To        | Reason                                              |
| ----------- | --------- | --------------------------------------------------- |
| draft_workspace | executed | Workspace text must never auto-execute              |
| user_editing | approved | Client cannot approve; approval must be server-side |
| approved    | executed  | Must go through `executing` state                   |

---

## 6. External Action Safety

### 6.1 Preview Rules

1. External payload preview must be explicitly marked as "this may be sent externally"
2. Target destination must be shown and verified
3. Full payload content must be visible before approval
4. Preview must distinguish `internal_task` from external actions
5. `internal_task` previews do not require approval

### 6.2 Approval Rules

1. Approval must be server-side
2. `approvedByPm: true` from client is never trusted
3. Approval binds `targetHash` and `payloadHash`
4. Editing the preview after approval **invalidates** the approval
5. Approval has an expiration time
6. Approval is one-time-use (status transitions to `used`)

### 6.3 Execution Rules

1. Execution uses `ExecutionCommand` only — never direct API calls from UI
2. Kill switch (`EXTERNAL_ACTIONS_ENABLED`) must be checked
3. RBAC must be checked (`workunit.execute_external_action`)
4. Tenant boundary must be verified
5. Idempotency key prevents double execution
6. Execution result must be recorded

### 6.4 Invalidation Triggers

Any of these actions invalidates an existing approval:

* User edits any field in the external payload preview
* User changes target destination
* User changes action type
* Approval expires
* Approval is used

After invalidation, the UI must show `approval_required` again.

---

## 7. Editing Rules

### 7.1 User Can Edit

* Workspace text (Section 4.5)
* Problem / Decision text (Section 4.2)
* Next Action text (Section 4.3)
* Task items (Section 4.4)
* External payload preview fields (Section 4.6) — before approval

### 7.2 AI Can Suggest

* Workspace text
* Problem / Decision rewording
* Next Action proposals
* Task breakdowns
* External payload drafts
* Missing field suggestions

All AI suggestions must be:

* Visually distinct from user-authored content
* Reviewable before use
* Never treated as final truth or authority

### 7.3 Read-Only

* Context Summary (generated from ReviewedWorkUnit)
* Approval Status (generated from server-side ActionApprovalRecord)
* Execution Result (generated from server-side ExecutionResult)
* System/security status badges
* Source references

### 7.4 Post-Approval Editing

After approval is granted:

1. Editing the external payload preview **invalidates** the approval
2. UI must show: "Editing this preview will invalidate the current approval. Continue?"
3. On confirmation: reset approval state to `approval_required`
4. User must request approval again after editing

### 7.5 Missing Information

When `WorkUnitDraft.missingFields` is non-empty:

1. Missing field names are shown prominently
2. External action preview cannot be created until required fields are filled
3. AI may suggest values for missing fields
4. User must explicitly fill or acknowledge missing fields

---

## 8. UI Requirements

### 8.1 Visual Distinction Rules

The UI must visually distinguish:

| Pair                    | Distinction Required                    |
| ----------------------- | --------------------------------------- |
| Draft vs Reviewed       | Reviewed shows check/verified indicator |
| Preview vs Executed     | Executed shows timestamp and result ref |
| Workspace vs Payload    | Payload has "may be sent" border/badge  |
| AI vs User content      | AI content has distinct style           |
| Internal vs External    | External has warning indicator          |

### 8.2 Status Indicators

The UI must clearly show:

* `Draft` — content is a draft, not final
* `Reviewed` — WorkUnit has been accepted as valid
* `Preview Ready` — external action payload is drafted
* `Approval Required` — server-side approval needed before execution
* `Approved` — action is approved and ready to execute (shows who/when)
* `Executing` — action is being performed
* `Executed` — action completed (shows result ref)
* `Blocked` — action blocked by policy
* `Failed` — action failed (shows safe error message)

### 8.3 Policy Status

The UI must show when actions are blocked by:

* `External Actions Disabled` — kill switch is off
* `Approval Required` — approval not yet granted
* `Forbidden` — RBAC denied
* `Integration Missing` — provider not configured

### 8.4 Unsafe Content Warnings

The UI must warn when:

* Raw external source content is present (should not happen after sanitization)
* Client-provided `approvedByPm` was stripped (not shown to user; logged)
* Client-provided `externalConfig` was stripped (not shown to user; logged)

---

## 9. Data Model Relationship

| Action Field Section        | Primary Domain Object | Secondary Domain Objects |
| --------------------------- | --------------------- | ------------------------ |
| Context Summary             | ReviewedWorkUnit      | SourceCandidate          |
| Problem / Decision          | WorkUnitDraft         | —                        |
| Next Action                 | WorkUnitDraft         | —                        |
| Task Breakdown              | WorkUnitDraft         | —                        |
| Draft Workspace             | WorkUnitDraft         | —                        |
| External Action Preview     | ActionPreview         | ReviewedWorkUnit         |
| Approval Status             | ActionApprovalRecord  | ActionPreview            |
| Execution Result            | ExecutionResult       | ExecutionCommand         |
| Missing Information         | WorkUnitDraft         | —                        |

---

## 10. API Relationship

Future API endpoints that may interact with the Action Field.

Note: Endpoint definitions are deferred to `API_CONTRACT.md`.

| Operation                   | Method   | Description                                |
| --------------------------- | -------- | ------------------------------------------ |
| Get WorkUnit context        | GET      | Fetch ReviewedWorkUnit for display         |
| Save draft workspace        | PUT      | Persist user-edited WorkUnitDraft          |
| Generate action preview     | POST     | Create ActionPreview from workUnitId       |
| Request approval            | POST     | Create ActionApprovalRecord (pending)      |
| Check approval status       | GET      | Read ActionApprovalRecord status           |
| Execute approved action     | POST     | Create ExecutionCommand (server-side only) |
| Get execution result        | GET      | Read ExecutionResult                       |

---

## 11. Error and Status Model

Core status codes relevant to the Action Field.

Detailed error model deferred to `ERROR_MODEL.md`.

| Code                     | Status | Meaning                                         |
| ------------------------ | ------ | ----------------------------------------------- |
| invalid_request          | 400    | Malformed input to Action Field API             |
| unauthorized             | 401    | No valid session                                |
| forbidden                | 403    | User lacks required permission                  |
| tenant_boundary_violation| 403    | Cross-tenant access attempt                     |
| external_actions_disabled| 403    | Kill switch is off                              |
| approval_required        | 403    | External action requires server-side approval   |
| approval_expired         | 403    | Approval has expired                            |
| approval_used            | 403    | Approval was already consumed                   |
| integration_missing      | 503    | Required provider integration is not configured |
| rate_limited             | 429    | Too many requests                               |
| internal_error           | 500    | Unexpected server error                         |

---

## 12. Security Requirements

1. **Frontend state is not authority.** UI state (`isApproved`, `canExecute`) must be derived from server responses, not local React state.

2. **AI output is not authority.** AI-generated text in the Action Field is a suggestion, not a command. It must never bypass approval.

3. **Raw external source content is untrusted.** The Action Field must not display raw Slack bodies, raw email bodies, or raw document content. Only sanitized metadata (title, summary, actors) should appear.

4. **`externalConfig` from client is not trusted.** Target channels, repositories, recipients, and calendar IDs must be resolved server-side from tenant integration config.

5. **`approvedByPm` from client is not trusted.** Approval is always resolved server-side. The client may request approval but must not declare itself approved.

6. **Server-side policy controls execution.** The `Execute` path checks: kill switch → RBAC → tenant boundary → persisted preview hash context → approval validity → integration config → idempotency.

---

## 13. Implementation Checklist

- [ ] Action Field state type (`ActionFieldState` union matching Section 5.1)
- [ ] Section model type (`ActionFieldSections` matching Section 4)
- [ ] Editor state persistence (draft workspace saved to server)
- [ ] Preview generation (`createActionPreview` wired to UI)
- [ ] Approval request flow (UI → server → ActionApprovalRecord)
- [ ] Approval invalidation on edit (hash comparison)
- [ ] Execution result display (success/failure from ExecutionResult)
- [ ] Safety check panel (domain-based, not mock data)
- [ ] Status badges aligned to domain trust levels
- [ ] Workspace text editor with AI suggestion toggle
- [ ] Unsaved changes detection and confirmation dialog
- [ ] All external action preview sections (Slack, Gmail, GitHub, Calendar)

---

## 14. Testing Requirements

### Unit Tests

- [ ] Editing workspace does not create an execution command
- [ ] Preview generation does not perform external action
- [ ] Approval required before execution (default deny)
- [ ] Editing preview invalidates approval (hash mismatch)
- [ ] Blocked external actions show `external_actions_disabled` state
- [ ] RBAC check prevents unauthorized execution
- [ ] Tenant boundary prevents cross-tenant execution
- [ ] Execution result cannot be fabricated by client

### Integration Tests

- [ ] Full flow: open → edit → preview → approve → execute → result
- [ ] Edit-after-approval: invalidates → re-request → re-approve → execute
- [ ] Kill switch: blocks at preview generation
- [ ] Missing fields: prevent preview creation

---

## 15. Alignment with Current Implementation

### What Exists Today

The current UI (`app/components/workunit-os/WorkUnitOSDashboard.tsx`) implements a three-pane OS console:

* left: WorkUnit Explorer
* center: Decomposition / Judgment Console
* right: Action Field Entry
* `Decision Trace` replaces AI-reasoning wording and records auditable judgment state.
* The right pane uses an Evidence Capsule instead of a raw Source Context reader.
* Readiness Gates replace vague Push Readiness scoring.
* The primary CTA is `Create Action Preview`; no `Execute External Action` button is exposed.

### CTA Wiring (Create Action Preview)

The adopted dashboard CTA connects to the existing Action Preview API through the following path:

```
selected InboxWorkUnit
  → selectedWorkUnitPreviewModel.ts  (buildPreviewGroupFromSelectedWorkUnit)
    → adoptedDashboardViewModel.ts   (buildActionFieldView → canCreatePreview gate)
      → AdoptedWorkUnitDashboard.tsx  (handleCreatePreview → createDashboardActionPreviews)
        → dashboardPreviewClient.ts  (buildDashboardPreviewRequests → strip forbidden keys)
          → POST /api/workunit/:id/action-preview
```

Key behavior:
- CTA is disabled when: no WorkUnit selected, no decision selected, preview already in-progress, or WorkUnit cannot produce a safe preview group.
- Active preview group is derived from the currently selected real WorkUnit in the sidebar.
- `getPrimaryActionPreviewGroup()` (in workUnitDashboardModel.ts) is legacy/demo only — not used in the active CTA path.
- Server errors are mapped to safe user-facing messages (`mapSafePreviewError` in adopted dashboard).
- No new backend route was added; client-owned hashes/status/tenant/role remain forbidden.

Remaining debt:
- Approval status needs API-backed dashboard binding (no GET approval-by-workunit endpoint exists yet).
- Real external execution remains blocked.
- OAuth/token storage still not implemented.

### Correction (2026-06-15): Truth/Security Gap Fix

The initial CTA wiring had several truth/security mismatches with the server-side model:

1. **Decision mapping**: `selectedDecision` was gated but never placed in the preview payload. `workUnit.nextAction` was incorrectly used as the `decision` field. Fixed: `decision` now carries the user-selected decision string; `recommendedAction` carries `nextAction`.

2. **Fallback removal**: `canCreatePreview` was based on `Boolean(selectedDecision)` instead of mapper success, and `fallbackPreviewGroup()` could produce active previews even when the safe mapper returned not-ready. Fixed: `canCreatePreview` is now `false` and `previewGroup` is empty when the mapper fails.

3. **Hash exposure**: Both `POST /api/workunit/:id/action-preview` and `POST /api/workunit/:id/approval` returned `targetHash`/`payloadHash` to the browser. Fixed: hashes are now server-only in browser-facing responses while remaining available for server-side verification.

4. **Approval status endpoint**: No API endpoint existed for querying approval status by WorkUnit. Added: `GET /api/workunit/:id/approval/status` returns a safe status summary (`none`, `pending`, `approved`, `rejected`, `expired`, `used`) without exposing hashes or tenant internals.

5. **Dashboard binding**: Approval Completed gate was hardcoded `false`. Fixed: gate now reflects real server-derived approval status, refreshed on work unit selection and after preview/approval actions.

6. **Approve/Reject UI**: Minimal Approve/Reject buttons appear after successful preview creation, calling the existing `approveDashboardActionPreviews()` client helper. No client-owned hash/status/tenant fields are sent.

The older `app/components/legacy/workunitInbox/WorkUnitActionField.tsx` also exists. It is retained as a migration reference, but it is not the adopted desktop UI path. The adopted MVP UI path is `WorkUnitOSDashboard`; the Action Field Entry uses the canonical dashboard preview client to create ActionPreviews through existing APIs.

### Gaps vs This Spec

| Gap | Current State | Target State |
| --- | ------------- | ------------ |
| Status values | `draft_ready`, `draft_saved`, `approved` (UI-only) | Domain-aligned: `draft_workspace`, `preview_ready`, `approval_required`, `approved`, `executing`, `executed` |
| Action type names | `email_send`, `calendar_block`, `database_update` | `gmail_reply`, `calendar_event`; remove `database_update` |
| Approval flow | Action Field Entry can create ActionPreviews; approval completion remains a separate visible gate | Execution-time verification now uses persisted `ActionPreview` + repository-backed `ApprovalStore` |
| Payload hash binding | Preview / Approval APIs persist `targetHash` + `payloadHash`; tools route verifies against them | Add edit-after-approval invalidation UI |
| Edit invalidates approval | No invalidation logic | Hash comparison triggers invalidation |
| Workspace vs payload separation | All in same editable drawer | Section-based model (4.1-4.9) |
| Execution | Disabled from the drawer | `ExecutionCommand` + `ExecutionResult` after approval |
| UI path integration | Adopted right pane owns Action Field Entry; old component remains as reference | Remove deprecated component after migration is complete |
| Data source | WorkUnit list and selected Action Field content bind through dashboard API clients; preview/approval state still partly local | Fully API-driven approval status and execution result display |

### Migration Path

0. Read `docs/CONTEXT_INDEX.md` and use canonical Action Field imports under `app/lib/application/actionField/*`
1. Add `ActionFieldSections` type matching Section 4
2. Add `ActionFieldState` type matching Section 5.1
3. Add state transition logic matching Section 5.2
4. Replace remaining local preview/approval state with API-fetched ActionPreview / ApprovalRecord data
5. Wire "approve" button to server-side approval request (not local state)
6. Add approval invalidation on edit (payloadHash check)
7. Add execution flow through ExecutionCommand
8. Add ExecutionResult display
9. Remove `database_update` action type
10. Rename `email_send` → `gmail_reply`, `calendar_block` → `calendar_event`

Internal Alpha hardening unifies execution-time approval verification through the persisted approval adapter and removes misleading sample WorkUnit states from the adopted dashboard critical path. It does not enable external execution, OAuth, billing, provider token storage, or legacy UI deletion.
