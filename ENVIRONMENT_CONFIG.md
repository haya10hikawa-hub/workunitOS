# ENVIRONMENT_CONFIG.md

# WorkUnit OS Environment Configuration

## 1. Quick Start

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

For local development with all features enabled: true

```env
ALLOW_DEV_SESSION=true
DEV_SESSION_ROLE=owner
ALLOW_MOCK_LLM=true
ALLOW_IN_MEMORY_PERSISTENCE=true
ALLOW_IN_MEMORY_APPROVAL_STORE=true
```

## 2. Variable Reference

| Variable | Purpose | Dev Default | Production Rule | Risk If Misconfigured |
|----------|---------|------------|----------------|----------------------|
| `ALLOW_DEV_SESSION` | Enable auth bypass | `false` | MUST be `false` | Anonymous access |
| `DEV_SESSION_ROLE` | Dev session role | `owner` | Ignored in prod | Elevated permissions |
| `ALLOW_MOCK_LLM` | Use mock LLM | `false` | MUST be `false` | Fake AI output |
| `LLM_PROVIDER` | Real provider | (empty) | `deepseek` | No LLM ingest |
| `DEEPSEEK_API_KEY` | Provider auth | (empty) | Required | Provider unavailable |
| `DEEPSEEK_BASE_URL` | API endpoint | `api.deepseek.com` | As configured | Wrong endpoint |
| `DEEPSEEK_DEFAULT_MODEL` | Fallback model | `deepseek-chat` | As configured | Wrong model |
| `DEEPSEEK_MODEL_EXTRACT` | Candidate extraction model | (empty) | Optional | Uses default |
| `DEEPSEEK_MODEL_DRAFT` | Draft generation model | (empty) | Optional | Uses default |
| `DEEPSEEK_MODEL_EVALUATE` | Evaluation model | (empty) | Optional | Uses default |
| `DEEPSEEK_MODEL_ACTION_PREVIEW` | Action preview model | (empty) | Optional | Uses default |
| `LLM_TIMEOUT_MS` | Request timeout | `15000` | As configured | Hung requests |
| `ALLOW_MOCK_LLM` | Dev mock provider | `false` | MUST be `false` | Fake responses |
| `ALLOW_LEGACY_INGEST_FALLBACK` | Static fallback | `false` | Keep `false` | Unsafe ingest |
| `ALLOW_IN_MEMORY_PERSISTENCE` | Dev in-memory DB | `false` | MUST be `false` | Data loss on restart |
| `PERSISTENCE_MODE` | Real persistence | (empty) | `d1` | No persistence |
| `ALLOW_IN_MEMORY_APPROVAL_STORE` | Dev approval store | `false` | MUST be `false` | Unsafe approvals |
| `EXTERNAL_ACTIONS_ENABLED` | Execute actions | `false` | Enable after D1+auth+RBAC | Unauthorized execution |

## 3. Development Setup

For local development:

```env
ALLOW_DEV_SESSION=true          # Skip auth
DEV_SESSION_ROLE=owner          # Full permissions
ALLOW_MOCK_LLM=true             # Use mock LLM (no API key needed)
ALLOW_IN_MEMORY_PERSISTENCE=true # Use in-memory persistence
ALLOW_IN_MEMORY_APPROVAL_STORE=true # Use in-memory approval store
EXTERNAL_ACTIONS_ENABLED=false  # NEVER enable in dev
```

Run the dev server:

```bash
npm run dev
```

## 4. Test Setup

Tests use their own environment setup and are isolated from `.env.local`.
Test files set required flags inline using `process.env` manipulation or test helpers.

Example (from tests):

```ts
resetInMemoryReposForTests()
const config = resolvePersistenceConfig({
  NODE_ENV: "development",
  ALLOW_IN_MEMORY_PERSISTENCE: "true",
})
```

## 5. Production Setup

**CRITICAL: ALL `ALLOW_*` flags MUST be `false` in production.**

Minimum production config:

```env
ALLOW_DEV_SESSION=false
ALLOW_MOCK_LLM=false
ALLOW_IN_MEMORY_PERSISTENCE=false
ALLOW_IN_MEMORY_APPROVAL_STORE=false
ALLOW_LEGACY_INGEST_FALLBACK=false

LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=<your-production-key>
DEEPSEEK_DEFAULT_MODEL=deepseek-chat

PERSISTENCE_MODE=d1
# D1 binding configured via Cloudflare dashboard

EXTERNAL_ACTIONS_ENABLED=false  # Enable only after D1 + real auth + RBAC
```

## 6. Environment Flag Security

All `ALLOW_*` flags are **security boundaries**. They exist ONLY for development and testing.

- `ALLOW_DEV_SESSION`: Bypasses authentication. **Never true in production.**
- `ALLOW_MOCK_LLM`: Produces fake AI output. **Never true in production.**
- `ALLOW_IN_MEMORY_PERSISTENCE`: Stores data in memory (lost on restart). **Never true in production.**
- `ALLOW_IN_MEMORY_APPROVAL_STORE`: Stores approvals in memory. **Never true in production.**
- `ALLOW_LEGACY_INGEST_FALLBACK`: Falls back to static sanitization. Avoid in production.
- `EXTERNAL_ACTIONS_ENABLED`: Enables real Slack/Gmail/GitHub/Calendar actions. **Enable only after all other production requirements are met.**

## 7. Failure Behavior

| Missing Config | Behavior |
|---------------|----------|
| No session + prod | `401 unauthorized` |
| No LLM provider | `integration_missing` |
| No persistence | `integration_missing` |
| No approval store | `approval_required` (default deny) |
| No D1 config in prod | `disabled` mode |
| External actions disabled | `external_actions_disabled` |

All failures are safe — the system fails closed.

## 8. Deployment Scripts

- `npm run cf:build` — build for Cloudflare Pages (requires `@opennextjs/cloudflare`)
- `npm run cf:dev` — build + local preview with Wrangler
- `npm run cf:deploy` — build + deploy to Cloudflare Pages
- Requires Next.js >= 16.2.6 or 15.5.18-15.x (upgrade from 16.1.6)

Runtime env is wired via:
`extractCloudflareEnv()` → `setRequestRuntimeEnvInProd()` → `resolveRouteRepositories()`

See `CLOUDFLARE_D1_SETUP.md` for D1 database configuration.
