import type { StudioDocument } from "@/types/studio"

export const mockStudioDocuments: StudioDocument[] = [
  {
    id: "doc-1",
    workUnitId: "wu-1",
    title: "Renewal rescue brief",
    mode: "Plan",
    content: `# Renewal rescue brief

Goal:
- unblock the enterprise renewal within this week

Working assumptions:
- security objections are valid but solvable
- buyer needs a concise response package, not a long audit dump

Next move:
- produce a one-page response and assign owners for each evidence item`,
  },
  {
    id: "doc-2",
    workUnitId: "wu-2",
    title: "Prompt cost reduction draft",
    mode: "Draft",
    content: `# Prompt cost reduction draft

Observation:
- longer system prompts improved quality but increased token burn

Experiment plan:
- trim repeated instructions
- move stable context into cached references
- compare quality at 0%, 15%, and 30% compression`,
  },
  {
    id: "doc-3",
    workUnitId: "wu-3",
    title: "Activation path notes",
    mode: "Review",
    content: `# Activation path notes

Users reach Studio but hesitate before their first structured output.

Questions:
- do they understand what a WorkUnit is
- is the first draft template too open-ended
- should tasks appear earlier in the flow`,
  },
  {
    id: "doc-4",
    workUnitId: "wu-4",
    title: "Execution friction checklist",
    mode: "Plan",
    content: `# Execution friction checklist

- identify the slowest transition between WorkUnit and Tasks
- separate UI friction from missing task clarity
- propose one instrumentation event per bottleneck`,
  },
]
