"use client"

import { useState, useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyticsArticle {
  id: string
  title: string
  url: string
  source: string
  category: string
  tag: string
  publishedAt: string
  signalLens?: string
  signalType?: string
  signalScores?: { lilly: number; hod: number; urgency: number }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_ACCENT: Record<string, string> = {
  snapshot: "#C8955A",
  lens:     "#60A5FA",
  category: "#4ade80",
  urgency:  "#f87171",
  sources:  "#A78BFA",
}

const LENS_COLOR: Record<string, string> = {
  LILLY: "#C8955A",
  HOD:   "#60A5FA",
  BOTH:  "#4ade80",
}

const CARD_GRADIENT: Record<string, string> = {
  snapshot: "radial-gradient(ellipse at top left,  rgba(200,149,90,0.14) 0%, transparent 65%)",
  lens:     "radial-gradient(ellipse at top right, rgba(96,165,250,0.11) 0%, transparent 65%)",
  category: "radial-gradient(ellipse at bottom left, rgba(74,222,128,0.10) 0%, transparent 65%)",
  urgency:  "radial-gradient(ellipse at top left,  rgba(248,113,113,0.12) 0%, transparent 65%)",
  sources:  "radial-gradient(ellipse at bottom right, rgba(167,139,250,0.11) 0%, transparent 65%)",
}

const TAG_LABEL: Record<string, string> = {
  "policy":            "Policy",
  "ai":                "AI",
  "design-industry":   "Design",
  "creative-practice": "Creative",
  "market":            "Market",
  "health":            "Health",
  "company":           "Company",
  "design-leadership": "Leadership",
  "creative-tech":     "Tech",
  "culture":           "Culture",
  "data":              "Data",
}

interface CardDef {
  id: string
  label: string
}

const CARDS: CardDef[] = [
  { id: "snapshot",  label: "Signal Snapshot"   },
  { id: "lens",      label: "Lens Distribution" },
  { id: "category",  label: "Category Heat"     },
  { id: "urgency",   label: "Urgency Surface"   },
  { id: "sources",   label: "Source Pulse"      },
]

// ─── Data derivation ──────────────────────────────────────────────────────────

function useAnalytics(articles: AnalyticsArticle[]) {
  return useMemo(() => {
    const annotated = articles.filter(a => a.signalScores)
    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0

    // Lens distribution
    const lens = { LILLY: 0, HOD: 0, BOTH: 0 }
    annotated.forEach(a => {
      if (a.signalLens && a.signalLens in lens)
        lens[a.signalLens as keyof typeof lens]++
    })

    // Category volumes + avg scores
    const catCount: Record<string, number> = {}
    const catScores: Record<string, { lilly: number[]; hod: number[]; urgency: number[] }> = {}
    articles.forEach(a => { catCount[a.tag] = (catCount[a.tag] || 0) + 1 })
    annotated.forEach(a => {
      if (!catScores[a.tag]) catScores[a.tag] = { lilly: [], hod: [], urgency: [] }
      if (a.signalScores) {
        catScores[a.tag].lilly.push(a.signalScores.lilly)
        catScores[a.tag].hod.push(a.signalScores.hod)
        catScores[a.tag].urgency.push(a.signalScores.urgency)
      }
    })

    const categoryData = Object.entries(catCount)
      .map(([tag, count]) => ({
        tag,
        label: TAG_LABEL[tag] || tag,
        count,
        avgLilly:   avg(catScores[tag]?.lilly   || []),
        avgHod:     avg(catScores[tag]?.hod     || []),
        avgUrgency: avg(catScores[tag]?.urgency || []),
      }))
      .sort((a, b) => b.count - a.count)

    // Top urgency
    const urgencyTop = [...annotated]
      .filter(a => (a.signalScores?.urgency || 0) > 0)
      .sort((a, b) => (b.signalScores?.urgency || 0) - (a.signalScores?.urgency || 0))
      .slice(0, 10)

    // Source counts
    const srcCount: Record<string, number> = {}
    articles.forEach(a => { srcCount[a.source] = (srcCount[a.source] || 0) + 1 })
    const topSources = Object.entries(srcCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([source, count]) => ({ source, count }))

    const allLilly   = annotated.map(a => a.signalScores!.lilly)
    const allHod     = annotated.map(a => a.signalScores!.hod)
    const allUrgency = annotated.map(a => a.signalScores!.urgency)

    return {
      total:          articles.length,
      annotatedCount: annotated.length,
      stubCount:      articles.filter(a => a.url === "#").length,
      lens,
      categoryData,
      urgencyTop,
      topSources,
      avgLilly:   avg(allLilly),
      avgHod:     avg(allHod),
      avgUrgency: avg(allUrgency),
    }
  }, [articles])
}

type Analytics = ReturnType<typeof useAnalytics>

// ─── DonutRing — pure SVG ─────────────────────────────────────────────────────

function DonutRing({ segments, size = 96, strokeWidth = 10 }: {
  segments: { value: number; color: string }[]
  size?: number
  strokeWidth?: number
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return null

  const r  = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2
  const C  = 2 * Math.PI * r
  let startPos = 0

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
      {segments.map((seg, i) => {
        if (seg.value === 0) return null
        const dash       = (seg.value / total) * C
        const dashOffset = C - startPos
        startPos += dash
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${C - dash}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        )
      })}
    </svg>
  )
}

// ─── Mini proportion bar — pure CSS ──────────────────────────────────────────

function ProportionBar({ segments }: { segments: { flex: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.flex, 0)
  if (total === 0) return null
  return (
    <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 2 }}>
      {segments.filter(s => s.flex > 0).map((s, i) => (
        <div key={i} style={{ flex: s.flex, background: s.color, borderRadius: 2 }} />
      ))}
    </div>
  )
}

