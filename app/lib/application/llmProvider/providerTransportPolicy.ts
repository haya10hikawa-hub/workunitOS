/**
 * Phase 3C: Provider Transport Policy + Mock Transport
 *
 * Defines network egress policy and mock transport.
 * No live network. No fetch. No real endpoint.
 *
 * Live provider integration remains No-Go.
 */

export type ProviderTransportPolicy = {
  readonly transportType: "blocked" | "mock" | "live"
  readonly networkAllowed: boolean
  readonly maxRetries: 0
  readonly timeoutMs: 0
}

export type MockProviderTransport = {
  readonly policy: ProviderTransportPolicy
  readonly execute: () => { readonly status: "blocked"; readonly reason: string }
}

export const BLOCKED_TRANSPORT_POLICY: ProviderTransportPolicy = {
  transportType: "blocked",
  networkAllowed: false,
  maxRetries: 0,
  timeoutMs: 0,
}

export const MOCK_TRANSPORT: MockProviderTransport = {
  policy: BLOCKED_TRANSPORT_POLICY,
  execute: () => ({ status: "blocked", reason: "provider_implementation_missing" }),
}
