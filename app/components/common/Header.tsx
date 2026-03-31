"use client"

import { useEffect, useState } from "react"
import { styles } from "@/styles/layoutStyles"

function formatClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", "")

  return `${parts} JST`
}

export default function Header() {
  const [clock, setClock] = useState(() => formatClock(new Date()))

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(formatClock(new Date()))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const applyTheme = (theme: "dark" | "light") => {
      if (theme === "light") {
        document.documentElement.setAttribute("data-theme", "light")
      } else {
        document.documentElement.removeAttribute("data-theme")
      }

      window.localStorage.setItem("ai-editor-theme", theme)
    }

    const stored = window.localStorage.getItem("ai-editor-theme")

    if (stored === "dark" || stored === "light") {
      applyTheme(stored)
      return
    }

    const prefersLight =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: light)").matches

    applyTheme(prefersLight ? "light" : "dark")
  }, [])

  const toggleTheme = () => {
    const root = document.documentElement
    const nextTheme = root.getAttribute("data-theme") === "light" ? "dark" : "light"

    if (nextTheme === "light") {
      root.setAttribute("data-theme", "light")
    } else {
      root.removeAttribute("data-theme")
    }

    window.localStorage.setItem("ai-editor-theme", nextTheme)
  }

  return (
    <header style={styles.header}>
      <div style={styles.headerLogo}>
        <span style={styles.logoMark}>▣</span>
        <div style={styles.logoText}>AI EDITOR</div>
      </div>

      <nav style={styles.flowNav} aria-label="System flow">
        <span style={styles.flowStep}>SIGNAL</span>
        <span style={styles.flowArrow}>→</span>
        <span style={styles.flowStep}>DECISION</span>
        <span style={styles.flowArrow}>→</span>
        <span style={styles.flowStep}>PLANNING</span>
        <span style={styles.flowArrow}>→</span>
        <span style={styles.flowStep}>EXECUTION</span>
      </nav>

      <div style={styles.headerRight}>
        <button
          type="button"
          onClick={toggleTheme}
          style={styles.themeToggle}
          aria-label="Toggle light/dark theme"
          title="Toggle light/dark theme"
        >
          THEME
        </button>
        <div style={styles.clock}>{clock}</div>
      </div>
    </header>
  )
}
