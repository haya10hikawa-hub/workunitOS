"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent,
} from "react"
import type { HopperConnectionPreview } from "@/lib/hopperActionRouter"

export type HopperQueueItem = {
  id: string
  scopeKey: string
  score: number
  threshold: number
  title: string
  summary: string
  sourceUrl?: string
  connectionPreview?: HopperConnectionPreview
  notePreview?: HopperConnectionPreview
}

type GestureState = {
  active: boolean
  dx: number
  dy: number
}

type HopperSortStage = "triage" | "route" | "action"
type HopperRouteDecision = "note" | "workunit"
type HopperActionDecision = "defer" | "create"

type HopperFeedbackReason =
  | "wrong_summary"
  | "wrong_priority"
  | "wrong_route"
  | "irrelevant"
  | "missing_context"
  | "other"

type HopperMobileTuiProps = {
  items: HopperQueueItem[]
  alpha?: number
  tDelay?: number
  language?: "ja" | "en"
  onLanguageChange?: (language: "ja" | "en") => void
  onCommit?: (event: {
    id: string
    action: "keep" | "discard"
    route?: HopperRouteDecision
    nextAction?: HopperActionDecision
    latencyMs: number
    score: number
  }) => void
  onWrongFeedback?: (event: {
    id: string
    stage: HopperSortStage
    reason: HopperFeedbackReason
    details: string
  }) => void
}

const SWIPE_THRESHOLD = 80
const EJECT_MS = 180

