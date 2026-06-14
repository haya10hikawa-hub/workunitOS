# Application Action Field

## Ownership
- Client-safe Action Field helpers for dashboard preview creation.
- Strips forbidden client-owned fields before API calls.

## Allowed imports
- Shared TypeScript types.
- Safe browser `fetch`.

## Forbidden imports
- React components.
- API route handlers.
- D1 repositories or repository resolvers.
- Raw external provider clients.
- Server session helpers.

## Canonical files
- `dashboardPreviewClient.ts`
- `errorState.ts`

## Legacy warnings
- `app/lib/actionField/*` is compatibility only.
- `app/lib/workunitInbox/actionFieldClient.ts` is for the legacy standalone UI only.

## Common mistakes
- Sending `tenantId`, `targetHash`, `payloadHash`, `approvedByUserId`, `status`, or `usedAt` from the client.
- Adding external execution to this client.
