"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronUp } from "lucide-react"
import type { Article, Signal } from "@/lib/types"

// ─── Chief of Staff — data hook ─────────────────────────────────────────────

export function useChiefOfStaff(articles: Article[]) {
  const [signals, setSignals] = useState<Signal[]>([])
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefError, setBriefError] = useState(false)
  const fetched = useRef(false)

  useEffect(() => {
    if (articles.length > 0 && !fetched.current) {
      fetched.current = true
      setBriefLoading(true)
      setBriefError(false)
      fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articles: articles.slice(0, 25) }),
      })
        .then(r => {
          if (!r.ok) throw new Error(`${r.status}`)
          return r.json()
        })
        .then(data => {
          setSignals(data.signals || [])
          setBriefLoading(false)
        })
        .catch(() => {
          setBriefError(true)
          setBriefLoading(false)
        })
    }
  }, [articles.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const placeholder: Signal[] = [
    { label: "ANALYZING FEED", body: "" },
    { label: "—", body: "" },
    { label: "—", body: "" },
  ]

  return {
    signals: briefLoading || signals.length === 0 ? placeholder : signals,
    briefLoading,
    briefError,
  }
}

// ─── Chief of Staff Band — COS drawer with Bump overlay ────────────────────

export const SCAN_STATUSES = [
  "$ dispatch --init",
  "▸ scanning feed [27 sources]",
  "▸ clustering signals",
  "▸ cross-referencing mandate",
  "▸ composing brief",
]

