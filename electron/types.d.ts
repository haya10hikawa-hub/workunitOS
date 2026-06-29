/**
 * Atra / WorkUnit OS — Electron renderer type surface (Phase E0).
 *
 * Documents the single read-only desktop API the preload exposes. The product UI does
 * not depend on this in Phase E0; it is optional and read-only by design.
 */

declare global {
  interface Window {
    readonly atraDesktop?: {
      readonly getAppVersion: () => Promise<string>
      readonly getPlatform: () => Promise<NodeJS.Platform>
    }
  }
}

export {}
