"use client"

import type { LauncherReadinessCard } from "@/lib/application/launcher/actionFieldEditorDraftModel"
import styles from "./WorkUnitLauncher.module.css"

type Props = {
  readonly cards: readonly LauncherReadinessCard[]
}

export function ReadinessCards({ cards }: Props) {
  return (
    <section className={styles.readinessPanel} aria-label="Readiness cards">
      <header>
        <p className={styles.eyebrow}>Verification</p>
        <h3>Readiness Cards</h3>
      </header>
      <div className={styles.readinessGrid}>
        {cards.map((card) => (
          <article key={card.id} className={`${styles.readinessCard} ${styles[`readiness-${card.state}`]}`}>
            <span>{card.state}</span>
            <strong>{card.label}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
