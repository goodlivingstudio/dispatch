export const revalidate = 3600 // 1 hour cache — zen content doesn't need to be real-time

// ─── Types ───────────────────────────────────────────────────────────────────

interface ZenBlock {
  id: string
  imageUrl: string
  title: string
  source?: string
  sourceUrl?: string
  width: number
  height: number
}

// ─── Are.na Channel ──────────────────────────────────────────────────────────

const ARENA_CHANNEL = "dispatch-zen"
const ARENA_USER = "jeremy-grant"

async function fetchArenaBlocks(): Promise<ZenBlock[]> {
  try {
    const res = await fetch(
      `https://api.are.na/v2/channels/${ARENA_CHANNEL}?per=100`,
      {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "Dispatch/1.0" },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    const contents = data.contents || []

    return contents
      .filter((block: { class: string; image?: { display?: { url?: string } } }) =>
        block.class === "Image" && block.image?.display?.url
      )
      .map((block: {
        id: number
        title?: string
        image: { display: { url: string }; original?: { url?: string } }
        source?: { url?: string; title?: string }
        metadata?: { description?: string }
      }) => ({
        id: `arena-${block.id}`,
        imageUrl: block.image.display.url,
        title: block.title || "",
        source: block.source?.title || "",
        sourceUrl: block.source?.url || "",
        width: 0,
        height: 0,
      }))
  } catch {
    return []
  }
}

// ─── RSS Image Feeds ─────────────────────────────────────────────────────────
// Extract hero images from design/architecture/culture RSS feeds

const IMAGE_FEEDS = [
  // Design & Architecture editorial
  { url: "https://www.dezeen.com/feed/",                 source: "Dezeen" },
  { url: "https://www.dezeen.com/architecture/feed/",    source: "Dezeen" },
  { url: "https://www.itsnicethat.com/rss",              source: "It's Nice That" },
  { url: "https://www.architectural-review.com/rss",     source: "Arch Review" },
  { url: "https://www.core77.com/feed",                  source: "Core77" },

  // Design galleries & showcases
  { url: "https://searchsystem.co/rss",                  source: "SearchSystem" },
  { url: "https://www.awwwards.com/blog/feed",           source: "Awwwards" },
  { url: "https://www.cssdesignawards.com/rss/new-sites.xml", source: "CSS Design Awards" },
  { url: "https://dribbble.com/shots/popular.rss",       source: "Dribbble" },
  { url: "https://tympanus.net/codrops/feed/",           source: "Codrops" },
  { url: "https://refero.design/rss",                    source: "Refero" },
  { url: "https://minimal.gallery/feed",                 source: "Minimal Gallery" },
  { url: "https://bestwebsite.gallery/feed",             source: "Best Website Gallery" },
]

function extractImageFromItem(item: string): string {
  // Try media:content or media:thumbnail
  const mediaMatch = item.match(/<media:content[^>]*url="([^"]+)"/)
    || item.match(/<media:thumbnail[^>]*url="([^"]+)"/)
  if (mediaMatch) return mediaMatch[1]

  // Try enclosure
  const encMatch = item.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/)
  if (encMatch) return encMatch[1]

  // Try first img in description/content
  const descMatch = item.match(/<description[\s\S]*?<\/description>/)
    || item.match(/<content:encoded[\s\S]*?<\/content:encoded>/)
  if (descMatch) {
    const imgMatch = descMatch[0].match(/(?:src|url)=["']?(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp))/i)
    if (imgMatch) return imgMatch[1]
  }

  return ""
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
  if (!m) return ""
  const raw = m[1].trim()
  const cdata = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  return (cdata ? cdata[1] : raw).replace(/<[^>]+>/g, "").trim()
}

async function fetchImageFeed(feed: { url: string; source: string }): Promise<ZenBlock[]> {
  try {
    const res = await fetch(feed.url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Dispatch/1.0" },
    })
    if (!res.ok) return []
    const xml = await res.text()
    const items = xml.match(/<item[\s\S]*?<\/item>/gi) || []

    return items.slice(0, 8).map((item, i) => {
      const imageUrl = extractImageFromItem(item)
      const title = extractTag(item, "title")
      const link = extractTag(item, "link")

      if (!imageUrl) return null

      return {
        id: `rss-${feed.source.toLowerCase().replace(/\s+/g, "-")}-${i}`,
        imageUrl,
        title,
        source: feed.source,
        sourceUrl: link,
        width: 0,
        height: 0,
      }
    }).filter(Boolean) as ZenBlock[]
  } catch {
    return []
  }
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const [arenaBlocks, ...rssResults] = await Promise.all([
    fetchArenaBlocks(),
    ...IMAGE_FEEDS.map(feed => fetchImageFeed(feed)),
  ])

  const rssBlocks = rssResults.flat()

  // Deduplicate by imageUrl
  const seen = new Set<string>()
  const allBlocks: ZenBlock[] = []
  for (const block of [...arenaBlocks, ...rssBlocks]) {
    if (!seen.has(block.imageUrl)) {
      seen.add(block.imageUrl)
      allBlocks.push(block)
    }
  }

  // Shuffle for ambient randomness
  const shuffled = allBlocks.sort(() => Math.random() - 0.5)

  return Response.json({
    blocks: shuffled,
    sources: {
      arena: { channel: ARENA_CHANNEL, user: ARENA_USER, count: arenaBlocks.length },
      rss: { feeds: IMAGE_FEEDS.length, count: rssBlocks.length },
    },
    totalBlocks: shuffled.length,
  })
}
