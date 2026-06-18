import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"

const root = process.cwd()
const launcherFiles = [
  "app/components/workunit-os/launcher/WorkUnitLauncher.tsx",
  "app/components/workunit-os/launcher/CommandPaletteView.tsx",
  "app/components/workunit-os/launcher/WorkUnitLauncher.module.css",
  "app/lib/application/launcher/workUnitSelectionModel.ts",
]

async function source(file: string): Promise<string> {
  return readFile(path.join(root, file), "utf8")
}

test("WorkUnitLauncherMode and launcher components exist", async () => {
  const launcher = await source(launcherFiles[0])
  const palette = await source(launcherFiles[1])
  assert.equal(launcher.includes('type WorkUnitLauncherMode = "palette" | "action-field"'), true)
  assert.equal(launcher.includes("export function WorkUnitLauncher"), true)
  assert.equal(palette.includes("export function CommandPaletteView"), true)
})

test("WorkUnitOSDashboard renders launcher by default with legacy flag fallback", async () => {
  const entry = await source("app/components/workunit-os/WorkUnitOSDashboard.tsx")
  assert.equal(entry.includes("<WorkUnitLauncher />"), true)
  assert.equal(entry.includes("NEXT_PUBLIC_WORKUNIT_LEGACY_DASHBOARD"), true)
  assert.equal(entry.includes("useLegacyDashboard ? <AdoptedWorkUnitDashboard /> : <WorkUnitLauncher />"), true)
})

test("launcher files do not include forbidden command strings or tools route", async () => {
  const combined = (await Promise.all(launcherFiles.map(source))).join("\n")
  const forbidden = [
    "Send" + " Email",
    "Post" + " Slack",
    "Create" + " GitHub" + " Issue",
    "Create" + " Calendar" + " Event",
    "Database" + " Update",
    "External" + " Execute",
    "/api/workunit" + "/tools",
    "slack" + "_post",
    "gmail" + "_send",
    "github" + "_issue",
    "calendar" + "_create",
    "database" + "_update",
  ]
  for (const term of forbidden) assert.equal(combined.includes(term), false, term)
})