export function ChiefOfStaffBand({ signals, briefLoading, briefError, onDeliberate }: {
  signals: Signal[]
  briefLoading: boolean
  briefError?: boolean
  onDeliberate?: (signal: Signal) => void
}) {
  const [statusIdx,  setStatusIdx]  = useState(0)
  const [revealed,   setRevealed]   = useState(false)
  const [expanded,   setExpanded]   = useState(true)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const wasLoading = useRef(true)

  // Advance status text while fetching
  useEffect(() => {
    if (!briefLoading) return
    setStatusIdx(0)
    wasLoading.current = true
    const t = setInterval(() => setStatusIdx(i => Math.min(i + 1, SCAN_STATUSES.length - 1)), 900)
    return () => clearInterval(t)
  }, [briefLoading])

  // When real data arrives, reveal
  useEffect(() => {
    const hasRealData = !briefLoading && signals.some(s => !!s.body)
    if (hasRealData && wasLoading.current) {
      wasLoading.current = false
      const t = setTimeout(() => setRevealed(true), 100)
      return () => clearTimeout(t)
    }
  }, [briefLoading, signals])

  const isLoading = !revealed

  return (
    <div
      style={{
        flexShrink: 0,
        background: "var(--accent-primary)",
        borderBottom: "1px solid var(--border)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {briefError ? (
        /* ── Error state ── */
        <div style={{
          padding: "16px 24px",
          display: "flex", flexDirection: "column", gap: 8,
          minHeight: 80, justifyContent: "center",
        }}>
          <div style={{
            fontSize: 10, fontFamily: "var(--font-geist-mono), monospace",
            color: "var(--accent-secondary)", textTransform: "uppercase", fontWeight: 600,
          }}>
            API Unavailable
          </div>
          <div style={{ fontSize: 12, fontFamily: "var(--font-geist-mono), monospace", color: "var(--text-tertiary)", lineHeight: 1.6 }}>
            Intelligence briefing will resume when the API connection is restored.
          </div>
        </div>
      ) : isLoading ? (
        /* ── Loading state: terminal boot ── */
        <>
          <div style={{
            padding: "16px 24px",
            display: "flex", flexDirection: "column", gap: 4,
            minHeight: 80, justifyContent: "center",
          }}>
            {SCAN_STATUSES.slice(0, statusIdx + 1).map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: 10, fontFamily: "var(--font-geist-mono), monospace",
                  color: i === statusIdx ? "var(--accent-muted)" : "var(--text-tertiary)",
                  opacity: i === statusIdx ? 1 : 0.5,
                  animation: i === statusIdx ? "status-fade 0.2s ease both" : "none",
                }}
              >
                {line}{i === statusIdx && i < SCAN_STATUSES.length - 1 && <span className="cursor-blink" style={{ marginLeft: 2 }}>_</span>}
                {i === statusIdx && i === SCAN_STATUSES.length - 1 && <span className="loading-pulse" style={{ marginLeft: 4, fontSize: 9, opacity: 0.6 }}>…</span>}
              </div>
            ))}
          </div>
          <div style={{
            position: "absolute", bottom: 0, left: 0, width: "25%", height: 1,
            background: "var(--accent-secondary)", opacity: 0.4,
            animation: "band-scan 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }} />
        </>
      ) : (
        <>
          {/* ── COS drawer handle ── */}
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "0 20px", height: 40,
              background: "none", border: "none", borderBottom: expanded ? "1px solid var(--border)" : "none",
              cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "none" }}
          >
            <span style={{
              fontSize: 10, fontFamily: "var(--font-geist-mono), monospace",
              color: "var(--accent-secondary)", textTransform: "uppercase",
            }}>
              COS
            </span>
            <ChevronUp
              size={14}
              strokeWidth={1.5}
              style={{
                color: "var(--text-tertiary)",
                transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                transform: expanded ? "rotate(0)" : "rotate(180deg)",
              }}
            />
          </button>

          {/* ── Expanded: 3-column signal grid ── */}
          <div style={{
            maxHeight: expanded ? 300 : 0,
            overflow: "hidden",
            transition: "max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
              {signals.map((signal, i) => {
                const isHovered = hoveredIdx === i
                return (
                  <div
                    key={i}
                    style={{
                      padding: "16px 20px",
                      borderRight: i < 2 ? "1px solid var(--border)" : "none",
                      animation: `signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 160}ms both`,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{
                      fontSize: 10, fontFamily: "var(--font-geist-mono), monospace",
                      color: "var(--accent-secondary)", textTransform: "uppercase",
                      marginBottom: 8,
                    }}>
                      {signal.label}
                    </div>
                    {signal.body && (
                      <div style={{
                        fontSize: 12, fontFamily: "var(--font-geist-mono), monospace",
                        color: "var(--text-primary)", lineHeight: 1.6,
                        flex: 1,
                      }}>
                        {signal.body}
                      </div>
                    )}
                    {signal.sources && signal.sources.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                        {signal.sources.map((src, si) => (
                          <a
                            key={si}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{
                              fontSize: 10, color: "var(--text-tertiary)",
                              textDecoration: "none", transition: "color 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = "var(--accent-secondary)" }}
                            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)" }}
                          >
                            {src.source}{si < signal.sources!.length - 1 ? " ·" : ""}
                          </a>
                        ))}
                      </div>
                    )}
                    {/* Bump CTA — always visible at bottom */}
                    {onDeliberate && signal.body && (
                      <button
                        onClick={() => onDeliberate(signal)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "6px 12px", marginTop: 12,
                          background: "transparent", border: "none",
                          fontSize: 11, color: "var(--accent-secondary)",
                          cursor: "pointer", transition: "color 0.15s",
                          alignSelf: "flex-start",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = "var(--accent-muted)" }}
                        onMouseLeave={e => { e.currentTarget.style.color = "var(--accent-secondary)" }}
                      >
                        Bump ↗
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Analysis Panel — mobile stacked view ───────────────────────────────────

export function AnalysisPanelMobile({ signals, briefLoading }: { signals: Signal[]; briefLoading: boolean }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-primary)" }}>
      {signals.map((signal, i) => (
        <div
          key={i}
          style={{
            padding: "24px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--accent-primary)",
          }}
        >
          <div
            style={{
              fontSize: 10, fontFamily: "var(--font-geist-mono), monospace",
              color: "var(--accent-secondary)", textTransform: "uppercase", marginBottom: 8,
            }}
            className={briefLoading && i === 0 ? "loading-pulse" : ""}
          >
            {signal.label}
          </div>
          {signal.body ? (
            <div style={{ fontSize: 12, fontFamily: "var(--font-geist-mono), monospace", color: "var(--text-primary)", lineHeight: 1.6 }}>
              {signal.body}
            </div>
          ) : briefLoading ? (
            <div className="loading-pulse" style={{ fontSize: 13, color: "var(--accent-muted)", opacity: 0.4 }}>
              ▊
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
