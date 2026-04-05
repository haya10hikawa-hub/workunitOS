"use client"

import { useEffect, useRef, useState } from "react"
import { styles } from "@/styles/layoutStyles"
import type { AppLanguage, AppTheme, AppTimeZone } from "@/types/ui"

interface HeaderProps {
  language: AppLanguage
  onLanguageChange: (language: AppLanguage) => void
}

const timeZoneOptions: Array<{
  value: AppTimeZone
  label: Record<AppLanguage, string>
}> = [
  {
    value: "Asia/Tokyo",
    label: {
      en: "Japan Standard Time (JST)",
      ja: "日本標準時 (JST)",
    },
  },
  {
    value: "UTC",
    label: {
      en: "Coordinated Universal Time (UTC)",
      ja: "協定世界時 (UTC)",
    },
  },
  {
    value: "America/Los_Angeles",
    label: {
      en: "Pacific Time (PT)",
      ja: "太平洋標準時 (PT)",
    },
  },
  {
    value: "America/New_York",
    label: {
      en: "Eastern Time (ET)",
      ja: "東部標準時 (ET)",
    },
  },
  {
    value: "Europe/London",
    label: {
      en: "Greenwich Mean Time (GMT/BST)",
      ja: "グリニッジ標準時 (GMT/BST)",
    },
  },
]

const copy: Record<
  AppLanguage,
  {
    settings: string
    language: string
    theme: string
    timezone: string
    english: string
    japanese: string
    dark: string
    white: string
    signal: string
    decision: string
    planning: string
    execution: string
  }
> = {
  en: {
    settings: "Settings",
    language: "Language",
    theme: "Theme",
    timezone: "Time Zone",
    english: "English",
    japanese: "Japanese",
    dark: "Dark",
    white: "White",
    signal: "SIGNAL",
    decision: "DECISION",
    planning: "PLANNING",
    execution: "EXECUTION",
  },
  ja: {
    settings: "設定",
    language: "言語",
    theme: "テーマ",
    timezone: "標準時",
    english: "英語",
    japanese: "日本語",
    dark: "ダーク",
    white: "ホワイト",
    signal: "シグナル",
    decision: "判断",
    planning: "計画",
    execution: "実行",
  },
}

function formatClock(date: Date, language: AppLanguage, timeZone: AppTimeZone) {
  const locale = language === "ja" ? "ja-JP" : "en-CA"
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
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

  const timeZoneShort =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value ?? timeZone

  return `${parts} ${timeZoneShort}`
}

function isAppLanguage(value: string | null): value is AppLanguage {
  return value === "en" || value === "ja"
}

function isAppTheme(value: string | null): value is AppTheme {
  return value === "dark" || value === "light"
}

function isAppTimeZone(value: string | null): value is AppTimeZone {
  return timeZoneOptions.some((option) => option.value === value)
}

function getInitialTheme(): AppTheme {
  if (typeof window === "undefined") {
    return "dark"
  }

  const storedTheme = window.localStorage.getItem("ai-editor-theme")
  if (isAppTheme(storedTheme)) {
    return storedTheme
  }

  const prefersLight =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches

  return prefersLight ? "light" : "dark"
}

function getInitialTimeZone(): AppTimeZone {
  if (typeof window === "undefined") {
    return "Asia/Tokyo"
  }

  const storedTimeZone = window.localStorage.getItem("ai-editor-timezone")
  return isAppTimeZone(storedTimeZone) ? storedTimeZone : "Asia/Tokyo"
}

export default function Header({ language, onLanguageChange }: HeaderProps) {
  const [theme, setTheme] = useState<AppTheme>(() => getInitialTheme())
  const [timeZone, setTimeZone] = useState<AppTimeZone>(() => getInitialTimeZone())
  const [clock, setClock] = useState(() => formatClock(new Date(), language, timeZone))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  const labels = copy[language]

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light")
    } else {
      document.documentElement.removeAttribute("data-theme")
    }

    window.localStorage.setItem("ai-editor-theme", theme)
  }, [theme])

  useEffect(() => {
    window.localStorage.setItem("ai-editor-timezone", timeZone)
  }, [timeZone])

  useEffect(() => {
    const renderClock = () => setClock(formatClock(new Date(), language, timeZone))
    renderClock()
    const timer = window.setInterval(renderClock, 1000)

    return () => window.clearInterval(timer)
  }, [language, timeZone])

  useEffect(() => {
    if (!settingsOpen) {
      return
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setSettingsOpen(false)
      }
    }

    window.addEventListener("mousedown", closeOnOutsideClick)
    return () => window.removeEventListener("mousedown", closeOnOutsideClick)
  }, [settingsOpen])

  const handleLanguageChange = (nextLanguage: AppLanguage) => {
    onLanguageChange(nextLanguage)
  }

  const handleThemeChange = (nextTheme: AppTheme) => {
    setTheme(nextTheme)
  }

  const handleTimeZoneChange = (nextTimeZone: AppTimeZone) => {
    setTimeZone(nextTimeZone)
  }

  return (
    <header style={styles.header}>
      <div style={styles.headerLogo}>
        <span style={styles.logoMark}>▣</span>
        <div style={styles.logoText}>AI EDITOR</div>
      </div>

      <nav style={styles.flowNav} aria-label="System flow">
        <span style={styles.flowStep}>{labels.signal}</span>
        <span style={styles.flowArrow}>→</span>
        <span style={styles.flowStep}>{labels.decision}</span>
        <span style={styles.flowArrow}>→</span>
        <span style={styles.flowStep}>{labels.planning}</span>
        <span style={styles.flowArrow}>→</span>
        <span style={styles.flowStep}>{labels.execution}</span>
      </nav>

      <div style={styles.headerRight}>
        <div style={styles.clock}>{clock}</div>
        <div style={styles.settingsWrap} ref={settingsRef}>
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            style={styles.settingsButton}
            aria-label={labels.settings}
            title={labels.settings}
          >
            ⚙
          </button>
          {settingsOpen ? (
            <div style={styles.settingsPanel} role="dialog" aria-label={labels.settings}>
              <div style={styles.settingsBlock}>
                <label htmlFor="ai-editor-language" style={styles.settingsLabel}>
                  {labels.language}
                </label>
                <select
                  id="ai-editor-language"
                  value={language}
                  onChange={(event) => {
                    if (isAppLanguage(event.target.value)) {
                      handleLanguageChange(event.target.value)
                    }
                  }}
                  style={styles.settingsSelect}
                >
                  <option value="en">{labels.english}</option>
                  <option value="ja">{labels.japanese}</option>
                </select>
              </div>

              <div style={styles.settingsBlock}>
                <label htmlFor="ai-editor-theme" style={styles.settingsLabel}>
                  {labels.theme}
                </label>
                <select
                  id="ai-editor-theme"
                  value={theme}
                  onChange={(event) => {
                    if (isAppTheme(event.target.value)) {
                      handleThemeChange(event.target.value)
                    }
                  }}
                  style={styles.settingsSelect}
                >
                  <option value="dark">{labels.dark}</option>
                  <option value="light">{labels.white}</option>
                </select>
              </div>

              <div style={styles.settingsBlock}>
                <label htmlFor="ai-editor-timezone" style={styles.settingsLabel}>
                  {labels.timezone}
                </label>
                <select
                  id="ai-editor-timezone"
                  value={timeZone}
                  onChange={(event) => {
                    if (isAppTimeZone(event.target.value)) {
                      handleTimeZoneChange(event.target.value)
                    }
                  }}
                  style={styles.settingsSelect}
                >
                  {timeZoneOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label[language]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
