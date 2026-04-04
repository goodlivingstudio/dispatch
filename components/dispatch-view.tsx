"use client"

import { useState, useEffect } from "react"
import { Copy, Check, ArrowUpRight, X } from "lucide-react"
import { TYPE, MONO, labelStyle, bodyStyle, metaStyle } from "@/lib/styles"

// ─── Types ──────────────────────────────────────────────────────────────────

interface Pitch {
  title: string
  thesis: string
  mode: "thought_leadership" | "creative"
  layers: string[]
  brief: string
  platforms: {
    primary: string
    adaptations: string[]
  }
  evidence: string[]
  angle?: string
  urgency: string
  wordCount?: number
  imageUrl?: string
}

interface DispatchData {
  available: boolean
  weekSummary: string | null
  headerImageUrl?: string
  pitches: Pitch[]
  articleCount?: number
  generatedAt?: string
  message?: string
}

// ─── Copy Button ────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
      }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 6,
        border: "1px solid var(--border)",
        background: copied ? "var(--accent-secondary)" : "transparent",
        color: copied ? "var(--bg-primary)" : "var(--text-tertiary)",
        ...TYPE.sm, cursor: "pointer", transition: "all 0.2s",
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : label}
    </button>
  )
}

// ─── Pitch Overlay ──────────────────────────────────────────────────────────

