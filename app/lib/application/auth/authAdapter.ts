export type VerifiedAuthIdentity = {
  provider: "dev" | "oidc" | "jwt" | "cookie"
  providerSubject: string
  email: string
  displayName?: string
  avatarUrl?: string
}

export type AuthAdapterResult =
  | { ok: true; identity: VerifiedAuthIdentity }
  | { ok: false; reason: "missing_credentials" | "invalid_credentials" | "adapter_not_configured" }

export interface AuthAdapter {
  verify(request: Request): Promise<AuthAdapterResult>
}
