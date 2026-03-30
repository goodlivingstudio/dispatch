"use client"

import { useState, useMemo } from "react"
import { ArrowUpRight } from "lucide-react"
import type { Article } from "@/lib/types"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SynthesisViewProps {
  articles: Article[]
  onDeliberate: (text: string) => void
}

type LayerKey = "opportunity" | "position" | "discipline" | "landscape" | "culture"

const LAYER_COLORS: Record<LayerKey, string> = {
  opportunity: "#C8955A",
  position: "#60A5FA",
  discipline: "#4ade80",
  landscape: "#A78BFA",
  culture: "#f87171",
}

const LAYER_LABELS: Record<LayerKey, string> = {
  opportunity: "Opportunity",
  position: "Position",
  discipline: "Discipline",
  landscape: "Landscape",
  culture: "Culture",
}

const ALL_LAYERS: LayerKey[] = ["opportunity", "position", "discipline", "landscape", "culture"]

// ─── Shared styles ──────────────────────────────────────────────────────────

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontFamily: "'SF Mono', 'Fira Code', monospace",
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 6,
}

const bodyStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--text-secondary)",
  lineHeight: 1.6,
}

const headingStyle: React.CSSProperties = {
  fontSize: 15,
  color: "var(--text-primary)",
  fontWeight: 600,
}

const cardBase: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "none",
  borderRadius: 14,
  padding: 24,
  cursor: "pointer",
  transition: "transform 0.15s, box-shadow 0.15s",
}

const pillStyle: React.CSSProperties = {
  fontSize: 9,
  fontFamily: "'SF Mono', 'Fira Code', monospace",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  padding: "2px 7px",
  borderRadius: 3,
  background: "var(--bg-elevated)",
  fontWeight: 600,
}

