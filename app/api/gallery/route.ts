// Gallery API — aggregates images from Are.na and RSS feeds
import { GALLERY_SOURCES, type GalleryImage, type ColorMood } from "@/lib/gallery"
import sharp from "sharp"

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

    for (let i = 0; i < Math.min(items.length, 30); i++) {
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

// ─── Server-side color mood classification ─────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h * 360, s, l]
}

function classifyMood(r: number, g: number, b: number): ColorMood {
  const [h, s, l] = rgbToHsl(r, g, b)
  if (s < 0.12) return "mono"
  if (s < 0.3) return "muted"
  if (s > 0.7) return "vivid"
  if (s < 0.55 && ((h >= 30 && h <= 160)) && l < 0.65) return "earth"
  if (h <= 60 || h >= 330) return "warm"
  if (h >= 180 && h <= 300) return "cool"
  if (h > 60 && h < 180) return s < 0.5 ? "earth" : "cool"
  return "warm"
}

interface ColorAnalysis {
  mood: ColorMood
  hue: number
  saturation: number
  lightness: number
}

async function analyzeImageColor(url: string): Promise<ColorAnalysis | undefined> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": "Dispatch/1.0 (gallery color analysis)" },
    })
    if (!res.ok) return undefined
    const buffer = Buffer.from(await res.arrayBuffer())
    const { data, info } = await sharp(buffer)
      .resize(1, 1, { fit: "cover" })
      .raw()
      .toBuffer({ resolveWithObject: true })
    if (info.channels >= 3) {
      const [h, s, l] = rgbToHsl(data[0], data[1], data[2])
      return {
        mood: classifyMood(data[0], data[1], data[2]),
        hue: Math.round(h),
        saturation: Math.round(s * 100) / 100,
        lightness: Math.round(l * 100) / 100,
      }
    }
    return undefined
  } catch {
    return undefined
  }
}

// Classify colors for a batch of images (parallel, with concurrency limit)
async function classifyBatch(images: GalleryImage[]): Promise<GalleryImage[]> {
  const CONCURRENCY = 10
  const results = [...images]

  for (let i = 0; i < results.length; i += CONCURRENCY) {
    const batch = results.slice(i, i + CONCURRENCY)
    const analyses = await Promise.allSettled(
      batch.map(img => analyzeImageColor(img.url))
    )
    analyses.forEach((result, j) => {
      if (result.status === "fulfilled" && result.value) {
        const a = result.value
        results[i + j] = { ...results[i + j], mood: a.mood, hue: a.hue, saturation: a.saturation, lightness: a.lightness }
      }
    })
  }

  return results
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

  // Classify color moods server-side (parallel, 10 at a time)
  const classified = await classifyBatch(allImages)

  // Shuffle for variety
  for (let i = classified.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[classified[i], classified[j]] = [classified[j], classified[i]]
  }

  return Response.json({
    images: classified,
    count: classified.length,
    sources: GALLERY_SOURCES.length,
  })
}
