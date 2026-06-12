"use client"

import type { InboxWorkUnit } from "@/app/lib/workunitInbox/types"

// ─── Props ──────────────────────────────────────────────────────

type Props = {
  wu: InboxWorkUnit | null
  onFeedback?: (status: "useful" | "not_useful" | "later" | "done") => void
}

// ─── Component ──────────────────────────────────────────────────

export function WorkUnitDetail({ wu, onFeedback }: Props) {
  if (!wu) {
    return (
      <div style={{ padding: 16, color: "#555" }}>
        Select a WorkUnit to see details
      </div>
    )
  }

  const buttons: { label: string; status: "useful" | "not_useful" | "later" | "done" }[] = [
    { label: "Useful", status: "useful" },
    { label: "Not useful", status: "not_useful" },
    { label: "Later", status: "later" },
    { label: "Done", status: "done" },
  ]

  return (
    <div style={{ padding: 16, border: "1px solid #333", borderRadius: 8, background: "#14141e" }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: "#eee", marginBottom: 8 }}>
        {wu.title}
      </div>
      <DetailRow label="Kind" value={wu.kind.replace(/_/g, " ")} />
      <DetailRow label="Priority" value={wu.priority} />
      <DetailRow label="Source" value={wu.sourceProvider} />
      <DetailRow label="Reason" value={wu.reason} />
      <DetailRow label="Evidence" value={wu.evidence} />
      {wu.sourceUrl && <DetailRow label="URL" value={wu.sourceUrl} />}
      {wu.actor && <DetailRow label="Actor" value={wu.actor} />}
      {wu.assignee && <DetailRow label="Assignee" value={wu.assignee} />}
      {wu.repository && <DetailRow label="Repository" value={wu.repository} />}
      {wu.dueAt && <DetailRow label="Due" value={new Date(wu.dueAt).toLocaleDateString()} />}

      <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {buttons.map(({ label, status }) => (
          <button
            key={status}
            onClick={() => onFeedback?.(status)}
            style={{
              padding: "4px 10px", fontSize: 11, border: "1px solid #444",
              borderRadius: 4, background: "#1a1a1a", color: "#aaa", cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Helper ─────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: 12, marginBottom: 4, display: "flex", gap: 8 }}>
      <span style={{ color: "#666", minWidth: 80 }}>{label}</span>
      <span style={{ color: "#bbb" }}>{value}</span>
    </div>
  )
}
