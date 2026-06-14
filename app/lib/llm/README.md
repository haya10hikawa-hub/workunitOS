# LLM Pipeline

## Ownership
- Sanitization, prompt construction, stage budget checks, provider routing, output parsing, and WorkUnit draft evaluation.

## Allowed imports
- Domain signal and WorkUnit types.
- LLM provider interfaces.
- Safe sanitization and validation helpers.

## Forbidden imports
- React components.
- API route handlers.
- D1 repositories.
- Raw external provider clients.
- Provider secrets or token storage.

## Canonical files
- `sanitize.ts`
- `budget.ts`
- `prompts.ts`
- `processWorkSignal.ts`
- `validateLlmOutput.ts`

## Legacy warnings
- Future WorkUnit-focused compaction should live under `app/lib/application/llmContext/*`.
- Raw provider bodies should not be passed to prompts by default.

## Common mistakes
- Treating sanitized input as trusted.
- Logging raw prompts, raw provider responses, secrets, or raw source payloads.
