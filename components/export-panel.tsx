"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Copy, Check, Download } from "lucide-react"
import { TYPE, MONO, labelStyle, bodyStyle, metaStyle } from "@/lib/styles"
import type { Article, Signal } from "@/lib/types"

// ─── Export Settings Types ──────────────────────────────────────────────────

type ExportScope = "brief" | "brief+synthesis" | "full"
type ExportDepth = "executive" | "full"
type ExportFormat = "markdown" | "plaintext"
type ExportRedaction = "full" | "redacted"
type ExportCadence = "daily" | "weekly" | "share"

interface ExportSettings {
  scope: ExportScope
  depth: ExportDepth
  format: ExportFormat
  redaction: ExportRedaction
  cadence: ExportCadence
  includeScores: boolean
}

const DEFAULTS: ExportSettings = {
  scope: "brief+synthesis",
  depth: "executive",
  format: "markdown",
  redaction: "full",
  cadence: "daily",
  includeScores: false,
}

const SETTINGS_KEY = "dispatch-export-settings"

function loadSettings(): ExportSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { /* use defaults */ }
  return DEFAULTS
}

function saveSettings(settings: ExportSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch {}
}

// ─── Chip selector ──────────────────────────────────────────────────────────

function ChipGroup<T extends string>({ label, options, value, onChange }: {
  label: string
  options: { id: T; label: string; description?: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...metaStyle, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map(opt => {
          const isActive = value === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              title={opt.description}
              style={{
                ...TYPE.sm, padding: "5px 14px", borderRadius: 9999, border: "none",
                background: isActive ? "var(--accent-primary)" : "transparent",
                color: isActive ? "var(--accent-secondary)" : "var(--text-tertiary)",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg-elevated)" }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? "var(--accent-primary)" : "transparent" }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Export Generator ───────────────────────────────────────────────────────

function generateExport(
  settings: ExportSettings,
  signals: Signal[],
  synthesisData: { briefing?: string; patterns?: { title: string; description: string }[]; blindSpotNote?: string } | null,
  articles: Article[],
): string {
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  const lines: string[] = []

  const isMarkdown = settings.format === "markdown"
  const h1 = isMarkdown ? "# " : ""
  const h2 = isMarkdown ? "## " : ""
  const h3 = isMarkdown ? "### " : ""
  const bold = (t: string) => isMarkdown ? `**${t}**` : t.toUpperCase()
  const separator = isMarkdown ? "\n---\n" : "\n————\n"

  // Header
  if (settings.cadence === "daily") {
    lines.push(`${h1}Dispatch Daily Intelligence — ${date}`)
  } else if (settings.cadence === "weekly") {
    lines.push(`${h1}Dispatch Weekly Review — Week of ${date}`)
  } else {
    lines.push(`${h1}Dispatch Intelligence Brief — ${date}`)
  }

  if (settings.redaction === "redacted") {
    lines.push(`\n${isMarkdown ? "_" : ""}Lilly-specific intelligence redacted for external sharing.${isMarkdown ? "_" : ""}`)
  }

  // DCOS Brief
  const realSignals = signals.filter(s => s.body)
  if (realSignals.length > 0) {
    lines.push(separator)
    lines.push(`${h2}Today's Signals`)
    for (const s of realSignals) {
      const body = s.body.replace(/\[\d+\]/g, "")
      if (settings.redaction === "redacted" && /lilly|donanemab|lillydirect|zepbound|mounjaro|retatrutide/i.test(body)) {
        continue // skip Lilly-specific signals in redacted mode
      }
      lines.push(`\n${bold(s.label)}`)
      lines.push(body.trim())
    }
  }

  // Synthesis
  if (settings.scope !== "brief" && synthesisData) {
    lines.push(separator)
    lines.push(`${h2}Pattern Intelligence`)
    if (synthesisData.briefing) {
      lines.push(`\n${synthesisData.briefing}`)
    }
    if (synthesisData.patterns && settings.depth === "full") {
      for (const p of synthesisData.patterns) {
        lines.push(`\n${h3}${p.title}`)
        lines.push(p.description)
      }
    }
    if (synthesisData.blindSpotNote) {
      lines.push(`\n${bold("Blind Spot:")} ${synthesisData.blindSpotNote}`)
    }
  }

  // Full: top signals from feed
  if (settings.scope === "full") {
    lines.push(separator)
    lines.push(`${h2}Top Signals by Urgency`)
    const sorted = [...articles]
      .filter(a => a.signalScores?.urgency && a.signalScores.urgency >= 6 && a.url !== "#")
      .sort((a, b) => (b.signalScores?.urgency ?? 0) - (a.signalScores?.urgency ?? 0))
      .slice(0, 10)

    for (const a of sorted) {
      if (settings.redaction === "redacted" && /lilly|donanemab|lillydirect/i.test(a.title)) continue
      const urgency = a.signalScores?.urgency ?? 0
      const scores = settings.includeScores && a.signalScores
        ? ` (${Object.entries(a.signalScores).filter(([, v]) => v >= 5).map(([k, v]) => `${k}:${v}`).join(", ")})`
        : ""
      lines.push(`\n- ${isMarkdown ? `[${urgency}]` : `[${urgency}]`} ${a.title} — ${a.source}${scores}`)
    }
  }

  // Footer
  lines.push(separator)
  lines.push(`${isMarkdown ? "_" : ""}Generated by Dispatch · ${new Date().toISOString().slice(0, 16).replace("T", " ")}${isMarkdown ? "_" : ""}`)

  return lines.join("\n")
}

// ─── Export Panel Component ─────────────────────────────────────────────────

export function ExportPanel({ onClose, signals, articles }: {
  onClose: () => void
  signals: Signal[]
  articles: Article[]
}) {
  const [settings, setSettings] = useState<ExportSettings>(loadSettings)
  const [copied, setCopied] = useState(false)
  const [synthesisData, setSynthesisData] = useState<{ briefing?: string; patterns?: { title: string; description: string }[]; blindSpotNote?: string } | null>(null)

  // Fetch synthesis on mount if articles are available
  useEffect(() => {
    if (articles.length === 0) return
    const annotated = articles.filter(a => a.synopsis || a.relevance)
    if (annotated.length === 0) return
    fetch("/api/synthesis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles: annotated.slice(0, 25) }),
    })
      .then(r => r.json())
      .then(data => { if (data.briefing) setSynthesisData(data) })
      .catch(() => {})
  }, [articles])

  const update = useCallback(<K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      saveSettings(next)
      return next
    })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const exportText = generateExport(settings, signals, synthesisData, articles)

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 6000,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "status-fade 0.15s ease both",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "28px 32px",
          width: 520, maxHeight: "85vh", overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <span style={{ ...TYPE.sm, fontFamily: MONO, color: "var(--accent-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Quick Export
          </span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 0, transition: "color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)" }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)" }}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Settings */}
        <ChipGroup
          label="Preset"
          value={settings.cadence}
          onChange={v => update("cadence", v)}
          options={[
            { id: "daily", label: "Daily Standup", description: "Brief + top 3 signals" },
            { id: "weekly", label: "Weekly Review", description: "Synthesis + dispatch pitches" },
            { id: "share", label: "Share with Collaborator", description: "Curated, clean language" },
          ]}
        />

        <ChipGroup
          label="Scope"
          value={settings.scope}
          onChange={v => update("scope", v)}
          options={[
            { id: "brief", label: "Brief Only", description: "DCOS cards only" },
            { id: "brief+synthesis", label: "Brief + Synthesis", description: "Cards + pattern intelligence" },
            { id: "full", label: "Full Digest", description: "Everything: cards, synthesis, top signals" },
          ]}
        />

        <ChipGroup
          label="Depth"
          value={settings.depth}
          onChange={v => update("depth", v)}
          options={[
            { id: "executive", label: "Executive", description: "1-page summary" },
            { id: "full", label: "Full", description: "All patterns and detail" },
          ]}
        />

        <ChipGroup
          label="Format"
          value={settings.format}
          onChange={v => update("format", v)}
          options={[
            { id: "markdown", label: "Markdown", description: "Atlas-ready with formatting" },
            { id: "plaintext", label: "Plain Text", description: "Clean text, no formatting" },
          ]}
        />

        <ChipGroup
          label="Audience"
          value={settings.redaction}
          onChange={v => update("redaction", v)}
          options={[
            { id: "full", label: "Internal", description: "Includes all Lilly intelligence" },
            { id: "redacted", label: "External", description: "Lilly-specific signals stripped" },
          ]}
        />

        {/* Toggle: include scores */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <button
            onClick={() => update("includeScores", !settings.includeScores)}
            style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
              border: settings.includeScores ? "none" : "1.5px solid var(--border)",
              background: settings.includeScores ? "var(--accent-secondary)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {settings.includeScores && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="var(--bg-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <span style={{ ...TYPE.body, color: "var(--text-secondary)" }}>Include signal scores and layer tags</span>
        </div>

        {/* Preview */}
        <div style={{
          background: "var(--bg-primary)", borderRadius: 10, border: "1px solid var(--border)",
          padding: 16, maxHeight: 200, overflowY: "auto", marginBottom: 20,
        }}>
          <pre style={{
            ...TYPE.sm, fontFamily: MONO, color: "var(--text-tertiary)",
            whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
            lineHeight: 1.6,
          }}>
            {exportText.slice(0, 600)}{exportText.length > 600 ? "\n..." : ""}
          </pre>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "10px 0", borderRadius: 8,
              border: "none",
              background: copied ? "var(--accent-secondary)" : "var(--accent-primary)",
              color: copied ? "var(--bg-primary)" : "var(--accent-secondary)",
              ...TYPE.body, fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied to clipboard" : "Copy to clipboard"}
          </button>
        </div>
      </div>
    </div>
  )
}
