# Adopted WorkUnit Dashboard

## Ownership
- Canonical visual shell for WorkUnit OS.
- `WorkUnitOSDashboard.tsx` renders this shell.
- Preserve the adopted v0 layout and CSS values.

## Allowed imports
- React hooks.
- CSS Modules in this folder.
- Client-safe application helpers under `app/lib/application/dashboard/*`.
- Client-safe Action Field helper under `app/lib/application/actionField/*`.

## Forbidden imports
- D1 repositories.
- `repositoryResolver` or `routeRepositories`.
- API route handlers.
- `security/session`.
- Raw external provider clients.

## Canonical files
- `AdoptedWorkUnitDashboard.tsx`
- `AdoptedWorkUnitDashboard.module.css`

## Legacy warnings
- Do not import `app/components/workunitInbox/*`.
- Do not import `app/components/legacy/workunitInbox/*`.
- Do not revive old pre-v0 panes as the root dashboard.

## Common mistakes
- Redesigning spacing, colors, density, or layout.
- Reading raw provider payloads in the component.
- Sending tenant, role, hash, approval status, or token fields from the client.
