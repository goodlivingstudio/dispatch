"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Radio, AudioLines, Blend } from "lucide-react"
import type { Article, FeedHealth, ViewMode } from "@/lib/types"
import { CATEGORY_CONFIG } from "@/lib/types"

// ─── Live Clock — 24hr with seconds ──────────────────────────────────────────

function useClock() {
  const [time, setTime] = useState("")

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
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

  return time
}

// ─── Source Filter Flyout ─────────────────────────────────────────────────────

function SourceFilter({ articles, excludedSources, onToggleSource }: {
  articles: Article[]
  excludedSources: Set<string>
  onToggleSource: (source: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Derive unique sources with counts
  const sources = useMemo(() => {
    const map: Record<string, number> = {}
    articles.forEach(a => { if (a.source) map[a.source] = (map[a.source] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
  }, [articles])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const activeCount = sources.length - excludedSources.size

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          fontSize: 11, color: "var(--text-tertiary)",
          padding: "4px 8px", borderRadius: 6,
          display: "inline-flex", alignItems: "center", gap: 3,
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--bg-elevated)" }}
        onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.background = "transparent" }}
      >
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{activeCount}</span>
        <span>sources</span>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 2000,
          width: 220,
          maxHeight: 320,
          overflowY: "auto",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "6px 0",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}>
          {/* Reset */}
          <div style={{ display: "flex", padding: "4px 12px 8px", borderBottom: "1px solid var(--border)" }}>
            <button
              onClick={() => sources.forEach(s => { if (excludedSources.has(s.name)) onToggleSource(s.name) })}
              style={{ background: "none", border: "none", fontSize: 10, color: "var(--accent-secondary)", cursor: "pointer", padding: 0 }}
            >
              Reset
            </button>
          </div>
          {sources.map(s => {
            const active = !excludedSources.has(s.name)
            return (
              <button
                key={s.name}
                onClick={() => onToggleSource(s.name)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 12px", background: "transparent", border: "none", cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-surface)" }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
              >
                {/* Checkbox */}
                <span style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: active ? "none" : "1.5px solid var(--border)",
                  background: active ? "var(--accent-secondary)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {active && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="var(--bg-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span style={{
                  flex: 1, fontSize: 12,
                  color: active ? "var(--text-secondary)" : "var(--text-tertiary)",
                  opacity: active ? 1 : 0.5,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  textAlign: "left",
                }}>
                  {s.name}
                </span>
                <span style={{
                  fontSize: 10, fontVariantNumeric: "tabular-nums",
                  color: "var(--text-tertiary)",
                  opacity: active ? 0.7 : 0.4,
                }}>
                  {s.count}
                </span>
              </button>
            )
          })}
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
  feedLoading,
  width,
  viewMode,
  onViewChange,
  excludedSources,
  onToggleSource,
}: {
  articles: Article[]
  active: string
  onSelect: (id: string) => void
  isLive: boolean
  feedHealth?: FeedHealth | null
  feedLoading: boolean
  width: number
  viewMode: ViewMode
  onViewChange: (mode: ViewMode) => void
  excludedSources: Set<string>
  onToggleSource: (source: string) => void
}) {
  const time = useClock()
  const now  = new Date()
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const day  = now.toLocaleDateString("en-US", { weekday: "long" })

  const isError  = !feedLoading && !isLive
  const dotColor = feedLoading ? "var(--text-tertiary)" : isError ? "#ef4444" : "var(--live)"
  const statusLabel = feedLoading ? "Loading" : isError ? "Offline" : "Live"
  const annotatedCount = articles.filter(a => a.synopsis || a.relevance).length

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
      {/* ── Identity zone ── */}
      <div style={{ padding: "24px 20px 16px" }}>
        <h1
          style={{
            fontSize: 22,
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
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          Directed intelligence for strategic positioning across technology, culture &amp; healthcare
        </div>
      </div>

      {/* ── Separator ── */}
      <div style={{ height: 1, background: "var(--border)", margin: "0 20px" }} />

      {/* ── Operational status zone ── */}
      <div style={{ padding: "14px 20px 16px", borderBottom: "1px solid var(--border)" }}>
        {/* Date + time — unified line */}
        <div style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          letterSpacing: "0.01em",
          fontWeight: 500,
          marginBottom: 8,
        }}>
          {day}, {date}
          <span style={{
            marginLeft: 8,
            color: "var(--text-tertiary)",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 400,
          }}>
            {time}
          </span>
        </div>

        {/* Status line: LIVE · sources · signals */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span
            className={!feedLoading && !isError ? "live-beacon" : undefined}
            style={{
              width: 5, height: 5, borderRadius: "50%",
              background: dotColor, flexShrink: 0,
            }}
          />
          <span style={{
            fontSize: 11,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: dotColor,
            fontWeight: 700,
          }}>
            {statusLabel}
          </span>
          <span style={{ color: "var(--border)", fontSize: 11 }}>·</span>
          <SourceFilter articles={articles} excludedSources={excludedSources} onToggleSource={onToggleSource} />
          <span style={{ color: "var(--border)", fontSize: 11 }}>·</span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {articles.length} signals
          </span>
          {annotatedCount > 0 && (
            <>
              <span style={{ color: "var(--border)", fontSize: 11 }}>·</span>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {annotatedCount} annotated
              </span>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
        {/* Signal / Audio / Synthesis — three-state toggle */}
        <div style={{ padding: "8px 14px 4px", marginBottom: 2 }}>
          <div
            style={{
              display: "flex",
              background: "var(--bg-elevated)",
              borderRadius: 10,
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
                left: viewMode === "signal" ? "3px" : viewMode === "audio" ? "calc(33.33% + 1px)" : "calc(66.66% + 1px)",
                width: "calc(33.33% - 4px)",
                height: "calc(100% - 6px)",
                background: viewMode === "synthesis" ? "var(--synth-indicator)" : "var(--bg-surface)",
                borderRadius: 6,
                transition: "left 0.35s cubic-bezier(0.16, 1, 0.3, 1), background 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                zIndex: 0,
              }}
            />
            {([
              { id: "signal" as const,    Icon: Radio,      title: "Signal"    },
              { id: "audio" as const,     Icon: AudioLines, title: "Audio"     },
              { id: "synthesis" as const, Icon: Blend,      title: "Synthesis" },
            ]).map(tab => {
              const isActive = viewMode === tab.id
              const color = isActive
                ? (tab.id === "synthesis" ? "var(--accent-secondary)" : "var(--text-primary)")
                : "var(--text-tertiary)"
              return (
                <button
                  key={tab.id}
                  onClick={() => onViewChange(tab.id)}
                  title={tab.title}
                  aria-label={tab.title}
                  aria-pressed={isActive}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px 0",
                    minHeight: 42,
                    background: "transparent",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    position: "relative",
                    zIndex: 1,
                    color,
                    transition: "background 0.2s ease, color 0.3s ease",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = tab.id === "synthesis" ? "rgba(184,149,106,0.08)" : "rgba(255,255,255,0.04)" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                >
                  <tab.Icon size={20} strokeWidth={1.6} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Category pills — visible in Signal mode only */}
        {viewMode === "signal" && (
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
