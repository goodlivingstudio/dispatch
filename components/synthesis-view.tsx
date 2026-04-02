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

// Option E — Considered Contrast
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

const ALL_LAYERS: LayerKey[] = ["opportunity", "position", "discipline", "landscape", "culture"]

// ─── Shared styles — aligned to Dispatch DS ────────────────────────────────

// Section label: Geist Sans, accent color, uppercase
const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--accent-secondary)",
  textTransform: "uppercase",
  fontWeight: 500,
  marginBottom: 8,
}

// Synthesis body: Geist Sans 12px
const bodyStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-secondary)",
  lineHeight: 1.6,
}

// Heading: Geist Sans 15px, weight 500
const headingStyle: React.CSSProperties = {
  fontSize: 15,
  color: "var(--text-primary)",
  fontWeight: 500,
}

const cardBase: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "none",
  borderRadius: 14,
  padding: 24,
  cursor: "pointer",
  transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
}

const pillStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  padding: "2px 8px",
  borderRadius: 4,
  background: "var(--bg-elevated)",
  fontWeight: 500,
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
  const byTag: Record<string, Article[]> = {}
  for (const a of articles) {
    const tag = a.tag?.toLowerCase()
    if (tag) {
      if (!byTag[tag]) byTag[tag] = []
      byTag[tag].push(a)
    }
  }

  const layerKeys = ALL_LAYERS.filter(k => (byTag[k]?.length || 0) > 0)
  const tagPairs: [LayerKey, LayerKey][] = []
  for (let i = 0; i < layerKeys.length; i++) {
    for (let j = i + 1; j < layerKeys.length; j++) {
      tagPairs.push([layerKeys[i], layerKeys[j]])
    }
  }

  const patterns: DerivedPattern[] = []

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
        background: "var(--bg-surface)", borderRadius: 14,
        border: "none", width: "80vw", maxWidth: 800,
        maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <span style={{ ...sectionLabelStyle, marginBottom: 0 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "4px 8px", borderRadius: 4 }}>&times;</button>
        </div>
        <div className="view-padding" style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Bump Button — matches Buttons board ───────────────────────────────────

function BumpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: 8,
        border: "1px solid var(--border)", background: "transparent",
        color: "var(--text-secondary)", fontSize: 12,
        fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "var(--bg-elevated)"
        e.currentTarget.style.color = "var(--accent-secondary)"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "transparent"
        e.currentTarget.style.color = "var(--text-secondary)"
      }}
    >
      Bump <ArrowUpRight size={11} />
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
    return <div style={bodyStyle}>No specific articles mapped yet.</div>
  }

  return (
    <div>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        style={{
          ...sectionLabelStyle,
          background: "transparent", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4,
          padding: "4px 8px", borderRadius: 8,
          marginBottom: open ? 16 : 0, transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
      >
        Contributing Signals ({articles.length})
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {articles.map(a => {
            const isExternal = a.url && a.url !== "#"
            const inner = (
              <div
                key={a.id}
                style={{
                  padding: "8px 16px", background: "var(--bg-elevated)", borderRadius: 8,
                  cursor: isExternal ? "pointer" : "default", transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (isExternal) e.currentTarget.style.background = "var(--bg-surface)" }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
              >
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>
                  {a.source} · {a.category} · {new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4 }}>
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

// ─── Synthesis View ─────────────────────────────────────────────────────────

export function SynthesisView({ articles, onDeliberate }: SynthesisViewProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const layerCounts = useMemo(() => countByLayer(articles), [articles])
  const patterns = useMemo(() => derivePatterns(articles), [articles])
  const blindSpots = useMemo(() => findBlindSpots(layerCounts), [layerCounts])

  const provocations = [
    {
      label: "Challenge",
      text: "What if the strongest signal this week isn\u2019t in your feed at all \u2014 but in what\u2019s conspicuously absent from it?",
    },
    {
      label: "Opportunity",
      text: "Three pharma companies made infrastructure AI bets this week. How do you position design as the connective tissue between molecule, operations, and experience?",
    },
    {
      label: "Blind Spot",
      text: "Your Culture layer has been quiet for three days. Is that a sourcing gap or are you unconsciously deprioritizing taste while chasing positioning?",
    },
  ]

  function cardHoverStyle(id: string): React.CSSProperties {
    return hoveredCard === id ? { transform: "scale(1.015)" } : {}
  }

  return (
    <main className="view-padding" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: "var(--bg-primary)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Module 1: Current Briefing ────────────────────────────────── */}
        <div
          style={{
            ...cardBase, ...cardHoverStyle("briefing"),
            animation: "signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0ms both",
          }}
          onMouseEnter={() => setHoveredCard("briefing")}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => setActiveModal("briefing")}
        >
          <div style={sectionLabelStyle}>Current Briefing</div>
          <div style={bodyStyle}>
            Intelligence briefing will appear here when the annotation engine is active. This view synthesizes patterns across all five layers to surface the single most important insight for your mandate right now.
          </div>
        </div>

        {/* ── Module 2: COS Suggests — three-column ──────────────────── */}
        <div style={{ animation: "signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 120ms both" }}>
          <div style={{ ...sectionLabelStyle, marginBottom: 16, paddingLeft: 2 }}>COS Suggests</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {provocations.map((p, i) => (
              <div
                key={i}
                style={{
                  ...cardBase, display: "flex", flexDirection: "column",
                  ...cardHoverStyle(`prov-${i}`),
                  animation: `signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${200 + i * 100}ms both`,
                }}
                onMouseEnter={() => setHoveredCard(`prov-${i}`)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => onDeliberate(p.text)}
              >
                <div style={sectionLabelStyle}>{p.label}</div>
                <div style={{ flex: 1, ...bodyStyle }}>
                  {p.text}
                </div>
                <div style={{ marginTop: 16 }}>
                  <BumpButton onClick={() => onDeliberate(p.text)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Module 3: Convergence Patterns ────────────────────────────── */}
        <div style={{ animation: "signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 500ms both" }}>
          <div style={{ ...sectionLabelStyle, marginBottom: 16, paddingLeft: 2 }}>Convergence Patterns</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {patterns.map((pattern, i) => (
              <div
                key={pattern.id}
                style={{
                  ...cardBase, ...cardHoverStyle(`pattern-${i}`),
                  animation: `signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${600 + i * 100}ms both`,
                }}
                onMouseEnter={() => setHoveredCard(`pattern-${i}`)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => setActiveModal(`pattern-${i}`)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  {pattern.layers.map(l => <LayerPill key={l} layer={l} />)}
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {pattern.signalCount} signals
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

        {/* ── Module 4: Blind Spots ─────────────────────────────────────── */}
        <div
          style={{
            ...cardBase, ...cardHoverStyle("blindspots"),
            animation: "signal-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1000ms both",
          }}
          onMouseEnter={() => setHoveredCard("blindspots")}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => setActiveModal("blindspots")}
        >
          <div style={sectionLabelStyle}>Blind Spots</div>
          <div style={{ fontSize: 12,  color: "var(--text-tertiary)", marginBottom: 16 }}>
            Layers trending cold
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {blindSpots.length === 0 ? (
              <div style={bodyStyle}>All layers have healthy coverage.</div>
            ) : (
              blindSpots.map(s => (
                <div key={s.layer} style={bodyStyle}>
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{LAYER_LABELS[s.layer]}</span>
                  {" "}&mdash; {s.note}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {activeModal === "briefing" && (
        <SynthesisModal title="Current Briefing" onClose={() => setActiveModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ ...headingStyle, fontSize: 18, marginBottom: 8 }}>
              Daily Intelligence Surface
            </div>
            <div style={{ ...bodyStyle, lineHeight: 1.6, marginBottom: 24 }}>
              Intelligence briefing will appear here when the annotation engine is active. This view synthesizes patterns across all five layers to surface the single most important insight for your mandate right now.
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, marginBottom: 24 }}>
              <div style={sectionLabelStyle}>Trending</div>
              <div style={{ ...bodyStyle, marginTop: 8 }}>
                {patterns.length > 0
                  ? `${patterns.length} convergence patterns detected. Strongest: "${patterns[0]?.title}" spanning ${patterns[0]?.layers.length} layers with ${patterns[0]?.signalCount} signals.`
                  : "No convergence patterns detected yet. Feed more signals to surface cross-layer themes."}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, marginBottom: 24 }}>
              <div style={sectionLabelStyle}>What to Watch</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {blindSpots.length > 0 ? blindSpots.map(s => (
                  <div key={s.layer} style={bodyStyle}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{LAYER_LABELS[s.layer]}</span> &mdash; {s.note}
                  </div>
                )) : (
                  <div style={bodyStyle}>All layers show healthy coverage. Focus on convergence patterns for actionable insight.</div>
                )}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24 }}>
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
                <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  {pattern.layers.map(l => <LayerPill key={l} layer={l} />)}
                </div>
                <div style={{ ...headingStyle, fontSize: 18, marginBottom: 8 }}>{pattern.title}</div>
                <div style={{ ...bodyStyle, lineHeight: 1.6 }}>{pattern.description}</div>
              </div>

              <div>
                <div style={sectionLabelStyle}>Strategic Implication</div>
                <div style={{ ...bodyStyle, marginTop: 8 }}>
                  This convergence pattern suggests a developing theme that crosses traditional boundaries. When synthesis is active, this section will contain a strategic interpretation of how these signals relate to your mandate.
                </div>
              </div>

              <ContributingSignalsDrawer articles={pattern.articles} />

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
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
              Layers with low or no signal coverage may represent gaps in your intelligence feed.
            </div>
            {blindSpots.length === 0 ? (
              <div style={bodyStyle}>All layers show adequate signal density. No blind spots detected.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {blindSpots.map(s => (
                  <div key={s.layer} style={{ padding: 16, background: "var(--bg-elevated)", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={headingStyle}>{LAYER_LABELS[s.layer]}</span>
                      <span style={{ ...pillStyle, color: "var(--text-tertiary)" }}>{s.count} signals</span>
                    </div>
                    <div style={bodyStyle}>
                      {s.count === 0
                        ? `No signals detected in the ${LAYER_LABELS[s.layer].toLowerCase()} layer. Consider adding sources that cover this domain.`
                        : `Only ${s.count} signal${s.count === 1 ? "" : "s"} detected. The ${LAYER_LABELS[s.layer].toLowerCase()} layer may be under-represented.`
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div>
              <div style={sectionLabelStyle}>Full Layer Coverage</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {ALL_LAYERS.map(l => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <LayerDot layer={l} />
                    <span style={{ fontSize: 12,  color: "var(--text-secondary)", width: 80 }}>{LAYER_LABELS[l]}</span>
                    <span style={{ fontSize: 11,  color: "var(--text-tertiary)" }}>{layerCounts[l]} articles</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SynthesisModal>
      )}

    </main>
  )
}
