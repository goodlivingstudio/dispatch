// Gallery API — aggregates images from Are.na and RSS feeds
import { GALLERY_SOURCES, type GalleryImage } from "@/lib/gallery"

export const revalidate = 1800 // 30 min cache

async function fetchArena(url: string, sourceName: string): Promise<GalleryImage[]> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    const contents = data.contents || []
    return contents
      .filter((c: { class?: string; image?: { display?: { url?: string }; original?: { url?: string } } }) => {
        // Accept Image blocks, or any block with an image attachment
        if (c.image?.display?.url) return true
        if (c.image?.original?.url) return true
        return false
      })
      .map((c: { id: number; title?: string; class?: string; image?: { display?: { url?: string }; original?: { url?: string } }; source?: { url?: string } }) => ({
        id: `arena-${c.id}`,
        url: c.image?.display?.url || c.image?.original?.url || "",
        title: c.title || undefined,
        source: sourceName,
        linkUrl: c.source?.url || undefined,
      }))
      .filter((img: GalleryImage) => img.url.length > 0)
  } catch {
    return []
  }
}

function extractImageFromRSS(item: string): string | null {
  // Decode CDATA sections first so we can find img tags inside content:encoded
  const decoded = item.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")

  // Upgrade Dezeen square thumbnails to column (natural aspect ratio)
  // Tested patterns against static.dezeen.com CDN:
  //   _sq_N.jpg  → _col_N.jpg   (e.g. _sq_1.jpg → _col_1.jpg)
  //   _sqN.jpg   → _col_N.jpg   (e.g. _sq2.jpg → _col_2.jpg)
  //   _sq.jpg    → _col_0.jpg   (no number = default to _col_0)
  //   _sq-N.jpg  → _col_0.jpg   (variant suffix, fall back to _col_0)
  function upgradeDezeenUrl(url: string): string {
    if (url.includes("dezeen.com")) {
      // _sq_N.jpg → _col_N.jpg (underscore-separated number)
      url = url.replace(/_sq_(\d+)\./, "_col_$1.")
      // _sqN.jpg → _col_N.jpg (number directly after sq, no separator)
      url = url.replace(/_sq(\d+)\./, "_col_$1.")
      // _sq-N.jpg → _col_0.jpg (dash variant, fall back)
      url = url.replace(/_sq-\d+\./, "_col_0.")
      // _sq.jpg → _col_0.jpg (bare square, no number)
      url = url.replace(/_sq\./, "_col_0.")
    }
    // Strip WordPress dimension suffixes
    return url.replace(/-\d+x\d+\./, ".")
  }

  // First try: img in description/content/content:encoded — usually full-size
  const imgMatches = decoded.matchAll(/<img[^>]+src=["']([^"']{20,})["']/gi)
  for (const m of imgMatches) {
    if (m[1]?.startsWith("http")) {
      return upgradeDezeenUrl(m[1])
    }
  }

  // media:content url (may have medium="image" attr)
  const mc = item.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*/i)
  if (mc?.[1]) {
    return upgradeDezeenUrl(mc[1])
  }

  // enclosure with image type
  const enc = item.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image[^"']*["']/i)
    || item.match(/<enclosure[^>]+type=["']image[^"']*["'][^>]+url=["']([^"']+)["']/i)
  if (enc?.[1]) return upgradeDezeenUrl(enc[1])

  // media:thumbnail as last resort
  const mt = item.match(/<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*/i)
  if (mt?.[1]) {
    return upgradeDezeenUrl(mt[1])
  }

  // og:image or similar in content
  const og = decoded.match(/(?:og:image|twitter:image)[^>]*content=["']([^"']+)["']/i)
  if (og?.[1]?.startsWith("http")) return og[1]

  return null
}

async function fetchRSS(url: string, sourceName: string): Promise<GalleryImage[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Dispatch/1.0 (personal gallery)" },
    })
    if (!res.ok) return []
    const xml = await res.text()

    const items = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || []
    const images: GalleryImage[] = []

    for (let i = 0; i < Math.min(items.length, 20); i++) {
      const item = items[i]
      const imageUrl = extractImageFromRSS(item)
      if (!imageUrl) continue

      const titleMatch = item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)
      const title = titleMatch?.[1]?.trim().replace(/<[^>]+>/g, "") || undefined

      const linkMatch = item.match(/<link[^>]+href=["']([^"']+)["']/i) || item.match(/<link[^>]*>([^<]+)<\/link>/i)
      const linkUrl = linkMatch?.[1]?.trim() || undefined

      images.push({
        id: `rss-${sourceName}-${i}`,
        url: imageUrl,
        title,
        source: sourceName,
        linkUrl,
      })
    }

    return images
  } catch {
    return []
  }
}

export async function GET() {
  const results = await Promise.allSettled(
    GALLERY_SOURCES.map(src =>
      src.type === "arena"
        ? fetchArena(src.url, src.name)
        : fetchRSS(src.url, src.name)
    )
  )

  const allImages: GalleryImage[] = []
  for (const result of results) {
    if (result.status === "fulfilled") {
      allImages.push(...result.value)
    }
  }

  // Shuffle for variety
  for (let i = allImages.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[allImages[i], allImages[j]] = [allImages[j], allImages[i]]
  }

  return Response.json({
    images: allImages,
    count: allImages.length,
    sources: GALLERY_SOURCES.length,
  })
}
