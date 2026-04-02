"use client"

import { useState, useEffect } from "react"
import { Copy, Check, ArrowUpRight } from "lucide-react"
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
  urgency: string
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

function PitchCard({ pitch, index, onDeliberate }: { pitch: Pitch; index: number; onDeliberate: (text: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const pitchMarkdown = `# ${pitch.title}\n\n**Thesis:** ${pitch.thesis}\n\n**Brief:** ${pitch.brief}\n\n**Platform:** ${pitch.platforms.primary}\n**Adaptations:**\n${pitch.platforms.adaptations.map(a => `- ${a}`).join("\n")}\n\n**Evidence:**\n${pitch.evidence.map(e => `- ${e}`).join("\n")}\n\n**Urgency:** ${pitch.urgency}`

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
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{
          ...TYPE.xs,
          textTransform: "uppercase",
          padding: "2px 8px",
          borderRadius: 4,
          background: pitch.mode === "thought_leadership" ? "rgba(90, 158, 176, 0.15)" : "rgba(200, 122, 106, 0.15)",
          color: pitch.mode === "thought_leadership" ? "#5A9EB0" : "#C87A6A",
          fontWeight: 500,
        }}>
          {pitch.mode === "thought_leadership" ? "Thought Leadership" : "Creative"}
        </span>
        {pitch.layers.map(l => (
          <span key={l} style={{
            ...TYPE.xs,
            color: LAYER_DOT[l] || "var(--text-tertiary)",
            textTransform: "uppercase",
          }}>
            {l.slice(0, 3)}
          </span>
        ))}
      </div>

      {/* Title */}
      <div style={{ ...TYPE.heading, color: "var(--text-primary)", marginBottom: 6 }}>
        {pitch.title}
      </div>

      {/* Thesis */}
      <div style={{ ...bodyStyle, marginBottom: expanded ? 16 : 0 }}>
        {pitch.thesis}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ animation: "signal-reveal 0.3s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
          {/* Brief */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 16 }}>
            <div style={{ ...metaStyle, textTransform: "uppercase", marginBottom: 6 }}>Brief</div>
            <div style={{ ...TYPE.body, color: "var(--text-secondary)", lineHeight: 1.7 }}>{pitch.brief}</div>
          </div>

          {/* Platform */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...metaStyle, textTransform: "uppercase", marginBottom: 6 }}>Platform</div>
            <div style={{ ...TYPE.body, color: "var(--text-primary)", fontWeight: 500, marginBottom: 4 }}>{pitch.platforms.primary}</div>
            {pitch.platforms.adaptations.map((a, i) => (
              <div key={i} style={{ ...TYPE.body, color: "var(--text-tertiary)", paddingLeft: 12 }}>
                {a}
              </div>
            ))}
          </div>

          {/* Evidence */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...metaStyle, textTransform: "uppercase", marginBottom: 6 }}>Supporting Signals</div>
            {pitch.evidence.map((e, i) => (
              <div key={i} style={{ ...TYPE.body, color: "var(--text-secondary)", marginBottom: 4, paddingLeft: 12 }}>
                {e}
              </div>
            ))}
          </div>

          {/* Urgency */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...metaStyle, textTransform: "uppercase", marginBottom: 6 }}>Why Now</div>
            <div style={{ ...TYPE.body, color: "var(--accent-muted)" }}>{pitch.urgency}</div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <CopyButton text={pitchMarkdown} label="Copy brief" />
            <button
              onClick={e => {
                e.stopPropagation()
                onDeliberate(`I want to develop this content pitch:\n\n"${pitch.title}"\n\nThesis: ${pitch.thesis}\n\nHelp me think through the argument structure, key points, and how to make it distinctive. What angle would make this piece stand out?`)
              }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 6,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--accent-secondary)",
                ...TYPE.sm, cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <ArrowUpRight size={12} />
              Develop in Cerebro
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DispatchView ───────────────────────────────────────────────────────────

export function DispatchView({ onDeliberate }: { onDeliberate: (text: string) => void }) {
  const [data, setData] = useState<DispatchData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dispatch")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <main className="view-padding" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: "var(--bg-primary)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ animation: "signal-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
          <div style={{ ...sectionLabel, fontFamily: MONO }}>Dispatch</div>
          <div style={{ ...bodyStyle, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
            {loading ? (
              <span className="loading-pulse">Analyzing the week&apos;s signal to generate content pitches...</span>
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
              <PitchCard key={i} pitch={pitch} index={i} onDeliberate={onDeliberate} />
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
    </main>
  )
}