function PitchOverlay({ pitch, onClose, onDeliberate }: { pitch: Pitch; onClose: () => void; onDeliberate: (text: string) => void }) {
  const pitchMarkdown = `# ${pitch.title}\n\n**Thesis:** ${pitch.thesis}\n\n**Brief:** ${pitch.brief}\n\n**Platform:** ${pitch.platforms.primary}\n**Adaptations:**\n${pitch.platforms.adaptations.map(a => `- ${a}`).join("\n")}\n\n**Evidence:**\n${pitch.evidence.map(e => `- ${e}`).join("\n")}\n\n**Urgency:** ${pitch.urgency}`

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 6000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", animation: "status-fade 0.15s ease both" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 36px", width: 600, maxHeight: "85vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ ...TYPE.xs, textTransform: "uppercase", color: pitch.mode === "thought_leadership" ? "#5A9EB0" : "#C87A6A", fontWeight: 600, letterSpacing: "0.06em" }}>
            {pitch.mode === "thought_leadership" ? "Thought Leadership" : "Creative"}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 0 }}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ fontSize: 18, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.4 }}>{pitch.title}</div>
        <div style={{ ...TYPE.body, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 24 }}>{pitch.thesis}</div>

        <div style={{ height: 1, background: "var(--border)", marginBottom: 24 }} />

        <div style={{ marginBottom: 24 }}>
          <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Brief</div>
          <div style={{ ...TYPE.body, color: "var(--text-secondary)", lineHeight: 1.7 }}>{pitch.brief}</div>
        </div>

        {pitch.angle && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Angle</div>
            <div style={{ ...TYPE.body, color: "var(--text-secondary)", lineHeight: 1.7 }}>{pitch.angle}</div>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Platform</div>
          <div style={{ ...TYPE.body, color: "var(--text-primary)", fontWeight: 500, marginBottom: 6 }}>{pitch.platforms.primary}</div>
          {pitch.platforms.adaptations.map((a, i) => (
            <div key={i} style={{ ...TYPE.body, color: "var(--text-tertiary)", marginBottom: 4 }}>{a}</div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Evidence</div>
          {pitch.evidence.map((e, i) => (
            <div key={i} style={{ ...TYPE.body, color: "var(--text-secondary)", marginBottom: 6 }}>{e}</div>
          ))}
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Why Now</div>
          <div style={{ ...TYPE.body, color: "var(--accent-muted)", lineHeight: 1.7 }}>{pitch.urgency}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <CopyButton text={pitchMarkdown} label="Copy brief" />
          <CopyButton
            text={`---\ntype: dispatch-pitch\ndate: ${new Date().toISOString().slice(0, 10)}\nmode: ${pitch.mode}\nlayers: [${pitch.layers.join(", ")}]\nplatform: ${pitch.platforms.primary}\n---\n\n# ${pitch.title}\n\n**Thesis:** ${pitch.thesis}\n\n**Brief:** ${pitch.brief}\n\n${pitch.angle ? `**Angle:** ${pitch.angle}\n\n` : ""}**Evidence:**\n${pitch.evidence.map(e => `- ${e}`).join("\n")}\n\n**Urgency:** ${pitch.urgency}\n\n**Adaptations:**\n${pitch.platforms.adaptations.map(a => `- ${a}`).join("\n")}\n\n${pitch.wordCount ? `**Target:** ~${pitch.wordCount} words` : ""}`}
            label="Copy for Atlas"
          />
          <button
            onClick={() => { onDeliberate(`I want to develop this content pitch:\n\n"${pitch.title}"\n\nThesis: ${pitch.thesis}\n\nHelp me think through the argument structure, key points, and how to make it distinctive.`); onClose() }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", ...TYPE.sm, cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
          >
            <ArrowUpRight size={12} />
            Develop in Cerebro
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── DispatchView ───────────────────────────────────────────────────────────

const DISPATCH_STATUSES = [
  "$ dispatch --weekly",
  "▸ loading 7-day article history",
  "▸ scoring multi-layer convergences",
  "▸ identifying publishable angles",
  "▸ generating content briefs",
]

let _cachedDispatch: DispatchData | null = null

export function DispatchView({ onDeliberate }: { onDeliberate: (text: string) => void }) {
  const [data, setData] = useState<DispatchData | null>(_cachedDispatch)
  const [loading, setLoading] = useState(!_cachedDispatch)
  const [statusIdx, setStatusIdx] = useState(0)
  const [activePitch, setActivePitch] = useState<Pitch | null>(null)

  useEffect(() => {
    if (_cachedDispatch) return
    setStatusIdx(0)
    const t = setInterval(() => setStatusIdx(i => Math.min(i + 1, DISPATCH_STATUSES.length - 1)), 1800)
    fetch("/api/dispatch")
      .then(r => r.json())
      .then(d => { setData(d); _cachedDispatch = d; setLoading(false); clearInterval(t) })
      .catch(() => { setLoading(false); clearInterval(t) })
    return () => clearInterval(t)
  }, [])

  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-primary)" }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, height: 40, display: "flex", alignItems: "center",
        padding: "0 20px", borderBottom: "1px solid var(--border)",
      }}>
        <span style={{ ...TYPE.sm, fontFamily: MONO, color: "var(--accent-muted)", textTransform: "uppercase" }}>
          Dispatch
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ padding: "32px 20px" }}>
            {DISPATCH_STATUSES.slice(0, statusIdx + 1).map((line, idx) => (
              <div
                key={idx}
                style={{
                  ...TYPE.sm, fontFamily: MONO,
                  color: idx === statusIdx ? "var(--accent-muted)" : "var(--text-tertiary)",
                  opacity: idx === statusIdx ? 1 : 0.5,
                  animation: idx === statusIdx ? "status-fade 0.2s ease both" : "none",
                  marginBottom: 4,
                }}
              >
                {line}{idx === statusIdx && idx < DISPATCH_STATUSES.length - 1 && <span className="cursor-blink" style={{ marginLeft: 2 }}>_</span>}
                {idx === statusIdx && idx === DISPATCH_STATUSES.length - 1 && <span className="loading-pulse" style={{ marginLeft: 4, ...TYPE.xs, opacity: 0.6 }}>...</span>}
              </div>
            ))}
          </div>
        )}

        {/* ── Content ── */}
        {!loading && data && (
          <div style={{ padding: "0 0 48px" }}>

            {/* ─ Header image ─ */}
            {data.headerImageUrl && (
              <div style={{
                height: 200, overflow: "hidden",
                animation: "signal-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
              }}>
                <img src={data.headerImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}

            {/* ─ WEEK SUMMARY — editorial lead ─ */}
            <div style={{
              padding: "40px 20px 36px",
              borderBottom: "1px solid var(--border)",
              animation: "signal-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}>
              <div style={{
                fontSize: 17,
                fontWeight: 400,
                color: "var(--text-primary)",
                lineHeight: 1.75,
                maxWidth: 580,
                letterSpacing: "-0.01em",
              }}>
                {data.message || data.weekSummary || "Weekly intelligence brief and content pitches."}
              </div>
              {data.articleCount && data.generatedAt && (
                <div style={{ ...metaStyle, marginTop: 14 }}>
                  {data.articleCount} articles · {new Date(data.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
              )}
            </div>

            {/* ─ PITCHES — editorial grid ─ */}
            {data.pitches && data.pitches.length > 0 && (
              <div style={{
                animation: "signal-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) 150ms both",
              }}>
                {data.pitches.map((pitch, i) => (
                  <div
                    key={i}
                    onClick={() => setActivePitch(pitch)}
                    style={{
                      padding: "28px 20px",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      transition: "background 0.15s",
                      animation: `signal-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${200 + i * 80}ms both`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-surface)" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                  >
                    <div style={{ display: "flex", gap: 20 }}>
                      {/* Image thumbnail — left side */}
                      <div style={{
                        width: 140, height: 100, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                        background: pitch.imageUrl ? "transparent" : `linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)`,
                      }}>
                        {pitch.imageUrl && (
                          <img src={pitch.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                      </div>
                      {/* Text content — right side */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Mode + platform indicator */}
                        <div style={{
                          ...TYPE.xs, textTransform: "uppercase", letterSpacing: "0.06em",
                          fontWeight: 600, marginBottom: 8,
                        }}>
                          <span style={{ color: pitch.mode === "thought_leadership" ? "#5A9EB0" : "#C87A6A" }}>
                            {pitch.mode === "thought_leadership" ? "Thought Leadership" : "Creative"}
                          </span>
                          <span style={{ color: "var(--text-tertiary)", margin: "0 6px" }}>·</span>
                          <span style={{ color: "var(--text-primary)" }}>{pitch.platforms.primary}</span>
                        </div>
                        {/* Title */}
                        <div style={{
                          ...TYPE.heading,
                          color: "var(--text-primary)",
                          marginBottom: 6,
                        }}>
                          {pitch.title}
                        </div>
                        {/* Thesis */}
                        <div style={{
                          ...TYPE.body,
                          color: "var(--text-secondary)",
                          lineHeight: 1.7,
                          marginBottom: pitch.evidence?.length > 0 ? 8 : 0,
                        }}>
                          {pitch.thesis}
                        </div>
                        {/* Evidence sources */}
                        {pitch.evidence && pitch.evidence.length > 0 && (
                          <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                            {pitch.evidence.slice(0, 2).map((e, ei) => (
                              <span key={ei}>
                                {ei > 0 && <span style={{ opacity: 0.4 }}> · </span>}
                                {e.length > 60 ? e.slice(0, 60) + "..." : e}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Copy all */}
                <div style={{ padding: "20px 20px" }}>
                  <CopyButton
                    text={`# Weekly Dispatch\n${data.weekSummary || ""}\n\n${data.pitches.map((p, i) => `## ${i + 1}. ${p.title}\n**Thesis:** ${p.thesis}\n**Mode:** ${p.mode}\n**Brief:** ${p.brief}\n**Platform:** ${p.platforms.primary}\n**Urgency:** ${p.urgency}\n`).join("\n")}`}
                    label="Copy all pitches"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !data?.pitches?.length && !data?.message && !data?.weekSummary && (
          <div style={{ padding: "48px 20px", maxWidth: 520 }}>
            <div style={{ ...TYPE.body, color: "var(--text-tertiary)", lineHeight: 1.8 }}>
              Content pitches will appear after the weekly intelligence brief generates.
            </div>
          </div>
        )}
      </div>

      {/* Pitch overlay */}
      {activePitch && (
        <PitchOverlay pitch={activePitch} onClose={() => setActivePitch(null)} onDeliberate={onDeliberate} />
      )}
    </main>
  )
}
