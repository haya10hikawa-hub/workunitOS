#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = fileURLToPath(new URL("../", import.meta.url))
const scanRoots = ["app", "tests"]
const ignoredDirs = new Set(["node_modules", ".next", ".open-next", "dist", "coverage"])
const legacyPrefixes = [
  { key: "app/lib/workunitInbox/sources", canonical: "app/lib/infrastructure/external" },
  { key: "@/app/lib/workunitInbox/sources", canonical: "@/app/lib/infrastructure/external" },
  { key: "@/lib/workunitInbox/sources", canonical: "@/lib/infrastructure/external" },
  { key: "app/lib/workunitInbox", canonical: "app/lib/application/workunitInbox" },
  { key: "@/app/lib/workunitInbox", canonical: "@/app/lib/application/workunitInbox" },
  { key: "@/lib/workunitInbox", canonical: "@/lib/application/workunitInbox" },
  { key: "app/lib/actionField", canonical: "app/lib/application/actionField" },
  { key: "@/app/lib/actionField", canonical: "@/app/lib/application/actionField" },
  { key: "@/lib/actionField", canonical: "@/lib/application/actionField" },
  { key: "app/components/workunitInbox", canonical: "app/components/workunit-os/adopted" },
  { key: "@/app/components/workunitInbox", canonical: "@/components/workunit-os/adopted" },
  { key: "@/components/workunitInbox", canonical: "@/components/workunit-os/adopted" },
  { key: "app/components/legacy/workunitInbox", canonical: "app/components/workunit-os/adopted" },
  { key: "@/app/components/legacy/workunitInbox", canonical: "@/components/workunit-os/adopted" },
  { key: "@/components/legacy/workunitInbox", canonical: "@/components/workunit-os/adopted" },
]

const importPattern = /^\s*import(?:\s+type)?(?:[\s\w{},*]+from\s+)?["']([^"']+)["']/gm

const files = []
for (const scanRoot of scanRoots) {
  files.push(...await listCodeFiles(path.join(rootDir, scanRoot)))
}

const matches = []
for (const file of files) {
  const source = await readFile(file, "utf8")
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1]
    const legacy = matchLegacy(specifier, file)
    if (legacy) {
      matches.push({
        file: path.relative(rootDir, file),
        specifier,
        prefix: legacy.key,
        canonical: legacy.canonical,
      })
    }
  }
}

const counts = new Map()
for (const item of matches) {
  counts.set(item.prefix, (counts.get(item.prefix) ?? 0) + 1)
}

console.log(`Legacy import count: ${matches.length}`)
console.log("")
console.log("Count by path prefix:")
for (const [prefix, count] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`- ${prefix}: ${count}`)
}
console.log("")
console.log("Importing files:")
for (const item of matches) {
  console.log(`- ${item.file} -> ${item.specifier} (suggested: ${item.canonical})`)
}

async function listCodeFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const nested = await Promise.all(entries.map(async (entry) => {
    if (ignoredDirs.has(entry.name)) return []
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return listCodeFiles(fullPath)
    if (!/\.(ts|tsx|mts)$/.test(entry.name)) return []
    return [fullPath]
  }))
  return nested.flat()
}

function matchLegacy(specifier, filePath) {
  const resolved = resolveSpecifier(specifier, filePath)
  const normalized = resolved.split(path.sep).join("/")
  return legacyPrefixes.find((legacy) => normalized.includes(legacy.key) || specifier.startsWith(legacy.key))
}

function resolveSpecifier(specifier, filePath) {
  if (specifier.startsWith("@/")) {
    const aliasPath = specifier.slice(2)
    return path.join(rootDir, aliasPath.startsWith("app/") ? aliasPath : path.join("app", aliasPath))
  }
  if (specifier.startsWith(".")) return path.resolve(path.dirname(filePath), specifier)
  return specifier
}
