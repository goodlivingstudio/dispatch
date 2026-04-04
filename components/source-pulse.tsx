"use client"

import { useState, useEffect, useMemo } from "react"
import { RefreshCw } from "lucide-react"
import { TYPE, MONO, metaStyle } from "@/lib/styles"
import type { Article, FeedHealth } from "@/lib/types"

// ─── Types ──────────────────────────────────────────────────────────────────

interface SourceStat {
  name: string
  count: number
  annotated: number
  live: boolean
  tag: string
  avgUrgency: number
  highestUrgency: number
  consecutiveFailures: number
}

interface LayerHealth {
  layer: string
  articleCount: number
  annotatedCount: number
  avgUrgency: number
  sources: number
}

interface PipelineStatus {
  totalArticles: number
  annotatedServer: number
  annotatedClient: number
  unannotated: number
  deduped: boolean
}

interface CacheStatus {
  annotationAge: string | null
  kvAvailable: boolean
  isrAge: string | null
}

const LAYER_LABELS: Record<string, string> = {
  opportunity: "Opportunity",
  position: "Position",
  discipline: "Discipline",
  landscape: "Landscape",
  culture: "Culture",
}

const LAYER_COLOR: Record<string, string> = {
  opportunity: "#D4A05A",
  position: "#5A9EB0",
  discipline: "#7BAF6A",
  landscape: "#9A85B8",
  culture: "#C87A6A",
}

// ─── Metric Card ────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color, width }: {
  label: string
  value: string | number
  sub?: string
  color?: string
  width?: string
}) {
  return (
    <div style={{
      background: "var(--bg-surface)", borderRadius: 12, padding: "14px 16px",
      flex: width || "1", minWidth: 0,
    }}>
      <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color || "var(--text-primary)", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  )
}

// ─── Layer Bar ──────────────────────────────────────────────────────────────

function LayerBar({ layer, health, maxArticles }: { layer: LayerHealth; health: number; maxArticles: number }) {
  const barWidth = maxArticles > 0 ? (layer.articleCount / maxArticles) * 100 : 0
  const annotationPct = layer.articleCount > 0 ? Math.round((layer.annotatedCount / layer.articleCount) * 100) : 0

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
      <div style={{ width: 80, flexShrink: 0 }}>
        <div style={{ ...TYPE.sm, color: LAYER_COLOR[layer.layer] || "var(--text-secondary)", fontWeight: 500 }}>
          {LAYER_LABELS[layer.layer] || layer.layer}
        </div>
      </div>
      {/* Count — left of bar */}
      <div style={{ width: 28, flexShrink: 0, textAlign: "right" }}>
        <span style={{ ...TYPE.sm, fontVariantNumeric: "tabular-nums", color: "var(--text-secondary)", fontWeight: 500 }}>
          {layer.articleCount}
        </span>
      </div>
      <div style={{ flex: 1, position: "relative", height: 16, background: "var(--bg-surface)", borderRadius: 4, overflow: "hidden" }}>
        {/* Article volume bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, height: "100%",
          width: `${barWidth}%`,
          background: LAYER_COLOR[layer.layer] || "var(--accent-muted)",
          opacity: 0.25,
          borderRadius: 4,
          transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }} />
        {/* Annotated portion */}
        <div style={{
          position: "absolute", top: 0, left: 0, height: "100%",
          width: `${barWidth * (annotationPct / 100)}%`,
          background: LAYER_COLOR[layer.layer] || "var(--accent-muted)",
          opacity: 0.5,
          borderRadius: 4,
          transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }} />
      </div>
      <div style={{ width: 50, flexShrink: 0, textAlign: "right" }}>
        <span style={{ ...TYPE.xs, fontFamily: MONO, color: annotationPct === 100 ? "var(--live)" : annotationPct > 50 ? "var(--text-tertiary)" : "#ef4444" }}>
          {annotationPct}%
        </span>
      </div>
      <div style={{ width: 40, flexShrink: 0, textAlign: "right" }}>
        <span style={{ ...TYPE.xs, fontFamily: MONO, color: layer.avgUrgency >= 7 ? "#D4A05A" : "var(--text-tertiary)" }}>
          u{layer.avgUrgency.toFixed(1)}
        </span>
      </div>
    </div>
  )
}

