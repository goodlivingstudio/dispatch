// ─── Shared types ────────────────────────────────────────────────────────────

export interface Article {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  summary: string       // raw RSS description — used in feed row only
  synopsis?: string     // AI-generated: what it's about, mandate-framed
  category: string
  tag: string
  relevance?: string    // AI-generated: why it matters to the mandate
  signalType?: string
  signalLens?: string
  signalScores?: { opportunity: number; position: number; discipline: number; landscape: number; culture: number; urgency: number }
}

export interface Message {
  role: "user" | "assistant" | "search"
  content: string
}

export interface SignalSource {
  title: string
  url: string
  source: string
}

export interface Signal {
  label: string
  body: string
  sources?: SignalSource[]
}

export interface FeedHealth {
  sourcesLive:   number
  sourcesTotal:  number
  sourcesFailed: number
  stubCategories: string[]
}

export type Skin = "mineral" | "slate" | "forest"

export type ViewMode = "signal" | "audio" | "synthesis"

// ─── Intelligence layers (from mandate) ──────────────────────────────────────

export type IntelLayer = "opportunity" | "position" | "discipline" | "landscape" | "culture"

export const LAYER_CONFIG: { id: IntelLayer | "all"; label: string }[] = [
  { id: "all",          label: "All"          },
  { id: "opportunity",  label: "Opportunity"  },
  { id: "position",     label: "Position"     },
  { id: "discipline",   label: "Discipline"   },
  { id: "landscape",    label: "Landscape"    },
  { id: "culture",      label: "Culture"      },
]

// Legacy — will be removed once news API migrates to layers
export const CATEGORY_CONFIG = LAYER_CONFIG

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 36e5)
  if (h < 1) return "< 1h"
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ─── Layer colors ────────────────────────────────────────────────────────────

export const LAYER_COLOR: Record<string, string> = {
  opportunity: "var(--accent-secondary)",
  position:    "var(--accent-muted)",
  discipline:  "var(--text-secondary)",
  landscape:   "var(--text-tertiary)",
  culture:     "var(--accent-muted)",
}

// Legacy alias
export const LENS_COLOR = LAYER_COLOR
