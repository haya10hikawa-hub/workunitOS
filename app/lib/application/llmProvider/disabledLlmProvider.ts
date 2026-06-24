export type DisabledLlmProvider = {
  readonly kind: "disabled_llm_provider"
  readonly providerConnected: false
}

export const DISABLED_LLM_PROVIDER: DisabledLlmProvider = {
  kind: "disabled_llm_provider",
  providerConnected: false,
}
