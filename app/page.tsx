"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Ticker } from "@/components/ticker"

// ─── Skin + mode system ───────────────────────────────────────────────────────

export type Skin = "mineral" | "slate" | "forest"

function applyThemeClasses(skin: Skin, day: boolean) {
  const el = document.documentElement
  el.classList.remove("day", "skin-slate", "skin-forest")
  if (day) el.classList.add("day")
  if (skin === "slate")  el.classList.add("skin-slate")
  if (skin === "forest") el.classList.add("skin-forest")
}

function useTheme() {
  const [skin, setSkinState] = useState<Skin>("mineral")
  const [isDay, setIsDay]     = useState(false)
  const skinRef               = useRef<Skin>("mineral")

  useEffect(() => {
    const storedSkin = (localStorage.getItem("dispatch-skin") as Skin) || "mineral"
    const storedMode = localStorage.getItem("dispatch-theme")
    const h   = new Date().getHours()
    const day = storedMode === "day" ? true : storedMode === "night" ? false : h >= 6 && h < 20
    skinRef.current = storedSkin
    setSkinState(storedSkin)
    setIsDay(day)
    applyThemeClasses(storedSkin, day)
  }, [])

  const toggleMode = useCallback(() => {
    setIsDay(prev => {
      const next = !prev
      applyThemeClasses(skinRef.current, next)
      localStorage.setItem("dispatch-theme", next ? "day" : "night")
      return next
    })
  }, [])

  const setSkin = useCallback((newSkin: Skin) => {
    skinRef.current = newSkin
    setSkinState(newSkin)
    localStorage.setItem("dispatch-skin", newSkin)
    setIsDay(prev => { applyThemeClasses(newSkin, prev); return prev })
  }, [])

  return { skin, isDay, toggleMode, setSkin }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Article {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  summary: string
  category: string
  tag: string
  relevance?: string
  signalType?: string
  signalLens?: string
  signalScores?: { lilly: number; hod: number; urgency: number }
}

interface Message {
  role: "user" | "assistant" | "search"
  content: string
}

interface Signal {
  label: string
  body: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG = [
  { id: "all",              label: "All"             },
  { id: "policy",           label: "Policy"          },
  { id: "ai",               label: "AI"              },
  { id: "design-industry",  label: "Design Industry" },
  { id: "creative-practice",label: "Creative"        },
  { id: "market",           label: "Market"          },
  { id: "health",           label: "Healthcare"      },
  { id: "company",          label: "Company"         },
  { id: "design-leadership",label: "Leadership"      },
  { id: "creative-tech",    label: "Creative Tech"   },
  { id: "culture",          label: "Culture"         },
  { id: "data",             label: "Data"            },
]


// ─── Annotation cache helpers ─────────────────────────────────────────────────
// Annotations live in localStorage with a 2-hour TTL.
// Single-user tool; 5-10 visits/day — fresh enough, eliminates every load cost.

const ANNOTATION_CACHE_KEY = "dispatch-annotations-v2"
const ANNOTATION_TTL_MS    = 2 * 60 * 60 * 1000 // 2 hours

interface AnnotationEntry {
  id: string
  relevance: string
  signalType: string
  signalLens: string
  signalScores?: { lilly: number; hod: number; urgency: number }
}

function loadAnnotationCache(): AnnotationEntry[] | null {
  try {
    const raw = localStorage.getItem(ANNOTATION_CACHE_KEY)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > ANNOTATION_TTL_MS) return null
    // Reject empty-content caches — these are artifacts of failed annotation runs
    const hasContent = Array.isArray(data) && data.some((a: AnnotationEntry) => a.relevance && a.relevance.length > 10)
    if (!hasContent) return null
    return data
  } catch { return null }
}

function saveAnnotationCache(data: AnnotationEntry[]) {
  try { localStorage.setItem(ANNOTATION_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })) }
  catch { /* quota exceeded — silently skip */ }
}

function mergeAnnotations(articles: Article[], annotations: AnnotationEntry[]): Article[] {
  const map = new Map(annotations.map(a => [a.id, a]))
  return articles.map(a => {
    const ann = map.get(a.id)
    return ann ? { ...a, ...ann } : a
  })
}

