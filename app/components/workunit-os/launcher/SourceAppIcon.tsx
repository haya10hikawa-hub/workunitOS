import type { SourceAppIconId, SourceAppIconView } from "@/lib/application/launcher/sourceAppIconModel"
import { isLocalSourceAppIconAssetPath } from "@/lib/application/launcher/sourceAppIconModel"
import Image from "next/image"
import type { IconType } from "react-icons"
import {
  SiFigma,
  SiGithub,
  SiGmail,
  SiGooglecalendar,
  SiGooglechat,
  SiGoogledocs,
  SiGoogledrive,
  SiGooglemeet,
  SiGooglesheets,
  SiGoogleslides,
  SiJira,
  SiLinear,
  SiNotion,
  SiSalesforce,
  SiSlack,
} from "react-icons/si"
import { FiBox, FiDatabase, FiUsers } from "react-icons/fi"
import styles from "./WorkUnitLauncher.module.css"

type SourceAppIconProps = {
  readonly icon: SourceAppIconView
  readonly size?: "sm" | "md" | "lg"
}

const SIZE_CLASS = {
  sm: "sourceAppIconSm",
  md: "sourceAppIconMd",
  lg: "sourceAppIconLg",
} as const

// react-icons is the primary icon for all known source apps.
// The registry-approved local SVG asset is a fallback for ids not in this map.
const REACT_ICON_BY_ID: Partial<Record<SourceAppIconId, IconType>> = {
  github: SiGithub,
  slack: SiSlack,
  gmail: SiGmail,
  "google-calendar": SiGooglecalendar,
  "google-drive": SiGoogledrive,
  "google-docs": SiGoogledocs,
  "google-sheets": SiGooglesheets,
  "google-slides": SiGoogleslides,
  "google-meet": SiGooglemeet,
  "google-chat": SiGooglechat,
  notion: SiNotion,
  jira: SiJira,
  linear: SiLinear,
  figma: SiFigma,
  salesforce: SiSalesforce,
  database: FiDatabase,
  team: FiUsers,
  workunit: FiBox,
  unknown: FiBox,
}

export function SourceAppIcon({ icon, size = "md" }: SourceAppIconProps) {
  const sizeClass = styles[SIZE_CLASS[size]]
  const className = `${styles.sourceAppIcon} ${sizeClass}`

  const ReactIcon = REACT_ICON_BY_ID[icon.id]
  if (ReactIcon) {
    return (
      <span className={className} title={icon.label} aria-label={icon.label}>
        <ReactIcon className={styles.sourceAppIconGlyph} aria-hidden="true" />
      </span>
    )
  }

  if (isLocalSourceAppIconAssetPath(icon.assetPath)) {
    return (
      <span className={className} title={icon.label}>
        <Image className={styles.sourceAppIconImage} src={icon.assetPath} alt={icon.label} width={32} height={32} unoptimized />
      </span>
    )
  }

  return (
    <span className={className} title={icon.label} aria-label={icon.label}>
      <span className={styles.sourceAppIconFallback}>{icon.fallbackBadge}</span>
    </span>
  )
}
