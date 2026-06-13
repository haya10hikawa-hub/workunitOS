"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import {
  Bell,
  Bug,
  Calendar,
  BarChart2,
  CheckSquare,
  ChevronRight,
  Cloud,
  FolderOpen,
  Mail,
  Menu,
  Plus,
  Settings,
  Square,
  User,
} from "lucide-react"
import {
  createDashboardActionPreviews,
} from "@/lib/application/actionField/dashboardPreviewClient"
import { getPrimaryActionPreviewGroup } from "@/lib/application/dashboard/workUnitDashboardModel"
import styles from "./AdoptedWorkUnitDashboard.module.css"

type PreviewStatus = "idle" | "creating" | "ready" | "failed"
type BadgeVariant = "ready" | "needs-review" | "blocked" | "draft" | "error"

type WorkUnit = {
  id: string
  icon: ReactNode
  iconBg: string
  label: string
  roi: number
  badge: BadgeVariant
}

type LogStatus = "INFO" | "READY" | "NEEDS_REVIEW" | "NEEDS_OWNER" | "NOT_READY" | "STATUS" | "ACTION"

type LogEntry = {
  status: LogStatus
  text: string
  indicator?: "green" | "yellow" | "red" | "gray"
  note?: string
}

type ReadinessGate = {
  label: string
  checked: boolean
}

type Tab = {
  id: string
  label: string
}

const workUnits: WorkUnit[] = [
  { id: "enterprise", icon: <FolderOpen size={14} strokeWidth={1.5} />, iconBg: "#1e3a2e", label: "Enterprise Update Response Pack", roi: 92.0, badge: "ready" },
  { id: "clientx", icon: <Mail size={14} strokeWidth={1.5} />, iconBg: "#1e2a3a", label: "Client X Project Delta Feedback", roi: 88.5, badge: "needs-review" },
  { id: "bug1045", icon: <Bug size={14} strokeWidth={1.5} />, iconBg: "#1a1a3a", label: "BUG-1045 - Authentication Failure", roi: 84.0, badge: "blocked" },
  { id: "quarterly", icon: <Calendar size={14} strokeWidth={1.5} />, iconBg: "#2a1a2a", label: "Quarterly Business Review", roi: 79.0, badge: "draft" },
  { id: "competitor", icon: <BarChart2 size={14} strokeWidth={1.5} />, iconBg: "#2a1e1a", label: "Competitor Product Launch", roi: 78.5, badge: "ready" },
  { id: "salesforce", icon: <Cloud size={14} strokeWidth={1.5} />, iconBg: "#1a1e2a", label: "Salesforce Integration Error", roi: 0.0, badge: "error" },
]

const tabs: Tab[] = [
  { id: "enterprise", label: "Enterprise Update Response Pack" },
  { id: "clientx", label: "Client X Feedback" },
  { id: "bug1045", label: "BUG-1045" },
]

const logEntries: LogEntry[] = [
  { status: "INFO", text: "Decomposed Push Candidates initialized." },
  { status: "READY", text: "1. Verify Source Info (Owner: PM | This Week)", indicator: "green" },
  { status: "NEEDS_REVIEW", text: "2. Confirm Owner (Owner: PM | This Week)", indicator: "yellow" },
  { status: "NEEDS_OWNER", text: "3. Determine Acceptance (Owner: PM | This Week)", indicator: "red" },
  { status: "NOT_READY", text: "4. Prepare External Action (Owner: PM | Next Week)", indicator: "gray" },
  { status: "STATUS", text: "Push Readiness: 82% - Required owner and execution target set. Push conditions met.", note: "THIS IS WRONG" },
  { status: "ACTION", text: "Awaiting user decision..." },
]

const badgeLabel: Record<BadgeVariant, string> = {
  ready: "READY",
  "needs-review": "NEEDS REVIEW",
  blocked: "BLOCKED",
  draft: "DRAFT",
  error: "ERROR",
}

const logTagLabel: Record<LogStatus, string> = {
  INFO: "[INFO]",
  READY: "[READY]",
  NEEDS_REVIEW: "[NEEDS REVIEW]",
  NEEDS_OWNER: "[NEEDS OWNER]",
  NOT_READY: "[NOT READY]",
  STATUS: "[STATUS]",
  ACTION: "[ACTION]",
}

