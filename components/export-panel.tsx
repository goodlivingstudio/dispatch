"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Copy, Check, Download, FileText, FileType } from "lucide-react"
import { TYPE, MONO, metaStyle } from "@/lib/styles"
import type { Article, Signal } from "@/lib/types"

// ─── Export Settings Types ──────────────────────────────────────────────────

type ExportScope = "brief" | "brief+synthesis" | "full"
type ExportDepth = "executive" | "full"
type ExportFormat = "markdown" | "plaintext" | "pdf" | "docx"
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

// ─── Content Generator (plain text, used by all formats) ────────────────────

interface ExportContent {
  title: string
  date: string
  redactionNote: string | null
  signals: { label: string; body: string }[]
  synthesis: { briefing: string; patterns: { title: string; description: string }[]; blindSpot: string } | null
  topArticles: { title: string; source: string; urgency: number; scores: string }[]
  footer: string
}

function buildContent(
  settings: ExportSettings,
  signals: Signal[],
  synthesisData: { briefing?: string; patterns?: { title: string; description: string }[]; blindSpotNote?: string } | null,
  articles: Article[],
): ExportContent {
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })

  const title = settings.cadence === "daily"
    ? `Dispatch Daily Intelligence — ${date}`
    : settings.cadence === "weekly"
    ? `Dispatch Weekly Review — Week of ${date}`
    : `Dispatch Intelligence Brief — ${date}`

  const redactionNote = settings.redaction === "redacted"
    ? "Lilly-specific intelligence redacted for external sharing."
    : null

  const realSignals = signals.filter(s => s.body).map(s => {
    const body = s.body.replace(/\[\d+\]/g, "").trim()
    if (settings.redaction === "redacted" && /lilly|donanemab|lillydirect|zepbound|mounjaro|retatrutide/i.test(body)) {
      return null
    }
    return { label: s.label, body }
  }).filter(Boolean) as { label: string; body: string }[]

  let synthesis: ExportContent["synthesis"] = null
  if (settings.scope !== "brief" && synthesisData?.briefing) {
    synthesis = {
      briefing: synthesisData.briefing,
      patterns: settings.depth === "full" ? (synthesisData.patterns || []) : [],
      blindSpot: synthesisData.blindSpotNote || "",
    }
  }

  let topArticles: ExportContent["topArticles"] = []
  if (settings.scope === "full") {
    topArticles = [...articles]
      .filter(a => a.signalScores?.urgency && a.signalScores.urgency >= 6 && a.url !== "#")
      .filter(a => !(settings.redaction === "redacted" && /lilly|donanemab|lillydirect/i.test(a.title)))
      .sort((a, b) => (b.signalScores?.urgency ?? 0) - (a.signalScores?.urgency ?? 0))
      .slice(0, 10)
      .map(a => ({
        title: a.title,
        source: a.source,
        urgency: a.signalScores?.urgency ?? 0,
        scores: settings.includeScores && a.signalScores
          ? Object.entries(a.signalScores).filter(([, v]) => v >= 5).map(([k, v]) => `${k}:${v}`).join(", ")
          : "",
      }))
  }

  return {
    title,
    date,
    redactionNote,
    signals: realSignals,
    synthesis,
    topArticles,
    footer: `Generated by Dispatch · ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
  }
}

// ─── Markdown / Plain Text renderer ─────────────────────────────────────────

function renderText(content: ExportContent, markdown: boolean): string {
  const h1 = markdown ? "# " : ""
  const h2 = markdown ? "## " : ""
  const h3 = markdown ? "### " : ""
  const bold = (t: string) => markdown ? `**${t}**` : t.toUpperCase()
  const sep = markdown ? "\n---\n" : "\n————\n"
  const em = (t: string) => markdown ? `_${t}_` : t
  const lines: string[] = []

  lines.push(`${h1}${content.title}`)
  if (content.redactionNote) lines.push(`\n${em(content.redactionNote)}`)

  if (content.signals.length > 0) {
    lines.push(sep)
    lines.push(`${h2}Today's Signals`)
    for (const s of content.signals) {
      lines.push(`\n${bold(s.label)}`)
      lines.push(s.body)
    }
  }

  if (content.synthesis) {
    lines.push(sep)
    lines.push(`${h2}Pattern Intelligence`)
    lines.push(`\n${content.synthesis.briefing}`)
    for (const p of content.synthesis.patterns) {
      lines.push(`\n${h3}${p.title}`)
      lines.push(p.description)
    }
    if (content.synthesis.blindSpot) {
      lines.push(`\n${bold("Blind Spot:")} ${content.synthesis.blindSpot}`)
    }
  }

  if (content.topArticles.length > 0) {
    lines.push(sep)
    lines.push(`${h2}Top Signals by Urgency`)
    for (const a of content.topArticles) {
      lines.push(`\n- [${a.urgency}] ${a.title} — ${a.source}${a.scores ? ` (${a.scores})` : ""}`)
    }
  }

  lines.push(sep)
  lines.push(em(content.footer))
  return lines.join("\n")
}

