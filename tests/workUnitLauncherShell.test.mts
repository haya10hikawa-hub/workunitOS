import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"

const root = process.cwd()
const launcherFiles = [
  "app/components/workunit-os/launcher/WorkUnitLauncher.tsx",
  "app/components/workunit-os/launcher/CommandPaletteView.tsx",
  "app/components/workunit-os/launcher/ActionFieldView.tsx",
  "app/components/workunit-os/launcher/ActionFieldEditor.tsx",
  "app/components/workunit-os/launcher/WorkUnitTreeMap.tsx",
  "app/components/workunit-os/launcher/ReadinessCards.tsx",
  "app/components/workunit-os/launcher/WorkUnitLauncher.module.css",
  "app/lib/application/launcher/workUnitSelectionModel.ts",
  "app/lib/application/launcher/paletteCommandRegistry.ts",
  "app/lib/application/launcher/forbiddenCommandFilter.ts",
  "app/lib/application/launcher/keyboardNavigationModel.ts",
  "app/lib/application/launcher/workUnitTreeModel.ts",
  "app/lib/application/launcher/actionFieldEditorDraftModel.ts",
]

async function source(file: string): Promise<string> {
  return readFile(path.join(root, file), "utf8")
}

test("WorkUnitLauncherMode and launcher components exist", async () => {
  const launcher = await source(launcherFiles[0])
  const palette = await source(launcherFiles[1])
  const actionField = await source(launcherFiles[2])
  const editor = await source(launcherFiles[3])
  const tree = await source(launcherFiles[4])
  assert.equal(launcher.includes('type WorkUnitLauncherMode = "palette" | "action-field"'), true)
  assert.equal(launcher.includes("export function WorkUnitLauncher"), true)
  assert.equal(palette.includes("export function CommandPaletteView"), true)
  assert.equal(actionField.includes("export function ActionFieldView"), true)
  assert.equal(editor.includes("export function ActionFieldEditor"), true)
  assert.equal(tree.includes("export function WorkUnitTreeMap"), true)
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
    "Direct" + " provider" + " mutation",
  ]
  for (const term of forbidden) assert.equal(combined.includes(term), false, term)
})

test("generated artifacts are not tracked", () => {
  const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  const forbiddenPrefixes = [
    "desktop/",
    ".dev.vars",
    ".env.local",
    ".next/",
    ".open-next/",
    ".npm-cache/",
    ".wrangler/",
    "_app_semantic_inventory",
    "_app_tree_audit",
    "_tmp_revert",
  ]
  for (const prefix of forbiddenPrefixes) assert.equal(tracked.includes(prefix), false, prefix)
})
