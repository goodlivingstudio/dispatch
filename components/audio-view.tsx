"use client"

import { useState, useEffect } from "react"
import { ExternalLink, ArrowUpRight } from "lucide-react"
import { TYPE, MONO, metaStyle } from "@/lib/styles"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Episode {
  id: string
  title: string
  showName: string
  url: string
  publishedAt: string
  summary: string
  duration: string
  artworkUrl: string
  category: string
  tag: string
  layer: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 36e5)
  if (h < 1) return "< 1h"
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return `${Math.floor(d / 7)}w`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
}

const LAYER_LABELS: Record<string, string> = {
  opportunity: "Opportunity",
  position: "Position",
  discipline: "Discipline",
  landscape: "Landscape",
  culture: "Culture",
}

// ─── Episode Modal ──────────────────────────────────────────────────────────

function EpisodeModal({ episode, onClose, onDeliberate }: { episode: Episode; onClose: () => void; onDeliberate?: (text: string) => void }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: 14,
          width: "80vw",
          maxWidth: 720,
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header with artwork */}
        <div style={{
          display: "flex", gap: 24, padding: "24px 24px 24px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          {episode.artworkUrl ? (
            <img
              src={episode.artworkUrl}
              alt={episode.showName}
              style={{ width: 96, height: 96, borderRadius: 14, objectFit: "cover", flexShrink: 0, background: "var(--bg-elevated)" }}
            />
          ) : (
            <div style={{
              width: 96, height: 96, borderRadius: 14, background: "var(--bg-elevated)",
              flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, color: "var(--text-tertiary)",
            }}>
              ◉
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ ...TYPE.body, color: "var(--text-tertiary)", marginBottom: 6 }}>
              {episode.showName}
            </div>
            <div style={{ fontSize: 18, fontWeight: 650, color: "var(--text-primary)", lineHeight: 1.35 }}>
              {episode.title}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "var(--text-tertiary)",
              cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "4px 8px",
              borderRadius: 4, alignSelf: "flex-start", flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* THE WHAT — Synopsis */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                ...metaStyle, textTransform: "uppercase",
                fontWeight: 600, marginBottom: 8,
              }}>
                Synopsis
              </div>
              <div style={{ ...TYPE.reading, color: "var(--text-secondary)" }}>
                {episode.summary || "Episode synopsis will be available when the annotation engine is active. This section provides an AI-generated summary of what this episode covers, distilled for relevance to your mandate."}
              </div>
            </div>

            {/* THE META — Particulars */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, marginBottom: 24 }}>
              <div style={{
                ...metaStyle, textTransform: "uppercase",
                fontWeight: 600, marginBottom: 16,
              }}>
                Details
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ ...metaStyle, marginBottom: 3 }}>Show</div>
                  <div style={{ ...TYPE.reading, color: "var(--text-primary)", fontWeight: 500 }}>{episode.showName}</div>
                </div>
                <div>
                  <div style={{ ...metaStyle, marginBottom: 3 }}>Duration</div>
                  <div style={{ ...TYPE.reading, color: "var(--text-primary)", fontWeight: 500 }}>{episode.duration || "—"}</div>
                </div>
                <div>
                  <div style={{ ...metaStyle, marginBottom: 3 }}>Published</div>
                  <div style={{ ...TYPE.reading, color: "var(--text-primary)", fontWeight: 500 }}>{formatDate(episode.publishedAt)}</div>
                </div>
                <div>
                  <div style={{ ...metaStyle, marginBottom: 3 }}>Category</div>
                  <div style={{ ...TYPE.reading, color: "var(--text-primary)", fontWeight: 500 }}>{episode.category}</div>
                </div>
                <div>
                  <div style={{ ...metaStyle, marginBottom: 3 }}>Layer</div>
                  <div style={{ ...TYPE.reading, color: "var(--text-primary)", fontWeight: 500 }}>{LAYER_LABELS[episode.layer] || episode.layer}</div>
                </div>
              </div>
            </div>

            {/* THE WHY — Mandate relevance */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, marginBottom: 24 }}>
              <div style={{
                ...metaStyle, textTransform: "uppercase",
                fontWeight: 600, marginBottom: 8,
              }}>
                Why It Matters
              </div>
              <div style={{ ...TYPE.reading, color: "var(--text-secondary)" }}>
                Mandate relevance analysis will appear here when the annotation engine is active. This section explains how this episode connects to your five intelligence layers and what you should listen for relative to your strategic positioning.
              </div>
            </div>

            {/* Actions */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
              {episode.url && episode.url !== "#" && (
                <a
                  href={episode.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "8px 16px", borderRadius: 8,
                    background: "var(--accent-secondary)", color: "var(--bg-primary)",
                    textDecoration: "none", ...TYPE.reading, fontWeight: 600,
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.85" }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1" }}
                >
                  Listen
                  <ExternalLink size={13} strokeWidth={2} />
                </a>
              )}
              {onDeliberate && (
                <button
                  onClick={() => {
                    onDeliberate(`I just came across this podcast episode: "${episode.title}" from ${episode.showName}. ${episode.summary ? `Here's what it covers: ${episode.summary}` : ""} How does this connect to my mandate? What should I listen for?`)
                    onClose()
                  }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "8px 16px", borderRadius: 8,
                    background: "var(--bg-elevated)", border: "none",
                    color: "var(--accent-secondary)", ...TYPE.reading, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-surface)" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                >
                  BUMP
                  <ArrowUpRight size={13} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Episode Card ────────────────────────────────────────────────────────────

function EpisodeCard({ episode, index, onClick }: { episode: Episode; index?: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        gap: 16,
        padding: 16,
        background: "var(--bg-surface)",
        borderRadius: 14,
        cursor: "pointer",
        transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: hovered ? "scale(1.015)" : "scale(1)",
        animation: index !== undefined ? `signal-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(index * 60, 600)}ms both` : undefined,
      }}
    >
      {/* Artwork */}
      {episode.artworkUrl ? (
        <img
          src={episode.artworkUrl}
          alt={episode.showName}
          style={{
            width: 64, height: 64, borderRadius: 8,
            objectFit: "cover", flexShrink: 0, background: "var(--bg-elevated)",
          }}
        />
      ) : (
        <div
          style={{
            width: 64, height: 64, borderRadius: 8, background: "var(--bg-elevated)",
            flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, color: "var(--text-tertiary)",
          }}
        >
          ◉
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Eyebrow */}
        <div
          style={{
            ...metaStyle,
            marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}
        >
          {episode.showName}
          {episode.duration && (
            <><span style={{ margin: "0 4px", opacity: 0.4 }}>·</span>{episode.duration}</>
          )}
          <span style={{ margin: "0 4px", opacity: 0.4 }}>·</span>
          {timeAgo(episode.publishedAt)}
        </div>

        {/* Episode title */}
        <div
          style={{
            ...TYPE.heading,
            color: hovered ? "var(--text-primary)" : "var(--text-secondary)",
            lineHeight: 1.4, transition: "color 0.15s",
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const, overflow: "hidden",
          }}
        >
          {episode.title}
        </div>
      </div>
    </div>
  )
}

// ─── Audio View ──────────────────────────────────────────────────────────────

const LAYER_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "opportunity", label: "Opportunity" },
  { id: "position", label: "Position" },
  { id: "discipline", label: "Discipline" },
  { id: "landscape", label: "Landscape" },
  { id: "culture", label: "Culture" },
]

export function AudioView({ onDeliberate, excludedSources }: { onDeliberate?: (text: string) => void; excludedSources?: Set<string> }) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [showCount, setShowCount] = useState(0)
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null)
  const [activeLayer, setActiveLayer] = useState("all")

  useEffect(() => {
    fetch("/api/podcasts")
      .then(r => r.json())
      .then(data => {
        setEpisodes(data.episodes || [])
        setShowCount(data.showCount || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const sourceFiltered = excludedSources?.size ? episodes.filter(ep => !excludedSources.has(ep.showName)) : episodes
  const filtered = activeLayer === "all" ? sourceFiltered : sourceFiltered.filter(ep => ep.layer === activeLayer)

  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-primary)" }}>
      {/* Header bar — matches all other views */}
      <div style={{
        flexShrink: 0, height: 40, display: "flex", alignItems: "center",
        padding: "0 20px", borderBottom: "1px solid var(--border)",
      }}>
        <span style={{ ...TYPE.sm, fontFamily: MONO, color: "var(--accent-muted)", textTransform: "uppercase" }}>
          Audio
        </span>
        {!loading && (
          <span style={{ ...TYPE.sm, color: "var(--text-primary)", marginLeft: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {filtered.length}/{episodes.length} Active
          </span>
        )}
      </div>

      <div className="view-padding" style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

      {/* Layer pills */}
      {!loading && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {LAYER_FILTERS.map(layer => {
            const isActive = activeLayer === layer.id
            const count = layer.id === "all" ? episodes.length : episodes.filter(ep => ep.layer === layer.id).length
            if (layer.id !== "all" && count === 0) return null
            return (
              <button
                key={layer.id}
                onClick={() => setActiveLayer(layer.id)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "4px 12px", borderRadius: 9999, border: "none",
                  background: isActive ? "var(--accent-primary)" : "transparent",
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg-elevated)" }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? "var(--accent-primary)" : "transparent" }}
              >
                <span style={{
                  ...TYPE.body,
                  color: isActive ? "var(--accent-secondary)" : "var(--text-tertiary)",
                  fontWeight: isActive ? 600 : 400,
                  transition: "color 0.15s",
                }}>
                  {layer.label}
                </span>
                <span style={{
                  ...TYPE.sm, fontVariantNumeric: "tabular-nums",
                  color: isActive ? "var(--accent-muted)" : "var(--text-tertiary)",
                  opacity: 0.7, transition: "color 0.15s",
                }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="episode-grid" style={{ gap: 12 }}>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="loading-pulse"
              style={{
                display: "flex", gap: 16, padding: 16,
                background: "var(--bg-surface)", borderRadius: 14,
              }}
            >
              <div style={{ width: 64, height: 64, borderRadius: 8, background: "var(--bg-elevated)", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 10, width: "60%", background: "var(--bg-elevated)", borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 14, width: "90%", background: "var(--bg-elevated)", borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : episodes.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, ...TYPE.reading, color: "var(--text-tertiary)" }}>
          No episodes loaded. Check podcast feed configuration.
        </div>
      ) : (
        <div className="episode-grid" style={{ gap: 12 }}>
          {filtered.map((ep, i) => (
            <EpisodeCard key={ep.id} episode={ep} index={i} onClick={() => setActiveEpisode(ep)} />
          ))}
        </div>
      )}

      {/* Episode modal */}
      {activeEpisode && (
        <EpisodeModal episode={activeEpisode} onClose={() => setActiveEpisode(null)} onDeliberate={onDeliberate} />
      )}
      </div>
    </main>
  )
}
