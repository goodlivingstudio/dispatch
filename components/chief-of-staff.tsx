"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { ChevronUp } from "lucide-react"
import type { Article, Signal, SignalSource } from "@/lib/types"

// ─── Citation chip — fixed popover with source details ──────────────────────

function CitationChip({ num, src }: { num: string; src: SignalSource }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const chipRef = useRef<HTMLSpanElement>(null)

  const handleEnter = () => {
    if (chipRef.current) {
      const rect = chipRef.current.getBoundingClientRect()
      setPos({ x: rect.left + rect.width / 2, y: rect.top })
    }
    setShow(true)
  }

  return (
    <>
      <span
        ref={chipRef}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        onClick={e => {
          e.stopPropagation()
          window.open(src.url, "_blank", "noopener,noreferrer")
        }}
        style={{
          color: "var(--accent-secondary)",
          cursor: "pointer",
          transition: "color 0.15s",
        }}
      >
        {num}
      </span>
      {show && createPortal(
        <div
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          onClick={e => e.stopPropagation()}
          style={{
            position: "fixed",
            left: Math.min(pos.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 240),
            top: Math.max(8, pos.y - 8),
            transform: "translateY(-100%)",
            width: 220,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 12px",
            zIndex: 1000,
            animation: "status-fade 0.15s ease both",
          }}
        >
          <div style={{
            fontSize: 10, fontFamily: "var(--font-geist-mono), monospace",
            color: "var(--accent-secondary)", textTransform: "uppercase",
            marginBottom: 4,
          }}>
            {src.source}
          </div>
          <a
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              fontSize: 11, fontFamily: "var(--font-geist-mono), monospace",
              color: "var(--text-primary)", lineHeight: 1.5,
              textDecoration: "none", display: "block",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--accent-secondary)" }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-primary)" }}
          >
            {src.title}
          </a>
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Citation renderer — parses [1][2] into hoverable chips ─────────────────

function renderCitedBody(body: string, sources?: SignalSource[]) {
  if (!sources || sources.length === 0) return body
  const parts = body.split(/(\[\d+\])/)
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/)
    if (!match) return part
    const idx = parseInt(match[1], 10) - 1
    const src = sources[idx]
    if (!src) return part
    return <CitationChip key={i} num={part} src={src} />
  })
}

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
              {signals.map((signal, i) => (
                  <div
                    key={i}
                    onClick={() => onDeliberate && signal.body && onDeliberate(signal)}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    style={{
                      padding: "16px 20px",
                      borderRight: i < 2 ? "1px solid var(--border)" : "none",
                      animation: `signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 160}ms both`,
                      display: "flex",
                      flexDirection: "column",
                      cursor: signal.body ? "pointer" : "default",
                      background: hoveredIdx === i ? "var(--bg-surface)" : "transparent",
                      transition: "background 0.12s",
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
                        color: hoveredIdx === i ? "var(--text-primary)" : "var(--text-secondary)",
                        lineHeight: 1.6,
                        flex: 1,
                        transition: "color 0.12s",
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