// ─── Source Row ──────────────────────────────────────────────────────────────

function SourceRow({ source }: { source: SourceStat }) {
  const isPersistentFailure = source.consecutiveFailures >= 5
  const isWarning = source.consecutiveFailures >= 2

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "4px 0",
      background: isPersistentFailure ? "rgba(239, 68, 68, 0.06)" : "transparent",
      borderRadius: isPersistentFailure ? 4 : 0,
      margin: isPersistentFailure ? "0 -4px" : 0,
      paddingLeft: isPersistentFailure ? 4 : 0,
      paddingRight: isPersistentFailure ? 4 : 0,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
        background: source.live ? "var(--live)" : "#ef4444",
        boxShadow: source.live ? "0 0 4px var(--live)" : "0 0 4px #ef4444",
      }} />
      <span style={{
        flex: 1, ...TYPE.sm, fontFamily: MONO,
        color: isPersistentFailure ? "#ef4444" : source.live ? "var(--text-secondary)" : "var(--text-tertiary)",
        opacity: source.live && !isPersistentFailure ? 1 : isPersistentFailure ? 0.9 : 0.5,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {source.name}
        {isWarning && (
          <span style={{
            ...TYPE.xs, fontFamily: MONO, marginLeft: 6,
            color: isPersistentFailure ? "#ef4444" : "#D4A05A",
            fontWeight: 600,
          }}>
            {source.consecutiveFailures}x
          </span>
        )}
      </span>
      <span style={{
        ...TYPE.xs, fontFamily: MONO, color: LAYER_COLOR[source.tag] || "var(--text-tertiary)",
        textTransform: "uppercase", width: 30, textAlign: "center",
      }}>
        {source.tag.slice(0, 3)}
      </span>
      <span style={{ ...TYPE.xs, fontFamily: MONO, color: "var(--text-tertiary)", width: 24, textAlign: "right" }}>
        {source.count}
      </span>
      <span style={{
        ...TYPE.xs, fontFamily: MONO, width: 28, textAlign: "right",
        color: source.annotated > 0 ? "var(--accent-muted)" : "var(--text-tertiary)",
        opacity: source.annotated > 0 ? 1 : 0.3,
      }}>
        {source.annotated > 0 ? `${source.annotated}` : "—"}
      </span>
      <span style={{
        ...TYPE.xs, fontFamily: MONO, width: 24, textAlign: "right",
        color: source.highestUrgency >= 8 ? "#D4A05A" : source.highestUrgency >= 6 ? "var(--text-tertiary)" : "var(--text-tertiary)",
        opacity: source.highestUrgency > 0 ? 1 : 0.3,
      }}>
        {source.highestUrgency > 0 ? source.highestUrgency : "—"}
      </span>
    </div>
  )
}

// ─── Cache Management ─────────────────────────────────────────────────────

