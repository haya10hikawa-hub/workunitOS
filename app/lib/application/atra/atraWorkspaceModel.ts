/**
 * Atra workspace model (candidate-only).
 *
 * Pure, deterministic model describing the "Quarterly Review Plan" workspace:
 * a core objective, a process-node graph, and the Action Field draft for the
 * selected node. It is candidate-only — no execution, no approval, no provider
 * call, no forbidden fields. The Action Field draft is local-edit only.
 */

export type AtraBadgeTone =
  | "slack"
  | "database"
  | "notion"
  | "drive"
  | "github"
  | "email"
  | "calendar"

export type AtraSourceBadge = {
  readonly code: string
  readonly tone: AtraBadgeTone
}

export type AtraNodeState = "default" | "selected" | "muted"

export type AtraOutputNode = {
  readonly id: string
  readonly label: string
}

export type AtraProcessNode = {
  readonly id: string
  readonly label: string
  readonly badges: readonly AtraSourceBadge[]
  readonly state: AtraNodeState
  readonly output?: AtraOutputNode
}

export type AtraCoreObjective = {
  readonly label: string
  readonly score: number
}

export type AtraDraftSpan = {
  readonly text: string
  readonly tone?: AtraBadgeTone
}

export type AtraDraftBlock =
  | { readonly kind: "h1"; readonly text: string }
  | { readonly kind: "p"; readonly spans: readonly AtraDraftSpan[] }
  | { readonly kind: "bullet"; readonly spans: readonly AtraDraftSpan[] }
  | { readonly kind: "note"; readonly text: string }

export type AtraActionField = {
  readonly path: string
  readonly outputTitle: string
  readonly linkedContext: readonly string[]
  readonly draftFilename: string
  readonly localEditsOnly: true
  readonly draftBlocks: readonly AtraDraftBlock[]
  readonly candidateOnly: true
  readonly humanReviewRequired: true
}

export type AtraWorkspaceModel = {
  readonly appVersion: string
  readonly workspaceTitle: string
  readonly coreObjective: AtraCoreObjective
  readonly processNodes: readonly AtraProcessNode[]
  readonly actionField: AtraActionField
}

const SLIDE_DECK_OUTPUT: AtraOutputNode = { id: "slide-deck-v4", label: "Slide Deck (v4)" }

export function deriveAtraWorkspace(): AtraWorkspaceModel {
  return {
    appVersion: "v1.0.4-stable",
    workspaceTitle: "Quarterly Review Plan",
    coreObjective: {
      label: "Quarterly review presentation",
      score: 79,
    },
    processNodes: [
      node("orient", "Orient", "default", [badge("DB", "database"), badge("SL", "slack")]),
      node("plan", "Plan", "default", []),
      {
        id: "compose",
        label: "Compose",
        state: "selected",
        badges: [badge("NO", "notion"), badge("DR", "drive")],
        output: SLIDE_DECK_OUTPUT,
      },
      node("verify", "Verify", "default", [badge("SL", "slack")]),
      node("resolve", "Resolve", "default", [badge("GH", "github"), badge("EM", "email")]),
      node("review", "Review", "default", []),
      node("intake", "", "muted", [badge("CA", "calendar")]),
    ],
    actionField: {
      path: "Compose / Slide Deck (v4)",
      outputTitle: "Slide Deck",
      linkedContext: [],
      draftFilename: "editable.md",
      localEditsOnly: true,
      candidateOnly: true,
      humanReviewRequired: true,
      draftBlocks: [
        { kind: "h1", text: "Q2 Performance Summary" },
        {
          kind: "p",
          spans: [
            { text: "Based on the data aggregated from Sources [" },
            { text: "SL", tone: "slack" },
            { text: ", " },
            { text: "DB", tone: "database" },
            { text: ", " },
            { text: "NO", tone: "notion" },
            { text: "], Q2 saw a substantial increase in core metrics." },
          ],
        },
        {
          kind: "bullet",
          spans: [{ text: "Performance metrics aligned with Q2 targets based on aggregate tool data." }],
        },
        {
          kind: "bullet",
          spans: [
            { text: "Dependent systems (" },
            { text: "GH", tone: "github" },
            { text: ", " },
            { text: "EM", tone: "email" },
            { text: ") functioned with minimal latency." },
          ],
        },
        {
          kind: "note",
          text: "// AI Note: Awaiting final verification from Slack channel #rev-q2 before finalizing draft.",
        },
      ],
    },
  }
}

function node(
  id: string,
  label: string,
  state: AtraNodeState,
  badges: readonly AtraSourceBadge[],
): AtraProcessNode {
  return { id, label, state, badges }
}

function badge(code: string, tone: AtraBadgeTone): AtraSourceBadge {
  return { code, tone }
}
