# Application WorkUnit Inbox

## Ownership
- Canonical inbox-facing application logic.
- Owns normalized signal types, signal-to-WorkUnit transforms, action-preview mapping, and persistence mapping.

## Allowed imports
- Domain and shared application types.
- Repository row types when mapping persistence shapes.

## Forbidden imports
- React components.
- API route handlers.
- D1 repository implementations.
- Raw provider clients.
- Server session helpers.

## Canonical files
- `types.ts`
- `transform.ts`
- `mockSignals.ts`
- `persistenceMapping.ts`
- `actionPreviewMapping.ts`

## Legacy warnings
- `app/lib/workunitInbox/*` is compatibility only.
- `app/lib/workunitInbox/sources/**` re-exports canonical provider boundaries only.

## Common mistakes
- Adding provider API calls here.
- Passing raw Slack/GitHub/Calendar payloads into WorkUnit objects.