// ─── PDF Generator ──────────────────────────────────────────────────────────

async function generatePDF(content: ExportContent): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const usable = pageWidth - margin * 2
  let y = 20

  const addPage = () => { doc.addPage(); y = 20 }
  const checkSpace = (needed: number) => { if (y + needed > 270) addPage() }

  // Title
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  const titleLines = doc.splitTextToSize(content.title, usable)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 8 + 4

  if (content.redactionNote) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "italic")
    doc.setTextColor(120, 120, 120)
    doc.text(content.redactionNote, margin, y)
    doc.setTextColor(0, 0, 0)
    y += 8
  }

  // Signals
  if (content.signals.length > 0) {
    y += 4
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Today's Signals", margin, y)
    y += 8

    for (const s of content.signals) {
      checkSpace(20)
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text(s.label.toUpperCase(), margin, y)
      y += 5

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      const bodyLines = doc.splitTextToSize(s.body, usable)
      doc.text(bodyLines, margin, y)
      y += bodyLines.length * 4.5 + 6
    }
  }

  // Synthesis
  if (content.synthesis) {
    checkSpace(20)
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Pattern Intelligence", margin, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const briefLines = doc.splitTextToSize(content.synthesis.briefing, usable)
    doc.text(briefLines, margin, y)
    y += briefLines.length * 4.5 + 4

    for (const p of content.synthesis.patterns) {
      checkSpace(16)
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text(p.title, margin, y)
      y += 5
      doc.setFont("helvetica", "normal")
      const descLines = doc.splitTextToSize(p.description, usable)
      doc.text(descLines, margin, y)
      y += descLines.length * 4.5 + 4
    }

    if (content.synthesis.blindSpot) {
      checkSpace(12)
      doc.setFont("helvetica", "bold")
      doc.text("Blind Spot:", margin, y)
      doc.setFont("helvetica", "normal")
      const bsLines = doc.splitTextToSize(content.synthesis.blindSpot, usable - 25)
      doc.text(bsLines, margin + 25, y)
      y += bsLines.length * 4.5 + 4
    }
  }

  // Top articles
  if (content.topArticles.length > 0) {
    checkSpace(20)
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Top Signals by Urgency", margin, y)
    y += 8

    for (const a of content.topArticles) {
      checkSpace(10)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      const line = `[${a.urgency}] ${a.title} — ${a.source}${a.scores ? ` (${a.scores})` : ""}`
      const artLines = doc.splitTextToSize(line, usable)
      doc.text(artLines, margin, y)
      y += artLines.length * 4 + 3
    }
  }

  // Footer
  checkSpace(16)
  y += 4
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6
  doc.setFontSize(8)
  doc.setFont("helvetica", "italic")
  doc.setTextColor(150, 150, 150)
  doc.text(content.footer, margin, y)

  const filename = `dispatch-${content.date.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`
  doc.save(filename)
}

// ─── DOCX Generator ─────────────────────────────────────────────────────────

