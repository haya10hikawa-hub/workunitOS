# Infrastructure External

## Ownership
- Canonical provider read boundary.
- Owns normalized GitHub, Slack, and Calendar source adapters.

## Allowed imports
- Provider-local types.
- Safe fetch/client utilities.
- Application WorkUnit transform types only when needed for normalized mapping.

## Forbidden imports
- React components.
- API route handlers.
- D1 repositories.
- `repositoryResolver`.
- Provider token persistence.

## Canonical files
- `github/*`
- `slack/*`
- `calendar/*`

## Legacy warnings
- `app/lib/workunitInbox/sources/**` remains compatibility only.
- Tests should import this folder directly.

## Common mistakes
- Returning raw provider API responses.
- Logging or storing provider tokens.
