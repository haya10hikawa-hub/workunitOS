import type { AuthAdapter } from "./authAdapter.ts"
import { DevAuthAdapter } from "./devAuthAdapter.ts"
import { JwtAuthAdapter } from "./jwtAuthAdapter.ts"
import { NoopProductionAuthAdapter } from "./noopProductionAuthAdapter.ts"

export function resolveAuthAdapter(): AuthAdapter {
  const mode = process.env.AUTH_ADAPTER ?? "none"
  if (mode === "jwt") return new JwtAuthAdapter()
  if (mode === "dev" && process.env.NODE_ENV !== "production") return new DevAuthAdapter()
  return new NoopProductionAuthAdapter()
}