function formatCacheAge(iso: string | null): string {
  if (!iso) return "no cache"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function CacheManagement() {
  const [audioStatus, setAudioStatus] = useState<"idle" | "running" | "done" | "error">("idle")
  const [audioResult, setAudioResult] = useState<string>("")
  const [synthStatus, setSynthStatus] = useState<"idle" | "running" | "done" | "error">("idle")
  const [dispatchStatus, setDispatchStatus] = useState<"idle" | "running" | "done" | "error">("idle")
  const [cacheAges, setCacheAges] = useState<{ audio: string | null; synthesis: string | null; dispatch: string | null }>({ audio: null, synthesis: null, dispatch: null })

  useEffect(() => {
    fetch("/api/cache-status").then(r => r.json()).then(setCacheAges).catch(() => {})
  }, [audioStatus, synthStatus, dispatchStatus]) // refetch after any action

  const purge = async (
    endpoint: string,
    setStatus: (s: "idle" | "running" | "done" | "error") => void,
    label: string,
  ) => {
    setStatus("running")
    try {
      const res = await fetch(endpoint, { method: "POST" })
      if (res.ok) setStatus("done")
      else setStatus("error")
    } catch { setStatus("error") }
    setTimeout(() => setStatus("idle"), 3000)
  }

  const regenAudio = async () => {
    setAudioStatus("running")
    let totalGen = 0, totalFail = 0, batch = 0
    try {
      while (true) {
        setAudioResult(`Batch ${batch + 1} — generating...`)
        const res = await fetch(`/api/regen-audio-images?batch=${batch}`, { method: "POST" })
        if (!res.ok) { setAudioStatus("error"); setAudioResult("Failed"); return }
        const data = await res.json()
        totalGen += data.generated
        totalFail += data.failed
        if (data.done) break
        batch++
      }
      setAudioStatus("done")
      setAudioResult(`${totalGen} generated${totalFail ? `, ${totalFail} failed` : ""}`)
    } catch {
      setAudioStatus("error")
      setAudioResult("Failed")
    }
  }

  const actions = [
    {
      label: "Audio Artwork",
      desc: "Regenerate podcast watercolors",
      status: audioStatus,
      sub: audioResult,
      action: regenAudio,
      age: cacheAges.audio,
    },
    {
      label: "Synthesis",
      desc: "Clear cache — regenerates on next visit",
      status: synthStatus,
      action: () => purge("/api/synthesis-purge", setSynthStatus, "Synthesis"),
      age: cacheAges.synthesis,
    },
    {
      label: "Dispatch",
      desc: "Clear cache — regenerates on next visit",
      status: dispatchStatus,
      action: () => purge("/api/dispatch-purge", setDispatchStatus, "Dispatch"),
      age: cacheAges.dispatch,
    },
  ]

  return (
    <div>
      <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        Cache Management
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {actions.map(a => (
          <button
            key={a.label}
            onClick={a.action}
            disabled={a.status === "running"}
            style={{
              flex: 1, background: "var(--bg-surface)", borderRadius: 8, padding: "10px 14px",
              border: "none", cursor: a.status === "running" ? "wait" : "pointer",
              display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { if (a.status !== "running") e.currentTarget.style.background = "var(--bg-elevated)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-surface)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
              <RefreshCw
                size={10}
                style={{
                  color: a.status === "done" ? "var(--live)" : a.status === "error" ? "#ef4444" : "var(--text-tertiary)",
                  animation: a.status === "running" ? "spin 1s linear infinite" : "none",
                }}
              />
              <span style={{
                ...TYPE.sm, fontFamily: MONO,
                color: a.status === "done" ? "var(--live)" : a.status === "error" ? "#ef4444" : "var(--text-secondary)",
              }}>
                {a.label}
              </span>
            </div>
            <span style={{ ...TYPE.xs, color: "var(--text-tertiary)", textAlign: "left" }}>
              {a.status === "running" ? (a.sub || "Working...") : a.status === "done" ? (a.sub || "Done") : a.desc}
            </span>
            {a.status === "idle" && (
              <span style={{ ...TYPE.xs, fontFamily: MONO, color: "var(--text-tertiary)", opacity: 0.6, marginTop: 2 }}>
                {formatCacheAge(a.age)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Source Pulse View ──────────────────────────────────────────────────────

export function SourcePulseView({ articles, feedHealth, fetchedAt }: {
  articles: Article[]
  feedHealth: FeedHealth | null
  fetchedAt: string | null
}) {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [now, setNow] = useState(Date.now())

  // Live clock tick for freshness indicators
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])

  const fetchDiagnostics = () => {
    setHealthLoading(true)
    fetch("/api/health")
      .then(r => r.json())
      .then(data => { setHealth(data); setHealthLoading(false) })
      .catch(() => setHealthLoading(false))
  }

  useEffect(() => { fetchDiagnostics() }, [])

  // ── Derived metrics ─────────────────────────────────────────────────────

  const failures = feedHealth?.sourceFailures || {}

  const sourceStats = useMemo((): SourceStat[] => {
    const map: Record<string, SourceStat> = {}
    articles.forEach(a => {
      if (!map[a.source]) map[a.source] = { name: a.source, count: 0, annotated: 0, live: a.url !== "#", tag: a.tag, avgUrgency: 0, highestUrgency: 0, consecutiveFailures: 0 }
      map[a.source].count++
      if (a.synopsis || a.relevance) map[a.source].annotated++
      const u = a.signalScores?.urgency ?? 0
      map[a.source].avgUrgency += u
      if (u > map[a.source].highestUrgency) map[a.source].highestUrgency = u
    })
    // Merge failure counts from KV
    for (const [name, count] of Object.entries(failures)) {
      if (map[name]) map[name].consecutiveFailures = count
    }
    return Object.values(map)
      .map(s => ({ ...s, avgUrgency: s.count > 0 ? s.avgUrgency / s.count : 0 }))
      .sort((a, b) => {
        // Primary: highest urgency first (10 → 1 → 0/unannotated)
        if (b.highestUrgency !== a.highestUrgency) return b.highestUrgency - a.highestUrgency
        // Secondary: article count
        return b.count - a.count
      })
  }, [articles, failures])

  const layerHealth = useMemo((): LayerHealth[] => {
    const layers = ["opportunity", "position", "discipline", "landscape", "culture"]
    return layers.map(layer => {
      const layerArticles = articles.filter(a => a.tag === layer)
      const annotated = layerArticles.filter(a => a.synopsis || a.relevance)
      const urgencies = layerArticles.map(a => a.signalScores?.urgency ?? 0)
      const avgUrgency = urgencies.length > 0 ? urgencies.reduce((s, v) => s + v, 0) / urgencies.length : 0
      const sources = new Set(layerArticles.map(a => a.source)).size
      return { layer, articleCount: layerArticles.length, annotatedCount: annotated.length, avgUrgency, sources }
    })
  }, [articles])

  const pipeline = useMemo((): PipelineStatus => {
    const annotated = articles.filter(a => a.synopsis || a.relevance)
    return {
      totalArticles: articles.length,
      annotatedServer: annotated.filter(a => a.signalScores !== undefined).length,
      annotatedClient: annotated.filter(a => a.signalScores === undefined).length,
      unannotated: articles.length - annotated.length,
      deduped: true,
    }
  }, [articles])

  const cache = useMemo((): CacheStatus => {
    let annotationAge: string | null = null
    try {
      const raw = localStorage.getItem("dispatch-annotations-v3")
      if (raw) {
        const { ts } = JSON.parse(raw)
        const mins = Math.round((now - ts) / 60000)
        annotationAge = mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`
      }
    } catch { /* */ }

    return {
      annotationAge,
      kvAvailable: !!(health?.env && typeof health.env === "object" && (health.env as Record<string, string>).KV_REST_API_URL?.startsWith("set")),
      isrAge: fetchedAt ? `${Math.round((now - new Date(fetchedAt).getTime()) / 60000)}m` : null,
    }
  }, [now, health, fetchedAt])

  const totalSources = feedHealth?.sourcesTotal ?? sourceStats.length
  const liveSources = feedHealth?.sourcesLive ?? sourceStats.filter(s => s.live).length
  const failedSources = feedHealth?.sourcesFailed ?? sourceStats.filter(s => !s.live).length
  const healthPct = totalSources > 0 ? Math.round((liveSources / totalSources) * 100) : 0
  const maxLayerArticles = Math.max(...layerHealth.map(l => l.articleCount), 1)
  const annotationPct = pipeline.totalArticles > 0 ? Math.round(((pipeline.annotatedServer + pipeline.annotatedClient) / pipeline.totalArticles) * 100) : 0

  const overallColor = healthPct >= 90 ? "var(--live)" : healthPct >= 70 ? "#D4A05A" : "#ef4444"

  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-primary)" }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, height: 40, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ ...TYPE.sm, fontFamily: MONO, color: "var(--accent-muted)", textTransform: "uppercase" }}>
            Source Pulse
          </span>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: overallColor,
            boxShadow: `0 0 6px ${overallColor}`,
          }} />
          <span style={{ ...TYPE.xs, fontFamily: MONO, color: overallColor }}>{healthPct}%</span>
        </div>
        <button
          onClick={fetchDiagnostics}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 6,
            border: "1px solid var(--border)", background: "transparent",
            ...metaStyle, cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
        >
          <RefreshCw size={11} style={{ animation: healthLoading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      <div className="view-padding" style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Top metrics row ── */}
          <div style={{ display: "flex", gap: 8 }}>
            <MetricCard label="Sources" value={`${liveSources}/${totalSources}`} sub={failedSources > 0 ? `${failedSources} failed` : "all healthy"} color={failedSources > 0 ? "#D4A05A" : "var(--live)"} />
            <MetricCard label="Articles" value={pipeline.totalArticles} sub={`${sourceStats.length} sources reporting`} />
            <MetricCard label="Annotated" value={`${annotationPct}%`} sub={`${pipeline.annotatedServer} server · ${pipeline.annotatedClient} client`} color={annotationPct >= 80 ? "var(--live)" : annotationPct >= 50 ? "#D4A05A" : "#ef4444"} />
            <MetricCard label="ISR Cache" value={cache.isrAge || "—"} sub={cache.annotationAge ? `annotations: ${cache.annotationAge}` : "no cache"} />
          </div>

          {/* ── API Status ── */}
          <div>
            <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              API Connections
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { name: "Anthropic", check: () => health?.anthropic === "ok — API responding" },
                { name: "Exa Search", check: () => String((health?.env as Record<string, string>)?.EXA_API_KEY || "").startsWith("set") },
                { name: "KV Memory", check: () => String((health?.env as Record<string, string>)?.KV_REST_API_URL || "").startsWith("set") },
                { name: "Are.na", check: () => String((health?.env as Record<string, string>)?.ARENA_ACCESS_TOKEN || "").startsWith("set") },
                { name: "Replicate", check: () => String((health?.env as Record<string, string>)?.REPLICATE_API_TOKEN || "").startsWith("set") },
              ].map(api => {
                const ok = health ? api.check() : null
                return (
                  <div key={api.name} style={{
                    flex: 1, background: "var(--bg-surface)", borderRadius: 8, padding: "10px 14px",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: ok === null ? "var(--text-tertiary)" : ok ? "var(--live)" : "#ef4444",
                      boxShadow: ok ? `0 0 4px ${ok ? "var(--live)" : "#ef4444"}` : "none",
                    }} />
                    <span style={{ ...TYPE.sm, fontFamily: MONO, color: ok === null ? "var(--text-tertiary)" : ok ? "var(--text-secondary)" : "#ef4444" }}>
                      {api.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Cache Management ── */}
          <CacheManagement />

          {/* ── Layer Coverage ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Layer Coverage
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ ...TYPE.xs, color: "var(--text-tertiary)" }}>volume</span>
                <span style={{ ...TYPE.xs, color: "var(--text-tertiary)", width: 50, textAlign: "right" }}>annot.</span>
                <span style={{ ...TYPE.xs, color: "var(--text-tertiary)", width: 40, textAlign: "right" }}>urg.</span>
              </div>
            </div>
            <div style={{ background: "var(--bg-surface)", borderRadius: 12, padding: "8px 14px" }}>
              {layerHealth.map(lh => (
                <LayerBar key={lh.layer} layer={lh} health={0} maxArticles={maxLayerArticles} />
              ))}
            </div>
          </div>

          {/* ── Layer Glossary ── */}
          <div>
            <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Intelligence Layers
            </div>
            <div style={{ background: "var(--bg-surface)", borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
              {([
                { layer: "Opportunity", color: "#D4A05A", what: "Healthcare, pharma, AI-health signal", why: "Direct relevance to the Lilly engagement and the broader healthcare transformation thesis. Signals here inform positioning for healthcare design leadership." },
                { layer: "Position", color: "#5A9EB0", what: "Career trajectory — hiring, comp, competitive positioning", why: "Tracks the market for senior design leadership roles. CDO/Head of Design hiring patterns, agency-to-in-house transitions, what organizations are hiring to solve." },
                { layer: "Discipline", color: "#7BAF6A", what: "How design leadership is evolving as a function", why: "The profession is changing — CDO role scope, AI impact on practice, design-engineering convergence, org design. Staying current here is non-negotiable." },
                { layer: "Landscape", color: "#9A85B8", what: "Broader forces shaping the operating environment", why: "AI policy, healthcare regulation, economic shifts affecting hiring and investment. The macro context that every other layer operates within." },
                { layer: "Culture", color: "#C87A6A", what: "Taste, criticism, creative practice", why: "Architecture, film, music, cultural theory. A design leader who only reads industry publications is a technician. Formation signals develop the judgment that separates leaders from practitioners." },
              ]).map(item => (
                <div key={item.layer}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                    <span style={{ ...TYPE.sm, color: "var(--text-primary)", fontWeight: 500 }}>{item.layer}</span>
                    <span style={{ ...TYPE.xs, color: "var(--text-tertiary)" }}>{item.what}</span>
                  </div>
                  <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", lineHeight: 1.6, paddingLeft: 16 }}>
                    {item.why}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Annotation Pipeline ── */}
          <div>
            <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Annotation Pipeline
            </div>
            <div style={{ background: "var(--bg-surface)", borderRadius: 12, padding: "14px 16px" }}>
              {/* Pipeline bar */}
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "var(--bg-elevated)", marginBottom: 10 }}>
                {pipeline.annotatedServer > 0 && (
                  <div style={{ width: `${(pipeline.annotatedServer / pipeline.totalArticles) * 100}%`, background: "var(--live)", transition: "width 0.6s" }} title={`Server: ${pipeline.annotatedServer}`} />
                )}
                {pipeline.annotatedClient > 0 && (
                  <div style={{ width: `${(pipeline.annotatedClient / pipeline.totalArticles) * 100}%`, background: "#D4A05A", transition: "width 0.6s" }} title={`Client: ${pipeline.annotatedClient}`} />
                )}
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--live)" }} />
                  <span style={{ ...TYPE.xs, fontFamily: MONO, color: "var(--text-secondary)" }}>Server ISR ({pipeline.annotatedServer})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "#D4A05A" }} />
                  <span style={{ ...TYPE.xs, fontFamily: MONO, color: "var(--text-secondary)" }}>Client fallback ({pipeline.annotatedClient})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--bg-elevated)" }} />
                  <span style={{ ...TYPE.xs, fontFamily: MONO, color: "var(--text-tertiary)" }}>Unannotated ({pipeline.unannotated})</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Source Grid ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Source Grid ({sourceStats.length} sources)
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ ...TYPE.xs, color: "var(--text-tertiary)", fontFamily: MONO }}>layer</span>
                <span style={{ ...TYPE.xs, color: "var(--text-tertiary)", fontFamily: MONO, width: 24, textAlign: "right" }}>qty</span>
                <span style={{ ...TYPE.xs, color: "var(--text-tertiary)", fontFamily: MONO, width: 28, textAlign: "right" }}>ann</span>
                <span style={{ ...TYPE.xs, color: "var(--text-tertiary)", fontFamily: MONO, width: 24, textAlign: "right" }}>urg</span>
              </div>
            </div>
            <div style={{ background: "var(--bg-surface)", borderRadius: 12, padding: "8px 14px" }}>
              {sourceStats.map(source => (
                <SourceRow key={source.name} source={source} />
              ))}
            </div>
          </div>

          {/* ── Estimated Daily Cost ── */}
          <div>
            <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Estimated Daily Cost
            </div>
            <div style={{ background: "var(--bg-surface)", borderRadius: 12, padding: "14px 16px" }}>
              {(() => {
                // Cost model based on Anthropic pricing (April 2026)
                // Haiku: $0.25/M input, $1.25/M output
                // Sonnet: $3/M input, $15/M output
                const isrCyclesPerDay = 48 // 30-min cache
                const annotationBatches = 2 // server-side per cycle
                const annotationTokensIn = 1000 // ~1K input per batch
                const annotationTokensOut = 2000 // ~2K output per batch
                const annotationCostPerCycle = annotationBatches * ((annotationTokensIn * 0.25 / 1e6) + (annotationTokensOut * 1.25 / 1e6))
                const annotationDaily = annotationCostPerCycle * isrCyclesPerDay

                const briefCostPerCall = (2000 * 0.25 / 1e6) + (800 * 1.25 / 1e6) // Haiku
                const briefDaily = briefCostPerCall * 5 // ~5 page loads/day

                const synthesisCostPerCall = (3000 * 0.25 / 1e6) + (1500 * 1.25 / 1e6) // Haiku
                const synthesisDaily = synthesisCostPerCall * 3 // ~3 views/day

                const cerebroCostPerTurn = (4000 * 3 / 1e6) + (800 * 15 / 1e6) // Sonnet
                const cerebroDaily = cerebroCostPerTurn * 10 // ~10 turns/day estimate

                const dispatchWeekly = (5000 * 3 / 1e6) + (2500 * 15 / 1e6) // Sonnet, 1x/week
                const dispatchDaily = dispatchWeekly / 7

                const clientAnnotation = 1 * ((1000 * 0.25 / 1e6) + (2000 * 1.25 / 1e6)) * 5 // 1 batch × 5 visits

                // Replicate image generation (Flux Schnell ~$0.003/image)
                const replicatePerImage = 0.003
                const synthesisImages = 4 * 3 // 4 convergence cards × ~3 views/day
                const dispatchImages = 5 / 7 // 5 pitch cards × 1/week
                const replicateDaily = (synthesisImages + dispatchImages) * replicatePerImage

                const totalDaily = annotationDaily + briefDaily + synthesisDaily + cerebroDaily + dispatchDaily + clientAnnotation + replicateDaily

                const items = [
                  { label: "Annotation (server ISR)", cost: annotationDaily, model: "Haiku" },
                  { label: "Annotation (client)", cost: clientAnnotation, model: "Haiku" },
                  { label: "DCOS Brief", cost: briefDaily, model: "Haiku" },
                  { label: "Synthesis", cost: synthesisDaily, model: "Haiku" },
                  { label: "Cerebro (~10 turns)", cost: cerebroDaily, model: "Sonnet" },
                  { label: "Dispatch (weekly)", cost: dispatchDaily, model: "Sonnet" },
                  { label: "Image gen (Flux)", cost: replicateDaily, model: "Replicate" },
                ]

                const monthlyEstimate = totalDaily * 30
                const isHealthy = monthlyEstimate < 40
                const isWarning = monthlyEstimate >= 40 && monthlyEstimate < 80

                return (
                  <>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 20, fontWeight: 600, color: isHealthy ? "var(--live)" : isWarning ? "#D4A05A" : "#ef4444" }}>
                        ${totalDaily.toFixed(2)}/day
                      </span>
                      <span style={{ ...TYPE.sm, color: "var(--text-tertiary)" }}>
                        ~${monthlyEstimate.toFixed(0)}/mo
                      </span>
                      {!isHealthy && (
                        <span style={{ ...TYPE.xs, color: isWarning ? "#D4A05A" : "#ef4444", fontWeight: 600 }}>
                          {isWarning ? "WATCH" : "HIGH"}
                        </span>
                      )}
                    </div>
                    {items.map(item => (
                      <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
                        <span style={{ flex: 1, ...TYPE.sm, fontFamily: MONO, color: "var(--text-secondary)" }}>
                          {item.label}
                        </span>
                        <span style={{ ...TYPE.xs, color: "var(--text-tertiary)", width: 44 }}>
                          {item.model}
                        </span>
                        <span style={{ ...TYPE.xs, fontFamily: MONO, color: "var(--text-tertiary)", width: 50, textAlign: "right" }}>
                          ${item.cost.toFixed(3)}
                        </span>
                      </div>
                    ))}
                    <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
                    <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                      Estimates based on typical usage (5 visits, 10 Cerebro turns/day). Actual costs depend on usage patterns. Annotation is the largest fixed cost.
                    </div>
                  </>
                )
              })()}
            </div>
          </div>

          {/* ── Stub Fallback ── */}
          {feedHealth?.stubCategories && feedHealth.stubCategories.length > 0 && (
            <div style={{
              background: "rgba(239, 68, 68, 0.08)", borderRadius: 12, padding: "12px 16px",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}>
              <div style={{ ...TYPE.xs, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Stub Fallback Active
              </div>
              <div style={{ ...TYPE.sm, fontFamily: MONO, color: "var(--text-secondary)" }}>
                Layers on curated stubs: {feedHealth.stubCategories.join(", ")}
              </div>
            </div>
          )}

          <div style={{ height: 24 }} />
        </div>
      </div>
    </main>
  )
}
