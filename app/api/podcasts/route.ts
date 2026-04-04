export const revalidate = 1800 // 30 min cache

import { PODCAST_FEEDS, type PodcastFeed } from "@/lib/podcasts"
import { kv } from "@vercel/kv"

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

  // Podcast annotation is lazy — runs client-side when Audio tab is visited
  // Removed from ISR to avoid competing with news annotation on page load

  // Check which shows have generated artwork in KV, serve via /api/audio-image endpoint
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const uniqueShows = [...new Set(episodes.map(e => e.showName))]
      const keys = uniqueShows.map(s => `audio-image:${s.replace(/[^a-zA-Z0-9]/g, "_")}`)
      // Just check existence via TTL (cheap — no data transfer)
      const ttls = await Promise.all(keys.map(k => kv.ttl(k).catch(() => -2)))
      const showsWithArt = new Set<string>()
      uniqueShows.forEach((show, i) => { if (ttls[i] > 0 || ttls[i] === -1) showsWithArt.add(show) })

      for (const ep of episodes) {
        if (showsWithArt.has(ep.showName)) {
          const slug = ep.showName.replace(/[^a-zA-Z0-9]/g, "_")
          ;(ep as Episode & { originalArtworkUrl?: string }).originalArtworkUrl = ep.artworkUrl
          ep.artworkUrl = `/api/audio-image?show=${encodeURIComponent(slug)}`
        }
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