async function generateDOCX(content: ExportContent): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle, AlignmentType } = await import("docx")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = []

  // Title
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: content.title, bold: true, size: 32 })],
  }))

  if (content.redactionNote) {
    children.push(new Paragraph({
      children: [new TextRun({ text: content.redactionNote, italics: true, color: "888888", size: 18 })],
      spacing: { after: 200 },
    }))
  }

  // Signals
  if (content.signals.length > 0) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "Today's Signals", bold: true, size: 26 })],
      spacing: { before: 400 },
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
    }))

    for (const s of content.signals) {
      children.push(new Paragraph({
        children: [new TextRun({ text: s.label.toUpperCase(), bold: true, size: 20 })],
        spacing: { before: 200 },
      }))
      children.push(new Paragraph({
        children: [new TextRun({ text: s.body, size: 20 })],
        spacing: { after: 100 },
      }))
    }
  }

  // Synthesis
  if (content.synthesis) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "Pattern Intelligence", bold: true, size: 26 })],
      spacing: { before: 400 },
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
    }))

    children.push(new Paragraph({
      children: [new TextRun({ text: content.synthesis.briefing, size: 20 })],
      spacing: { after: 200 },
    }))

    for (const p of content.synthesis.patterns) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: p.title, bold: true, size: 22 })],
        spacing: { before: 200 },
      }))
      children.push(new Paragraph({
        children: [new TextRun({ text: p.description, size: 20 })],
        spacing: { after: 100 },
      }))
    }

    if (content.synthesis.blindSpot) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: "Blind Spot: ", bold: true, size: 20 }),
          new TextRun({ text: content.synthesis.blindSpot, size: 20 }),
        ],
        spacing: { before: 200 },
      }))
    }
  }

  // Top articles
  if (content.topArticles.length > 0) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "Top Signals by Urgency", bold: true, size: 26 })],
      spacing: { before: 400 },
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
    }))

    for (const a of content.topArticles) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `[${a.urgency}] ${a.title} — ${a.source}${a.scores ? ` (${a.scores})` : ""}`, size: 18 })],
        spacing: { after: 60 },
      }))
    }
  }

  // Footer
  children.push(new Paragraph({
    children: [new TextRun({ text: content.footer, italics: true, color: "999999", size: 16 })],
    spacing: { before: 400 },
    alignment: AlignmentType.LEFT,
    border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
  }))

  const doc = new Document({
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(doc)
  const filename = `dispatch-${content.date.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.docx`
  const { saveAs } = await import("file-saver")
  saveAs(blob, filename)
}

// ─── Export Panel Component ─────────────────────────────────────────────────

export function ExportPanel({ onClose, signals, articles }: {
  onClose: () => void
  signals: Signal[]
  articles: Article[]
}) {
  const [settings, setSettings] = useState<ExportSettings>(loadSettings)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
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

  const content = buildContent(settings, signals, synthesisData, articles)
  const previewText = renderText(content, settings.format === "markdown")

  const handleCopy = () => {
    const text = renderText(content, settings.format === "markdown")
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      if (settings.format === "pdf") {
        await generatePDF(content)
      } else if (settings.format === "docx") {
        await generateDOCX(content)
      } else {
        // Markdown or plain text download as file
        const text = renderText(content, settings.format === "markdown")
        const ext = settings.format === "markdown" ? "md" : "txt"
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
        const { saveAs } = await import("file-saver")
        saveAs(blob, `dispatch-${new Date().toISOString().slice(0, 10)}.${ext}`)
      }
    } catch (err) {
      console.error("Export failed:", err)
    }
    setDownloading(false)
  }

  const isFileFormat = settings.format === "pdf" || settings.format === "docx"

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
          width: 540, maxHeight: "85vh", overflowY: "auto",
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
            { id: "pdf", label: "PDF", description: "Formatted document for sharing" },
            { id: "docx", label: "Word", description: "Editable document for collaboration" },
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

        {/* Preview — only for text formats */}
        {!isFileFormat && (
          <div style={{
            background: "var(--bg-primary)", borderRadius: 10, border: "1px solid var(--border)",
            padding: 16, maxHeight: 180, overflowY: "auto", marginBottom: 20,
          }}>
            <pre style={{
              ...TYPE.sm, fontFamily: MONO, color: "var(--text-tertiary)",
              whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
              lineHeight: 1.6,
            }}>
              {previewText.slice(0, 600)}{previewText.length > 600 ? "\n..." : ""}
            </pre>
          </div>
        )}

        {/* File format indicator */}
        {isFileFormat && (
          <div style={{
            background: "var(--bg-primary)", borderRadius: 10, border: "1px solid var(--border)",
            padding: "16px 20px", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            {settings.format === "pdf" ? <FileText size={20} style={{ color: "var(--accent-muted)", flexShrink: 0 }} /> : <FileType size={20} style={{ color: "var(--accent-muted)", flexShrink: 0 }} />}
            <div>
              <div style={{ ...TYPE.body, color: "var(--text-secondary)", fontWeight: 500 }}>
                {settings.format === "pdf" ? "PDF Document" : "Word Document (.docx)"}
              </div>
              <div style={{ ...TYPE.sm, color: "var(--text-tertiary)", marginTop: 2 }}>
                {content.signals.length} signals{content.synthesis ? " + synthesis" : ""}{content.topArticles.length > 0 ? ` + ${content.topArticles.length} ranked articles` : ""}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          {/* Copy to clipboard — always available */}
          <button
            onClick={handleCopy}
            style={{
              flex: isFileFormat ? 0 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: isFileFormat ? "10px 16px" : "10px 0", borderRadius: 8,
              border: isFileFormat ? "1px solid var(--border)" : "none",
              background: !isFileFormat ? (copied ? "var(--accent-secondary)" : "var(--accent-primary)") : "transparent",
              color: !isFileFormat ? (copied ? "var(--bg-primary)" : "var(--accent-secondary)") : (copied ? "var(--accent-secondary)" : "var(--text-tertiary)"),
              ...TYPE.body, fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={e => { if (isFileFormat && !copied) e.currentTarget.style.background = "var(--bg-elevated)" }}
            onMouseLeave={e => { if (isFileFormat) e.currentTarget.style.background = "transparent" }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {!isFileFormat && (copied ? "Copied" : "Copy to clipboard")}
          </button>

          {/* Download — primary action for file formats */}
          {isFileFormat && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "10px 0", borderRadius: 8,
                border: "none",
                background: downloading ? "var(--bg-elevated)" : "var(--accent-primary)",
                color: downloading ? "var(--text-tertiary)" : "var(--accent-secondary)",
                ...TYPE.body, fontWeight: 600,
                cursor: downloading ? "default" : "pointer", transition: "all 0.2s",
              }}
            >
              <Download size={14} />
              {downloading ? "Generating..." : `Download ${settings.format.toUpperCase()}`}
            </button>
          )}

          {/* Download as file — secondary for text formats */}
          {!isFileFormat && (
            <button
              onClick={handleDownload}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 16px", borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-tertiary)",
                ...TYPE.body, fontWeight: 500,
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
            >
              <Download size={14} />
              .{settings.format === "markdown" ? "md" : "txt"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
