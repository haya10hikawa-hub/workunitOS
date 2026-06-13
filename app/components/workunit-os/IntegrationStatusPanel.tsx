"use client"

import { useEffect, useState } from "react"
import { fetchIntegrationStatus, type DashboardIntegrationProviderStatus } from "@/lib/application/dashboard/dashboardStatusClient"

export function IntegrationStatusPanel({ className = "" }: { className?: string }) {
  const [state, setState] = useState<{ status: "loading" | "loaded" | "error"; providers: DashboardIntegrationProviderStatus[]; error?: string }>({ status: "loading", providers: [] })

  useEffect(() => {
    let active = true
    fetchIntegrationStatus().then((result) => {
      if (!active) return
      setState(result.ok ? { status: "loaded", providers: result.providers } : { status: "error", providers: [], error: result.error })
    })
    return () => { active = false }
  }, [])

  return (
    <section className={["rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4", className].join(" ")}>
      <div className="mb-4 text-[14px] font-semibold text-[var(--ai-text-strong)]">接続ステータス</div>
      {state.status === "loading" ? <div className="text-[12px] text-[var(--ai-text-muted)]">Loading integration status...</div> : null}
      {state.status === "error" ? <div className="text-[12px] text-[var(--ai-danger)]">{state.error}</div> : null}
      {state.status === "loaded" && state.providers.length === 0 ? <div className="text-[12px] text-[var(--ai-text-muted)]">No provider status available.</div> : null}
      {state.status === "loaded" ? <div className="space-y-3">{state.providers.map((provider) => <ProviderRow key={provider.provider} provider={provider} />)}</div> : null}
    </section>
  )
}

function ProviderRow({ provider }: { provider: DashboardIntegrationProviderStatus }) {
  return (
    <div className="rounded-[7px] border border-[var(--ai-border)] bg-black px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-[var(--ai-text-strong)]">{provider.provider.toUpperCase()}</span>
        <span className={statusTone(provider.status)}>{provider.status}</span>
      </div>
      <div className="mt-2 grid gap-1 text-[11px] text-[var(--ai-text-muted)]">
        <span>Mode: {provider.mode}</span>
        <span>Last Sync: {provider.lastSyncedAt ?? "n/a"}</span>
        {provider.lastErrorCode ? <span>Error: {provider.lastErrorCode}</span> : null}
        {provider.scopes.length > 0 ? <span>Scopes: {provider.scopes.join(", ")}</span> : null}
      </div>
    </div>
  )
}

function statusTone(status: string) {
  if (status === "connected" || status === "active" || status === "synced") return "text-[12px] font-semibold text-[var(--ai-accent)]"
  if (status === "pending" || status === "rate_limited" || status === "fetch_failed") return "text-[12px] font-semibold text-[#ffcc66]"
  if (status === "fake" || status === "disabled" || status === "disconnected") return "text-[12px] font-semibold text-[var(--ai-text-muted)]"
  return "text-[12px] font-semibold text-[var(--ai-danger)]"
}
