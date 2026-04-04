export const revalidate = 1800 // 30 min cache

import { PODCAST_FEEDS, type PodcastFeed } from "@/lib/podcasts"
import { kv } from "@vercel/kv"
import Anthropic from "@anthropic-ai/sdk"
import { OPERATOR, FIVE_LAYERS } from "@/lib/prompts"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Episode {
  id: string
  title: string
  showName: string
  url: string
  publishedAt: string
  summary: string
  duration: string
  artworkUrl: string
  category: string
  tag: string
  layer: string
  urgency?: number
  signalScores?: { opportunity: number; position: number; discipline: number; landscape: number; culture: number; urgency: number }
}

// ─── RSS Parser ──────────────────────────────────────────────────────────────

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function extractCDATA(raw: string): string {
  const m = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  return m ? m[1] : raw
}

function stripHTML(str: string): string {
  return str.replace(/<[^>]+>/g, "").trim()
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
  return m ? decodeEntities(extractCDATA(m[1]).trim()) : ""
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i"))
  return m ? m[1] : ""
}

function formatDuration(raw: string): string {
  if (!raw) return ""
  // Could be seconds (e.g., "2580") or HH:MM:SS
  if (raw.includes(":")) return raw
  const totalSec = parseInt(raw, 10)
  if (isNaN(totalSec)) return raw
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

async function fetchPodcastFeed(feed: PodcastFeed): Promise<Episode[]> {
  try {
    const res = await fetch(feed.url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Dispatch/1.0 (+https://dispatch.goodliving.studio)" },
    })
    if (!res.ok) return []
    const xml = await res.text()

    // Extract show-level artwork
    const showArtwork = extractAttr(xml, "itunes:image", "href")
      || extractAttr(xml, "image", "href")
      || ""

    // Parse items
    const items = xml.match(/<item[\s\S]*?<\/item>/gi) || []
    return items.slice(0, 5).map((item, i) => {
      const title = stripHTML(extractTag(item, "title"))
      const link = extractTag(item, "link") || extractAttr(item, "enclosure", "url") || ""
      const pubDate = extractTag(item, "pubDate")
      const desc = stripHTML(extractTag(item, "description") || extractTag(item, "itunes:summary") || "")
      const duration = formatDuration(extractTag(item, "itunes:duration"))
      const episodeArt = extractAttr(item, "itunes:image", "href")

      return {
        id: `${feed.show.toLowerCase().replace(/\s+/g, "-")}-${i}`,
        title: title || "Untitled Episode",
        showName: feed.show,
        url: link,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        summary: desc.slice(0, 200),
        duration,
        artworkUrl: episodeArt || showArtwork,
        category: feed.category,
        tag: feed.tag,
        layer: feed.layer,
      }
    })
  } catch {
    return []
  }
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const results = await Promise.allSettled(
    PODCAST_FEEDS.map(feed => fetchPodcastFeed(feed))
  )

  const episodes: Episode[] = []
  let liveSources = 0

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      episodes.push(...result.value)
      liveSources++
    }
  }

  // Sort by most recent
  episodes.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  // Annotate top episodes with urgency scores (same approach as news)
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (apiKey && episodes.length > 0) {
    try {
      const toAnnotate = episodes.slice(0, 20)
      const items = toAnnotate.map((e, i) => `${i + 1}. [${e.layer}] ${e.showName}: ${e.title}${e.summary ? ` — ${e.summary.slice(0, 80)}` : ""}`).join("\n")

      const client = new Anthropic({ apiKey })
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        system: `${OPERATOR}\n\n${FIVE_LAYERS}\n\nScore each podcast episode for relevance and urgency. Return a JSON array with one object per episode:\n{ "scores": { "opportunity": 0-10, "position": 0-10, "discipline": 0-10, "landscape": 0-10, "culture": 0-10, "urgency": 0-10 } }\n\nReturn only valid JSON array.`,
        messages: [{ role: "user", content: items + "\n\nReturn JSON array." }],
      })

      const text = response.content[0]?.type === "text" ? response.content[0].text : ""
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        const scores: { scores?: { opportunity: number; position: number; discipline: number; landscape: number; culture: number; urgency: number } }[] = JSON.parse(match[0])
        for (let i = 0; i < Math.min(scores.length, toAnnotate.length); i++) {
          if (scores[i]?.scores) {
            episodes[i].signalScores = scores[i].scores
            episodes[i].urgency = scores[i].scores?.urgency ?? 0
          }
        }
      }
    } catch { /* annotation failure shouldn't break the feed */ }
  }

  // Load pre-generated Dispatch-style artwork from KV (created by scripts/gen-audio-images.ts)
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const uniqueShows = [...new Set(episodes.map(e => e.showName))]
      const keys = uniqueShows.map(s => `audio-image:${s.replace(/[^a-zA-Z0-9]/g, "_")}`)
      const values = await Promise.all(keys.map(k => kv.get<string>(k).catch(() => null)))
      const showImages = new Map<string, string>()
      uniqueShows.forEach((show, i) => { if (values[i]) showImages.set(show, values[i] as string) })

      for (const ep of episodes) {
        const genUrl = showImages.get(ep.showName)
        if (genUrl) ep.artworkUrl = genUrl
      }
    } catch { /* KV read failure — keep original artwork */ }
  }

  return Response.json({
    episodes,
    isLive: liveSources > 0,
    showCount: liveSources,
    totalShows: PODCAST_FEEDS.length,
  })
}