async function fetchAnnotations(articles: Article[]): Promise<AnnotationEntry[] | null> {
  // Return cached if still fresh
  const cached = loadAnnotationCache()
  if (cached) return cached

  try {
    const res = await fetch("/api/annotate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articles: articles.slice(0, 20).map(a => ({ id: a.id, title: a.title, category: a.category })),
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const annotations: AnnotationEntry[] = data.annotations || []
    if (annotations.length > 0) saveAnnotationCache(annotations)
    return annotations
  } catch { return null }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 36e5)
  if (h < 1) return "< 1h"
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ─── Live Clock ───────────────────────────────────────────────────────────────

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
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <div
        style={{
          fontSize: 11,
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          color: "var(--text-secondary)",
          letterSpacing: "0.04em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {time}
      </div>
      <div
        style={{
          fontSize: 9,
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          color: "var(--text-tertiary)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {tzLabel}
      </div>
    </div>
  )
}

// ─── Left Rail ────────────────────────────────────────────────────────────────

function LeftRail({
  articles,
  active,
  onSelect,
  isLive,
  feedLoading,
  width,
}: {
  articles: Article[]
  active: string
  onSelect: (id: string) => void
  isLive: boolean
  feedLoading: boolean
  width: number
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
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "var(--text-primary)",
              lineHeight: 1,
            }}
          >
            Dispatch
          </div>
          <LiveClock />
        </div>

        {/* Date */}
        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            color: "var(--text-tertiary)",
            letterSpacing: "0.02em",
          }}
        >
          {day}, {date}
        </div>

        {/* Feed status */}
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: feedLoading
                ? "var(--text-tertiary)"
                : isLive
                ? "var(--live)"
                : "var(--text-tertiary)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 9,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: feedLoading
                ? "var(--text-tertiary)"
                : isLive
                ? "var(--live)"
                : "var(--text-tertiary)",
            }}
          >
            {feedLoading ? "Loading" : isLive ? "Live" : "Demo"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
        {CATEGORY_CONFIG.map(cat => {
          const n = countFor(cat.id)
          if (cat.id !== "all" && n === 0 && !feedLoading) return null
          const isActive = active === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 20px",
                background: isActive ? "var(--bg-elevated)" : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.1s",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                  fontWeight: isActive ? 500 : 400,
                  letterSpacing: "-0.01em",
                }}
              >
                {cat.label}
              </span>
              {n > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    color: isActive ? "var(--text-secondary)" : "var(--text-tertiary)",
                  }}
                >
                  {n}
                </span>
              )}
            </button>
          )
        })}

      </nav>
    </aside>
  )
}

// ─── Chief of Staff — data hook ───────────────────────────────────────────────

function useChiefOfStaff(articles: Article[]) {
  const [signals, setSignals] = useState<Signal[]>([])
  const [briefLoading, setBriefLoading] = useState(false)
  const fetched = useRef(false)

  useEffect(() => {
    if (articles.length > 0 && !fetched.current) {
      fetched.current = true
      setBriefLoading(true)
      fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articles: articles.slice(0, 25) }),
      })
        .then(r => r.json())
        .then(data => {
          setSignals(data.signals || [])
          setBriefLoading(false)
        })
        .catch(() => setBriefLoading(false))
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
  }
}

// ─── Chief of Staff Band — desktop horizontal grid ────────────────────────────

const SCAN_STATUSES = ["Scanning feed", "Clustering signals", "Composing brief"]

