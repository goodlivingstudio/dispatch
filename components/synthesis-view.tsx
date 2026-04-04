"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowUpRight } from "lucide-react"
import type { Article } from "@/lib/types"
import { TYPE, MONO, labelStyle, metaStyle } from "@/lib/styles"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SynthesisViewProps {
  articles: Article[]
  onDeliberate: (text: string) => void
}

type LayerKey = "opportunity" | "position" | "discipline" | "landscape" | "culture"

const LAYER_COLORS: Record<LayerKey, string> = {
  opportunity: "#D4A05A",
  position: "#5A9EB0",
  discipline: "#7BAF6A",
  landscape: "#9A85B8",
  culture: "#C87A6A",
}

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
}

interface SynthesisData {
  headline?: string
  briefing: string
  patterns: AIPattern[]
  blindSpotNote: string
  cerebroProvocation?: string
}

const SYNTHESIS_STATUSES = [
  "$ synthesis --analyze",
  "▸ reading annotated feed",
  "▸ loading 7-day history",
  "▸ detecting convergences",
  "▸ composing briefing",
]

// ─── Synthesis View ────────────────────────────────────────────────────────

export function SynthesisView({ articles, onDeliberate }: SynthesisViewProps) {
  const [data, setData] = useState<SynthesisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusIdx, setStatusIdx] = useState(0)
  const fetched = useRef(false)

  useEffect(() => {
    if (articles.length === 0 || fetched.current) return
    const annotated = articles.filter(a => a.synopsis || a.relevance)
    if (annotated.length < 3) return
    fetched.current = true
    setLoading(true)
    setStatusIdx(0)

    const t = setInterval(() => setStatusIdx(i => Math.min(i + 1, SYNTHESIS_STATUSES.length - 1)), 1200)

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
      })
      .catch(() => { setLoading(false); clearInterval(t) })

    return () => clearInterval(t)
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
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>

            {/* ─ THE BRIEFING — headline + evidence ─ */}
            <div style={{
              padding: "36px 20px 32px",
              borderBottom: "1px solid var(--border)",
              animation: "signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}>
              {/* Headline — the week's biggest shift */}
              <div style={{
                fontSize: 19,
                fontWeight: 500,
                color: "var(--text-primary)",
                lineHeight: 1.45,
                letterSpacing: "-0.015em",
                marginBottom: 16,
              }}>
                {data.headline || data.briefing.split(/[.!?]\s/)[0]}
              </div>

              {/* Briefing — broken into scannable points */}
              {(() => {
                const text = data.headline ? data.briefing : data.briefing.split(/(?<=[.!?])\s+/).slice(1).join(" ")
                const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim())
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {sentences.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--text-tertiary)", flexShrink: 0, marginTop: 8 }} />
                        <span style={{ ...TYPE.body, color: "var(--text-secondary)", lineHeight: 1.7 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* ─ CONVERGENCES — measured 2-column grid ─ */}
            {data.patterns.length > 0 && (
              <div style={{
                padding: "28px 20px",
                animation: "signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 150ms both",
              }}>
                <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>
                  Convergences
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: data.patterns.length === 1 ? "1fr" : "1fr 1fr",
                  gap: 1,
                  background: "var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}>
                  {data.patterns.map((pattern, i) => (
                    <div
                      key={i}
                      onClick={() => onDeliberate(`I want to explore this convergence pattern:\n\n"${pattern.title}"\n\n${pattern.description}\n\nWhat does this mean strategically?`)}
                      style={{
                        background: "var(--bg-surface)",
                        padding: "24px",
                        cursor: "pointer",
                        transition: "background 0.15s",
                        animation: `signal-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${200 + i * 80}ms both`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                      onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-surface)" }}
                    >
                      {/* Card image — generative or placeholder */}
                      <div style={{
                        height: 120, marginBottom: 16, borderRadius: 8, overflow: "hidden",
                        background: pattern.imageUrl ? "transparent" : `linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)`,
                      }}>
                        {pattern.imageUrl && (
                          <img
                            src={pattern.imageUrl}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        )}
                      </div>
                      {/* Layer labels with dot separators */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                        {pattern.layers.map((l, li) => (
                          <span key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {li > 0 && <span style={{ ...TYPE.xs, color: "var(--text-tertiary)", opacity: 0.4 }}>·</span>}
                            <span style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              {LAYER_LABELS[l as LayerKey] || l}
                            </span>
                          </span>
                        ))}
                      </div>
                      {/* Title — the headline */}
                      <div style={{
                        ...TYPE.heading,
                        color: "var(--text-primary)",
                        marginBottom: 8,
                      }}>
                        {pattern.title}
                      </div>
                      {/* Description — bullet points */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {pattern.description.split(/(?<=[.!?])\s+/).filter(s => s.trim()).map((s, si) => (
                          <div key={si} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--text-tertiary)", flexShrink: 0, marginTop: 7 }} />
                            <span style={{ ...TYPE.body, color: "var(--text-secondary)", lineHeight: 1.7 }}>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─ BOTTOM ROW — blind spots + provocation side by side ─ */}
            <div style={{
              display: "flex",
              borderTop: "1px solid var(--border)",
              animation: "signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 500ms both",
              flex: 1,
            }}>
              {/* Blind Spots */}
              {data.blindSpotNote && (
                <div style={{
                  flex: 1,
                  padding: "28px 20px",
                  borderRight: data.cerebroProvocation ? "1px solid var(--border)" : "none",
                  display: "flex", flexDirection: "column",
                }}>
                  <div style={{ ...TYPE.xs, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 500 }}>
                    Blind Spots
                  </div>
                  <div style={{ ...TYPE.body, color: "var(--text-tertiary)", lineHeight: 1.7 }}>
                    {data.blindSpotNote}
                  </div>
                </div>
              )}

              {/* Cerebro Provocation */}
              {data.cerebroProvocation && (
                <div
                  onClick={() => onDeliberate(data.cerebroProvocation!)}
                  style={{
                    flex: 1,
                    padding: "28px 20px",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-surface)" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <ArrowUpRight size={11} style={{ color: "var(--accent-secondary)" }} />
                    <span style={{ ...TYPE.xs, color: "var(--accent-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Ask Cerebro
                    </span>
                  </div>
                  <div style={{ ...TYPE.body, color: "var(--text-secondary)", lineHeight: 1.7 }}>
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
