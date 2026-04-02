"use client"

import { useState, useEffect, useMemo } from "react"
import { Copy, Check, RefreshCw } from "lucide-react"
import { FEEDS } from "@/lib/feeds"
import { PODCAST_FEEDS } from "@/lib/podcasts"
import { MONO } from "@/lib/styles"
import type { FeedHealth, Skin } from "@/lib/types"

// ─── Types ──────────────────────────────────────────────────────────────────

interface ConfigViewProps {
  excludedSources: Set<string>
  onToggleSource: (source: string) => void
  feedHealth: FeedHealth | null
  skin: Skin
  onSkinChange: (skin: Skin) => void
  isDay: boolean
  onToggleMode: () => void
}

const LAYERS = ["opportunity", "position", "discipline", "landscape", "culture"] as const
const LAYER_LABELS: Record<string, string> = {
  opportunity: "Opportunity",
  position: "Position",
  discipline: "Discipline",
  landscape: "Landscape",
  culture: "Culture",
}
const LAYER_DOT: Record<string, string> = {
  opportunity: "#D4A05A",
  position: "#5A9EB0",
  discipline: "#7BAF6A",
  landscape: "#9A85B8",
  culture: "#C87A6A",
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupByLayer<T extends { layer: string }>(items: T[], nameKey: keyof T): Record<string, T[]> {
  const groups: Record<string, T[]> = {}
  for (const layer of LAYERS) groups[layer] = []
  for (const item of [...items].sort((a, b) => String(a[nameKey]).localeCompare(String(b[nameKey])))) {
    const layer = item.layer || "landscape"
    if (!groups[layer]) groups[layer] = []
    groups[layer].push(item)
  }
  return groups
}

function generateInventoryMarkdown(excludedSources: Set<string>): string {
  const ts = new Date().toISOString()
  const activeNews = FEEDS.filter(f => !excludedSources.has(f.source)).length
  const activePods = PODCAST_FEEDS.filter(f => !excludedSources.has(f.show)).length
  const newsGroups = groupByLayer(FEEDS, "source")
  const podGroups = groupByLayer(PODCAST_FEEDS, "show")

  let md = `# Dispatch Source Inventory\nGenerated: ${ts}\n\n`
  md += `## News Sources (${FEEDS.length} total, ${activeNews} active)\n\n`
  for (const layer of LAYERS) {
    const items = newsGroups[layer]
    if (!items?.length) continue
    md += `### ${LAYER_LABELS[layer]}\n| Source | Category | Status | URL |\n|--------|----------|--------|-----|\n`
    for (const f of items) {
      md += `| ${f.source} | ${f.category} | ${excludedSources.has(f.source) ? "Disabled" : "Active"} | ${f.url} |\n`
    }
    md += "\n"
  }
  md += `## Podcast Sources (${PODCAST_FEEDS.length} total, ${activePods} active)\n\n`
  for (const layer of LAYERS) {
    const items = podGroups[layer]
    if (!items?.length) continue
    md += `### ${LAYER_LABELS[layer]}\n| Show | Category | Status | URL |\n|------|----------|--------|-----|\n`
    for (const f of items) {
      md += `| ${f.show} | ${f.category} | ${excludedSources.has(f.show) ? "Disabled" : "Active"} | ${f.url} |\n`
    }
    md += "\n"
  }
  return md
}

// ─── Shared styles ──────────────────────────────────────────────────────────

const sectionLabel: React.CSSProperties = {
  fontSize: 11, color: "var(--accent-secondary)",
  textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12,
  fontWeight: 500,
}
const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "8px 12px", borderRadius: 6,
  transition: "background 0.12s", cursor: "pointer",
}
const badgeStyle = (color: string): React.CSSProperties => ({
  fontSize: 10, color,
  textTransform: "uppercase", letterSpacing: "0.03em",
  padding: "1px 6px", borderRadius: 4,
  background: "var(--bg-elevated)", whiteSpace: "nowrap",
  fontWeight: 500,
})
const categoryStyle: React.CSSProperties = {
  fontSize: 11, color: "var(--text-tertiary)",
  marginLeft: "auto", whiteSpace: "nowrap",
}
const separator: React.CSSProperties = {
  height: 1, background: "var(--border)", margin: "20px 0",
}

// ─── Copy Button ────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 14px", borderRadius: 6,
        border: "1px solid var(--border)",
        background: copied ? "var(--accent-secondary)" : "transparent",
        color: copied ? "var(--bg-primary)" : "var(--text-tertiary)",
        fontSize: 11, cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : label}
    </button>
  )
}

