import type { AuthAdapter, AuthAdapterResult } from "./authAdapter.ts"

export class DevAuthAdapter implements AuthAdapter {
  async verify(_request: Request): Promise<AuthAdapterResult> {
    void _request
    if (process.env.NODE_ENV === "production") return { ok: false, reason: "adapter_not_configured" }
    if (process.env.ALLOW_DEV_SESSION !== "true") return { ok: false, reason: "missing_credentials" }
    return {
      ok: true,
      identity: { provider: "dev", providerSubject: "dev-user", email: "dev@example.local" },
    }
  }
}
