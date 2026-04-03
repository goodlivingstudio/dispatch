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
}

interface DispatchData {
  available: boolean
  weekSummary: string | null
  pitches: Pitch[]
  articleCount?: number
  generatedAt?: string
  message?: string
}

// ─── Shared styles ──────────────────────────────────────────────────────────

const cardBase: React.CSSProperties = {
  background: "var(--bg-surface)",
  borderRadius: 14,
  padding: 24,
  transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
}

const sectionLabel: React.CSSProperties = {
  ...labelStyle,
  marginBottom: 16,
  paddingLeft: 2,
}

const LAYER_DOT: Record<string, string> = {
  opportunity: "#D4A05A",
  position: "#5A9EB0",
  discipline: "#7BAF6A",
  landscape: "#9A85B8",
  culture: "#C87A6A",
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

// ─── Pitch Card ─────────────────────────────────────────────────────────────

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
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ ...TYPE.xs, textTransform: "uppercase", padding: "2px 8px", borderRadius: 4, background: pitch.mode === "thought_leadership" ? "rgba(90, 158, 176, 0.15)" : "rgba(200, 122, 106, 0.15)", color: pitch.mode === "thought_leadership" ? "#5A9EB0" : "#C87A6A", fontWeight: 500 }}>
              {pitch.mode === "thought_leadership" ? "Thought Leadership" : "Creative"}
            </span>
            {pitch.layers.map(l => (
              <span key={l} style={{ ...TYPE.xs, color: LAYER_DOT[l] || "var(--text-tertiary)", textTransform: "uppercase" }}>{l.slice(0, 3)}</span>
            ))}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer", transition: "color 0.15s", padding: 0 }} onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)" }} onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)" }}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ ...TYPE.heading, color: "var(--text-primary)", marginBottom: 8, fontSize: 18 }}>{pitch.title}</div>
        <div style={{ ...bodyStyle, marginBottom: 24 }}>{pitch.thesis}</div>

        <div style={{ height: 1, background: "var(--border)", marginBottom: 24 }} />

        <div style={{ marginBottom: 24 }}>
          <div style={{ ...metaStyle, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Brief</div>
          <div style={{ ...TYPE.body, color: "var(--text-secondary)", lineHeight: 1.7 }}>{pitch.brief}</div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ ...metaStyle, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Platform</div>
          <div style={{ ...TYPE.body, color: "var(--text-primary)", fontWeight: 500, marginBottom: 6 }}>{pitch.platforms.primary}</div>
          {pitch.platforms.adaptations.map((a, i) => (
            <div key={i} style={{ ...TYPE.body, color: "var(--text-tertiary)", marginBottom: 4 }}>{a}</div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ ...metaStyle, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Supporting Signals</div>
          {pitch.evidence.map((e, i) => (
            <div key={i} style={{ ...TYPE.body, color: "var(--text-secondary)", marginBottom: 6 }}>{e}</div>
          ))}
        </div>

        {pitch.angle && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ ...metaStyle, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Author Angle</div>
            <div style={{ ...TYPE.body, color: "var(--text-secondary)", lineHeight: 1.7 }}>{pitch.angle}</div>
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <div style={{ ...metaStyle, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Why Now</div>
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
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", ...TYPE.sm, cursor: "pointer", transition: "all 0.15s" }}
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

// ─── Pitch Card (opens overlay) ─────────────────────────────────────────────

function PitchCard({ pitch, index, onClick }: { pitch: Pitch; index: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        ...cardBase,
        cursor: "pointer",
        transform: hovered ? "scale(1.01)" : "scale(1)",
        animation: `signal-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${200 + index * 120}ms both`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ ...TYPE.xs, textTransform: "uppercase", padding: "2px 8px", borderRadius: 4, background: pitch.mode === "thought_leadership" ? "rgba(90, 158, 176, 0.15)" : "rgba(200, 122, 106, 0.15)", color: pitch.mode === "thought_leadership" ? "#5A9EB0" : "#C87A6A", fontWeight: 500 }}>
          {pitch.mode === "thought_leadership" ? "Thought Leadership" : "Creative"}
        </span>
        {pitch.layers.map(l => (
          <span key={l} style={{ ...TYPE.xs, color: LAYER_DOT[l] || "var(--text-tertiary)", textTransform: "uppercase" }}>{l.slice(0, 3)}</span>
        ))}
      </div>
      <div style={{ ...TYPE.heading, color: "var(--text-primary)", marginBottom: 6 }}>{pitch.title}</div>
      <div style={{ ...bodyStyle }}>{pitch.thesis}</div>
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

// Module-level cache so tab switches don't re-fetch
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
      {/* Header bar — matches DCOS and Cerebro */}
      <div style={{
        flexShrink: 0, height: 40, display: "flex", alignItems: "center",
        padding: "0 20px", borderBottom: "1px solid var(--border)",
      }}>
        <span style={{ ...TYPE.sm, fontFamily: MONO, color: "var(--accent-muted)", textTransform: "uppercase" }}>
          Dispatch
        </span>
      </div>

      <div className="view-padding" style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Summary */}
        <div style={{ animation: "signal-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
          <div style={{ ...bodyStyle, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {DISPATCH_STATUSES.slice(0, statusIdx + 1).map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: 11, fontFamily: MONO,
                      color: idx === statusIdx ? "var(--accent-muted)" : "var(--text-tertiary)",
                      opacity: idx === statusIdx ? 1 : 0.5,
                      animation: idx === statusIdx ? "status-fade 0.2s ease both" : "none",
                    }}
                  >
                    {line}{idx === statusIdx && idx < DISPATCH_STATUSES.length - 1 && <span className="cursor-blink" style={{ marginLeft: 2 }}>_</span>}
                    {idx === statusIdx && idx === DISPATCH_STATUSES.length - 1 && <span className="loading-pulse" style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>…</span>}
                  </div>
                ))}
              </div>
            ) : data?.message ? (
              data.message
            ) : data?.weekSummary ? (
              data.weekSummary
            ) : (
              "Weekly intelligence brief and content pitches."
            )}
          </div>
          {data?.articleCount && data.generatedAt && (
            <div style={{ ...metaStyle, marginTop: 8 }}>
              Based on {data.articleCount} articles · Generated {new Date(data.generatedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Pitches */}
        {data?.pitches && data.pitches.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.pitches.map((pitch, i) => (
              <PitchCard key={i} pitch={pitch} index={i} onClick={() => setActivePitch(pitch)} />
            ))}
          </div>
        )}

        {/* Copy all */}
        {data?.pitches && data.pitches.length > 0 && (
          <div style={{ paddingTop: 8 }}>
            <CopyButton
              text={`# Weekly Dispatch\n${data.weekSummary || ""}\n\n${data.pitches.map((p, i) => `## ${i + 1}. ${p.title}\n**Thesis:** ${p.thesis}\n**Mode:** ${p.mode}\n**Brief:** ${p.brief}\n**Platform:** ${p.platforms.primary}\n**Urgency:** ${p.urgency}\n`).join("\n")}`}
              label="Copy all pitches (Markdown)"
            />
          </div>
        )}
      </div>
      </div>

      {/* Pitch overlay */}
      {activePitch && (
        <PitchOverlay pitch={activePitch} onClose={() => setActivePitch(null)} onDeliberate={onDeliberate} />
      )}
    </main>
  )
}
