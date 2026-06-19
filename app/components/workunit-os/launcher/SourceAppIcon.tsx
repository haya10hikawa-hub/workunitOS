import type { SourceAppIconView } from "@/lib/application/launcher/sourceAppIconModel"
import { isLocalSourceAppIconAssetPath } from "@/lib/application/launcher/sourceAppIconModel"
import Image from "next/image"
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

export function SourceAppIcon({ icon, size = "md" }: SourceAppIconProps) {
  const sizeClass = styles[SIZE_CLASS[size]]
  const className = `${styles.sourceAppIcon} ${sizeClass}`

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