const bumpButtonStyle: React.CSSProperties = {
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
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function countByLayer(articles: Article[]): Record<LayerKey, number> {
  const counts: Record<LayerKey, number> = { opportunity: 0, position: 0, discipline: 0, landscape: 0, culture: 0 }
  for (const a of articles) {
    const tag = a.tag?.toLowerCase() as LayerKey
    if (tag && tag in counts) counts[tag]++
  }
  return counts
}

interface DerivedPattern {
  id: string
  layers: LayerKey[]
  title: string
  description: string
  articles: Article[]
  signalCount: number
}

function derivePatterns(articles: Article[]): DerivedPattern[] {
  // Group articles by source
  const bySource: Record<string, Article[]> = {}
  for (const a of articles) {
    if (!bySource[a.source]) bySource[a.source] = []
    bySource[a.source].push(a)
  }

  // Group articles by tag
  const byTag: Record<string, Article[]> = {}
  for (const a of articles) {
    const tag = a.tag?.toLowerCase()
    if (tag) {
      if (!byTag[tag]) byTag[tag] = []
      byTag[tag].push(a)
    }
  }

  // Find tag combinations that have articles from multiple sources
  const tagPairs: [LayerKey, LayerKey][] = []
  const layerKeys = ALL_LAYERS.filter(k => (byTag[k]?.length || 0) > 0)
  for (let i = 0; i < layerKeys.length; i++) {
    for (let j = i + 1; j < layerKeys.length; j++) {
      tagPairs.push([layerKeys[i], layerKeys[j]])
    }
  }

  const patterns: DerivedPattern[] = []

  // Create patterns from tag intersections
  const patternTemplates = [
    { layers: ["opportunity", "discipline"] as LayerKey[], title: "Strategic Craft Intersection", desc: "Opportunity signals overlap with discipline evolution, suggesting new roles require both strategic vision and technical depth." },
    { layers: ["position", "landscape"] as LayerKey[], title: "Market Position Shift", desc: "Leadership positioning intersects with industry landscape changes, indicating the terrain for career moves is shifting." },
    { layers: ["discipline", "culture"] as LayerKey[], title: "Craft Meets Culture", desc: "How teams work is changing alongside what they build. Cultural shifts are reshaping what design leadership means in practice." },
    { layers: ["opportunity", "landscape"] as LayerKey[], title: "Emerging Terrain", desc: "New opportunities are emerging from landscape-level shifts. Early movers who read these signals will have positioning advantage." },
  ]

  for (const tmpl of patternTemplates) {
    const matchingArticles = articles.filter(a => {
      const tag = a.tag?.toLowerCase() as LayerKey
      return tmpl.layers.includes(tag)
    })
    if (matchingArticles.length > 0) {
      // Check if multiple sources contribute
      const sources = new Set(matchingArticles.map(a => a.source))
      patterns.push({
        id: tmpl.title.toLowerCase().replace(/\s+/g, "-"),
        layers: tmpl.layers.filter(l => (byTag[l]?.length || 0) > 0),
        title: tmpl.title,
        description: tmpl.desc,
        articles: matchingArticles.slice(0, 8),
        signalCount: matchingArticles.length,
      })
    }
  }

  // Ensure at least 4 patterns, fill from remaining layer combos
  if (patterns.length < 4) {
    for (const pair of tagPairs) {
      if (patterns.length >= 4) break
      if (patterns.some(p => p.layers[0] === pair[0] && p.layers[1] === pair[1])) continue
      const matchingArticles = articles.filter(a => {
        const tag = a.tag?.toLowerCase() as LayerKey
        return pair.includes(tag)
      })
      if (matchingArticles.length > 0) {
        patterns.push({
          id: `${pair[0]}-${pair[1]}`,
          layers: pair,
          title: `${LAYER_LABELS[pair[0]]} \u00d7 ${LAYER_LABELS[pair[1]]}`,
          description: `Signals across ${LAYER_LABELS[pair[0]].toLowerCase()} and ${LAYER_LABELS[pair[1]].toLowerCase()} suggest an emerging pattern worth monitoring.`,
          articles: matchingArticles.slice(0, 8),
          signalCount: matchingArticles.length,
        })
      }
    }
  }

  return patterns.slice(0, 4)
}

function findBlindSpots(layerCounts: Record<LayerKey, number>): { layer: LayerKey; count: number; note: string }[] {
  const sorted = ALL_LAYERS.map(l => ({ layer: l, count: layerCounts[l] })).sort((a, b) => a.count - b.count)
  const spots: { layer: LayerKey; count: number; note: string }[] = []
  for (const s of sorted) {
    if (s.count === 0) {
      spots.push({ ...s, note: "No signals detected" })
    } else if (s.count <= 2) {
      spots.push({ ...s, note: `Only ${s.count} signal${s.count === 1 ? "" : "s"} \u2014 may be under-covered` })
    }
    if (spots.length >= 3) break
  }
  return spots
}

// ─── Modal ──────────────────────────────────────────────────────────────────

function SynthesisModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: "var(--bg-surface)", borderRadius: 16,
        border: "none", width: "80vw", maxWidth: 800,
        maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 28px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <span style={{ ...sectionLabelStyle, marginBottom: 0 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "4px 8px", borderRadius: 4 }}>&times;</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── BUMP Button ────────────────────────────────────────────────────────────

function BumpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      style={bumpButtonStyle}
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
      BUMP to Cerebro <ArrowUpRight size={11} />
    </button>
  )
}

// ─── Layer Dot ──────────────────────────────────────────────────────────────

function LayerDot({ layer, size = 7 }: { layer: LayerKey; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: "50%", background: LAYER_COLORS[layer], flexShrink: 0, display: "inline-block" }} />
}

// ─── Layer Badge Pill ───────────────────────────────────────────────────────

function LayerPill({ layer }: { layer: LayerKey }) {
  return (
    <span style={{ ...pillStyle, color: "var(--text-secondary)" }}>
      {LAYER_LABELS[layer]}
    </span>
  )
}

// ─── Contributing Signals Drawer ─────────────────────────────────────────────

