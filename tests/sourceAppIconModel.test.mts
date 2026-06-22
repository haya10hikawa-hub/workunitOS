import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { resolveSourceAppIcon } from "../app/lib/application/launcher/sourceAppIconModel.ts"

const root = process.cwd()
const requiredAssets = [
  "github.svg",
  "slack.svg",
  "gmail.svg",
  "google-calendar.svg",
  "google-drive.svg",
  "google-docs.svg",
  "google-sheets.svg",
  "google-slides.svg",
  "notion.svg",
]

test("source app icon model resolves known providers to local assets", () => {
  assert.equal(resolveSourceAppIcon({ sourceProvider: "github", repository: "acme/app" }).assetPath, "/workunit-source-icons/github.svg")
  assert.equal(resolveSourceAppIcon({ sourceProvider: "slack", title: "#ops thread" }).assetPath, "/workunit-source-icons/slack.svg")
  assert.equal(resolveSourceAppIcon({ kind: "deadline", title: "calendar review" }).assetPath, "/workunit-source-icons/google-calendar.svg")
  assert.equal(resolveSourceAppIcon({ kind: "missed_response", title: "email follow-up" }).assetPath, "/workunit-source-icons/gmail.svg")
  assert.equal(resolveSourceAppIcon({ title: "Notion architecture memo" }).assetPath, "/workunit-source-icons/notion.svg")
})

test("source app icon model keeps unknown and database on fallback badges", () => {
  const unknown = resolveSourceAppIcon({ title: "unmapped source" })
  const database = resolveSourceAppIcon({ title: "database migration sql" })
  const team = resolveSourceAppIcon({ title: "team review" })
  assert.equal(unknown.assetPath, null)
  assert.equal(unknown.fallbackBadge, "WU")
  assert.equal(database.assetPath, null)
  assert.equal(database.fallbackBadge, "DB")
  assert.equal(team.assetPath, null)
  assert.equal(team.fallbackBadge, "TE")
})

test("source app icon model never resolves external asset paths", () => {
  const cases = [
    resolveSourceAppIcon({ sourceProvider: "github" }),
    resolveSourceAppIcon({ sourceProvider: "slack" }),
    resolveSourceAppIcon({ sourceProvider: "gmail" }),
    resolveSourceAppIcon({ sourceProvider: "calendar" }),
    resolveSourceAppIcon({ sourceProvider: "unknown" }),
  ]
  for (const icon of cases) {
    assert.equal(icon.assetPath?.startsWith("http://") ?? false, false)
    assert.equal(icon.assetPath?.startsWith("https://") ?? false, false)
  }
})

test("required source app SVG assets exist and are static", async () => {
  for (const file of requiredAssets) {
    const body = await readFile(path.join(root, "public/workunit-source-icons", file), "utf8")
    assert.equal(body.length > 0, true, file)
    assert.match(body, /<svg/i, file)
    assert.equal(/<script/i.test(body), false, file)
    assert.equal(/<foreignObject/i.test(body), false, file)
    assert.equal(/https?:\/\//i.test(body), false, file)
  }
  const sources = await readFile(path.join(root, "public/workunit-source-icons/SOURCES.md"), "utf8")
  assert.match(sources, /Simple Icons/)
})
