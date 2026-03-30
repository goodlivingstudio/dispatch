"use client"

import { useMemo } from "react"
import type { Article } from "@/lib/types"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SynthesisViewProps {
  articles: Article[]
  onDeliberate: (text: string) => void
}

// ─── Layer badge pill ────────────────────────────────────────────────────────

const LAYER_PILL_COLORS: Record<string, string> = {
  OPP: "var(--accent-secondary)",
  POS: "var(--accent-muted)",
  DIS: "var(--text-secondary)",
  LND: "var(--text-tertiary)",
  CUL: "var(--accent-muted)",
}

function LayerBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: "2px 6px",
        borderRadius: 3,
        background: "var(--bg-elevated)",
        color: LAYER_PILL_COLORS[label] || "var(--text-tertiary)",
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  )
}

// ─── Section label ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  )
}

// ─── Placeholder convergence patterns ────────────────────────────────────────

const PLACEHOLDER_PATTERNS = [
  {
    layers: ["OPP", "DIS", "LND"],
    title: "Pharma \u00d7 AI Infrastructure",
    description:
      "Multiple signals point to pharmaceutical companies building internal AI platforms rather than buying. Design leadership in this space requires understanding both regulatory constraint and technical architecture \u2014 a rare intersection where your background applies directly.",
  },
  {
    layers: ["POS", "DIS"],
    title: "Design Leadership \u2192 Product Leadership",
    description:
      "The role boundary between design and product continues to blur at the VP/SVP level. Signals suggest organizations are consolidating these functions under leaders who can hold both craft and business outcomes.",
  },
  {
    layers: ["DIS", "LND"],
    title: "Design Engineering Convergence",
    description:
      "Frontend tooling and design systems are merging. Companies hiring for design leadership increasingly expect fluency in implementation, not just specification.",
  },
  {
    layers: ["OPP", "LND"],
    title: "Pharma Regulatory \u00d7 AI Accountability",
    description:
      "FDA guidance on AI/ML in drug development mirrors emerging AI accountability frameworks. Organizations navigating both need design leaders who can translate regulatory complexity into user-facing clarity.",
  },
]

// ─── Synthesis View ──────────────────────────────────────────────────────────

export function SynthesisView({ articles, onDeliberate }: SynthesisViewProps) {
  const stats = useMemo(() => {
    const sources = new Set(articles.map(a => a.source))
    const today = new Date()
    const dateStr = today.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    return {
      date: dateStr,
      signalCount: articles.length,
      sourceCount: sources.size,
    }
  }, [articles])

  const provocationText =
    "What if the strongest signal this week isn\u2019t in your feed at all \u2014 but in what\u2019s conspicuously absent from it?"

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "28px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* ── Module 1: Current Briefing ──────────────────────────────────── */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          borderLeft: "3px solid var(--accent-secondary)",
          padding: 28,
        }}
      >
        <SectionLabel>Current Briefing</SectionLabel>
        <div
          style={{
            fontSize: 12,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            color: "var(--text-tertiary)",
            letterSpacing: "0.01em",
            marginBottom: 14,
          }}
        >
          {stats.date} &middot; {stats.signalCount} signals &middot;{" "}
          {stats.sourceCount} sources
        </div>
        <div
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            letterSpacing: "-0.005em",
          }}
        >
          Intelligence briefing will appear here when the annotation engine is
          active. This view synthesizes patterns across all five layers &mdash;
          Opportunity, Position, Discipline, Landscape, and Culture &mdash; to
          surface the single most important insight for your mandate right now.
        </div>
      </div>

      {/* ── Module 2: Convergence Patterns ──────────────────────────────── */}
      <div>
        <SectionLabel>Convergence Patterns</SectionLabel>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            marginBottom: 12,
          }}
        >
          Themes emerging across 2+ layers
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {PLACEHOLDER_PATTERNS.map((pattern, i) => (
            <div
              key={i}
              style={{
                gridColumn: i === 0 ? "1 / -1" : undefined,
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "18px 20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 5,
                  marginBottom: 10,
                  flexWrap: "wrap",
                }}
              >
                {pattern.layers.map(l => (
                  <LayerBadge key={l} label={l} />
                ))}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: 6,
                  letterSpacing: "-0.01em",
                }}
              >
                {pattern.title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  letterSpacing: "-0.005em",
                }}
              >
                {pattern.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Module 3: Blind Spots + Cerebro Provocation ─────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        {/* Blind Spots */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <SectionLabel>Blind Spots</SectionLabel>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              marginBottom: 14,
            }}
          >
            Layers trending cold
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--accent-muted)",
                  flexShrink: 0,
                  marginTop: 5,
                }}
              />
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  Culture
                </strong>{" "}
                &mdash; quiet for 3 days
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--text-tertiary)",
                  flexShrink: 0,
                  marginTop: 5,
                }}
              />
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  Position
                </strong>{" "}
                &mdash; no new leadership signals in 48h
              </div>
            </div>
          </div>
        </div>

        {/* Cerebro Provocation */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            borderLeft: "3px solid var(--accent-secondary)",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <SectionLabel>Cerebro Suggests</SectionLabel>
          <div
            style={{
              flex: 1,
              fontSize: 14,
              fontStyle: "italic",
              color: "var(--accent-secondary)",
              lineHeight: 1.6,
              letterSpacing: "-0.005em",
              marginBottom: 16,
            }}
          >
            {provocationText}
          </div>
          <button
            onClick={() => onDeliberate(provocationText)}
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 12px",
              borderRadius: 7,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 10,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--accent-secondary)"
              e.currentTarget.style.color = "var(--accent-secondary)"
              e.currentTarget.style.background = "var(--bg-elevated)"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)"
              e.currentTarget.style.color = "var(--text-secondary)"
              e.currentTarget.style.background = "transparent"
            }}
          >
            BUMP to Cerebro
          </button>
        </div>
      </div>
    </div>
  )
}
