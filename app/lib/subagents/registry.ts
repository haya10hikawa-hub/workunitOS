export type WorkUnitSubAgentRole =
  | "coordination"
  | "hopper"
  | "normalization"
  | "drafting"
  | "execution"
  | "voice"
  | "safety"

export type WorkUnitSubAgentDefinition = {
  id: string
  name: string
  role: WorkUnitSubAgentRole
  modulePath: string
  responsibility: string
}

export const WORKUNIT_SUBAGENTS: readonly WorkUnitSubAgentDefinition[] = [
  agent("01", "Chief of Staff", "coordination", "chiefOfStaffAgent.ts", "PM intent, state, next action handoff"),
  agent("02", "Slack Hopper", "hopper", "slackHopperAgent.ts", "Slack sandbox to sanitized candidate"),
  agent("03", "Notion Hopper", "hopper", "notionHopperAgent.ts", "Notion sandbox to sanitized candidate"),
  agent("04", "Gmail Hopper", "hopper", "gmailHopperAgent.ts", "Gmail sandbox to sanitized candidate"),
  agent("05", "Google Drive Hopper", "hopper", "googleDriveHopperAgent.ts", "Drive sandbox to sanitized candidate"),
  agent("06", "Google Calendar Hopper", "hopper", "googleCalendarHopperAgent.ts", "Calendar sandbox to sanitized candidate"),
  agent("07", "Source Normalization", "normalization", "sourceNormalizationAgent.ts", "Multi-source privacy-checked normalization"),
  agent("08", "WorkUnit Draft", "drafting", "workUnitDraftAgent.ts", "Candidate to WorkUnit draft"),
  agent("09", "Correction", "drafting", "correctionAgent.ts", "PM judgment and correction application"),
  agent("10", "Context Merge", "drafting", "contextMergeAgent.ts", "Related candidate merge"),
  agent("11", "GitHub Issue", "execution", "githubIssueAgent.ts", "Approval-gated GitHub issue draft"),
  agent("12", "Task", "execution", "taskAgent.ts", "Internal task draft"),
  agent("13", "Calendar Schedule", "execution", "calendarScheduleAgent.ts", "Approval-gated calendar candidate"),
  agent("14", "Reply Draft", "execution", "replyDraftAgent.ts", "Slack/Gmail reply draft"),
  agent("15", "Voice Prompt", "voice", "voicePromptAgent.ts", "Proactive voice phrase generation"),
  agent("16", "Interruptibility", "voice", "interruptibilityAgent.ts", "Interrupt timing score"),
  agent("17", "Privacy Sandbox", "safety", "privacySandboxAgent.ts", "Raw data and injection boundary"),
  agent("18", "Eval Red Team", "safety", "evalRedTeamAgent.ts", "Safety checklist and eval set"),
]

export function listWorkUnitSubAgents(): readonly WorkUnitSubAgentDefinition[] {
  return WORKUNIT_SUBAGENTS
}

function agent(
  index: string,
  name: string,
  role: WorkUnitSubAgentRole,
  file: string,
  responsibility: string,
): WorkUnitSubAgentDefinition {
  return { id: `wu-subagent-${index}`, name, role, modulePath: `app/lib/subagents/${file}`, responsibility }
}
