/**
 * Phase 3B: Provider Secret Policy Contract
 *
 * Defines how future provider secrets must be managed.
 * No real secret is read, stored, or transmitted.
 *
 * Live provider integration remains No-Go.
 */

export type ProviderSecretPolicy = {
  readonly secretSource: "injected" | "not-configured"
  readonly secretLoader: string
  readonly rotationRequired: boolean
  readonly neverInSource: true
  readonly neverInModelContext: true
  readonly neverInDiagnostics: true
}

export const SEALED_SECRET_POLICY: ProviderSecretPolicy = {
  secretSource: "not-configured",
  secretLoader: "none — live provider integration is No-Go",
  rotationRequired: false,
  neverInSource: true,
  neverInModelContext: true,
  neverInDiagnostics: true,
}
