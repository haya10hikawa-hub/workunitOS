"use client"

import { AtraWorkspace } from "@/components/atra/AtraWorkspace"

// Retained for compatibility with the launcher mode contract. The Atra workspace
// renders the Node Canvas and Action Field side by side (no modal mode switch).
export type WorkUnitLauncherMode = "palette" | "action-field"

export function WorkUnitLauncher() {
  return <AtraWorkspace />
}
