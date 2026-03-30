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
  signalScores?: { lilly: number; hod: number; urgency: number }
}

export interface Message {
  role: "user" | "assistant" | "search"
  content: string
}

export interface Signal {
  label: string
  body: string
}

export interface FeedHealth {
  sourcesLive:   number
  sourcesTotal:  number
  sourcesFailed: number
  stubCategories: string[]
}

export type Skin = "mineral" | "slate" | "forest"

export type ViewMode = "signal" | "audio" | "synthesis"

// ─── Config ──────────────────────────────────────────────────────────────────

export const CATEGORY_CONFIG = [
  { id: "all",              label: "All"             },
  { id: "policy",           label: "Policy"          },
  { id: "ai",               label: "AI"              },
  { id: "design-industry",  label: "Design Industry" },
  { id: "creative-practice",label: "Creative"        },
  { id: "market",           label: "Market"          },
  { id: "health",           label: "Healthcare"      },
  { id: "company",          label: "Company"         },
  { id: "design-leadership",label: "Leadership"      },
  { id: "creative-tech",    label: "Creative Tech"   },
  { id: "culture",          label: "Culture"         },
  { id: "data",             label: "Data"            },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 36e5)
  if (h < 1) return "< 1h"
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ─── Signal lens colors ──────────────────────────────────────────────────────

export const LENS_COLOR: Record<string, string> = {
  LILLY: "var(--accent-secondary)",
  HOD:   "var(--accent-muted)",
  BOTH:  "var(--accent-secondary)",
}
