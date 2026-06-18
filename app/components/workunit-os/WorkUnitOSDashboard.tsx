"use client"

import { AdoptedWorkUnitDashboard } from "./adopted/AdoptedWorkUnitDashboard"
import { WorkUnitLauncher } from "./launcher/WorkUnitLauncher"

export function WorkUnitOSDashboard() {
  const useLegacyDashboard = process.env.NEXT_PUBLIC_WORKUNIT_LEGACY_DASHBOARD === "true"
  return useLegacyDashboard ? <AdoptedWorkUnitDashboard /> : <WorkUnitLauncher />
}
