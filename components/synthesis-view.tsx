"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowUpRight } from "lucide-react"
import type { Article } from "@/lib/types"
import { TYPE, MONO, labelStyle, metaStyle } from "@/lib/styles"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SynthesisViewProps {
  articles: Article[]
  onDeliberate: (text: string) => void
  sortBy?: "urgency" | "layer"
}

type LayerKey = "opportunity" | "position" | "discipline" | "landscape" | "culture"

const LAYER_LABELS: Record<LayerKey, string> = {
  opportunity: "Opportunity",
  position: "Position",
  discipline: "Discipline",
  landscape: "Landscape",
  culture: "Culture",
}

interface AIPattern {
  title: string
  description: string
  layers: string[]
  signalCount: number
  imageUrl?: string
  sources?: string[] // article titles / source names backing this pattern
}

interface SynthesisData {
  headline?: string
  briefing: string
  patterns: AIPattern[]
  blindSpotNote: string
  cerebroProvocation?: string
  headerImageUrl?: string
}

const SYNTHESIS_STATUSES = [
  "$ synthesis --analyze",
  "▸ reading annotated feed",
  "▸ loading 7-day history",
  "▸ detecting convergences",
  "▸ composing briefing",
]

// ─── Synthesis View ────────────────────────────────────────────────────────

