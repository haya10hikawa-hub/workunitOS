import type { AuthAdapter, AuthAdapterResult } from "./authAdapter.ts"

export class NoopProductionAuthAdapter implements AuthAdapter {
  async verify(_request: Request): Promise<AuthAdapterResult> {
    void _request
    return { ok: false, reason: "adapter_not_configured" }
  }
}