// ─── Card resting state ───────────────────────────────────────────────────────

function CardViz({ id, analytics }: { id: string; analytics: Analytics }) {
  switch (id) {

    case "snapshot": {
      return (
        <div>
          <div style={{ fontSize: 64, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.04em", lineHeight: 1 }}>
            {analytics.total}
          </div>
          <div style={{ fontSize: 11, fontFamily: "'SF Mono','Fira Code',monospace", color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 6, marginBottom: 16, fontWeight: 700 }}>
            signals tracked today
          </div>
          <ProportionBar segments={[
            { flex: analytics.lens.LILLY, color: LENS_COLOR.LILLY },
            { flex: analytics.lens.HOD,   color: LENS_COLOR.HOD   },
            { flex: analytics.lens.BOTH,  color: LENS_COLOR.BOTH  },
          ]} />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            {(["LILLY", "HOD", "BOTH"] as const).map(k => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: LENS_COLOR[k], flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontFamily: "'SF Mono','Fira Code',monospace", color: "var(--text-tertiary)", letterSpacing: "0.04em", fontWeight: 600 }}>
                  {k === "HOD" ? "HoD" : k === "BOTH" ? "Both" : "Lilly"} {analytics.lens[k]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    case "lens": {
      const total    = analytics.lens.LILLY + analytics.lens.HOD + analytics.lens.BOTH
      const dominant = (Object.entries(analytics.lens) as [string, number][])
        .sort((a, b) => b[1] - a[1])[0]
      const pct = total > 0 ? Math.round((dominant[1] / total) * 100) : 0
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <DonutRing segments={[
            { value: analytics.lens.LILLY, color: LENS_COLOR.LILLY },
            { value: analytics.lens.HOD,   color: LENS_COLOR.HOD   },
            { value: analytics.lens.BOTH,  color: LENS_COLOR.BOTH  },
          ]} />
          <div>
            <div style={{ fontSize: 44, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {pct}%
            </div>
            <div style={{ fontSize: 11, fontFamily: "'SF Mono','Fira Code',monospace", color: LENS_COLOR[dominant[0]] || "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4, marginBottom: 12, fontWeight: 700 }}>
              {dominant[0] === "HOD" ? "HoD" : dominant[0] === "BOTH" ? "Both" : "Lilly"} dominant
            </div>
            {(["LILLY","HOD","BOTH"] as const).map(k => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: LENS_COLOR[k], flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontFamily: "'SF Mono','Fira Code',monospace", color: "var(--text-tertiary)", letterSpacing: "0.03em", fontWeight: 600 }}>
                  {k === "HOD" ? "HoD" : k === "BOTH" ? "Both" : "Lilly"} — {analytics.lens[k]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    case "category": {
      const top  = analytics.categoryData[0]
      const max  = top?.count || 1
      return (
        <div>
          <div style={{ fontSize: 42, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {top?.label || "—"}
          </div>
          <div style={{ fontSize: 11, fontFamily: "'SF Mono','Fira Code',monospace", color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 5, marginBottom: 14, fontWeight: 700 }}>
            most active · {top?.count || 0} articles
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {analytics.categoryData.map(cat => (
              <div key={cat.tag} style={{
                padding: "4px 9px",
                borderRadius: 4,
                background: `rgba(74,222,128,${0.10 + (cat.count / max) * 0.55})`,
                fontSize: 11,
                fontFamily: "'SF Mono','Fira Code',monospace",
                color: "var(--text-secondary)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}>
                {cat.label}
              </div>
            ))}
          </div>
        </div>
      )
    }

    case "urgency": {
      const top3 = analytics.urgencyTop.slice(0, 3)
      if (top3.length === 0)
        return <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>Annotating…</div>
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {top3.map((article, i) => (
            <div key={article.id}>
              <div style={{
                fontSize: i === 0 ? 14 : 13,
                fontWeight: i === 0 ? 550 : 400,
                color: i === 0 ? "var(--text-primary)" : "var(--text-secondary)",
                lineHeight: 1.3,
                letterSpacing: "-0.01em",
                marginBottom: 6,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}>
                {article.title}
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "var(--border)" }}>
                <div style={{
                  height: "100%",
                  width: `${((article.signalScores?.urgency || 0) / 10) * 100}%`,
                  background: CARD_ACCENT.urgency,
                  borderRadius: 3,
                }} />
              </div>
            </div>
          ))}
        </div>
      )
    }

    case "sources": {
      const top5 = analytics.topSources.slice(0, 5)
      const max  = top5[0]?.count || 1
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {top5.map(item => (
            <div key={item.source}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "82%", fontWeight: 500 }}>
                  {item.source}
                </span>
                <span style={{ fontSize: 12, fontFamily: "'SF Mono','Fira Code',monospace", color: "var(--text-tertiary)", flexShrink: 0, fontWeight: 700 }}>
                  {item.count}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "var(--border)" }}>
                <div style={{ height: "100%", width: `${(item.count / max) * 100}%`, background: CARD_ACCENT.sources, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      )
    }

    default: return null
  }
}

// ─── Recharts tooltip style ───────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderRadius: 3,
    fontSize: 11,
    color: "var(--text-primary)",
  },
  itemStyle:  { color: "var(--text-secondary)" },
  labelStyle: { color: "var(--text-primary)", marginBottom: 4 },
  cursor: { fill: "var(--border)", fillOpacity: 0.4 },
}

// ─── Modal chart ──────────────────────────────────────────────────────────────

function ModalChart({ id, analytics }: { id: string; analytics: Analytics }) {
  switch (id) {

    case "snapshot": {
      const data = [
        { name: "Lilly Relevance", value: parseFloat(analytics.avgLilly.toFixed(1)),   fill: LENS_COLOR.LILLY },
        { name: "HoD Relevance",   value: parseFloat(analytics.avgHod.toFixed(1)),     fill: LENS_COLOR.HOD   },
        { name: "Urgency",         value: parseFloat(analytics.avgUrgency.toFixed(1)), fill: CARD_ACCENT.urgency },
      ]
      return (
        <div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "'SF Mono','Fira Code',monospace", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 24 }}>
            Average AI-scored signal strength across {analytics.annotatedCount} annotated articles — scored 0–10 per dimension
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 32, top: 0, bottom: 0 }}>
              <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={150} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" radius={4} maxBarSize={22}>
                {data.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 32, display: "flex", gap: 32 }}>
            {[
              { label: "Total signals", value: analytics.total },
              { label: "AI annotated", value: analytics.annotatedCount },
              { label: "Stub fallback", value: analytics.stubCount },
            ].map(stat => (
              <div key={stat.label}>
                <div style={{ fontSize: 36, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-tertiary)", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    case "lens": {
      const pieData = [
        { name: "Lilly",    value: analytics.lens.LILLY, color: LENS_COLOR.LILLY },
        { name: "HoD Path", value: analytics.lens.HOD,   color: LENS_COLOR.HOD   },
        { name: "Both",     value: analytics.lens.BOTH,  color: LENS_COLOR.BOTH  },
      ].filter(d => d.value > 0)
      const total = analytics.lens.LILLY + analytics.lens.HOD + analytics.lens.BOTH
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <ResponsiveContainer width={280} height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={116} paddingAngle={3} dataKey="value">
                {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {pieData.map(item => (
              <div key={item.name}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{item.name}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em", paddingLeft: 16 }}>
                  {item.value}
                  <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-tertiary)", marginLeft: 6 }}>
                    {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    case "category": {
      const data = analytics.categoryData.map(c => ({ name: c.label, count: c.count }))
      return (
        <div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "'SF Mono','Fira Code',monospace", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 24 }}>
            Article volume by category across {analytics.total} signals — darker fill = higher concentration
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={100} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" fill={CARD_ACCENT.category} fillOpacity={0.75} radius={4} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    }

    case "urgency": {
      const data = analytics.urgencyTop.slice(0, 8).map(a => ({
        name: a.title.slice(0, 52) + (a.title.length > 52 ? "…" : ""),
        urgency: a.signalScores?.urgency || 0,
      }))
      return (
        <div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "'SF Mono','Fira Code',monospace", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 24 }}>
            Highest urgency signals today — AI-scored 0–10 (10 = act now, 0 = evergreen)
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
              <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={220} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="urgency" fill={CARD_ACCENT.urgency} fillOpacity={0.8} radius={4} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    }

    case "sources": {
      const data = analytics.topSources.map(s => ({ name: s.source, count: s.count }))
      return (
        <div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "'SF Mono','Fira Code',monospace", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 24 }}>
            Publication volume across {analytics.topSources.length} sources — signals per outlet today
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={150} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" fill={CARD_ACCENT.sources} fillOpacity={0.8} radius={4} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    }

    default: return null
  }
}

// ─── Deliberate prompt builder ────────────────────────────────────────────────

function buildPrompt(id: string, analytics: Analytics): string {
  const total = analytics.lens.LILLY + analytics.lens.HOD + analytics.lens.BOTH
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0

  switch (id) {
    case "snapshot":
      return `Looking at today's signal snapshot: ${analytics.total} total articles in the feed, ${analytics.annotatedCount} annotated. Lens split is ${pct(analytics.lens.LILLY)}% Lilly-focused, ${pct(analytics.lens.HOD)}% HoD path, ${pct(analytics.lens.BOTH)}% serving both. Average scores — Lilly relevance: ${analytics.avgLilly.toFixed(1)}/10, HoD relevance: ${analytics.avgHod.toFixed(1)}/10, urgency: ${analytics.avgUrgency.toFixed(1)}/10. What does this distribution tell me about today's information environment?`
    case "lens":
      return `My lens distribution today: ${analytics.lens.LILLY} Lilly-specific articles (${pct(analytics.lens.LILLY)}%), ${analytics.lens.HOD} HoD path (${pct(analytics.lens.HOD)}%), ${analytics.lens.BOTH} serving both mandates (${pct(analytics.lens.BOTH)}%). Is this a healthy balance? What does the skew — if any — tell me about where I should focus?`
    case "category": {
      const top3 = analytics.categoryData.slice(0, 3).map(c => `${c.label} (${c.count})`).join(", ")
      return `Today's category distribution is led by: ${top3}. Total coverage across ${analytics.categoryData.length} categories. What does this concentration pattern reveal? Am I getting the right coverage for my mandate?`
    }
    case "urgency": {
      const top3 = analytics.urgencyTop.slice(0, 3).map(a => `"${a.title.slice(0, 70)}"`)
      return `My highest urgency signals right now:\n\n${top3.join("\n")}\n\nAverage urgency across all annotated articles: ${analytics.avgUrgency.toFixed(1)}/10. What needs my attention today and in what order?`
    }
    case "sources": {
      const top3 = analytics.topSources.slice(0, 3).map(s => `${s.source} (${s.count})`).join(", ")
      return `My top sources today: ${top3}. Is this a healthy mix of perspectives, or am I over-indexed on certain outlets or publication types?`
    }
    default: return ""
  }
}

// ─── Analytics Modal ──────────────────────────────────────────────────────────

function AnalyticsModal({ card, analytics, onClose, onDeliberate }: {
  card: CardDef
  analytics: Analytics
  onClose: () => void
  onDeliberate: (text: string) => void
}) {
  const accent = CARD_ACCENT[card.id] || "var(--accent-secondary)"

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: "var(--bg-surface)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        width: "min(96vw, 1440px)",
        height: "90vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.04)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 28px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <div>
            <span style={{ fontSize: 11, fontFamily: "'SF Mono','Fira Code',monospace", color: accent, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
              {card.label}
            </span>
            <span style={{ marginLeft: 16, fontSize: 11, fontFamily: "'SF Mono','Fira Code',monospace", color: "var(--text-tertiary)", letterSpacing: "0.04em" }}>
              {analytics.annotatedCount} annotated · {analytics.total} total
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "4px 8px", borderRadius: 4 }}>
            ×
          </button>
        </div>

        {/* Chart — full width, fills height */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>
          <ModalChart id={card.id} analytics={analytics} />
        </div>

        {/* Footer — Deliberate CTA */}
        <div style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border)",
          padding: "16px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-elevated)",
        }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Send this signal to <span style={{ color: "var(--accent-muted)" }}>Cerebro</span> for deeper analysis and strategic framing.
          </div>
          <button
            onClick={() => { onDeliberate(buildPrompt(card.id, analytics)); onClose() }}
            style={{
              background: "var(--accent-secondary)",
              color: "var(--bg-primary)",
              border: "none",
              borderRadius: 8,
              padding: "11px 24px",
              fontSize: 11,
              fontFamily: "'SF Mono','Fira Code',monospace",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontWeight: 700,
              flexShrink: 0,
              marginLeft: 24,
            }}
          >
            Deliberate →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Analytics Card ───────────────────────────────────────────────────────────

function AnalyticsCard({ card, analytics, onClick }: {
  card: CardDef
  analytics: Analytics
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const accent   = CARD_ACCENT[card.id]   || "var(--accent-secondary)"
  const gradient = CARD_GRADIENT[card.id] || ""

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: `${gradient}, var(--bg-surface)`,
        borderRadius: 14,
        border: "1px solid var(--border)",
        padding: "22px 24px 24px",
        cursor: "pointer",
        transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s cubic-bezier(0.16,1,0.3,1)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 8px 32px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.06)`
          : "0 1px 3px rgba(0,0,0,0.07)",
        height: "100%",
        minHeight: 230,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <span style={{
          fontSize: 12,
          fontFamily: "'SF Mono','Fira Code',monospace",
          color: accent,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}>
          {card.label}
        </span>
        <span style={{
          color: accent,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.25s, transform 0.25s cubic-bezier(0.16,1,0.3,1)",
          transform: hovered ? "translate(2px,-2px)" : "translate(0,0)",
          fontSize: 18,
          lineHeight: 1,
          fontWeight: 400,
        }}>
          ↗
        </span>
      </div>
      <CardViz id={card.id} analytics={analytics} />
    </div>
  )
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────

export function AnalyticsPanel({ articles, onDeliberate }: {
  articles: AnalyticsArticle[]
  onDeliberate: (text: string) => void
}) {
  const analytics   = useAnalytics(articles)
  const [active, setActive] = useState<CardDef | null>(null)

  return (
    <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px", background: "var(--bg-primary)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {CARDS.map((card, i) => (
          <div key={card.id} style={{ gridColumn: i === 4 ? "1 / -1" : "auto" }}>
            <AnalyticsCard card={card} analytics={analytics} onClick={() => setActive(card)} />
          </div>
        ))}
      </div>

      {active && (
        <AnalyticsModal
          card={active}
          analytics={analytics}
          onClose={() => setActive(null)}
          onDeliberate={text => { onDeliberate(text); setActive(null) }}
        />
      )}
    </main>
  )
}
