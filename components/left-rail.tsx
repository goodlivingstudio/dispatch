"use client"

import { useState, useEffect, useRef } from "react"
import type { Article, FeedHealth } from "@/lib/types"
import { CATEGORY_CONFIG } from "@/lib/types"

// ─── Live Clock ──────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState("")
  const [tzLabel, setTzLabel] = useState("")

  useEffect(() => {
    // Browser-native timezone — same signal as IP lookup, no external service
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    // Display city portion: "America/New_York" → "New York"
    const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz
    setTzLabel(city)

    const tick = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: tz,
          hour12: false,
        })
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (!time) return null

  return (
    <div
      style={{
        fontSize: 11,
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        color: "var(--text-tertiary)",
        letterSpacing: "0.02em",
        fontVariantNumeric: "tabular-nums",
        fontWeight: 400,
      }}
    >
      {time}
    </div>
  )
}

// ─── Feed Status indicator with diagnostic tooltip ──────────────────────────

const TAG_LABEL: Record<string, string> = {
  "policy":           "Policy",
  "ai":               "AI",
  "design-industry":  "Design Industry",
  "creative-practice":"Creative Practice",
  "market":           "Market",
  "health":           "Healthcare",
  "company":          "Company Intel",
  "design-leadership":"Design Leadership",
  "creative-tech":    "Creative Tech",
  "culture":          "Culture",
  "data":             "Data",
}

function FeedStatus({ isLive, feedHealth, feedLoading }: {
  isLive: boolean
  feedHealth: FeedHealth | null
  feedLoading: boolean
}) {
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 })

  const isError  = !feedLoading && !isLive
  const dotColor = feedLoading ? "var(--text-tertiary)" : isError ? "#ef4444" : "var(--live)"
  const label    = feedLoading ? "Loading" : isError ? "Error" : "Live"

  const buildDiagnostic = (): string => {
    if (!feedHealth) return "Fetching feed status…"
    if (!isLive) {
      const stubs = feedHealth.stubCategories
      const stubNames = stubs.length > 0
        ? `Fallback content active for: ${stubs.map(t => TAG_LABEL[t] || t).join(", ")}.`
        : ""
      return `All ${feedHealth.sourcesTotal} sources failed to respond. ${stubNames} No live data available.`
    }
    return ""
  }

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setTipPos({ top: rect.bottom + 6, left: rect.left })
    }
    setTooltipVisible(true)
  }

  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setTooltipVisible(false)}
      style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, cursor: "default" }}
    >
      <span
        className={!feedLoading && !isError ? "live-beacon" : undefined}
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: dotColor,
          flexShrink: 0,
        }}
      />
      <span style={{
        fontSize: 11,
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: dotColor,
        fontWeight: 700,
      }}>
        {label}
      </span>

      {/* Diagnostic tooltip — only on error */}
      {tooltipVisible && isError && (
        <div style={{
          position: "fixed",
          top: tipPos.top,
          left: tipPos.left,
          zIndex: 2000,
          width: 224,
          background: "var(--bg-elevated)",
          border: "1px solid #ef4444",
          borderRadius: 3,
          padding: "8px 10px",
          pointerEvents: "none",
        }}>
          <div style={{
            fontSize: 10,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#ef4444",
            marginBottom: 5,
          }}>
            Feed Offline
          </div>
          <div style={{
            fontSize: 12,
            lineHeight: 1.55,
            color: "var(--text-secondary)",
          }}>
            {buildDiagnostic()}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Left Rail ───────────────────────────────────────────────────────────────

export function LeftRail({
  articles,
  active,
  onSelect,
  isLive,
  feedHealth,
  feedLoading,
  width,
  showAnalytics,
  onToggleAnalytics,
}: {
  articles: Article[]
  active: string
  onSelect: (id: string) => void
  isLive: boolean
  feedHealth: FeedHealth | null
  feedLoading: boolean
  width: number
  showAnalytics: boolean
  onToggleAnalytics: () => void
}) {
  const now  = new Date()
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const day  = now.toLocaleDateString("en-US", { weekday: "long" })

  const countFor = (id: string) =>
    id === "all" ? articles.length : articles.filter(a => a.tag === id).length

  return (
    <aside
      style={{
        width,
        flexShrink: 0,
        background: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Wordmark + Clock */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Top row: wordmark + clock */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.04em",
                color: "var(--text-primary)",
                lineHeight: 1,
                margin: 0,
              }}
            >
              Dispatch
            </h1>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                letterSpacing: "0.005em",
                marginTop: 6,
                lineHeight: 1.45,
              }}
            >
              Directed intelligence for strategic positioning across technology, culture &amp; healthcare
            </div>
          </div>
          <LiveClock />
        </div>

        {/* Date */}
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "var(--text-tertiary)",
            letterSpacing: "0.01em",
            fontWeight: 500,
          }}
        >
          {day}, {date}
        </div>

        {/* Feed status */}
        <FeedStatus isLive={isLive} feedHealth={feedHealth} feedLoading={feedLoading} />
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
        {/* Signal / Synthesis — left brain / right brain */}
        <div style={{ padding: "8px 14px 4px", marginBottom: 2 }}>
          <div
            style={{
              display: "flex",
              background: "var(--bg-elevated)",
              borderRadius: 8,
              padding: 3,
              gap: 0,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Sliding indicator */}
            <div
              style={{
                position: "absolute",
                top: 3,
                left: showAnalytics ? "calc(50% + 1.5px)" : "3px",
                width: "calc(50% - 4.5px)",
                height: "calc(100% - 6px)",
                background: "var(--bg-surface)",
                borderRadius: 6,
                transition: "left 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                zIndex: 0,
              }}
            />
            {[
              { id: "feed",      label: "Signal"    },
              { id: "analytics", label: "Synthesis"  },
            ].map(tab => {
              const isTab = tab.id === "analytics" ? showAnalytics : !showAnalytics
              return (
                <button
                  key={tab.id}
                  onClick={() => { if (tab.id === "analytics" && !showAnalytics) onToggleAnalytics(); else if (tab.id === "feed" && showAnalytics) onToggleAnalytics() }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px 0",
                    minHeight: 36,
                    background: "transparent",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    letterSpacing: "0.01em",
                    color: isTab ? "var(--text-primary)" : "var(--text-tertiary)",
                    fontWeight: isTab ? 600 : 400,
                    transition: "color 0.3s ease",
                  }}>
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Category pills — hidden in synthesis view */}
        {!showAnalytics && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 14px" }}>
            {CATEGORY_CONFIG.map(cat => {
              const n = countFor(cat.id)
              if (cat.id !== "all" && n === 0 && !feedLoading) return null
              const isActive = active === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelect(cat.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 12px",
                    borderRadius: 16,
                    border: "none",
                    background: isActive ? "var(--accent-primary)" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg-elevated)" }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? "var(--accent-primary)" : "transparent" }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: isActive ? "var(--accent-secondary)" : "var(--text-tertiary)",
                      fontWeight: isActive ? 600 : 400,
                      letterSpacing: "-0.01em",
                      transition: "color 0.15s",
                    }}
                  >
                    {cat.label}
                  </span>
                  {n > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontVariantNumeric: "tabular-nums",
                        color: isActive ? "var(--accent-muted)" : "var(--text-tertiary)",
                        opacity: 0.7,
                        transition: "color 0.15s",
                      }}
                    >
                      {n}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

      </nav>
    </aside>
  )
}