function ContributingSignalsDrawer({ articles }: { articles: Article[] }) {
  const [open, setOpen] = useState(false)

  if (articles.length === 0) {
    return (
      <div style={bodyStyle}>No specific articles mapped yet.</div>
    )
  }

  return (
    <div>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        style={{
          ...sectionLabelStyle,
          background: "transparent", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4,
          padding: "4px 8px", borderRadius: 6,
          marginBottom: open ? 12 : 0, transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-secondary)" }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)" }}
      >
        Contributing Signals ({articles.length})
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {articles.map(a => {
            const isExternal = a.url && a.url !== "#"
            const inner = (
              <div
                key={a.id}
                style={{
                  padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 8,
                  cursor: isExternal ? "pointer" : "default",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (isExternal) e.currentTarget.style.background = "var(--bg-surface)" }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
              >
                {/* Eyebrow */}
                <div style={{
                  fontSize: 11, fontFamily: "'SF Mono', 'Fira Code', monospace",
                  color: "var(--text-tertiary)", letterSpacing: "-0.01em", marginBottom: 4,
                }}>
                  {a.source} · {a.category} · {new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                {/* Headline */}
                <div style={{
                  fontSize: 13, fontWeight: 550, color: "var(--text-primary)",
                  lineHeight: 1.4, letterSpacing: "-0.01em",
                }}>
                  {a.title}
                </div>
              </div>
            )
            if (isExternal) {
              return (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }} onClick={e => e.stopPropagation()}>
                  {inner}
                </a>
              )
            }
            return inner
          })}
        </div>
      )}
    </div>
  )
}

// ─── Unused — kept for future dataviz work ───────────────────────────────────
// LayerScatter and LayerLegend removed from render but retained in code

// eslint-disable-next-line @typescript-eslint/no-unused-vars

