/**
 * Atra / WorkUnit OS — Electron preload (Phase E0).
 *
 * Exposes EXACTLY one read-only desktop API surface to the renderer via contextBridge:
 *
 *   window.atraDesktop = {
 *     getAppVersion: () => Promise<string>
 *     getPlatform:   () => Promise<NodeJS.Platform>
 *   }
 *
 * It does NOT expose ipcRenderer, raw invoke/send/on/removeListener, or any
 * file / shell / provider / token / secret / approval / external-action capability.
 * The renderer cannot escalate authority through this bridge.
 */

import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("atraDesktop", {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke("atra:getAppVersion"),
  getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke("atra:getPlatform"),
})
