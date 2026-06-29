/**
 * Atra / WorkUnit OS — Electron Safe Shell (Phase E0).
 *
 * Electron is ONLY a desktop container for the existing Next.js Atra web UI. It adds
 * NO execution authority. The shell does not — and must never — perform external
 * execution, approval/execution creation, real LLM calls, file-system access, shell
 * command execution, or provider/token/secret/approval IPC.
 *
 *   AI proposes. Rules guard. Humans decide.
 *   Electron shell must not increase authority.
 *
 * The only IPC exposed is read-only desktop metadata:
 *   - atra:getAppVersion
 *   - atra:getPlatform
 *
 * Electron is intentionally NOT a package.json dependency (the alpha safety gate
 * forbids it; Electron desktop alpha remains No-Go). These files are statically
 * verified by `npm run electron:build:check` and `tests/electronSecurityInvariants.test.mts`.
 */

import { app, BrowserWindow, ipcMain } from "electron"
import path from "node:path"

// Renderer URL for development only. Used solely to point the BrowserWindow at the
// local Next.js dev server. It is NEVER used for secrets or provider configuration.
const DEFAULT_DEV_URL = "http://localhost:3000"
const START_URL = process.env.ATRA_ELECTRON_START_URL ?? DEFAULT_DEV_URL

// Navigation allowlist: only the same origin as the start URL may be navigated to.
// Everything else is denied by default (no external navigation, no new windows).
function isAllowedNavigation(targetUrl: string): boolean {
  try {
    return new URL(targetUrl).origin === new URL(START_URL).origin
  } catch {
    return false
  }
}

// Read-only desktop metadata handlers. These return static, non-sensitive values and
// perform no side effects, no file/network/shell access, and touch no product state.
function registerReadOnlyIpc(): void {
  ipcMain.handle("atra:getAppVersion", () => app.getVersion())
  ipcMain.handle("atra:getPlatform", () => process.platform)
}

function createWindow(): void {
  const preloadPath = path.join(__dirname, "preload.js")

  const window = new BrowserWindow({
    width: 1280,
    height: 832,
    show: true,
    webPreferences: {
      // Hard security boundary — the renderer is untrusted.
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: preloadPath,
    },
  })

  // Deny-by-default for any attempt to open a new window.
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }))

  // Deny-by-default for any navigation away from the app origin.
  window.webContents.on("will-navigate", (event, targetUrl) => {
    if (!isAllowedNavigation(targetUrl)) event.preventDefault()
  })

  void window.loadURL(START_URL)
}

app.whenReady().then(() => {
  registerReadOnlyIpc()
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