export function SynthesisView({ articles, onDeliberate, sortBy = "layer" }: SynthesisViewProps) {
  const [data, setData] = useState<SynthesisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusIdx, setStatusIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [hoveredCerebro, setHoveredCerebro] = useState(false)
  const [hoveredBlindSpots, setHoveredBlindSpots] = useState(false)
  const fetched = useRef(false)

  const isTriage = sortBy === "urgency"

  useEffect(() => {
    if (articles.length === 0 || fetched.current) return
    const annotated = articles.filter(a => a.synopsis || a.relevance)
    if (annotated.length < 3) return
    fetched.current = true
    setLoading(true)
    setStatusIdx(0)
    setElapsed(0)

    const t = setInterval(() => setStatusIdx(i => Math.min(i + 1, SYNTHESIS_STATUSES.length - 1)), 1200)
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)

    fetch("/api/synthesis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles: annotated.slice(0, 25) }),
    })
      .then(r => r.json())
      .then(result => {
        if (result.briefing) setData(result)
        setLoading(false)
        clearInterval(t)
        clearInterval(timer)
      })
      .catch(() => { setLoading(false); clearInterval(t); clearInterval(timer) })

    return () => { clearInterval(t); clearInterval(timer) }
  }, [articles])

  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-primary)" }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, height: 40, display: "flex", alignItems: "center",
        padding: "0 20px", borderBottom: "1px solid var(--border)",
      }}>
        <span style={{ ...TYPE.sm, fontFamily: MONO, color: "var(--accent-muted)", textTransform: "uppercase" }}>
          Synthesis
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column" }}>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ padding: "32px 20px" }}>
            {SYNTHESIS_STATUSES.slice(0, statusIdx + 1).map((line, i) => (
              <div
                key={i}
                style={{
                  ...TYPE.sm, fontFamily: MONO,
                  color: i === statusIdx ? "var(--accent-muted)" : "var(--text-tertiary)",
                  opacity: i === statusIdx ? 1 : 0.5,
                  animation: i === statusIdx ? "status-fade 0.2s ease both" : "none",
                  marginBottom: 4,
                }}
              >
                {line}{i === statusIdx && i < SYNTHESIS_STATUSES.length - 1 && <span className="cursor-blink" style={{ marginLeft: 2 }}>_</span>}
                {i === statusIdx && i === SYNTHESIS_STATUSES.length - 1 && <span className="loading-pulse" style={{ marginLeft: 4, ...TYPE.xs, opacity: 0.6 }}>...</span>}
              </div>
            ))}
            {elapsed > 3 && (
              <div style={{ ...TYPE.xs, fontFamily: MONO, color: "var(--text-tertiary)", marginTop: 12, opacity: 0.6 }}>
                {elapsed < 10 ? "analyzing patterns" : elapsed < 30 ? "composing images" : "finishing up"} · {elapsed}s
              </div>
            )}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !data && (
          <div style={{ padding: "48px 20px", maxWidth: 520 }}>
            <div style={{ ...TYPE.body, color: "var(--text-tertiary)", lineHeight: 1.8 }}>
              Pattern intelligence will appear when annotated articles are available.
            </div>
          </div>
        )}

        {/* ── Editorial layout ── */}
        {!loading && data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28, padding: "0 20px 48px" }}>

            {/* ─ HERO — image + headline + summary + bullets ─ */}
            <div style={{
              background: "var(--bg-surface)", borderRadius: 12, overflow: "hidden",
              animation: "signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
              marginTop: 20,
            }}>
              {/* Hero image */}
              <div style={{
                height: 280, overflow: "hidden",
                background: data.headerImageUrl ? "transparent" : "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)",
              }}>
                {data.headerImageUrl && (
                  <img src={data.headerImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>

              {/* Headline + summary + bullets */}
              <div style={{ padding: "28px 28px 32px" }}>
                {/* Headline */}
                <div style={{
                  fontSize: 19, fontWeight: 500, color: "var(--text-primary)",
                  lineHeight: 1.45, letterSpacing: "-0.015em",
                  marginBottom: isTriage ? 0 : 14,
                }}>
                  {data.headline || data.briefing.split(/[.!?]\s/)[0]}
                </div>

                {/* Summary paragraph + bullets — Explore only */}
                {!isTriage && (() => {
                  const text = data.headline ? data.briefing : data.briefing.split(/(?<=[.!?])\s+/).slice(1).join(" ")
                  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim())
                  const summary = sentences[0] || ""
                  const bullets = sentences.slice(1)
                  return (
                    <>
                      {summary && (
                        <div style={{ ...TYPE.reading, color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: bullets.length > 0 ? 14 : 0 }}>
                          {summary}
                        </div>
                      )}
                      {bullets.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {bullets.map((s, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--text-tertiary)", flexShrink: 0, marginTop: 8 }} />
                              <span style={{ ...TYPE.body, color: "var(--text-tertiary)", lineHeight: 1.7 }}>{s}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

            {/* ─ CONVERGENCES — cards ─ */}
            {data.patterns.length > 0 && (
              <div style={{ animation: "signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 150ms both" }}>
                <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                  Convergences
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: data.patterns.length === 1 ? "1fr" : "1fr 1fr",
                  gap: 16,
                }}>
                  {data.patterns.map((pattern, i) => (
                    <div
                      key={i}
                      onClick={() => onDeliberate(`I want to explore this convergence pattern:\n\n"${pattern.title}"\n\n${pattern.description}\n\nWhat does this mean strategically?`)}
                      onMouseEnter={() => setHoveredCard(i)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        background: hoveredCard === i ? "var(--bg-elevated)" : "var(--bg-surface)",
                        borderRadius: 12,
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "background 0.15s",
                        animation: `signal-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${200 + i * 60}ms both`,
                      }}
                    >
                      {/* Card image */}
                      <div style={{
                        height: 160, overflow: "hidden",
                        background: pattern.imageUrl ? "transparent" : "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)",
                      }}>
                        {pattern.imageUrl && (
                          <img src={pattern.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                      </div>
                      {/* Card content */}
                      <div style={{ padding: "20px 24px 24px" }}>
                        {/* Layer eyebrow */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          {pattern.layers.map((l, li) => (
                            <span key={l} style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              {li > 0 && <span style={{ opacity: 0.4, margin: "0 4px" }}>·</span>}
                              {LAYER_LABELS[l as LayerKey] || l}
                            </span>
                          ))}
                        </div>
                        {/* Title */}
                        <div style={{
                          ...TYPE.heading,
                          color: hoveredCard === i ? "var(--text-primary)" : "var(--text-secondary)",
                          transition: "color 0.15s",
                          marginBottom: pattern.description ? 10 : 0,
                        }}>
                          {pattern.title}
                        </div>
                        {/* Description bullets — Triage: 2-3 max, Explore: all */}
                        {pattern.description && (() => {
                          const allBullets = pattern.description.split(/(?<=[.!?])\s+/).filter(s => s.trim())
                          const bullets = isTriage ? allBullets.slice(0, 3) : allBullets
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                              {bullets.map((s, si) => (
                                <div key={si} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                  <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--text-tertiary)", flexShrink: 0, marginTop: 7 }} />
                                  <span style={{ ...TYPE.body, color: "var(--text-secondary)", lineHeight: 1.7 }}>{s}</span>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                        {/* Sources — Explore only, quiet attribution */}
                        {!isTriage && pattern.sources && pattern.sources.length > 0 && (
                          <div style={{ marginTop: 12, ...TYPE.xs, color: "var(--text-tertiary)", opacity: 0.5, lineHeight: 1.6 }}>
                            Based on {pattern.sources.join(" · ")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─ BOTTOM — Blind Spots + Ask Cerebro ─ */}
            <div style={{
              display: "grid",
              gridTemplateColumns: data.blindSpotNote && data.cerebroProvocation ? "1fr 1fr" : "1fr",
              gap: 16,
              animation: "signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 500ms both",
            }}>
              {/* Blind Spots — structured bullets */}
              {data.blindSpotNote && (
                <div
                  onClick={() => onDeliberate(`Explore this blind spot in my intelligence feed:\n\n"${data.blindSpotNote}"\n\nWhat am I missing and why does it matter?`)}
                  onMouseEnter={() => setHoveredBlindSpots(true)}
                  onMouseLeave={() => setHoveredBlindSpots(false)}
                  style={{
                    background: hoveredBlindSpots ? "var(--bg-elevated)" : "var(--bg-surface)",
                    borderRadius: 12, padding: "20px 24px",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                >
                  <div style={{ ...TYPE.xs, color: hoveredBlindSpots ? "var(--text-primary)" : "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 500, transition: "color 0.15s" }}>
                    Blind Spots
                  </div>
                  {(() => {
                    const sentences = data.blindSpotNote.split(/(?<=[.!?])\s+/).filter(s => s.trim())
                    if (isTriage) {
                      // Triage: first sentence only
                      return (
                        <div style={{ ...TYPE.body, color: "var(--text-tertiary)", lineHeight: 1.7 }}>
                          {sentences[0]}
                        </div>
                      )
                    }
                    // Explore: structured bullets
                    if (sentences.length <= 1) {
                      return (
                        <div style={{ ...TYPE.body, color: "var(--text-tertiary)", lineHeight: 1.7 }}>
                          {data.blindSpotNote}
                        </div>
                      )
                    }
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {sentences.map((s, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent-muted)", flexShrink: 0, marginTop: 7 }} />
                            <span style={{ ...TYPE.body, color: "var(--text-tertiary)", lineHeight: 1.7 }}>{s}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Ask Cerebro */}
              {data.cerebroProvocation && (
                <div
                  onClick={() => onDeliberate(data.cerebroProvocation!)}
                  onMouseEnter={() => setHoveredCerebro(true)}
                  onMouseLeave={() => setHoveredCerebro(false)}
                  style={{
                    background: hoveredCerebro ? "var(--bg-elevated)" : "var(--bg-surface)",
                    borderRadius: 12, padding: "20px 24px",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <ArrowUpRight size={11} style={{ color: "var(--accent-secondary)" }} />
                    <span style={{ ...TYPE.xs, color: "var(--accent-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Ask Cerebro
                    </span>
                  </div>
                  <div style={{
                    ...TYPE.body,
                    color: hoveredCerebro ? "var(--text-primary)" : "var(--text-secondary)",
                    lineHeight: 1.7, transition: "color 0.15s",
                  }}>
                    {data.cerebroProvocation}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </main>
  )
}