// ─── Toggle Checkbox ────────────────────────────────────────────────────────

function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onToggle() }}
      style={{
        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
        border: `1.5px solid ${active ? "var(--accent-secondary)" : "var(--text-tertiary)"}`,
        background: active ? "var(--accent-secondary)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s", cursor: "pointer",
      }}
    >
      {active && (
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
          <path d="M2 5L4.5 7.5L8 3" stroke="var(--bg-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

// ─── ConfigView ─────────────────────────────────────────────────────────────

export function ConfigView({ excludedSources, onToggleSource, feedHealth, skin, onSkinChange, isDay, onToggleMode }: ConfigViewProps) {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  const newsGroups = useMemo(() => groupByLayer(FEEDS, "source"), [])
  const podGroups = useMemo(() => groupByLayer(PODCAST_FEEDS, "show"), [])

  const activeNewsCount = FEEDS.filter(f => !excludedSources.has(f.source)).length
  const activePodCount = PODCAST_FEEDS.filter(f => !excludedSources.has(f.show)).length

  const fetchHealth = () => {
    setHealthLoading(true)
    fetch("/api/health")
      .then(r => r.json())
      .then(data => { setHealth(data); setHealthLoading(false) })
      .catch(() => setHealthLoading(false))
  }

  useEffect(() => { fetchHealth() }, [])

  const inventoryMd = useMemo(() => generateInventoryMarkdown(excludedSources), [excludedSources])

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={sectionLabel}>Configuration</div>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
          Source inventory, diagnostics, and preferences.
        </div>
      </div>

      <div style={separator} />

      {/* ── News Sources ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={sectionLabel}>
            News Sources
            <span style={{ color: "var(--text-tertiary)", marginLeft: 8, fontWeight: 400 }}>
              {activeNewsCount}/{FEEDS.length} active
            </span>
          </div>
          <CopyButton text={inventoryMd.split("## Podcast")[0]} label="Copy news" />
        </div>

        {LAYERS.map(layer => {
          const items = newsGroups[layer]
          if (!items?.length) return null
          return (
            <div key={layer} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: LAYER_DOT[layer], textTransform: "uppercase", marginBottom: 6, paddingLeft: 12 }}>
                {LAYER_LABELS[layer]}
                <span style={{ color: "var(--text-tertiary)", marginLeft: 6 }}>({items.filter(f => !excludedSources.has(f.source)).length})</span>
              </div>
              {items.map(feed => {
                const active = !excludedSources.has(feed.source)
                return (
                  <div
                    key={feed.url}
                    onClick={() => onToggleSource(feed.source)}
                    style={{ ...rowStyle, opacity: active ? 1 : 0.5 }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                  >
                    <Toggle active={active} onToggle={() => onToggleSource(feed.source)} />
                    <span style={{ fontSize: 12, color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                      {feed.source}
                    </span>
                    <span style={badgeStyle(LAYER_DOT[layer])}>{layer.slice(0, 3)}</span>
                    <span style={categoryStyle}>{feed.category}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div style={separator} />

      {/* ── Podcast Sources ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={sectionLabel}>
            Podcast Sources
            <span style={{ color: "var(--text-tertiary)", marginLeft: 8, fontWeight: 400 }}>
              {activePodCount}/{PODCAST_FEEDS.length} active
            </span>
          </div>
          <CopyButton text={"## Podcast" + inventoryMd.split("## Podcast")[1]} label="Copy podcasts" />
        </div>

        {LAYERS.map(layer => {
          const items = podGroups[layer]
          if (!items?.length) return null
          return (
            <div key={layer} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: LAYER_DOT[layer], textTransform: "uppercase", marginBottom: 6, paddingLeft: 12 }}>
                {LAYER_LABELS[layer]}
                <span style={{ color: "var(--text-tertiary)", marginLeft: 6 }}>({items.filter(f => !excludedSources.has(f.show)).length})</span>
              </div>
              {items.map(feed => {
                const active = !excludedSources.has(feed.show)
                return (
                  <div
                    key={feed.url}
                    onClick={() => onToggleSource(feed.show)}
                    style={{ ...rowStyle, opacity: active ? 1 : 0.5 }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                  >
                    <Toggle active={active} onToggle={() => onToggleSource(feed.show)} />
                    <span style={{ fontSize: 12, color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                      {feed.show}
                    </span>
                    <span style={badgeStyle(LAYER_DOT[layer])}>{layer.slice(0, 3)}</span>
                    <span style={categoryStyle}>{feed.category}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div style={separator} />

      {/* ── Copy Full Inventory ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={sectionLabel}>Export Inventory</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <CopyButton text={inventoryMd} label="Copy full inventory (Markdown)" />
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 8, lineHeight: 1.6 }}>
          Paste into Claude for analysis of your signal bundle structure.
        </div>
      </div>

      <div style={separator} />

      {/* ── Diagnostics ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={sectionLabel}>Diagnostics</div>
          <button
            onClick={fetchHealth}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 6,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-tertiary)", fontSize: 11,
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
          >
            <RefreshCw size={11} style={{ animation: healthLoading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>

        <div style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: "16px", fontFamily: MONO, fontSize: 11, lineHeight: 2 }}>
          {/* API Status */}
          <div style={{ color: "var(--text-tertiary)", marginBottom: 4 }}>API STATUS</div>
          <div>
            <span style={{ color: health?.anthropic === "ok — API responding" ? "var(--live)" : "#ef4444" }}>●</span>
            {" "}Anthropic: {health ? String((health.env as Record<string, string>)?.ANTHROPIC_API_KEY || "unknown") : "checking..."}
          </div>
          <div>
            <span style={{ color: String((health?.env as Record<string, string>)?.EXA_API_KEY || "").startsWith("set") ? "var(--live)" : "var(--text-tertiary)" }}>●</span>
            {" "}Exa: {health ? String((health.env as Record<string, string>)?.EXA_API_KEY || "unknown") : "checking..."}
          </div>
          <div>
            <span style={{ color: String((health?.env as Record<string, string>)?.KV_REST_API_URL || "").startsWith("set") ? "var(--live)" : "var(--text-tertiary)" }}>●</span>
            {" "}KV Memory: {health ? String((health.env as Record<string, string>)?.KV_REST_API_URL || "unknown") : "checking..."}
          </div>
          <div>
            <span style={{ color: "var(--live)" }}>●</span>
            {" "}Connection: {health?.anthropic ? String(health.anthropic) : "checking..."}
          </div>

          {/* Feed Health */}
          {feedHealth && (
            <>
              <div style={{ color: "var(--text-tertiary)", marginTop: 12, marginBottom: 4 }}>FEED HEALTH</div>
              <div>{feedHealth.sourcesLive}/{feedHealth.sourcesTotal} sources live</div>
              {feedHealth.sourcesFailed > 0 && (
                <div style={{ color: "#ef4444" }}>{feedHealth.sourcesFailed} sources failed</div>
              )}
              {feedHealth.stubCategories?.length > 0 && (
                <div>Stub fallback: {feedHealth.stubCategories.join(", ")}</div>
              )}
            </>
          )}

          {/* Cache */}
          <div style={{ color: "var(--text-tertiary)", marginTop: 12, marginBottom: 4 }}>CACHE</div>
          <div>
            Annotation cache: {(() => {
              try {
                const raw = localStorage.getItem("dispatch-annotations-v3")
                if (!raw) return "empty"
                const { ts } = JSON.parse(raw)
                const age = Math.round((Date.now() - ts) / 60000)
                return `${age}m old`
              } catch { return "unknown" }
            })()}
          </div>
          <button
            onClick={() => { localStorage.removeItem("dispatch-annotations-v3"); fetchHealth() }}
            style={{
              marginTop: 4, padding: "3px 8px", borderRadius: 4,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-tertiary)", fontSize: 10,
              cursor: "pointer",
            }}
          >
            Clear annotation cache
          </button>
        </div>
      </div>

      <div style={separator} />

      {/* ── Preferences ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={sectionLabel}>Preferences</div>

        {/* Skin */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8 }}>Skin</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["mineral", "slate", "forest"] as Skin[]).map(s => (
              <button
                key={s}
                onClick={() => onSkinChange(s)}
                style={{
                  padding: "6px 16px", borderRadius: 6,
                  border: skin === s ? "1px solid var(--accent-secondary)" : "1px solid var(--border)",
                  background: skin === s ? "var(--accent-primary)" : "transparent",
                  color: skin === s ? "var(--accent-secondary)" : "var(--text-tertiary)",
                  fontSize: 11, cursor: "pointer",
                  textTransform: "capitalize", transition: "all 0.15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8 }}>Theme</div>
          <button
            onClick={onToggleMode}
            style={{
              padding: "6px 16px", borderRadius: 6,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-tertiary)", fontSize: 11,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {isDay ? "Switch to night" : "Switch to day"}
          </button>
        </div>
      </div>
    </div>
  )
}
