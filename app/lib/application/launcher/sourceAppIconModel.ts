export type SourceAppIconId =
  | "github"
  | "slack"
  | "gmail"
  | "google-calendar"
  | "google-drive"
  | "google-docs"
  | "google-sheets"
  | "google-slides"
  | "notion"
  | "jira"
  | "linear"
  | "figma"
  | "google-meet"
  | "google-chat"
  | "salesforce"
  | "database"
  | "team"
  | "workunit"
  | "unknown"

export type SourceAppIconView = {
  readonly id: SourceAppIconId
  readonly label: string
  readonly assetPath: string | null
  readonly fallbackBadge: string
  readonly sourceType: "local_asset" | "fallback_badge"
}

type SourceAppIconInput = {
  readonly sourceProvider?: string | null
  readonly kind?: string | null
  readonly repository?: string | null
  readonly sourceUrl?: string | null
  readonly title?: string | null
}

const LOCAL_ASSETS = {
  github: "/workunit-source-icons/github.svg",
  slack: "/workunit-source-icons/slack.svg",
  gmail: "/workunit-source-icons/gmail.svg",
  "google-calendar": "/workunit-source-icons/google-calendar.svg",
  "google-drive": "/workunit-source-icons/google-drive.svg",
  "google-docs": "/workunit-source-icons/google-docs.svg",
  "google-sheets": "/workunit-source-icons/google-sheets.svg",
  "google-slides": "/workunit-source-icons/google-slides.svg",
  notion: "/workunit-source-icons/notion.svg",
  jira: "/workunit-source-icons/jira.svg",
  linear: "/workunit-source-icons/linear.svg",
  figma: "/workunit-source-icons/figma.svg",
  "google-meet": "/workunit-source-icons/google-meet.svg",
  "google-chat": "/workunit-source-icons/google-chat.svg",
  salesforce: "/workunit-source-icons/salesforce.svg",
} as const satisfies Partial<Record<SourceAppIconId, string>>

const ICON_META: Record<SourceAppIconId, { readonly label: string; readonly fallbackBadge: string }> = {
  github: { label: "GitHub", fallbackBadge: "GH" },
  slack: { label: "Slack", fallbackBadge: "SL" },
  gmail: { label: "Gmail", fallbackBadge: "EM" },
  "google-calendar": { label: "Google Calendar", fallbackBadge: "CA" },
  "google-drive": { label: "Google Drive", fallbackBadge: "GD" },
  "google-docs": { label: "Google Docs", fallbackBadge: "DO" },
  "google-sheets": { label: "Google Sheets", fallbackBadge: "SH" },
  "google-slides": { label: "Google Slides", fallbackBadge: "GS" },
  notion: { label: "Notion", fallbackBadge: "NO" },
  jira: { label: "Jira", fallbackBadge: "JI" },
  linear: { label: "Linear", fallbackBadge: "LI" },
  figma: { label: "Figma", fallbackBadge: "FI" },
  "google-meet": { label: "Google Meet", fallbackBadge: "ME" },
  "google-chat": { label: "Google Chat", fallbackBadge: "CH" },
  salesforce: { label: "Salesforce", fallbackBadge: "SF" },
  database: { label: "Database", fallbackBadge: "DB" },
  team: { label: "Team", fallbackBadge: "TE" },
  workunit: { label: "WorkUnit", fallbackBadge: "WU" },
  unknown: { label: "Unknown source", fallbackBadge: "WU" },
}

export function resolveSourceAppIcon(input: SourceAppIconInput): SourceAppIconView {
  const haystack = [input.sourceProvider, input.kind, input.repository, input.sourceUrl, input.title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  if (input.repository || match(haystack, ["github", "pull request", " pr ", "issue"])) return icon("github")
  if (match(haystack, ["slack", "thread", "channel", "#"])) return icon("slack")
  if (match(haystack, ["gmail", "email", "mail", "missed response"])) return icon("gmail")
  if (match(haystack, ["calendar", "meeting", "schedule", "deadline"])) return icon("google-calendar")
  if (match(haystack, ["drive"])) return icon("google-drive")
  if (match(haystack, ["docs", "document"])) return icon("google-docs")
  if (match(haystack, ["sheets", "spreadsheet"])) return icon("google-sheets")
  if (match(haystack, ["slides", "presentation", "deck"])) return icon("google-slides")
  if (match(haystack, ["notion"])) return icon("notion")
  if (match(haystack, ["jira", "task-"])) return icon("jira")
  if (match(haystack, ["linear"])) return icon("linear")
  if (match(haystack, ["figma", "design"])) return icon("figma")
  if (match(haystack, ["meet"])) return icon("google-meet")
  if (match(haystack, ["chat"])) return icon("google-chat")
  if (match(haystack, ["salesforce", "crm"])) return icon("salesforce")
  if (match(haystack, ["database", " db", "sql"])) return icon("database")
  if (match(haystack, ["team", "user", "stakeholder"])) return icon("team")
  if (match(haystack, ["workunit", "internal"])) return icon("workunit")
  return icon("unknown")
}

export function isLocalSourceAppIconAssetPath(value: string | null): value is SourceAppIconView["assetPath"] & string {
  return Object.values(LOCAL_ASSETS).includes(value as never)
}

function icon(id: SourceAppIconId): SourceAppIconView {
  const meta = ICON_META[id]
  const assetPath = LOCAL_ASSETS[id as keyof typeof LOCAL_ASSETS] ?? null
  return {
    id,
    label: meta.label,
    assetPath,
    fallbackBadge: meta.fallbackBadge,
    sourceType: assetPath ? "local_asset" : "fallback_badge",
  }
}

function match(haystack: string, needles: readonly string[]): boolean {
  return needles.some((needle) => haystack.includes(needle))
}
