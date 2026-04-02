"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronUp } from "lucide-react"
import type { Article, Signal } from "@/lib/types"
import { MONO, TYPE, labelStyle, bodyStyle, metaStyle } from "@/lib/styles"
import { renderCitedBody } from "@/components/citation"

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
            ...labelStyle, fontWeight: 600,
          }}>
            API Unavailable
          </div>
          <div style={{ ...TYPE.body, color: "var(--text-tertiary)", lineHeight: 1.7 }}>
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
                  ...TYPE.sm, fontFamily: "var(--font-geist-mono), monospace",
                  color: i === statusIdx ? "var(--accent-muted)" : "var(--text-tertiary)",
                  opacity: i === statusIdx ? 1 : 0.5,
                  animation: i === statusIdx ? "status-fade 0.2s ease both" : "none",
                }}
              >
                {line}{i === statusIdx && i < SCAN_STATUSES.length - 1 && <span className="cursor-blink" style={{ marginLeft: 2 }}>_</span>}
                {i === statusIdx && i === SCAN_STATUSES.length - 1 && <span className="loading-pulse" style={{ marginLeft: 4, ...TYPE.xs, opacity: 0.6 }}>…</span>}
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
              background: "none", border: "none",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "none" }}
          >
            <span style={{
              ...TYPE.sm, fontFamily: "var(--font-geist-mono), monospace",
              color: "var(--accent-secondary)", textTransform: "uppercase",
            }}>
              DCOS
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

          {/* ── Expanded: 3-column signal cards ── */}
          <div style={{
            maxHeight: expanded ? 400 : 0,
            overflow: "hidden",
            transition: "max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "8px 16px 0" }}>
              {signals.map((signal, i) => (
                  <div
                    key={i}
                    onClick={() => onDeliberate && signal.body && onDeliberate(signal)}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    style={{
                      position: "relative",
                      padding: "18px 20px",
                      borderRadius: 12,
                      animation: `signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 160}ms both`,
                      display: "flex",
                      flexDirection: "column",
                      cursor: signal.body ? "pointer" : "default",
                      background: hoveredIdx === i ? "var(--bg-elevated)" : "var(--bg-surface)",
                      transition: "background 0.15s, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      transform: hoveredIdx === i ? "scale(1.01)" : "scale(1)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Generative texture — unique SVG per card */}
                    <svg
                      style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", opacity: 0.06, pointerEvents: "none" }}
                      viewBox="0 0 200 200"
                      preserveAspectRatio="xMaxYMid slice"
                    >
                      {i === 0 && (
                        /* Network/branching — opportunity */
                        <g stroke="var(--accent-secondary)" strokeWidth="1" fill="none">
                          <path d="M20,180 Q60,120 100,140 T180,60" />
                          <path d="M40,200 Q80,140 120,160 T200,80" />
                          <path d="M100,140 L140,100 L180,120" />
                          <path d="M60,120 L100,80 L160,90" />
                          <circle cx="100" cy="140" r="3" fill="var(--accent-secondary)" />
                          <circle cx="140" cy="100" r="2" fill="var(--accent-secondary)" />
                          <circle cx="180" cy="60" r="3" fill="var(--accent-secondary)" />
                          <circle cx="160" cy="90" r="2" fill="var(--accent-secondary)" />
                        </g>
                      )}
                      {i === 1 && (
                        /* Ascending trajectory — position */
                        <g stroke="var(--accent-secondary)" strokeWidth="1" fill="none">
                          <path d="M0,180 C40,170 60,140 80,130 S120,80 160,50 S190,20 200,10" />
                          <path d="M0,200 C50,185 70,160 100,145 S150,100 180,70" />
                          <line x1="80" y1="130" x2="80" y2="180" strokeDasharray="3,4" />
                          <line x1="130" y1="90" x2="130" y2="160" strokeDasharray="3,4" />
                          <line x1="170" y1="55" x2="170" y2="130" strokeDasharray="3,4" />
                          <circle cx="80" cy="130" r="2.5" fill="var(--accent-secondary)" />
                          <circle cx="130" cy="90" r="2.5" fill="var(--accent-secondary)" />
                          <circle cx="170" cy="55" r="2.5" fill="var(--accent-secondary)" />
                        </g>
                      )}
                      {i === 2 && (
                        /* Radar/scanning — watch */
                        <g stroke="var(--accent-secondary)" strokeWidth="1" fill="none">
                          <circle cx="160" cy="100" r="30" />
                          <circle cx="160" cy="100" r="55" />
                          <circle cx="160" cy="100" r="80" />
                          <line x1="160" y1="100" x2="200" y2="60" />
                          <line x1="160" y1="100" x2="120" y2="40" strokeDasharray="3,4" />
                          <circle cx="185" cy="75" r="2.5" fill="var(--accent-secondary)" />
                          <circle cx="130" cy="55" r="2" fill="var(--accent-secondary)" />
                          <circle cx="145" cy="130" r="2" fill="var(--accent-secondary)" />
                        </g>
                      )}
                    </svg>

                    <div style={{
                      ...labelStyle,
                      marginBottom: 10,
                      position: "relative",
                      zIndex: 1,
                    }}>
                      {signal.label}
                    </div>
                    {signal.body && (
                      <div style={{
                        ...TYPE.body,
                        color: hoveredIdx === i ? "var(--text-primary)" : "var(--text-secondary)",
                        lineHeight: 1.7,
                        flex: 1,
                        transition: "color 0.12s",
                        position: "relative",
                        zIndex: 1,
                      }}>
                        {renderCitedBody(signal.body, signal.sources)}
                      </div>
                    )}
                  </div>
              ))}
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
              ...labelStyle, marginBottom: 8,
            }}
            className={briefLoading && i === 0 ? "loading-pulse" : ""}
          >
            {signal.label}
          </div>
          {signal.body ? (
            <div style={{ ...TYPE.body, color: "var(--text-primary)", lineHeight: 1.7 }}>
              {signal.body}
            </div>
          ) : briefLoading ? (
            <div className="loading-pulse" style={{ ...TYPE.reading, color: "var(--accent-muted)", opacity: 0.4 }}>
              ▊
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