export function HopperMobileTui({
  items,
  alpha = 0.15,
  tDelay = 0,
  language = "ja",
  onLanguageChange,
  onCommit,
  onWrongFeedback,
}: HopperMobileTuiProps) {
  const [queue, setQueue] = useState(items)
  const [gesture, setGesture] = useState<GestureState>({ active: false, dx: 0, dy: 0 })
  const [eject, setEject] = useState<"keep" | "discard" | null>(null)
  const [stage, setStage] = useState<HopperSortStage>("triage")
  const [routeDecision, setRouteDecision] = useState<HopperRouteDecision | null>(null)
  const [actionDecision, setActionDecision] = useState<HopperActionDecision | null>(null)
  const [wrongOpen, setWrongOpen] = useState(false)
  const [feedbackReason, setFeedbackReason] = useState<HopperFeedbackReason | null>(null)
  const [feedbackDetails, setFeedbackDetails] = useState("")
  const touchStartRef = useRef({ x: 0, y: 0, at: 0 })
  const activeAtRef = useRef(0)
  const activeCardRef = useRef<HTMLElement | null>(null)
  const priorityBarRef = useRef<HTMLDivElement | null>(null)
  const workUnitMetricRef = useRef<HTMLSpanElement | null>(null)
  const ejectRef = useRef<"keep" | "discard" | null>(null)
  const decisionPathRef = useRef<{
    route?: HopperRouteDecision
    nextAction?: HopperActionDecision
  }>({})

  useEffect(() => {
    setQueue(items)
  }, [items])

  const activeItem = queue[0]
  const activeItemId = activeItem?.id
  const activeScore = activeItem?.score ?? 0
  const activeThreshold = activeItem?.threshold ?? 0
  const visibleStack = useMemo(() => queue.slice(0, 3), [queue])
  const copy = uiCopy[language]

  useEffect(() => {
    activeAtRef.current = performance.now()
    setStage("triage")
    setRouteDecision(null)
    setActionDecision(null)
    decisionPathRef.current = {}
    activeCardRef.current?.style.setProperty("--hopper-active-opacity", "1")
    priorityBarRef.current?.style.setProperty("--hopper-priority-scale", "1")
    priorityBarRef.current?.style.setProperty("--hopper-priority-color", "#0a84ff")
  }, [activeItemId])

  useEffect(() => {
    let frame = 0

    const tick = () => {
      if (!activeItemId || ejectRef.current) {
        frame = requestAnimationFrame(tick)
        return
      }

      const elapsedSeconds = Math.max(0, (performance.now() - activeAtRef.current) / 1000 - tDelay)
      const remaining = Math.exp(-alpha * elapsedSeconds)
      const currentPriorityScore = activeScore * remaining
      const workUnitMargin = currentPriorityScore - activeThreshold
      const priorityColor = workUnitMargin >= 0 ? "#0a84ff" : "#ff453a"

      priorityBarRef.current?.style.setProperty(
        "--hopper-priority-scale",
        Math.max(0, Math.min(1, remaining)).toFixed(4),
      )
      priorityBarRef.current?.style.setProperty("--hopper-priority-color", priorityColor)

      if (workUnitMetricRef.current) {
        workUnitMetricRef.current.textContent = formatWorkUnitMargin(workUnitMargin)
        workUnitMetricRef.current.style.color = priorityColor
      }

      activeCardRef.current?.style.setProperty(
        "--hopper-active-opacity",
        workUnitMargin < 0 ? "0.72" : "1",
      )

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [activeItemId, activeScore, activeThreshold, alpha, tDelay])

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!activeItem || eject) return

    const touch = event.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      at: performance.now(),
    }
    setGesture({ active: true, dx: 0, dy: 0 })
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!gesture.active || !activeItem || eject) return

    event.preventDefault()
    const touch = event.touches[0]
    setGesture({
      active: true,
      dx: touch.clientX - touchStartRef.current.x,
      dy: touch.clientY - touchStartRef.current.y,
    })
  }

  const handleTouchEnd = () => {
    if (!gesture.active || !activeItem || eject) return

    if (gesture.dx > SWIPE_THRESHOLD) {
      commitStage("right")
      return
    }

    if (gesture.dx < -SWIPE_THRESHOLD) {
      commitStage("left")
      return
    }

    setGesture({ active: false, dx: 0, dy: 0 })
  }

  const commit = useCallback((action: "keep" | "discard") => {
    if (!activeItem) return

    ejectRef.current = action
    setEject(action)
    const startedAt = touchStartRef.current.at || activeAtRef.current

    window.setTimeout(() => {
      const latencyMs = Math.round(performance.now() - startedAt)
      onCommit?.({
        id: activeItem.id,
        action,
        ...decisionPathRef.current,
        latencyMs,
        score: activeItem.score,
      })
      setQueue((current) => current.slice(1))
      setGesture({ active: false, dx: 0, dy: 0 })
      setStage("triage")
      setRouteDecision(null)
      setActionDecision(null)
      decisionPathRef.current = {}
      activeCardRef.current?.style.setProperty("--hopper-active-opacity", "1")
      priorityBarRef.current?.style.setProperty("--hopper-priority-scale", "1")
      setEject(null)
      ejectRef.current = null
    }, EJECT_MS)
  }, [activeItem, onCommit])

  const advanceStage = useCallback((nextStage: HopperSortStage) => {
    setStage(nextStage)
    setGesture({ active: false, dx: 0, dy: 0 })
    activeAtRef.current = performance.now()
    activeCardRef.current?.style.setProperty("--hopper-active-opacity", "1")
    priorityBarRef.current?.style.setProperty("--hopper-priority-scale", "1")
  }, [])

  const commitStage = useCallback((direction: "left" | "right") => {
    if (stage === "triage") {
      if (direction === "left") {
        commit("discard")
        return
      }

      advanceStage("route")
      return
    }

    if (stage === "route") {
      const route = direction === "left" ? "note" : "workunit"
      setRouteDecision(route)
      decisionPathRef.current = { ...decisionPathRef.current, route }
      advanceStage("action")
      return
    }

    const nextAction = direction === "left" ? "defer" : "create"
    setActionDecision(nextAction)
    decisionPathRef.current = { ...decisionPathRef.current, nextAction }
    commit("keep")
  }, [advanceStage, commit, stage])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeItem || eject || event.repeat || isEditableTarget(event.target)) return

      const key = event.key.toLowerCase()
      if (key === "arrowright" || key === "l") {
        event.preventDefault()
        touchStartRef.current = { x: 0, y: 0, at: performance.now() }
        setGesture({ active: true, dx: SWIPE_THRESHOLD + 28, dy: 0 })
        commitStage("right")
        return
      }

      if (key === "arrowleft" || key === "h") {
        event.preventDefault()
        touchStartRef.current = { x: 0, y: 0, at: performance.now() }
        setGesture({ active: true, dx: -SWIPE_THRESHOLD - 28, dy: 0 })
        commitStage("left")
        return
      }

      if (key === "arrowup" || key === "k") {
        event.preventDefault()
        setGesture({ active: true, dx: 0, dy: -42 })
        return
      }

      if (key === "arrowdown" || key === "j") {
        event.preventDefault()
        setGesture({ active: true, dx: 0, dy: 42 })
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key === "arrowup" || key === "k" || key === "arrowdown" || key === "j") {
        setGesture({ active: false, dx: 0, dy: 0 })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [activeItem, commitStage, eject])

  const actionBias =
    gesture.dx > SWIPE_THRESHOLD * 0.5
      ? stageCopy[language][stage].right
      : gesture.dx < -SWIPE_THRESHOLD * 0.5
        ? stageCopy[language][stage].left
        : "HOLD"

  return (
    <section style={styles.shell} aria-label="Hopper mobile queue">
      <div style={styles.statusRow}>
        <span>HOPPER</span>
        <div style={styles.statusControls}>
          <span style={styles.stageLabel}>{stageCopy[language][stage].label}</span>
          <span>{queue.length.toString().padStart(2, "0")}</span>
          <button
            type="button"
            style={styles.languageButton}
            aria-label={copy.languageLabel}
            onClick={() => onLanguageChange?.(language === "ja" ? "en" : "ja")}
          >
            {language.toUpperCase()}
          </button>
        </div>
      </div>

      <div style={styles.stackRegion}>
        {visibleStack.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyTitle}>{copy.emptyTitle}</div>
            <div style={styles.emptyMeta}>{copy.emptyMeta}</div>
          </div>
        ) : (
          visibleStack
            .map((item, index) => {
              const isActive = index === 0
              const transform = getCardTransform(index, gesture, eject)
              const workUnitMargin = item.score - item.threshold
              const preview = routeDecision === "note" ? item.notePreview : item.connectionPreview

              return (
                <article
                  ref={isActive ? activeCardRef : undefined}
                  key={item.id}
                  style={{
                    ...styles.card,
                    zIndex: 10 - index,
                    opacity: isActive ? "var(--hopper-active-opacity, 1)" : 0.46,
                    transform,
                    transition: gesture.active && isActive ? "none" : "transform 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease",
                  }}
                >
                  <div style={styles.cardMeta}>
                    <span>{item.scopeKey}</span>
                    <span
                      ref={isActive ? workUnitMetricRef : undefined}
                      style={workUnitMargin >= 0 ? styles.workUnitPositive : styles.workUnitNegative}
                    >
                      {formatWorkUnitMargin(workUnitMargin)}
                    </span>
                  </div>
                  <h1 style={styles.title}>{item.title}</h1>
                  <p style={styles.summary}>{item.summary}</p>
                  {isActive ? (
                    <div style={styles.pathRow}>
                      <span>{routeDecision ? routeDecision.toUpperCase() : "--"}</span>
                      <span>{actionDecision ? actionDecision.toUpperCase() : "--"}</span>
                    </div>
                  ) : null}
                  {isActive && preview ? (
                    <div style={styles.connectionPreview}>
                      <div style={styles.connectionHeader}>
                        <span>CONNECTION</span>
                        <span>{preview.targetSurface.toUpperCase()}</span>
                      </div>
                      <strong style={styles.connectionTarget}>{preview.label}</strong>
                      <p style={styles.connectionWhy}>{preview.why}</p>
                      <ol style={styles.connectionSteps}>
                        {preview.nextItems.slice(0, 3).map((nextItem) => (
                          <li key={nextItem}>{nextItem}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                  {isActive ? (
                    <button
                      type="button"
                      style={styles.wrongButton}
                      onClick={() => setWrongOpen(true)}
                    >
                      THIS IS WRONG
                    </button>
                  ) : null}
                  {isActive ? (
                    <div style={styles.decayTrack}>
                      <div
                        ref={priorityBarRef}
                        style={{
                          ...styles.priorityBar,
                        }}
                      />
                    </div>
                  ) : null}
                </article>
              )
            })
            .reverse()
        )}
      </div>

      <div
        style={styles.touchPad}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div style={styles.padRail}>
          <span style={actionBias === stageCopy[language][stage].left ? styles.padHot : styles.padCold}>
            {stageCopy[language][stage].left}
          </span>
          <span style={styles.padCenter}>{Math.round(gesture.dx)}</span>
          <span style={actionBias === stageCopy[language][stage].right ? styles.padHot : styles.padCold}>
            {stageCopy[language][stage].right}
          </span>
        </div>
      </div>

      {wrongOpen && activeItem ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modalPanel}>
            <div style={styles.modalTitle}>WHY WRONG</div>
            <div style={styles.modalOptions}>
              {feedbackOptions[language].map((option) => {
                const active = feedbackReason === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    style={{
                      ...styles.feedbackOption,
                      ...(active ? styles.feedbackOptionActive : null),
                    }}
                    onClick={() => setFeedbackReason(option.id)}
                  >
                    <span>{active ? "●" : "○"}</span>
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
            <textarea
              value={feedbackDetails}
              onChange={(event) => setFeedbackDetails(event.target.value)}
              style={styles.feedbackText}
              placeholder="DETAILS"
            />
            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.modalButton}
                onClick={() => {
                  setWrongOpen(false)
                  setFeedbackReason(null)
                  setFeedbackDetails("")
                }}
              >
                CANCEL
              </button>
              <button
                type="button"
                style={{
                  ...styles.modalButton,
                  ...(feedbackReason ? styles.modalButtonPrimary : styles.modalButtonDisabled),
                }}
                disabled={!feedbackReason}
                onClick={() => {
                  if (!feedbackReason || !activeItem) return
                  onWrongFeedback?.({
                    id: activeItem.id,
                    stage,
                    reason: feedbackReason,
                    details: feedbackDetails,
                  })
                  setWrongOpen(false)
                  setFeedbackReason(null)
                  setFeedbackDetails("")
                }}
              >
                SUBMIT
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function getCardTransform(
  index: number,
  gesture: GestureState,
  eject: "keep" | "discard" | null,
): string {
  if (index > 0) {
    const scale = 1 - index * 0.055
    const y = index * 16
    return `translate3d(0, ${y}px, ${-index * 24}px) scale(${scale})`
  }

  if (eject) {
    const direction = eject === "keep" ? 1 : -1
    return `translate3d(${direction * 460}px, ${gesture.dy}px, 0) rotate(${direction * 18}deg)`
  }

  const rotate = Math.max(-16, Math.min(16, gesture.dx / 9))
  return `translate3d(${gesture.dx}px, ${gesture.dy}px, 0) rotate(${rotate}deg)`
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
}

function formatWorkUnitMargin(margin: number): string {
  const sign = margin >= 0 ? "+" : "-"
  return `WU: Δ${sign}${Math.abs(margin).toFixed(3)}`
}

const uiCopy = {
  ja: {
    emptyTitle: "QUEUE EMPTY",
    emptyMeta: "SIGNALなし",
    languageLabel: "言語を切り替える",
  },
  en: {
    emptyTitle: "QUEUE EMPTY",
    emptyMeta: "NO SIGNAL",
    languageLabel: "Change language",
  },
}

const stageCopy: Record<
  "ja" | "en",
  Record<HopperSortStage, { label: string; left: string; right: string }>
> = {
  ja: {
    triage: { label: "TRIAGE", left: "DROP", right: "CANDIDATE" },
    route: { label: "ROUTE", left: "NOTE", right: "WORKUNIT" },
    action: { label: "ACTION", left: "DEFER", right: "CREATE" },
  },
  en: {
    triage: { label: "TRIAGE", left: "DROP", right: "CANDIDATE" },
    route: { label: "ROUTE", left: "NOTE", right: "WORKUNIT" },
    action: { label: "ACTION", left: "DEFER", right: "CREATE" },
  },
}

const feedbackOptions: Record<
  "ja" | "en",
  Array<{ id: HopperFeedbackReason; label: string }>
> = {
  ja: [
    { id: "wrong_summary", label: "Summary is wrong" },
    { id: "wrong_priority", label: "Priority is wrong" },
    { id: "wrong_route", label: "Route is wrong" },
    { id: "irrelevant", label: "Not a WorkUnit signal" },
    { id: "missing_context", label: "Missing context" },
    { id: "other", label: "Other" },
  ],
  en: [
    { id: "wrong_summary", label: "Summary is wrong" },
    { id: "wrong_priority", label: "Priority is wrong" },
    { id: "wrong_route", label: "Route is wrong" },
    { id: "irrelevant", label: "Not a WorkUnit signal" },
    { id: "missing_context", label: "Missing context" },
    { id: "other", label: "Other" },
  ],
}

const mono =
  "var(--font-geist-mono, 'SFMono-Regular'), 'JetBrains Mono', 'Fira Code', Consolas, monospace"

const styles: Record<string, CSSProperties> = {
  shell: {
    minHeight: "100dvh",
    width: "100%",
    display: "grid",
    gridTemplateRows: "44px minmax(0, 1fr) 30dvh",
    background: "#000000",
    color: "#f5f5f7",
    fontFamily: mono,
    overflow: "hidden",
    userSelect: "none",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    color: "#6e6e73",
    fontSize: "11px",
    letterSpacing: "0",
    borderBottom: "1px solid #141414",
  },
  statusControls: {
    display: "inline-flex",
    alignItems: "center",
    gap: "12px",
  },
  stageLabel: {
    color: "#f5f5f7",
  },
  languageButton: {
    minWidth: "34px",
    height: "24px",
    border: "1px solid #202020",
    background: "#000000",
    color: "#f5f5f7",
    padding: "0 7px",
    fontFamily: mono,
    fontSize: "10px",
    lineHeight: "22px",
    letterSpacing: "0",
  },
  stackRegion: {
    position: "relative",
    display: "grid",
    placeItems: "center",
    padding: "18px 18px 8px",
    perspective: "900px",
    overflow: "hidden",
  },
  card: {
    position: "absolute",
    width: "min(86vw, 380px)",
    minHeight: "48dvh",
    display: "grid",
    gridTemplateRows: "auto auto 1fr auto auto auto auto",
    gap: "12px",
    padding: "18px",
    border: "1px solid #202020",
    background: "#050505",
    color: "#f5f5f7",
    boxShadow: "0 28px 60px rgba(0,0,0,.58)",
    transformOrigin: "50% 82%",
    willChange: "transform",
  },
  cardMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    color: "#6e6e73",
    fontSize: "10px",
    lineHeight: 1.4,
    overflowWrap: "anywhere",
  },
  title: {
    margin: 0,
    color: "#f5f5f7",
    fontFamily: mono,
    fontSize: "22px",
    lineHeight: 1.14,
    fontWeight: 700,
    letterSpacing: "0",
    overflowWrap: "anywhere",
  },
  summary: {
    margin: 0,
    color: "#6e6e73",
    fontSize: "13px",
    lineHeight: 1.55,
    letterSpacing: "0",
    overflowWrap: "anywhere",
  },
  wrongButton: {
    width: "100%",
    border: "1px solid #202020",
    background: "#050505",
    color: "#6e6e73",
    padding: "10px 8px",
    fontFamily: mono,
    fontSize: "10px",
    letterSpacing: "0",
  },
  pathRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    color: "#6e6e73",
    fontSize: "10px",
  },
  connectionPreview: {
    display: "grid",
    gap: "7px",
    border: "1px solid #161616",
    padding: "10px",
    background: "#030303",
  },
  connectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    color: "#6e6e73",
    fontSize: "9px",
    lineHeight: 1.2,
  },
  connectionTarget: {
    color: "#f5f5f7",
    fontSize: "11px",
    lineHeight: 1.25,
    overflowWrap: "anywhere",
  },
  connectionWhy: {
    margin: 0,
    color: "#6e6e73",
    fontSize: "10px",
    lineHeight: 1.35,
    overflowWrap: "anywhere",
  },
  connectionSteps: {
    margin: 0,
    paddingLeft: "16px",
    color: "#6e6e73",
    fontSize: "9px",
    lineHeight: 1.45,
    overflowWrap: "anywhere",
  },
  decayTrack: {
    height: "1px",
    width: "100%",
    background: "#1c1c1e",
    overflow: "hidden",
  },
  priorityBar: {
    height: "1px",
    width: "100%",
    background: "var(--hopper-priority-color, #0a84ff)",
    transform: "scaleX(var(--hopper-priority-scale, 1))",
    transformOrigin: "left center",
    transition: "background 120ms linear",
  },
  workUnitPositive: {
    color: "#0a84ff",
    fontVariantNumeric: "tabular-nums",
  },
  workUnitNegative: {
    color: "#ff453a",
    fontVariantNumeric: "tabular-nums",
  },
  touchPad: {
    borderTop: "1px solid #141414",
    background: "#000000",
    display: "grid",
    gridTemplateRows: "1fr",
    touchAction: "none",
  },
  padRail: {
    display: "grid",
    gridTemplateColumns: "1fr 64px 1fr",
    alignItems: "center",
    padding: "0 22px",
    fontSize: "12px",
    letterSpacing: "0",
  },
  padCold: {
    color: "#6e6e73",
  },
  padHot: {
    color: "#f5f5f7",
  },
  padCenter: {
    color: "#6e6e73",
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
  },
  emptyState: {
    display: "grid",
    gap: "8px",
    textAlign: "center",
  },
  emptyTitle: {
    color: "#f5f5f7",
    fontSize: "16px",
    fontWeight: 700,
  },
  emptyMeta: {
    color: "#6e6e73",
    fontSize: "11px",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 10000,
    display: "grid",
    placeItems: "end center",
    padding: "14px",
    background: "rgba(0,0,0,.72)",
  },
  modalPanel: {
    width: "100%",
    border: "1px solid #202020",
    background: "#050505",
    padding: "14px",
    display: "grid",
    gap: "12px",
  },
  modalTitle: {
    color: "#f5f5f7",
    fontSize: "12px",
    fontWeight: 700,
  },
  modalOptions: {
    display: "grid",
    gap: "6px",
  },
  feedbackOption: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "18px 1fr",
    gap: "8px",
    alignItems: "center",
    border: "1px solid #141414",
    background: "#000000",
    color: "#6e6e73",
    padding: "9px 10px",
    fontFamily: mono,
    fontSize: "11px",
    textAlign: "left",
  },
  feedbackOptionActive: {
    borderColor: "#0a84ff",
    color: "#f5f5f7",
  },
  feedbackText: {
    minHeight: "72px",
    border: "1px solid #202020",
    background: "#000000",
    color: "#f5f5f7",
    padding: "10px",
    fontFamily: mono,
    fontSize: "11px",
    resize: "none",
    outline: "none",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
  },
  modalButton: {
    border: "1px solid #202020",
    background: "#000000",
    color: "#6e6e73",
    padding: "8px 10px",
    fontFamily: mono,
    fontSize: "10px",
  },
  modalButtonPrimary: {
    borderColor: "#0a84ff",
    color: "#0a84ff",
  },
  modalButtonDisabled: {
    opacity: 0.45,
  },
}
