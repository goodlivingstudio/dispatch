"use client"

import { useState, useEffect, useMemo } from "react"
import { Copy, Check, RefreshCw, Trash2, Download } from "lucide-react"
// Skin removed from props — controlled via ticker header
import { FEEDS } from "@/lib/feeds"
import { PODCAST_FEEDS } from "@/lib/podcasts"
import { GALLERY_SOURCES } from "@/lib/gallery"
import { MONO, TYPE, labelStyle, metaStyle } from "@/lib/styles"
import type { FeedHealth } from "@/lib/types"

// ─── Types ──────────────────────────────────────────────────────────────────

interface ConfigViewProps {
  excludedSources: Set<string>
  onToggleSource: (source: string) => void
  feedHealth: FeedHealth | null
  articles?: import("@/lib/types").Article[]
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

// ─── Cerebro Station — memory management, topic threads, selective purge ──

interface ConvoThread {
  topic: string
  messages: Array<{ role: string; content: string }>
  startIdx: number
  endIdx: number
}

function groupIntoThreads(messages: Array<{ role: string; content: string }>): ConvoThread[] {
  if (messages.length === 0) return []
  const threads: ConvoThread[] = []
  let current: ConvoThread | null = null

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    if (m.role === "user") {
      // Start a new thread on each user message that follows an assistant message
      if (!current || (i > 0 && messages[i - 1].role === "assistant")) {
        if (current) threads.push(current)
        const topic = m.content.length > 60 ? m.content.slice(0, 57) + "..." : m.content
        current = { topic, messages: [], startIdx: i, endIdx: i }
      }
    }
    if (current) {
      current.messages.push(m)
      current.endIdx = i
    }
  }
  if (current) threads.push(current)
  return threads
}