function LayerScatter({ layerCounts, size = 80 }: { layerCounts: Record<LayerKey, number>; size?: number }) {
  const total = Math.max(Object.values(layerCounts).reduce((a, b) => a + b, 0), 1)
  // Tight cluster — circles overlap heavily to create a Venn effect
  const positions = [
    { x: 0.50, y: 0.30 },  // opportunity — top center
    { x: 0.72, y: 0.42 },  // position — right
    { x: 0.64, y: 0.68 },  // discipline — bottom right
    { x: 0.36, y: 0.68 },  // landscape — bottom left
    { x: 0.28, y: 0.42 },  // culture — left
  ]
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {ALL_LAYERS.map((l, i) => {
        const proportion = layerCounts[l] / total
        // Larger base size + more proportional scaling for bigger, overlapping circles
        const r = Math.max(size * 0.14, proportion * size * 0.55)
        const cx = positions[i].x * size - r
        const cy = positions[i].y * size - r
        return (
          <div
            key={l}
            title={`${LAYER_LABELS[l]}: ${layerCounts[l]}`}
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              background: LAYER_COLORS[l],
              opacity: layerCounts[l] === 0 ? 0.08 : 0.2,
              transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Layer Legend — dot + label (never colored type) ─────────────────────────

function LayerLegend({ layerCounts }: { layerCounts: Record<LayerKey, number> }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {ALL_LAYERS.map(l => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: LAYER_COLORS[l], flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {LAYER_LABELS[l]}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
            {layerCounts[l]}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Synthesis View ─────────────────────────────────────────────────────────

export function SynthesisView({ articles, onDeliberate }: SynthesisViewProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const layerCounts = useMemo(() => countByLayer(articles), [articles])
  const patterns = useMemo(() => derivePatterns(articles), [articles])
  const blindSpots = useMemo(() => findBlindSpots(layerCounts), [layerCounts])

  const stats = useMemo(() => {
    const today = new Date()
    return {
      date: today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
      count: articles.length,
    }
  }, [articles])

  const provocationText = "What if the strongest signal this week isn\u2019t in your feed at all \u2014 but in what\u2019s conspicuously absent from it?"

  function cardHoverStyle(id: string): React.CSSProperties {
    return hoveredCard === id
      ? { transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }
      : {}
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px", background: "var(--bg-primary)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Module 1: Current Briefing ────────────────────────────────── */}
        <div
          style={{ ...cardBase,  ...cardHoverStyle("briefing") }}
          onMouseEnter={() => setHoveredCard("briefing")}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => setActiveModal("briefing")}
        >
          <div style={sectionLabelStyle}>Current Briefing</div>
          <div style={{ ...bodyStyle, fontSize: 14 }}>
            Intelligence briefing will appear here when the annotation engine is active. This view synthesizes patterns across all five layers — Opportunity, Position, Discipline, Landscape, and Culture — to surface the single most important insight for your mandate right now.
          </div>
        </div>

        {/* ── Module 2: Convergence Patterns ────────────────────────────── */}
        <div>
          <div style={{ ...sectionLabelStyle, marginBottom: 10, paddingLeft: 2 }}>Convergence Patterns</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {patterns.map((pattern, i) => (
              <div
                key={pattern.id}
                style={{ ...cardBase, ...cardHoverStyle(`pattern-${i}`) }}
                onMouseEnter={() => setHoveredCard(`pattern-${i}`)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => setActiveModal(`pattern-${i}`)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                    {pattern.layers.map(l => LAYER_LABELS[l]).join(" · ")} · {pattern.signalCount} signals
                  </span>
                </div>
                <div style={{ ...headingStyle, marginBottom: 6 }}>{pattern.title}</div>
                <div style={{ ...bodyStyle, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {pattern.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Module 3: Blind Spots + Cerebro ───────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* Blind Spots */}
          <div
            style={{ ...cardBase, ...cardHoverStyle("blindspots") }}
            onMouseEnter={() => setHoveredCard("blindspots")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => setActiveModal("blindspots")}
          >
            <div style={sectionLabelStyle}>Blind Spots</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 14 }}>Layers trending cold</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {blindSpots.length === 0 ? (
                <div style={bodyStyle}>All layers have healthy coverage.</div>
              ) : (
                blindSpots.map(s => (
                  <div key={s.layer} style={{ ...bodyStyle }}>
                    <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{LAYER_LABELS[s.layer]}</strong>
                    {" "}&mdash; {s.note}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cerebro */}
          <div
            style={{ ...cardBase,  display: "flex", flexDirection: "column", ...cardHoverStyle("cerebro") }}
            onMouseEnter={() => setHoveredCard("cerebro")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => setActiveModal("cerebro")}
          >
            <div style={sectionLabelStyle}>Cerebro Suggests</div>
            <div style={{ flex: 1, fontSize: 14, fontStyle: "italic", color: "var(--accent-secondary)", lineHeight: 1.6, letterSpacing: "-0.005em", marginBottom: 16 }}>
              {provocationText}
            </div>
            <BumpButton onClick={() => onDeliberate(provocationText)} />
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {activeModal === "briefing" && (
        <SynthesisModal title="Current Briefing" onClose={() => setActiveModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Heading */}
            <div style={{ ...headingStyle, fontSize: 20, marginBottom: 8 }}>
              Daily Intelligence Surface
            </div>

            {/* Opening */}
            <div style={{ ...bodyStyle, fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
              Intelligence briefing will appear here when the annotation engine is active. This view synthesizes patterns across all five layers — Opportunity, Position, Discipline, Landscape, and Culture — to surface the single most important insight for your mandate right now.
            </div>

            {/* Trending */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, marginBottom: 28 }}>
              <div style={sectionLabelStyle}>Trending</div>
              <div style={{ ...bodyStyle, marginTop: 10 }}>
                {patterns.length > 0
                  ? `${patterns.length} convergence patterns detected. Strongest: "${patterns[0]?.title}" spanning ${patterns[0]?.layers.length} layers with ${patterns[0]?.signalCount} signals.`
                  : "No convergence patterns detected yet. Feed more signals to surface cross-layer themes."}
              </div>
            </div>

            {/* What to Watch */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, marginBottom: 28 }}>
              <div style={sectionLabelStyle}>What to Watch</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                {blindSpots.length > 0 ? blindSpots.map(s => (
                  <div key={s.layer} style={{ ...bodyStyle }}>
                    <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{LAYER_LABELS[s.layer]}</strong> — {s.note}
                  </div>
                )) : (
                  <div style={bodyStyle}>All layers show healthy coverage. Focus on convergence patterns for actionable insight.</div>
                )}
              </div>
            </div>

            {/* Bump */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
              <BumpButton onClick={() => { onDeliberate("Briefing: What is the single most important insight across all five layers today?"); setActiveModal(null) }} />
            </div>
          </div>
        </SynthesisModal>
      )}

      {patterns.map((pattern, i) =>
        activeModal === `pattern-${i}` ? (
          <SynthesisModal key={pattern.id} title="Convergence Pattern" onClose={() => setActiveModal(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  {pattern.layers.map(l => <LayerPill key={l} layer={l} />)}
                </div>
                <div style={{ ...headingStyle, fontSize: 18, marginBottom: 8 }}>{pattern.title}</div>
                <div style={{ ...bodyStyle, fontSize: 14, lineHeight: 1.7 }}>{pattern.description}</div>
              </div>

              <div>
                <div style={sectionLabelStyle}>Strategic Implication</div>
                <div style={{ ...bodyStyle, marginTop: 8, fontStyle: "italic" }}>
                  This convergence pattern suggests a developing theme that crosses traditional boundaries. When AI synthesis is active, this section will contain a strategic interpretation of how these signals relate to your mandate and what action they might warrant.
                </div>
              </div>

              <ContributingSignalsDrawer articles={pattern.articles} />

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
                <BumpButton onClick={() => { onDeliberate(`Pattern: ${pattern.title} \u2014 ${pattern.description}`); setActiveModal(null) }} />
              </div>
            </div>
          </SynthesisModal>
        ) : null
      )}

      {activeModal === "blindspots" && (
        <SynthesisModal title="Blind Spots" onClose={() => setActiveModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={bodyStyle}>
              Layers with low or no signal coverage may represent gaps in your intelligence feed. These blind spots could mean your sources aren&apos;t covering these areas, or that genuine silence exists in the market.
            </div>
            {blindSpots.length === 0 ? (
              <div style={{ ...bodyStyle, fontStyle: "italic" }}>All layers show adequate signal density. No blind spots detected.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {blindSpots.map(s => (
                  <div key={s.layer} style={{ padding: "14px 16px", background: "var(--bg-elevated)", borderRadius: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ ...headingStyle, fontSize: 14 }}>{LAYER_LABELS[s.layer]}</span>
                      <span style={{ ...pillStyle, color: "var(--text-tertiary)" }}>{s.count} signals</span>
                    </div>
                    <div style={bodyStyle}>
                      {s.count === 0
                        ? `No signals detected in the ${LAYER_LABELS[s.layer].toLowerCase()} layer. This could indicate a sourcing gap or genuine market silence. Consider adding sources that cover this domain.`
                        : `Only ${s.count} signal${s.count === 1 ? "" : "s"} detected. The ${LAYER_LABELS[s.layer].toLowerCase()} layer may be under-represented in your current feed configuration.`
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div>
              <div style={sectionLabelStyle}>Full Layer Coverage</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                {ALL_LAYERS.map(l => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <LayerDot layer={l} />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 80 }}>{LAYER_LABELS[l]}</span>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "'SF Mono', 'Fira Code', monospace" }}>{layerCounts[l]} articles</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SynthesisModal>
      )}

      {activeModal === "cerebro" && (
        <SynthesisModal title="Cerebro Suggests" onClose={() => setActiveModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ fontSize: 16, fontStyle: "italic", color: "var(--accent-secondary)", lineHeight: 1.7 }}>
              {provocationText}
            </div>
            <div style={bodyStyle}>
              Cerebro generates provocations designed to push your thinking beyond the signals in your feed. These are not conclusions &mdash; they are deliberate destabilizations meant to surface assumptions and blind spots in your current mental model.
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
              <BumpButton onClick={() => { onDeliberate(provocationText); setActiveModal(null) }} />
            </div>
          </div>
        </SynthesisModal>
      )}
    </main>
  )
}