export function AdoptedWorkUnitDashboard() {
  const [activeUnit, setActiveUnit] = useState("enterprise")
  const [activeTab, setActiveTab] = useState("enterprise")
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null)
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle")
  const [previewMessage, setPreviewMessage] = useState("")

  const readinessGates = useMemo<ReadinessGate[]>(() => ([
    { label: "Source Verified", checked: true },
    { label: "Owner Confirmed", checked: true },
    { label: "Decision Selected", checked: selectedDecision !== null },
    { label: "Action Preview Created", checked: previewStatus === "ready" },
    { label: "Approval Completed", checked: false },
  ]), [previewStatus, selectedDecision])

  const handleCreatePreview = async () => {
    setPreviewStatus("creating")
    setPreviewMessage("")
    const result = await createDashboardActionPreviews(getPrimaryActionPreviewGroup())
    if (!result.ok) {
      setPreviewStatus("failed")
      setPreviewMessage(result.error)
      return
    }
    setPreviewStatus("ready")
    setPreviewMessage(`Created ${result.previews.length} action preview${result.previews.length === 1 ? "" : "s"}.`)
  }

  return (
    <div className={styles.root}>
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button type="button" className={styles.iconBtn} aria-label="Menu">
            <Menu size={16} strokeWidth={1.5} />
          </button>
          <span className={styles.osTitle}>WorkUnit OS</span>
        </div>
        <div className={styles.topBarRight}>
          <span className={styles.systemStatus}>
            System Status: <span className={styles.statusWatching}>Watching</span>
            {" | "}Last Scan: 10:40 AM
          </span>
          <button type="button" className={styles.iconBtn} aria-label="User avatar">
            <div className={styles.avatar} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Settings">
            <Settings size={16} strokeWidth={1.5} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Notifications">
            <Bell size={16} strokeWidth={1.5} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Profile">
            <User size={16} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>WorkUnit Explorer</span>
          </div>
          <nav className={styles.sidebarNav} aria-label="WorkUnit list">
            {workUnits.map((workUnit) => (
              <button
                key={workUnit.id}
                type="button"
                className={`${styles.unitItem} ${activeUnit === workUnit.id ? styles.unitItemActive : ""}`}
                onClick={() => setActiveUnit(workUnit.id)}
              >
                <span className={styles.unitIcon} style={{ backgroundColor: workUnit.iconBg }}>
                  {workUnit.icon}
                </span>
                <div className={styles.unitInfo}>
                  <span className={styles.unitLabel}>{workUnit.label}</span>
                  <div className={styles.unitMeta}>
                    <span className={styles.unitRoi}>ROI: {workUnit.roi.toFixed(1)}</span>
                    <Badge variant={workUnit.badge} label={badgeLabel[workUnit.badge]} />
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        <main className={styles.centerPanel}>
          <div className={styles.tabBar} role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
            <button type="button" className={styles.tabAdd} aria-label="Add tab">
              <Plus size={14} strokeWidth={1.5} />
            </button>
          </div>

          <div className={styles.centerContent}>
            <h1 className={styles.centerTitle}>Decomposition: Enterprise Update Response Pack</h1>

            <section className={styles.section}>
              <h2 className={styles.sectionLabel}>SITUATION</h2>
              <p className={styles.sectionBody}>Received signal from WorkUnit OS Roadmap.</p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionLabel}>PROBLEM / WHY NOW</h2>
              <p className={styles.sectionBody}>Phase 1-3 implementation in progress.</p>
              <p className={styles.sectionBody}>Deadline: This Week (2026-06-14)</p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionLabel}>DECISION REQUIRED</h2>
              <div className={styles.decisionButtons}>
                {["Accept", "Defer", "Reject", "Ask Owner"].map((decision, index) => (
                  <button
                    key={decision}
                    type="button"
                    className={`${styles.decisionBtn} ${index === 0 ? styles.decisionBtnPrimary : ""}`}
                    onClick={() => setSelectedDecision(decision)}
                  >
                    [{decision}]
                  </button>
                ))}
              </div>
            </section>

            <div className={styles.roiBar}>
              <span className={styles.roiLabel}>ROI Metric</span>
              <span className={styles.roiFormula}>
                Impact × Urgency × Importance / Effort = <span className={styles.roiValue}>240.0</span>
              </span>
            </div>

            <section className={styles.logsSection}>
              <h2 className={styles.logsSectionTitle}>AI Reasoning &amp; Execution Logs</h2>
              <ul className={styles.logsList}>
                {logEntries.map((entry, index) => (
                  <li key={`${entry.status}-${index}`} className={styles.logEntry}>
                    <ChevronRight size={12} strokeWidth={1.5} className={styles.logChevron} />
                    <LogStatusTag status={entry.status} />
                    <span className={styles.logText}>{entry.text}</span>
                    {entry.indicator ? <IndicatorDot color={entry.indicator} /> : null}
                    {entry.note ? <span className={styles.logNote}>{entry.note}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </main>

        <aside className={styles.rightPanel}>
          <h2 className={styles.rightPanelTitle}>Action Field Entry</h2>

          <div className={styles.rightSection}>
            <p className={styles.rightLabel}>
              <span className={styles.rightLabelBold}>RECOMMENDED ACTION:</span>{" "}
              Prepare Slack reply for enterprise update response.
            </p>
          </div>

          <div className={styles.evidenceCapsule}>
            <div className={styles.evidenceHeader}>
              <span className={styles.evidenceTitle}>EVIDENCE CAPSULE</span>
              <span className={styles.confidenceBadge}>Confidence: High</span>
            </div>
            <div className={styles.evidenceCard}>
              <p className={styles.evidencePath}>Slack / #enterprise-updates |</p>
              <p className={styles.evidenceText}>
                Hey <span className={styles.evidenceMention}>@channel</span>, the new roadmap signals are in. We need to address the Phase 1-3 implementation this week. Please review.
              </p>
            </div>
          </div>

          <div className={styles.readinessSection}>
            <h3 className={styles.readinessTitle}>READINESS GATES</h3>
            <ul className={styles.gatesList}>
              {readinessGates.map((gate) => (
                <li key={gate.label} className={styles.gateItem}>
                  {gate.checked ? (
                    <CheckSquare size={14} strokeWidth={1.5} className={styles.gateChecked} />
                  ) : (
                    <Square size={14} strokeWidth={1.5} className={styles.gateUnchecked} />
                  )}
                  <span className={`${styles.gateLabel} ${gate.checked ? styles.gateLabelChecked : ""}`}>{gate.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.ctaSection}>
            <h3 className={styles.ctaTitle}>CTA AREA</h3>
            <button
              type="button"
              className={styles.ctaButton}
              onClick={handleCreatePreview}
              disabled={previewStatus === "creating"}
              aria-busy={previewStatus === "creating"}
            >
              Create Action Preview
            </button>
            <div className={styles.ctaBlocked}>
              External Execution: <span className={styles.ctaBlockedBadge}>BLOCKED</span>
              <br />
              (Reason: Approval is not completed)
            </div>
            <span className={styles.srOnly} aria-live="polite">
              {previewStatus === "idle" ? "" : previewStatus === "creating" ? "Creating action preview." : previewStatus === "ready" ? previewMessage : previewMessage || "Action preview creation failed."}
            </span>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Badge({ variant, label }: { variant: BadgeVariant; label: string }) {
  return <span className={`${styles.badge} ${styles[`badge--${variant}`]}`}>{label}</span>
}

function LogStatusTag({ status }: { status: LogStatus }) {
  const map: Record<LogStatus, string> = {
    INFO: styles.tagInfo,
    READY: styles.tagReady,
    NEEDS_REVIEW: styles.tagNeedsReview,
    NEEDS_OWNER: styles.tagNeedsOwner,
    NOT_READY: styles.tagNotReady,
    STATUS: styles.tagStatus,
    ACTION: styles.tagAction,
  }
  return <span className={`${styles.logTag} ${map[status]}`}>{logTagLabel[status]}</span>
}

function IndicatorDot({ color }: { color: "green" | "yellow" | "red" | "gray" }) {
  return <span className={`${styles.indicatorDot} ${styles[`dot--${color}`]}`} aria-hidden="true" />
}
