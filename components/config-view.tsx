"use client"

import { useState, useEffect, useMemo } from "react"
import { Copy, Check, RefreshCw, Trash2, Download } from "lucide-react"
import { FEEDS } from "@/lib/feeds"
import { PODCAST_FEEDS } from "@/lib/podcasts"
import { MONO, TYPE, labelStyle, metaStyle } from "@/lib/styles"
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
  ...labelStyle, letterSpacing: "0.04em", marginBottom: 12,
}
const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "8px 12px", borderRadius: 6,
  transition: "background 0.12s", cursor: "pointer",
}
const badgeStyle = (color: string): React.CSSProperties => ({
  ...TYPE.xs, color,
  textTransform: "uppercase", letterSpacing: "0.03em",
  padding: "1px 6px", borderRadius: 4,
  background: "var(--bg-elevated)", whiteSpace: "nowrap",
  fontWeight: 500,
})
const categoryStyle: React.CSSProperties = {
  ...metaStyle,
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
        ...TYPE.sm, cursor: "pointer",
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

// ─── Cerebro Station — memory management & export ───────────────────────

function CerebroStation() {
  const [messageCount, setMessageCount] = useState<number | null>(null)
  const [exported, setExported] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])

  const sessionId = typeof window !== "undefined" ? localStorage.getItem("cerebro-session") : null

  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/memory?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages) {
          setMessages(data.messages)
          setMessageCount(data.messages.length)
        }
      })
      .catch(() => {})
  }, [sessionId])

  const handleExport = () => {
    if (messages.length === 0) return
    const header = `# Cerebro Conversation Export\nSession: ${sessionId}\nExported: ${new Date().toISOString()}\nMessages: ${messages.length}\n\n---\n\n`
    const thread = messages
      .map(m => `**${m.role === "user" ? "Jeremy" : "Cerebro"}:**\n${m.content}`)
      .join("\n\n---\n\n")
    const footer = `\n\n---\n\n*Exported from Dispatch for continued analysis in Claude.*`
    navigator.clipboard.writeText(header + thread + footer).then(() => {
      setExported(true)
      setTimeout(() => setExported(false), 2500)
    })
  }

  const handleClear = () => {
    if (!sessionId) return
    fetch(`/api/memory?sessionId=${sessionId}`, { method: "DELETE" })
      .then(() => {
        setMessages([])
        setMessageCount(0)
        setCleared(true)
        setTimeout(() => setCleared(false), 2500)
      })
      .catch(() => {})
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={sectionLabel}>
        Cerebro Station
        <span style={{ color: "var(--text-tertiary)", marginLeft: 8, fontWeight: 400 }}>
          memory · export · session
        </span>
      </div>

      <div style={{ ...TYPE.body, color: "var(--text-tertiary)", marginBottom: 16, lineHeight: 1.6 }}>
        Cerebro is your station chief. Export conversation threads for deeper analysis in Claude Desktop, or clear memory to start fresh.
      </div>

      {/* Session info */}
      <div style={{
        background: "var(--bg-surface)", borderRadius: 8, padding: "14px 16px",
        marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ ...metaStyle, textTransform: "uppercase" }}>Active Session</span>
          <span style={{
            ...TYPE.xs,
            color: messageCount && messageCount > 0 ? "var(--live)" : "var(--text-tertiary)",
          }}>
            ● {messageCount === null ? "loading" : `${messageCount} messages`}
          </span>
        </div>
        <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", fontFamily: MONO }}>
          {sessionId || "no session"}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={handleExport}
          disabled={messages.length === 0}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 6,
            border: "1px solid var(--border)",
            background: exported ? "var(--accent-secondary)" : "transparent",
            color: exported ? "var(--bg-primary)" : messages.length > 0 ? "var(--text-secondary)" : "var(--text-tertiary)",
            ...TYPE.sm, cursor: messages.length > 0 ? "pointer" : "default",
            transition: "all 0.2s",
            opacity: messages.length === 0 ? 0.5 : 1,
          }}
        >
          {exported ? <Check size={12} /> : <Download size={12} />}
          {exported ? "Copied to clipboard" : "Export thread (Markdown)"}
        </button>

        <button
          onClick={handleClear}
          disabled={messages.length === 0}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 6,
            border: "1px solid var(--border)",
            background: cleared ? "var(--bg-elevated)" : "transparent",
            color: cleared ? "var(--text-secondary)" : messages.length > 0 ? "var(--text-tertiary)" : "var(--text-tertiary)",
            ...TYPE.sm, cursor: messages.length > 0 ? "pointer" : "default",
            transition: "all 0.2s",
            opacity: messages.length === 0 ? 0.5 : 1,
          }}
        >
          {cleared ? <Check size={12} /> : <Trash2 size={12} />}
          {cleared ? "Memory cleared" : "Clear memory"}
        </button>
      </div>

      <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", marginTop: 10, lineHeight: 1.6 }}>
        Export copies the full thread as Markdown — paste into Claude Desktop for extended strategic thinking. Clear memory resets Cerebro to a blank slate.
      </div>
    </div>
  )
}

