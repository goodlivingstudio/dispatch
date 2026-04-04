// ─── Article Persistence — 7-day rolling window in Vercel KV ────────────────
// Stores annotated articles so Synthesis and Dispatch can analyze trends
// over time, not just today's feed. Keyed by date (YYYY-MM-DD).
//
// Each day's articles are stored as a single KV entry with 8-day TTL.
// Reading the last 7 days gives a full week of scored signal.

import { kv } from "@vercel/kv"

const KV_AVAILABLE = !!(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
)

// TTL: 8 days — gives 1 day buffer beyond the 7-day read window
const TTL_SECONDS = 8 * 24 * 60 * 60

interface StoredArticle {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  summary: string
  category: string
  tag: string
  synopsis?: string
  relevance?: string
  signalType?: string
  signalLens?: string
  signalScores?: { opportunity: number; position: number; discipline: number; landscape: number; culture: number; urgency: number }
}

function dayKey(date?: Date): string {
  const d = date || new Date()
  return `articles:${d.toISOString().slice(0, 10)}`
}

/**
 * Store today's annotated articles. Called from /api/news after annotation.
 * Overwrites the current day's entry (ISR refreshes every 30 min).
 */
export async function storeArticles(articles: StoredArticle[]): Promise<void> {
  if (!KV_AVAILABLE || articles.length === 0) return
  try {
    // Only store articles with real URLs (not stubs)
    const real = articles.filter(a => a.url !== "#")
    await kv.set(dayKey(), real, { ex: TTL_SECONDS })
  } catch {
    // never break the feed on storage failure
  }
}

/**
 * Load articles for a specific day. Returns [] if not available.
 */
export async function loadArticlesForDay(date: Date): Promise<StoredArticle[]> {
  if (!KV_AVAILABLE) return []
  try {
    const stored = await kv.get<StoredArticle[]>(dayKey(date))
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

/**
 * Load all articles from the last N days (default 7).
 * Returns a flat array, newest first, deduplicated by ID.
 */
export async function loadArticleHistory(days: number = 7): Promise<StoredArticle[]> {
  if (!KV_AVAILABLE) return []
  try {
    const promises: Promise<StoredArticle[]>[] = []
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      promises.push(loadArticlesForDay(date))
    }
    const results = await Promise.all(promises)
    const all = results.flat()

    // Deduplicate by ID, keeping newest version
    const seen = new Set<string>()
    return all.filter(a => {
      if (seen.has(a.id)) return false
      seen.add(a.id)
      return true
    })
  } catch {
    return []
  }
}

// ─── Source Failure Tracking ─────────────────────────────────────────────────
// Tracks consecutive failures per source. Incremented on failure, reset on success.
// Keyed as a single KV entry: { "STAT News": 0, "Axios": 3, ... }

const FAILURE_KEY = "source:failures"
const FAILURE_TTL = 30 * 24 * 60 * 60 // 30 days

export interface SourceFailures {
  [sourceName: string]: number
}

/**
 * Record which sources succeeded and which failed in this cycle.
 * Increment consecutive count for failures, reset to 0 for successes.
 */
export async function recordSourceHealth(
  succeeded: string[],
  failed: string[],
): Promise<void> {
  if (!KV_AVAILABLE) return
  try {
    const current = await kv.get<SourceFailures>(FAILURE_KEY) || {}
    for (const name of succeeded) {
      current[name] = 0
    }
    for (const name of failed) {
      current[name] = (current[name] || 0) + 1
    }
    await kv.set(FAILURE_KEY, current, { ex: FAILURE_TTL })
  } catch {
    // never break the feed on tracking failure
  }
}

/**
 * Load the current failure counts for all sources.
 */
export async function loadSourceFailures(): Promise<SourceFailures> {
  if (!KV_AVAILABLE) return {}
  try {
    return await kv.get<SourceFailures>(FAILURE_KEY) || {}
  } catch {
    return {}
  }
}

// ─── Palette Snapshots — daily mood distribution for trend detection ────────

export interface PaletteSnapshot {
  date: string
  totalImages: number
  moods: Record<string, number>      // { warm: 44, cool: 15, ... }
  avgHue: number                      // 0-360
  avgSaturation: number               // 0-1
  avgLightness: number                // 0-1
  sourceBreakdown: Record<string, {   // per-source mood + avg hue
    count: number
    dominantMood: string
    avgHue: number
  }>
}

const PALETTE_KEY_PREFIX = "palette:"
const PALETTE_TTL = 14 * 24 * 60 * 60 // 14 days

export async function storePaletteSnapshot(snapshot: PaletteSnapshot): Promise<void> {
  if (!KV_AVAILABLE) return
  try {
    await kv.set(`${PALETTE_KEY_PREFIX}${snapshot.date}`, snapshot, { ex: PALETTE_TTL })
  } catch { /* never break on storage failure */ }
}

export async function loadPaletteHistory(days: number = 7): Promise<PaletteSnapshot[]> {
  if (!KV_AVAILABLE) return []
  try {
    const promises: Promise<PaletteSnapshot | null>[] = []
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = `${PALETTE_KEY_PREFIX}${date.toISOString().slice(0, 10)}`
      promises.push(kv.get<PaletteSnapshot>(key))
    }
    const results = await Promise.all(promises)
    return results.filter(Boolean) as PaletteSnapshot[]
  } catch {
    return []
  }
}

export { KV_AVAILABLE as ARTICLE_STORE_AVAILABLE }
export type { StoredArticle }
