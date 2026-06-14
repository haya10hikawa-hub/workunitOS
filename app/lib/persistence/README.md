# Persistence

## Ownership
- Repository interfaces, route repository resolution, D1 implementations, and in-memory implementations.
- Server-side persistence boundary for tenant-scoped data.

## Allowed imports
- Domain and persistence row types.
- D1-like runtime bindings in infrastructure implementations.

## Forbidden imports
- React components.
- UI code.
- API route handlers from repository implementations.
- Raw provider clients unless explicitly modeled as persisted metadata.

## Canonical files
- `repositoryResolver.ts`
- `routeRepositories.ts`
- `repositories.ts`
- `types.ts`
- `d1/*`

## Legacy warnings
- UI must not import this folder.
- API routes should enter through `routeRepositories.ts`.

## Common mistakes
- Resolving tenant DB access in components.
- Trusting client-provided tenant IDs for repository context.