function ChiefOfStaffBand({ signals, briefLoading, onDeliberate }: {
  signals: Signal[]
  briefLoading: boolean
  onDeliberate?: (signal: Signal) => void
}) {
  const [statusIdx,  setStatusIdx]  = useState(0)
  const [revealed,   setRevealed]   = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const wasLoading = useRef(true)

  // Advance status text while fetching (stops at final stage)
  useEffect(() => {
    if (!briefLoading) return
    setStatusIdx(0)
    wasLoading.current = true
    const t = setInterval(() => setStatusIdx(i => Math.min(i + 1, SCAN_STATUSES.length - 1)), 1700)
    return () => clearInterval(t)
  }, [briefLoading])

  // When real data arrives, wait one beat then reveal
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
        minHeight: 80,
      }}
    >
      {isLoading ? (
        /* ── Loading state: status text + horizontal scan bar ── */
        <>
          <div style={{
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: 80,
          }}>
            <div
              key={statusIdx}
              style={{
                fontSize: 9,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                color: "var(--accent-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                animation: "status-fade 0.3s ease both",
              }}
            >
              {SCAN_STATUSES[statusIdx]}
            </div>
          </div>
          {/* Scan bar */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "25%",
            height: 1,
            background: "var(--accent-secondary)",
            opacity: 0.5,
            animation: "band-scan 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }} />
        </>
      ) : (
        /* ── Revealed state: staggered column entry ── */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
          {signals.map((signal, i) => {
            const isHovered = hoveredIdx === i
            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  padding: "16px 20px 14px",
                  borderRight: i < 2 ? "1px solid var(--border)" : "none",
                  animation: `signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 160}ms both`,
                  position: "relative",
                  transition: "background 0.15s",
                  background: isHovered ? "var(--bg-elevated)" : "transparent",
                }}
              >
                <div style={{
                  fontSize: 9,
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  color: "var(--accent-muted)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}>
                  {signal.label}
                </div>
                {signal.body && (
                  <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.6, letterSpacing: "-0.01em" }}>
                    {signal.body}
                  </div>
                )}
                {/* Deliberate affordance — appears on hover */}
                {onDeliberate && signal.body && (
                  <button
                    onClick={() => onDeliberate(signal)}
                    style={{
                      position: "absolute",
                      bottom: 10,
                      right: 12,
                      background: "none",
                      border: "none",
                      padding: "2px 0",
                      cursor: "pointer",
                      fontSize: 9,
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--accent-secondary)",
                      opacity: isHovered ? 1 : 0,
                      transition: "opacity 0.2s",
                      pointerEvents: isHovered ? "auto" : "none",
                    }}
                    aria-label={`Deliberate on: ${signal.label}`}
                  >
                    Deliberate →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Analysis Panel — mobile stacked view ─────────────────────────────────────

function AnalysisPanel({ signals, briefLoading }: { signals: Signal[]; briefLoading: boolean }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-primary)" }}>
      {signals.map((signal, i) => (
        <div
          key={i}
          style={{
            padding: "20px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--accent-primary)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              color: "var(--accent-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
            className={briefLoading && i === 0 ? "loading-pulse" : ""}
          >
            {signal.label}
          </div>
          {signal.body ? (
            <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.65, letterSpacing: "-0.01em" }}>
              {signal.body}
            </div>
          ) : briefLoading ? (
            <div className="loading-pulse" style={{ fontSize: 13, color: "var(--accent-muted)", opacity: 0.4, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
              ▊
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

// ─── Signal Card — hover intelligence briefing ────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  DATA:     "Data Signal",
  CASE:     "Case Study",
  OPINION:  "Perspective",
  TREND:    "Trend",
  RESEARCH: "Research",
  NEWS:     "News",
  CULTURAL: "Cultural",
}

const URGENCY_TIER = (score: number | undefined): { label: string; color: string } => {
  if (score === undefined) return { label: "Pending",  color: "var(--text-tertiary)" }
  if (score >= 8)          return { label: "Breaking", color: "#c0392b" }
  if (score >= 5)          return { label: "Timely",   color: "var(--accent-primary)" }
  return                          { label: "Context",  color: "var(--text-tertiary)" }
}

const LENS_COLOR: Record<string, string> = {
  LILLY: "var(--accent-secondary)",
  HOD:   "var(--accent-muted)",
  BOTH:  "var(--accent-secondary)",
}

const LENS_LABEL: Record<string, string> = {
  LILLY: "Lilly",
  HOD:   "HoD Path",
  BOTH:  "Lilly · HoD",
}


function SignalCard({ x, y, article }: { x: number; y: number; article: Article | null }) {
  if (!article) return null

  const vw          = typeof window !== "undefined" ? window.innerWidth : 1200
  const left        = Math.min(x + 18, vw - 276)
  const top         = Math.max(8, y - 44)
  const lens        = article.signalLens || ""
  const type        = article.signalType || ""
  const scores      = article.signalScores
  const accentColor = LENS_COLOR[lens] || "var(--border)"
  const urgency     = URGENCY_TIER(scores?.urgency)
  const typeLabel   = TYPE_LABEL[type] || ""

  return (
    <div style={{
      position: "fixed",
      left,
      top,
      width: 260,
      pointerEvents: "none",
      zIndex: 1000,
      background: "var(--bg-surface)",
      borderRadius: 3,
      border: "1px solid var(--border)",
      borderLeft: `3px solid ${accentColor}`,
      overflow: "hidden",
    }}>
      {/* Header: signal type + lens — only render when at least one value is known */}
      {(typeLabel || lens) && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px 5px",
          borderBottom: "1px solid var(--border)",
        }}>
          {typeLabel && (
            <span style={{
              fontSize: 9,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
            }}>
              {typeLabel}
            </span>
          )}
          {lens && (
            <span style={{
              fontSize: 9,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: accentColor,
              marginLeft: "auto",
            }}>
              {LENS_LABEL[lens]}
            </span>
          )}
        </div>
      )}

      {/* Summary — what it is, factual, muted */}
      {article.summary && (
        <div style={{ padding: article.relevance ? "10px 12px 9px" : "10px 12px" }}>
          <div style={{
            fontSize: 11.5,
            lineHeight: 1.55,
            color: "var(--text-tertiary)",
            letterSpacing: "-0.01em",
          }}>
            {article.summary}
          </div>
        </div>
      )}

      {/* Relevance — why it matters, interpretive, pulls you in */}
      {article.relevance && (
        <div style={{
          padding: "9px 12px 11px",
          borderTop: "1px solid var(--border)",
        }}>
          <div style={{
            fontSize: 12,
            lineHeight: 1.55,
            color: "var(--text-primary)",
            letterSpacing: "-0.015em",
          }}>
            {article.relevance}
          </div>
        </div>
      )}

      {/* Footer: urgency tier — only when scores present */}
      {scores && (
        <div style={{
          padding: "5px 10px 6px",
          borderTop: "1px solid var(--border)",
        }}>
          <span style={{
            fontSize: 9,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: urgency.color,
          }}>
            {urgency.label}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Feed Card ────────────────────────────────────────────────────────────────

type SignalCallbacks = {
  onSignalEnter: (article: Article, x: number, y: number) => void
  onSignalMove:  (x: number, y: number) => void
  onSignalLeave: () => void
}

function FeedCard({ article, onSignalEnter, onSignalMove, onSignalLeave }: { article: Article } & SignalCallbacks) {
  const isExternal   = article.url !== "#"
  const hasSignal    = !!(article.summary || article.relevance)
  const [hovered, setHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const signalActiveRef = useRef(false)

  const isLeftHalf = (clientX: number) => {
    if (!cardRef.current) return true
    const rect = cardRef.current.getBoundingClientRect()
    return clientX < rect.left + rect.width * 0.5
  }

  const handleMouseEnter = (e: React.MouseEvent) => {
    setHovered(true)
    if (hasSignal && isLeftHalf(e.clientX)) {
      signalActiveRef.current = true
      onSignalEnter(article, e.clientX, e.clientY)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!hasSignal) return
    if (isLeftHalf(e.clientX)) {
      if (!signalActiveRef.current) {
        signalActiveRef.current = true
        onSignalEnter(article, e.clientX, e.clientY)
      } else {
        onSignalMove(e.clientX, e.clientY)
      }
    } else {
      if (signalActiveRef.current) {
        signalActiveRef.current = false
        onSignalLeave()
      }
    }
  }

  const handleMouseLeave = () => {
    setHovered(false)
    signalActiveRef.current = false
    onSignalLeave()
  }

  const content = (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        display: "flex",
        padding: "14px 20px 14px 18px",
        borderBottom: "1px solid var(--border)",
        borderLeft: `2px solid ${article.signalLens === "LILLY" || article.signalLens === "BOTH" ? "var(--accent-secondary)" : "transparent"}`,
        background: hovered ? "var(--bg-surface)" : "transparent",
        cursor: isExternal ? "pointer" : hasSignal ? "default" : "default",
        transition: "background 0.12s",
        gap: 0,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Meta line */}
        <div
          style={{
            fontSize: 10,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            color: "var(--text-tertiary)",
            letterSpacing: "0.02em",
            marginBottom: 6,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {article.source}
          <span style={{ margin: "0 5px", opacity: 0.4 }}>·</span>
          {article.category}
          <span style={{ margin: "0 5px", opacity: 0.4 }}>·</span>
          {timeAgo(article.publishedAt)}
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 550,
            color: hovered ? "var(--text-primary)" : "var(--text-secondary)",
            lineHeight: 1.4,
            letterSpacing: "-0.02em",
            marginBottom: article.relevance ? 7 : 0,
          }}
        >
          {article.title}
        </div>

        {/* Relevance hook */}
        {article.relevance && (
          <div
            style={{
              fontSize: 11.5,
              color: article.signalLens === "LILLY" || article.signalLens === "BOTH" ? "var(--accent-muted)" : "var(--text-tertiary)",
              lineHeight: 1.55,
              letterSpacing: "-0.005em",
            }}
          >
            {article.relevance}
          </div>
        )}
      </div>
    </div>
  )

  if (isExternal) {
    return (
      <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none" }}>
        {content}
      </a>
    )
  }
  return content
}

// ─── Cerebro ──────────────────────────────────────────────────────────────────

function Cerebro({ articles, pendingPrompt }: {
  articles: Article[]
  pendingPrompt?: { text: string; id: number } | null
}) {
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState("")
  const [loading,   setLoading]   = useState(false)
  const [tokens,    setTokens]    = useState(0)
  const [memory,    setMemory]    = useState(false)
  const [sessionId, setSessionId] = useState("")
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Generate or restore a persistent session ID
  useEffect(() => {
    let id = localStorage.getItem("cerebro-session")
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      localStorage.setItem("cerebro-session", id)
    }
    setSessionId(id)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  useEffect(() => {
    const el = inputRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = Math.min(el.scrollHeight, 96) + "px"
    }
  }, [input])

  const sendRef = useRef<((text: string) => Promise<void>) | undefined>(undefined)

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return
      const updated = [...messages, { role: "user" as const, content: text.trim() }]
      setMessages(updated)
      setInput("")
      setLoading(true)

      const feedContext = articles.length
        ? {
            count: articles.length,
            articles: articles
              .slice(0, 15)
              .map(a => `[${a.category}] ${a.source}: ${a.title}${a.relevance ? ` — ${a.relevance}` : ""}`)
              .join("\n"),
          }
        : null

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updated.filter(m => m.role !== "search"), feedContext, sessionId }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setMessages(prev => [...prev, { role: "assistant", content: `// error: ${data.error || res.status}` }])
        } else {
          // Inject search lines into the display thread before the response
          const searchLines: Message[] = (data.searches || []).map(
            (q: string) => ({ role: "search" as const, content: q })
          )
          setMessages(prev => [
            ...prev,
            ...searchLines,
            { role: "assistant", content: data.text || "// empty response" },
          ])
          setTokens(t => t + (data.inputTokens || 0) + (data.outputTokens || 0))
          if (data.memoryActive) setMemory(true)
        }
      } catch (err) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `// network error: ${err instanceof Error ? err.message : String(err)}` },
        ])
      }
      setLoading(false)
    },
    [messages, loading, articles]
  )

  // Keep ref current so the pending-prompt effect never captures a stale send
  sendRef.current = send

  // Auto-fire a deliberation prompt seeded from ChiefOfStaffBand
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (pendingPrompt?.text) sendRef.current?.(pendingPrompt.text)
  }, [pendingPrompt?.id])

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--accent-muted)",
          }}
        >
          Cerebro
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {memory && (
            <span
              title="Conversation memory active — Cerebro remembers previous sessions"
              style={{
                fontSize: 8,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                color: "var(--accent-muted)",
                letterSpacing: "0.06em",
                opacity: 0.7,
              }}
            >
              ◈ mem
            </span>
          )}
          {tokens > 0 && (
            <span
              style={{
                fontSize: 9,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                color: "var(--text-tertiary)",
              }}
            >
              {tokens.toLocaleString()}t
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 0",
        }}
      >
        {messages.length === 0 && (
          <div style={{ padding: "8px 16px" }}>
            <div
              style={{
                fontSize: 11,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                color: "var(--text-tertiary)",
                lineHeight: 1.8,
              }}
            >
              {"// "}<span style={{ color: "var(--accent-muted)" }}>ready</span>
              <br />
              {"// "}Ask about the feed, the Lilly
              <br />
              {"// "}opportunity, or the five-year path.
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: m.role === "search" ? 4 : 16 }}>
            {m.role === "user" ? (
              // User prompt
              <div
                style={{
                  padding: "0 16px",
                  fontSize: 11,
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  color: "var(--text-tertiary)",
                  lineHeight: 1.6,
                  wordBreak: "break-word",
                }}
              >
                <span style={{ color: "var(--accent-secondary)", marginRight: 6 }}>{">"}</span>
                {m.content}
              </div>
            ) : m.role === "search" ? (
              // Web search activity — shown as terminal comment
              <div
                style={{
                  padding: "0 16px",
                  fontSize: 10,
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  color: "var(--text-tertiary)",
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ color: "var(--accent-muted)", opacity: 0.7 }}>↗</span>
                <span style={{ opacity: 0.6 }}>searched: &ldquo;{m.content}&rdquo;</span>
              </div>
            ) : (
              // Assistant response — monospace, full width
              <div
                style={{
                  padding: "0 16px",
                  fontSize: 11.5,
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  color: "var(--text-secondary)",
                  lineHeight: 1.75,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.content}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ padding: "0 16px" }}>
            <span
              className="cursor-blink"
              style={{
                fontSize: 13,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            >
              ▊
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            color: "var(--accent-secondary)",
            lineHeight: "20px",
            flexShrink: 0,
            paddingBottom: 2,
          }}
        >
          {">"}
        </span>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder="ask anything"
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 12,
            fontFamily: "inherit",
            color: "var(--text-primary)",
            caretColor: "var(--accent-secondary)",
            lineHeight: "20px",
            maxHeight: 96,
          }}
        />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Column Divider ───────────────────────────────────────────────────────────

