import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"

const root = process.cwd()

async function source(file: string): Promise<string> {
  return readFile(path.join(root, file), "utf8")
}

test("SourceAppIcon renders only registry-approved local image paths", async () => {
  const component = await source("app/components/workunit-os/launcher/SourceAppIcon.tsx")
  assert.equal(component.includes("isLocalSourceAppIconAssetPath(icon.assetPath)"), true)
  assert.equal(component.includes("src={icon.assetPath}"), true)
  assert.equal(component.includes('from "next/image"'), true)
  assert.equal(component.includes("alt={icon.label}"), true)
  assert.equal(component.includes("http://"), false)
  assert.equal(component.includes("https://"), false)
})

test("launcher source icon code has no runtime CDN URLs or tools route", async () => {
  const files = [
    "app/components/workunit-os/launcher/CommandPaletteView.tsx",
    "app/components/workunit-os/launcher/WorkUnitLauncher.tsx",
    "app/components/workunit-os/launcher/WorkUnitTreeMap.tsx",
    "app/components/workunit-os/launcher/SourceAppIcon.tsx",
    "app/lib/application/launcher/sourceAppIconModel.ts",
    "app/lib/application/launcher/workUnitSelectionModel.ts",
    "app/lib/application/launcher/workUnitTreeModel.ts",
  ]
  const combined = (await Promise.all(files.map(source))).join("\n")
  assert.equal(combined.includes("cdn.simpleicons.org"), false)
  assert.equal(combined.includes("cdn.jsdelivr.net"), false)
  assert.equal(combined.includes("/api/workunit" + "/tools"), false)
  for (const label of [
    "Send" + " Email",
    "Post" + " Slack",
    "Create" + " GitHub" + " Issue",
    "Create" + " Calendar" + " Event",
    "Database" + " Update",
    "External" + " Execute",
  ]) {
    assert.equal(combined.includes(label), false, label)
  }
})
