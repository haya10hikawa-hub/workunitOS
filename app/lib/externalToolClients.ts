import type {
  CalendarScheduleCandidate,
  GitHubIssueDraft,
  ReplyDraft,
} from "./workUnitExecution.ts"
import type { ToolBackendExternalConfig } from "../types/toolBackend.ts"

export type ExternalToolResult = {
  externalRef: string
  raw?: unknown
}

export type ExternalToolClients = {
  github?: {
    createIssue: (input: GitHubCreateIssueInput) => Promise<ExternalToolResult>
  }
  slack?: {
    postMessage: (input: SlackPostMessageInput) => Promise<ExternalToolResult>
  }
  gmail?: {
    sendMessage: (input: GmailSendMessageInput) => Promise<ExternalToolResult>
  }
  googleCalendar?: {
    createEvent: (input: GoogleCalendarCreateEventInput) => Promise<ExternalToolResult>
  }
}

export type GitHubCreateIssueInput = {
  draft: GitHubIssueDraft
  owner: string
  repo: string
}

export type SlackPostMessageInput = {
  draft: ReplyDraft
  channel: string
  threadTs?: string
}

export type GmailSendMessageInput = {
  draft: ReplyDraft
  to: string
  from?: string
  subject: string
}

export type GoogleCalendarCreateEventInput = {
  candidate: CalendarScheduleCandidate
  calendarId: string
  timeZone?: string
}

export function createDefaultExternalToolClients(env: NodeJS.ProcessEnv = process.env): ExternalToolClients {
  return {
    ...(env.GITHUB_TOKEN ? { github: githubClient(env.GITHUB_TOKEN) } : {}),
    ...(env.SLACK_BOT_TOKEN ? { slack: slackClient(env.SLACK_BOT_TOKEN) } : {}),
    ...(env.GMAIL_ACCESS_TOKEN ? { gmail: gmailClient(env.GMAIL_ACCESS_TOKEN) } : {}),
    ...(env.GOOGLE_CALENDAR_ACCESS_TOKEN ? { googleCalendar: googleCalendarClient(env.GOOGLE_CALENDAR_ACCESS_TOKEN) } : {}),
  }
}

export function githubConfig(config?: ToolBackendExternalConfig, env: NodeJS.ProcessEnv = process.env): { owner: string; repo: string } | null {
  const owner = clean(config?.github?.owner) ?? clean(env.GITHUB_OWNER)
  const repo = clean(config?.github?.repo) ?? clean(env.GITHUB_REPO)
  return owner && repo ? { owner, repo } : null
}

export function slackConfig(config?: ToolBackendExternalConfig, env: NodeJS.ProcessEnv = process.env): { channel: string; threadTs?: string } | null {
  const channel = clean(config?.slack?.channel) ?? clean(env.SLACK_CHANNEL_ID)
  return channel ? { channel, ...(config?.slack?.threadTs ? { threadTs: config.slack.threadTs } : {}) } : null
}

export function gmailConfig(config?: ToolBackendExternalConfig, env: NodeJS.ProcessEnv = process.env): { to: string; from?: string; subject?: string } | null {
  const to = clean(config?.gmail?.to) ?? clean(env.GMAIL_TO)
  if (!to) return null
  return { to, ...(config?.gmail?.from ? { from: config.gmail.from } : {}), ...(config?.gmail?.subject ? { subject: config.gmail.subject } : {}) }
}

export function googleCalendarConfig(config?: ToolBackendExternalConfig, env: NodeJS.ProcessEnv = process.env): { calendarId: string; timeZone?: string } | null {
  const calendarId = clean(config?.googleCalendar?.calendarId) ?? clean(env.GOOGLE_CALENDAR_ID) ?? "primary"
  return { calendarId, ...(config?.googleCalendar?.timeZone ? { timeZone: config.googleCalendar.timeZone } : {}) }
}

function githubClient(token: string): ExternalToolClients["github"] {
  return {
    async createIssue(input) {
      const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues`, {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ title: input.draft.title, body: input.draft.body, labels: input.draft.labels }),
      })
      const data = await readJson(response)
      if (!response.ok) throw new Error(`github_create_issue_failed:${response.status}`)
      return { externalRef: String(data.html_url ?? data.url ?? data.number), raw: data }
    },
  }
}

function slackClient(token: string): ExternalToolClients["slack"] {
  return {
    async postMessage(input) {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ channel: input.channel, text: input.draft.body, thread_ts: input.threadTs }),
      })
      const data = await readJson(response)
      if (!response.ok || data.ok === false) throw new Error(`slack_post_message_failed:${data.error ?? response.status}`)
      return { externalRef: `${data.channel}:${data.ts}`, raw: data }
    },
  }
}

function gmailClient(token: string): ExternalToolClients["gmail"] {
  return {
    async sendMessage(input) {
      const raw = encodeBase64Url([
        input.from ? `From: ${input.from}` : null,
        `To: ${input.to}`,
        `Subject: ${input.subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        input.draft.body,
      ].filter((line): line is string => line !== null).join("\r\n"))
      const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      })
      const data = await readJson(response)
      if (!response.ok) throw new Error(`gmail_send_failed:${response.status}`)
      return { externalRef: String(data.id), raw: data }
    },
  }
}

function googleCalendarClient(token: string): ExternalToolClients["googleCalendar"] {
  return {
    async createEvent(input) {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(toCalendarEvent(input.candidate, input.timeZone)),
      })
      const data = await readJson(response)
      if (!response.ok) throw new Error(`calendar_create_event_failed:${response.status}`)
      return { externalRef: String(data.htmlLink ?? data.id), raw: data }
    },
  }
}

function toCalendarEvent(candidate: CalendarScheduleCandidate, timeZone?: string): Record<string, unknown> {
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate.timeHint)) {
    return {
      summary: candidate.title,
      description: candidate.description,
      attendees: candidate.attendees.map((email) => ({ email })),
      start: { date: candidate.timeHint },
      end: { date: addDays(candidate.timeHint, 1) },
    }
  }
  const start = new Date(candidate.timeHint)
  const end = new Date(start.getTime() + 60 * 60_000)
  return {
    summary: candidate.title,
    description: candidate.description,
    attendees: candidate.attendees.map((email) => ({ email })),
    start: { dateTime: start.toISOString(), ...(timeZone ? { timeZone } : {}) },
    end: { dateTime: end.toISOString(), ...(timeZone ? { timeZone } : {}) },
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return { text }
  }
}

function clean(value: string | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}