function Divider({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 9,
        flexShrink: 0,
        position: "relative",
        cursor: "col-resize",
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 4,
          width: 1,
          background: "var(--text-tertiary)",
          opacity: hovered ? 0.45 : 0.2,
          transition: "opacity 0.15s",
        }}
      />
    </div>
  )
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

function useMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])
  return isMobile
}

export default function Page() {
  const { skin, isDay, toggleMode, setSkin } = useTheme()
  const isMobile = useMobile()
  const [articles,    setArticles]    = useState<Article[]>([])
  const [isLive,      setIsLive]      = useState(false)
  const [feedLoading,    setFeedLoading]    = useState(true)
  const [active,         setActive]         = useState("all")
  const [mobileTab,      setMobileTab]      = useState<"feed" | "analysis" | "cerebro">("feed")
  const [cerebroPrompt,  setCerebroPrompt]  = useState<{ text: string; id: number } | null>(null)
  const { signals, briefLoading } = useChiefOfStaff(articles)

  const handleDeliberate = useCallback((signal: Signal) => {
    const text = `I want to deliberate on this signal from the brief:\n\n"${signal.label}"\n\n${signal.body}\n\nWalk me through the strategic implications. What should I be thinking about, and what questions should I be exploring?`
    setCerebroPrompt({ text, id: Date.now() })
    setMobileTab("cerebro")
  }, [])

  // Signal card hover state — desktop only
  const [signal, setSignal] = useState<{ article: Article; x: number; y: number } | null>(null)
  const handleSignalEnter = useCallback((article: Article, x: number, y: number) => { setSignal({ article, x, y }) }, [])
  const handleSignalMove  = useCallback((x: number, y: number) => { setSignal(s => s ? { ...s, x, y } : s) }, [])
  const handleSignalLeave = useCallback(() => { setSignal(null) }, [])

  // Resizable column widths
  const [leftWidth,  setLeftWidth]  = useState(220)
  const [rightWidth, setRightWidth] = useState(320)
  const dragRef = useRef<{ side: "left"|"right"; startX: number; startW: number } | null>(null)

  const startResize = useCallback((side: "left"|"right", e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = {
      side,
      startX: e.clientX,
      startW: side === "left" ? leftWidth : rightWidth,
    }
    document.body.style.cursor    = "col-resize"
    document.body.style.userSelect = "none"

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = ev.clientX - dragRef.current.startX
      if (dragRef.current.side === "left") {
        setLeftWidth(clamp(dragRef.current.startW + delta, 160, 380))
      } else {
        setRightWidth(clamp(dragRef.current.startW - delta, 220, 520))
      }
    }
    const onUp = () => {
      dragRef.current = null
      document.body.style.cursor    = ""
      document.body.style.userSelect = ""
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup",   onUp)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup",   onUp)
  }, [leftWidth, rightWidth])

  useEffect(() => {
    fetch("/api/news")
      .then(r => r.json())
      .then(data => {
        const fresh: Article[] = data.articles || []
        setIsLive(data.isLive || false)

        // Merge any cached annotations immediately before render
        const cached = loadAnnotationCache()
        setArticles(cached ? mergeAnnotations(fresh, cached) : fresh)
        setFeedLoading(false)

        // Fetch fresh annotations (uses localStorage cache, 2hr TTL)
        fetchAnnotations(fresh).then(annotations => {
          if (annotations) setArticles(mergeAnnotations(fresh, annotations))
        })
      })
      .catch(() => setFeedLoading(false))
  }, [])

  const filtered =
    active === "all" ? articles : articles.filter(a => a.tag === active)

  const feedContent = (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      {!isMobile && <ChiefOfStaffBand signals={signals} briefLoading={briefLoading} onDeliberate={handleDeliberate} />}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {feedLoading ? (
          <div style={{ padding: "32px 20px" }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="loading-pulse"
                style={{
                  padding: "14px 20px 14px 18px",
                  borderBottom: "1px solid var(--border)",
                  borderLeft: "2px solid transparent",
                }}
              >
                <div style={{ height: 10, width: `${60 + (i % 3) * 15}%`, background: "var(--border)", borderRadius: 2, marginBottom: 8 }} />
                <div style={{ height: 13, width: `${70 + (i % 4) * 8}%`, background: "var(--bg-elevated)", borderRadius: 2 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, fontSize: 11, fontFamily: "'SF Mono', 'Fira Code', monospace", color: "var(--text-tertiary)" }}>
            no articles
          </div>
        ) : (
          filtered.map(a => (
            <FeedCard
              key={a.id}
              article={a}
              onSignalEnter={handleSignalEnter}
              onSignalMove={handleSignalMove}
              onSignalLeave={handleSignalLeave}
            />
          ))
        )}
      </div>
    </main>
  )

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden", background: "var(--bg-primary)" }}>
        <Ticker isDay={isDay} onToggle={toggleMode} skin={skin} onSkinChange={setSkin} />

        {/* Mobile: show active tab panel */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {mobileTab === "feed"     && feedContent}
          {mobileTab === "analysis" && <AnalysisPanel signals={signals} briefLoading={briefLoading} />}
          {mobileTab === "cerebro"  && <div style={{ flex: 1, overflow: "hidden" }}><Cerebro articles={articles} pendingPrompt={cerebroPrompt} /></div>}
        </div>

        {/* Mobile bottom tab bar */}
        <div
          style={{
            flexShrink: 0,
            height: 52,
            display: "flex",
            alignItems: "stretch",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-surface)",
          }}
        >
          {([
            { id: "feed",     icon: "≡",  label: "Feed"     },
            { id: "analysis", icon: "◎",  label: "Analysis" },
            { id: "cerebro",  icon: "◈",  label: "Cerebro"  },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              aria-label={tab.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                borderTop: `2px solid ${mobileTab === tab.id ? "var(--accent-secondary)" : "transparent"}`,
              }}
            >
              <span style={{ fontSize: 15 }}>{tab.icon}</span>
              <span
                style={{
                  fontSize: 9,
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: mobileTab === tab.id ? "var(--accent-secondary)" : "var(--text-tertiary)",
                }}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-primary)",
      }}
    >
      {/* Signal ticker — full width, pinned top */}
      <Ticker isDay={isDay} onToggle={toggleMode} skin={skin} onSkinChange={setSkin} />

      {/* Three-column workspace */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <LeftRail
          articles={articles}
          active={active}
          onSelect={setActive}
          isLive={isLive}
          feedLoading={feedLoading}
          width={leftWidth}
        />
        <Divider onMouseDown={e => startResize("left", e)} />
        {feedContent}
        <Divider onMouseDown={e => startResize("right", e)} />
        <div style={{ width: rightWidth, flexShrink: 0 }}>
          <Cerebro articles={articles} pendingPrompt={cerebroPrompt} />
        </div>
      </div>

      {/* Signal card — intelligence briefing on hover */}
      <SignalCard
        x={signal?.x ?? 0}
        y={signal?.y ?? 0}
        article={signal?.article ?? null}
      />
    </div>
  )
}