function CerebroStation() {
  const [exported, setExported] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])
  const [loading, setLoading] = useState(true)
  const [logExpanded, setLogExpanded] = useState(false)

  const sessionId = typeof window !== "undefined" ? localStorage.getItem("cerebro-session") : null

  const fetchMessages = () => {
    if (!sessionId) { setLoading(false); return }
    fetch(`/api/memory?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchMessages() }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const threads = useMemo(() => groupIntoThreads(messages), [messages])

  const handleExportAll = () => {
    if (messages.length === 0) return
    const header = `# Cerebro Conversation Export\nSession: ${sessionId}\nExported: ${new Date().toISOString()}\nThreads: ${threads.length} · Messages: ${messages.length}\n\n`
    const body = threads.map((t, i) => {
      const threadMsgs = t.messages.map(m => `**${m.role === "user" ? "Jeremy" : "Cerebro"}:**\n${m.content}`).join("\n\n")
      return `---\n\n## Thread ${i + 1}: ${t.topic}\n\n${threadMsgs}`
    }).join("\n\n")
    navigator.clipboard.writeText(header + body + "\n\n---\n\n*Exported from Dispatch.*").then(() => {
      setExported(true)
      setTimeout(() => setExported(false), 2500)
    })
  }

  const handleExportThread = (thread: ConvoThread) => {
    const body = thread.messages.map(m => `**${m.role === "user" ? "Jeremy" : "Cerebro"}:**\n${m.content}`).join("\n\n---\n\n")
    navigator.clipboard.writeText(`# ${thread.topic}\n\n${body}`)
  }

  const handlePurgeThread = (thread: ConvoThread) => {
    if (!sessionId) return
    fetch(`/api/memory?sessionId=${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeFrom: thread.startIdx, removeTo: thread.endIdx }),
    }).then(() => fetchMessages())
  }

  const handleClearAll = () => {
    if (!sessionId) return
    fetch(`/api/memory?sessionId=${sessionId}`, { method: "DELETE" })
      .then(() => {
        setMessages([])
        setCleared(true)
        setTimeout(() => setCleared(false), 2500)
      })
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={sectionLabel}>
        Cerebro Station
      </div>

      <div style={{ ...TYPE.body, color: "var(--text-tertiary)", marginBottom: 20, lineHeight: 1.7 }}>
        Conversation memory persists across sessions. Export threads for deeper analysis in Claude Desktop, or purge selectively to keep memory focused.
      </div>

      {/* Session status */}
      <div style={{
        background: "var(--bg-surface)", borderRadius: 8, padding: "16px 18px",
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ ...metaStyle, textTransform: "uppercase" }}>Active Session</span>
          <span style={{
            ...TYPE.xs,
            color: messages.length > 0 ? "var(--live)" : "var(--text-tertiary)",
          }}>
            {loading ? "loading..." : `${messages.length} messages · ${threads.length} threads`}
          </span>
        </div>
        <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", fontFamily: MONO }}>
          {sessionId || "no session"}
        </div>
      </div>

      {/* Thread list — collapsible */}
      {threads.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setLogExpanded(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6, width: "100%",
              background: "transparent", border: "none", cursor: "pointer",
              ...metaStyle, textTransform: "uppercase", marginBottom: logExpanded ? 10 : 0,
              padding: 0, transition: "color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-secondary)" }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)" }}
          >
            <span style={{ transition: "transform 0.2s", transform: logExpanded ? "rotate(90deg)" : "rotate(0)", display: "inline-block" }}>›</span>
            Conversation Log ({threads.length})
          </button>
          <div style={{ maxHeight: logExpanded ? 2000 : 0, overflow: "hidden", transition: "max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {threads.map((thread, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-surface)", borderRadius: 8, padding: "12px 14px",
                  display: "flex", alignItems: "flex-start", gap: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...TYPE.body, color: "var(--text-primary)", marginBottom: 4, lineHeight: 1.5 }}>
                    {thread.topic}
                  </div>
                  <div style={{ ...TYPE.xs, color: "var(--text-tertiary)" }}>
                    {thread.messages.length} messages
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => handleExportThread(thread)}
                    title="Copy this thread"
                    style={{
                      width: 26, height: 26, borderRadius: 5, border: "none",
                      background: "transparent", color: "var(--text-tertiary)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-secondary)" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)" }}
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={() => handlePurgeThread(thread)}
                    title="Purge this thread"
                    style={{
                      width: 26, height: 26, borderRadius: 5, border: "none",
                      background: "transparent", color: "var(--text-tertiary)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "#ef4444" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      {/* Global actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={handleExportAll}
          disabled={messages.length === 0}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 6,
            border: "1px solid var(--border)",
            background: exported ? "var(--accent-secondary)" : "transparent",
            color: exported ? "var(--bg-primary)" : messages.length > 0 ? "var(--text-secondary)" : "var(--text-tertiary)",
            ...TYPE.sm, cursor: messages.length > 0 ? "pointer" : "default",
            transition: "all 0.2s",
            opacity: messages.length === 0 ? 0.5 : 1,
          }}
        >
          {exported ? <Check size={12} /> : <Download size={12} />}
          {exported ? "Copied" : "Export all threads"}
        </button>

        <button
          onClick={handleClearAll}
          disabled={messages.length === 0}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 6,
            border: "1px solid var(--border)",
            background: cleared ? "var(--bg-elevated)" : "transparent",
            color: cleared ? "var(--text-secondary)" : messages.length > 0 ? "var(--text-tertiary)" : "var(--text-tertiary)",
            ...TYPE.sm, cursor: messages.length > 0 ? "pointer" : "default",
            transition: "all 0.2s",
            opacity: messages.length === 0 ? 0.5 : 1,
          }}
        >
          {cleared ? <Check size={12} /> : <Trash2 size={12} />}
          {cleared ? "Cleared" : "Purge all memory"}
        </button>
      </div>
    </div>
  )
}

// ─── Source Grid — two-column layout for source lists ───────────────────

function SourceGrid({ sources, type, excludedSources, onToggleSource }: {
  sources: Record<string, Array<{ url: string; source?: string; show?: string; category: string; layer: string }>>
  type: "source" | "show"
  excludedSources: Set<string>
  onToggleSource: (name: string) => void
}) {
  return (
    <>
      {LAYERS.map(layer => {
        const items = sources[layer]
        if (!items?.length) return null
        const getName = (f: { source?: string; show?: string }) => type === "show" ? f.show || "" : f.source || ""
        return (
          <div key={layer} style={{ marginBottom: 16 }}>
            <div style={{ ...TYPE.sm, fontWeight: 500, color: LAYER_DOT[layer], textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, paddingLeft: 4 }}>
              {LAYER_LABELS[layer]}
              <span style={{ color: "var(--text-tertiary)", marginLeft: 6 }}>
                ({items.filter(f => !excludedSources.has(getName(f))).length})
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {items.map(feed => {
                const name = getName(feed)
                const active = !excludedSources.has(name)
                return (
                  <div
                    key={feed.url}
                    onClick={() => onToggleSource(name)}
                    style={{ ...rowStyle, opacity: active ? 1 : 0.5, padding: "6px 8px" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                  >
                    <Toggle active={active} onToggle={() => onToggleSource(name)} />
                    <span style={{ ...TYPE.body, color: active ? "var(--text-primary)" : "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}

// ─── ConfigView ─────────────────────────────────────────────────────────────

export function ConfigView({ excludedSources, onToggleSource, feedHealth, articles = [] }: ConfigViewProps) {
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
        </div>

        <SourceGrid sources={newsGroups} type="source" excludedSources={excludedSources} onToggleSource={onToggleSource} />
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

        <SourceGrid sources={socialGroups} type="source" excludedSources={excludedSources} onToggleSource={onToggleSource} />
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
        </div>

        <SourceGrid sources={podGroups} type="show" excludedSources={excludedSources} onToggleSource={onToggleSource} />
      </div>

      <div style={separator} />

      {/* ── Gallery Sources ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={sectionLabel}>
          Gallery Sources
          <span style={{ color: "var(--text-tertiary)", marginLeft: 8, fontWeight: 400 }}>
            {GALLERY_SOURCES.length} feeds
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {GALLERY_SOURCES.map(src => (
            <div key={src.url} style={{ ...rowStyle, cursor: "default" }}>
              <span style={{ ...TYPE.body, color: "var(--text-primary)" }}>{src.name}</span>
              <span style={badgeStyle("var(--text-tertiary)")}>{src.type}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={separator} />

      {/* ── Export ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={sectionLabel}>Export</div>
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

          {/* Feed Health — Source Pulse */}
          {feedHealth && (
            <>
              <div style={{ color: "var(--text-tertiary)", marginTop: 12, marginBottom: 4 }}>FEED HEALTH</div>
              <div>
                <span style={{ color: feedHealth.sourcesLive / feedHealth.sourcesTotal >= 0.8 ? "var(--live)" : feedHealth.sourcesLive / feedHealth.sourcesTotal >= 0.5 ? "#D4A05A" : "#ef4444" }}>●</span>
                {" "}{feedHealth.sourcesLive}/{feedHealth.sourcesTotal} sources live ({Math.round(feedHealth.sourcesLive / feedHealth.sourcesTotal * 100)}%)
              </div>
              {feedHealth.sourcesFailed > 0 && (
                <div style={{ color: "#ef4444" }}>
                  <span>●</span> {feedHealth.sourcesFailed} sources failed
                </div>
              )}
              {feedHealth.stubCategories?.length > 0 && (
                <div>Stub fallback: {feedHealth.stubCategories.join(", ")}</div>
              )}
            </>
          )}

          {/* Per-source breakdown */}
          {articles && articles.length > 0 && (() => {
            const sourceMap: Record<string, { count: number; annotated: number; live: boolean; tag: string }> = {}
            articles.forEach(a => {
              if (!sourceMap[a.source]) sourceMap[a.source] = { count: 0, annotated: 0, live: a.url !== "#", tag: a.tag }
              sourceMap[a.source].count++
              if (a.synopsis || a.relevance) sourceMap[a.source].annotated++
            })
            const sources = Object.entries(sourceMap).sort((a, b) => b[1].count - a[1].count)
            const totalAnnotated = articles.filter(a => a.synopsis || a.relevance).length

            return (
              <>
                <div style={{ color: "var(--text-tertiary)", marginTop: 12, marginBottom: 4 }}>SOURCE PULSE ({sources.length} sources, {totalAnnotated}/{articles.length} annotated)</div>
                <div style={{ maxHeight: 240, overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
                  {sources.map(([name, stats]) => (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                        background: stats.live ? "var(--live)" : "#ef4444",
                      }} />
                      <span style={{
                        flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        color: stats.live ? "var(--text-secondary)" : "var(--text-tertiary)",
                        opacity: stats.live ? 1 : 0.6,
                      }}>
                        {name}
                      </span>
                      <span style={{ color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums", minWidth: 20, textAlign: "right" }}>
                        {stats.count}
                      </span>
                      {stats.annotated > 0 && (
                        <span style={{ color: "var(--accent-muted)", fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>
                          ✓{stats.annotated}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )
          })()}

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

      <div style={{ height: 32 }} />
    </div>
  )
}
