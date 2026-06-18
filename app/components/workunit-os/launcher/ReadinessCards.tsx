"use client"

import type { LauncherReadinessCard } from "@/lib/application/launcher/actionFieldEditorDraftModel"
import styles from "./WorkUnitLauncher.module.css"

type Props = {
  readonly cards: readonly LauncherReadinessCard[]
}

export function ReadinessCards({ cards }: Props) {
  return (
    <section className={styles.readinessPanel} aria-label="Readiness cards">
      <h3>Readiness</h3>
      <div className={styles.readinessGrid}>
        {cards.map((card) => (
          <article key={card.id} className={`${styles.readinessCard} ${styles[`readiness-${card.state}`]}`}>
            <div>
              <span>{card.label}</span>
              <strong>{card.detail}</strong>
            </div>
            <i>{card.score}</i>
          </article>
        ))}
      </div>
    </section>
  )
}