// ─── ConfigView ─────────────────────────────────────────────────────────────

export function ConfigView({ excludedSources, onToggleSource, feedHealth, skin, onSkinChange, isDay, onToggleMode }: ConfigViewProps) {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  const newsFeedsOnly = useMemo(() => FEEDS.filter(f => f.type !== "social"), [])
  const socialFeeds = useMemo(() => FEEDS.filter(f => f.type === "social"), [])
  const newsGroups = useMemo(() => groupByLayer(newsFeedsOnly, "source"), [newsFeedsOnly])
  const socialGroups = useMemo(() => groupByLayer(socialFeeds, "source"), [socialFeeds])
  const podGroups = useMemo(() => groupByLayer(PODCAST_FEEDS, "show"), [])

  const activeNewsCount = newsFeedsOnly.filter(f => !excludedSources.has(f.source)).length
  const activeSocialCount = socialFeeds.filter(f => !excludedSources.has(f.source)).length
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
        <div style={{ ...TYPE.body, color: "var(--text-tertiary)" }}>
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
              {activeNewsCount}/{newsFeedsOnly.length} active
            </span>
          </div>
          <CopyButton text={inventoryMd.split("## Podcast")[0]} label="Copy news" />
        </div>

        {LAYERS.map(layer => {
          const items = newsGroups[layer]
          if (!items?.length) return null
          return (
            <div key={layer} style={{ marginBottom: 16 }}>
              <div style={{ ...TYPE.sm, fontWeight: 500, color: LAYER_DOT[layer], textTransform: "uppercase", marginBottom: 6, paddingLeft: 12 }}>
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
                    <span style={{ ...TYPE.body, color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}>
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

      {/* ── Social Sources ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={sectionLabel}>
            Social Sources
            <span style={{ color: "var(--text-tertiary)", marginLeft: 8, fontWeight: 400 }}>
              {activeSocialCount}/{socialFeeds.length} active
            </span>
          </div>
        </div>

        <div style={{ ...TYPE.body, color: "var(--text-tertiary)", marginBottom: 12, lineHeight: 1.6 }}>
          Newsletters, essays, editorial voices. Different nutrient than news — same feed.
        </div>

        {LAYERS.map(layer => {
          const items = socialGroups[layer]
          if (!items?.length) return null
          return (
            <div key={layer} style={{ marginBottom: 16 }}>
              <div style={{ ...TYPE.sm, fontWeight: 500, color: LAYER_DOT[layer], textTransform: "uppercase", marginBottom: 6, paddingLeft: 12 }}>
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
                    <span style={{ ...TYPE.body, color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}>
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
              <div style={{ ...TYPE.sm, fontWeight: 500, color: LAYER_DOT[layer], textTransform: "uppercase", marginBottom: 6, paddingLeft: 12 }}>
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
                    <span style={{ ...TYPE.body, color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}>
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

      {/* ── Export Inventory ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={sectionLabel}>Export Inventory</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <CopyButton text={inventoryMd} label="Copy full inventory (Markdown)" />
        </div>
        <div style={{ ...metaStyle, marginTop: 8, lineHeight: 1.6 }}>
          Paste into Claude for analysis of your signal bundle structure.
        </div>
      </div>

      <div style={separator} />

      {/* ── Cerebro Station ── */}
      <CerebroStation />

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
              ...metaStyle,
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
          >
            <RefreshCw size={11} style={{ animation: healthLoading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>

        <div style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: "16px", fontFamily: MONO, ...TYPE.sm, lineHeight: 2 }}>
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
              ...TYPE.xs, color: "var(--text-tertiary)",
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

        {/* Manual feed refresh */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...metaStyle, marginBottom: 8 }}>Feed</div>
          <button
            onClick={() => {
              localStorage.removeItem("dispatch-annotations-v3")
              window.location.reload()
            }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 16px", borderRadius: 6,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-tertiary)",
              ...TYPE.sm, cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
          >
            <RefreshCw size={12} />
            Refresh feed &amp; clear cache
          </button>
        </div>

        {/* Skin */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...metaStyle, marginBottom: 8 }}>Skin</div>
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
                  ...TYPE.sm, cursor: "pointer",
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
          <div style={{ ...metaStyle, marginBottom: 8 }}>Theme</div>
          <button
            onClick={onToggleMode}
            style={{
              padding: "6px 16px", borderRadius: 6,
              border: "1px solid var(--border)", background: "transparent",
              ...metaStyle,
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
