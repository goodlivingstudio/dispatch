// News feed aggregator — fetches RSS sources, annotates via Claude, sorts by recency
export const revalidate = 1800 // 30 min cache

import Anthropic from "@anthropic-ai/sdk"
import { FEEDS, type FeedDef } from "@/lib/feeds"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Article {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  summary: string
  category: string
  tag: string
  imageUrl?: string
  synopsis?: string
  relevance?: string
  signalType?: string
  signalLens?: string
  signalScores?: { opportunity: number; position: number; discipline: number; landscape: number; culture: number; urgency: number }
}

// ─── RSS Parser ───────────────────────────────────────────────────────────────

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function extractCDATA(raw: string): string {
  const m = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  return m ? m[1] : raw
}

function stripHTML(str: string): string {
  return str.replace(/<[^>]+>/g, "").trim()
}

function parseRSS(xml: string, feed: FeedDef): Article[] {
  const items: Article[] = []

  // Support both RSS <item> and Atom <entry>
  const itemMatches = xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>|<entry[^>]*>([\s\S]*?)<\/entry>/g)

  let index = 0
  for (const match of itemMatches) {
    if (index >= 5) break
    const block = match[1] || match[2]

    const title = extractField(block, "title")
    const url = extractLink(block)
    const pubDate = extractField(block, "pubDate") || extractField(block, "published") || extractField(block, "updated")
    const description = extractField(block, "description") || extractField(block, "summary") || extractField(block, "content")

    if (!title || !url) continue
    if (title.includes("[Removed]")) continue

    const cleanTitle = stripHTML(decodeEntities(extractCDATA(title)))
    const cleanDesc = stripHTML(decodeEntities(extractCDATA(description || title)))
    const sentences = cleanDesc.split(/(?<=[.!?])\s+/)
    const summary = sentences.slice(0, 2).join(" ")

    let publishedAt = new Date().toISOString()
    if (pubDate) {
      const parsed = new Date(decodeEntities(extractCDATA(pubDate)))
      if (!isNaN(parsed.getTime())) publishedAt = parsed.toISOString()
    }

    items.push({
      id: `${feed.tag}-${feed.source}-${feed.category}-${index}`,
      title: cleanTitle,
      source: feed.source,
      url,
      publishedAt,
      summary: summary || cleanTitle,
      category: feed.category,
      tag: feed.tag,
      imageUrl: extractImage(block),
    })

    index++
  }

  return items
}

function extractImage(block: string): string | undefined {
  // media:content url="..."
  const mc = block.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*/i)
  if (mc?.[1]?.match(/\.(jpg|jpeg|png|webp)/i)) return mc[1]

  // media:thumbnail url="..."
  const mt = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*/i)
  if (mt?.[1]) return mt[1]

  // enclosure url="..." type="image/..."
  const enc = block.match(/<enclosure[^>]+type=["']image[^"']*["'][^>]+url=["']([^"']+)["'][^>]*/i)
    || block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image[^"']*["'][^>]*/i)
  if (enc?.[1]) return enc[1]

  // First <img> inside description CDATA
  const img = block.match(/<img[^>]+src=["']([^"']{20,})["'][^>]*/i)
  if (img?.[1]?.startsWith("http")) return img[1]

  return undefined
}

function extractField(block: string, field: string): string {
  const m = block.match(new RegExp(`<${field}[^>]*>([\\s\\S]*?)<\\/${field}>`, "i"))
  return m ? m[1].trim() : ""
}

function extractLink(block: string): string {
  // Atom <link href="..." />
  const atomLink = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*(?:\/>|>)/i)
  if (atomLink) return atomLink[1]
  // RSS <link>...</link>
  const rssLink = block.match(/<link[^>]*>([^<]+)<\/link>/i)
  if (rssLink) return rssLink[1].trim()
  // <guid> as fallback
  const guid = block.match(/<guid[^>]*>([^<]+)<\/guid>/i)
  if (guid && guid[1].startsWith("http")) return guid[1].trim()
  return ""
}

// ─── RSS Fetcher ──────────────────────────────────────────────────────────────

async function fetchFeed(feed: FeedDef): Promise<Article[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { "User-Agent": "Dispatch/1.0 (personal RSS reader)" },
    })
    clearTimeout(timeout)
    if (!res.ok) return []
    const xml = await res.text()
    return parseRSS(xml, feed)
  } catch {
    return []
  }
}

// ─── Stub Content ─────────────────────────────────────────────────────────────
// Quality reference content — used when live feeds are unavailable for a layer

const ALL_LAYERS = ["opportunity", "position", "discipline", "landscape", "culture"]

const STUBS: Record<string, Article[]> = {
  opportunity: [
    { id: "opp-1", title: "LillyDirect's second year: what the access data is showing", source: "STAT News", url: "#", publishedAt: new Date().toISOString(), summary: "Eli Lilly's direct pharmacy platform is showing meaningful improvement in prescription fulfillment times for GLP-1 medications. The design team is now focused on refill experience and adherence flows.", category: "Healthcare & Pharma", tag: "opportunity" },
    { id: "opp-2", title: "Healthcare AI funding doubles in Q1 as pharma bets on diagnostic automation", source: "BioPharma Dive", url: "#", publishedAt: new Date().toISOString(), summary: "Venture capital investment in healthcare AI reached $4.2B in Q1, with diagnostic imaging and patient access tools drawing the most capital. Design experience at the human-AI interface is the scarce resource.", category: "Healthcare & Pharma", tag: "opportunity" },
    { id: "opp-3", title: "Digital health UX is still failing patients — and the data shows it", source: "Fierce Healthcare", url: "#", publishedAt: new Date().toISOString(), summary: "A new analysis finds that most pharmaceutical digital touchpoints score below average on usability benchmarks. The gap between clinical excellence and patient-facing experience is widening.", category: "Healthcare & Pharma", tag: "opportunity" },
  ],
  position: [
    { id: "pos-1", title: "VP of Design compensation benchmarks: what the data shows", source: "Levels.fyi", url: "#", publishedAt: new Date().toISOString(), summary: "Median VP Design compensation at public tech companies reached $620K total. Healthcare tech and pharma are paying 20-30% above median to attract design leaders with domain fluency.", category: "Design Leadership", tag: "position" },
    { id: "pos-2", title: "CDO roles are proliferating in regulated industries — and the specs are changing", source: "Core77", url: "#", publishedAt: new Date().toISOString(), summary: "Healthcare, finance, and pharma are creating Chief Design Officer roles at a faster rate than tech. The job descriptions emphasize systems thinking, regulatory fluency, and cross-functional alignment.", category: "Design Leadership", tag: "position" },
  ],
  discipline: [
    { id: "dis-1", title: "Design leadership is being redefined around judgment, not craft", source: "Eye on Design", url: "#", publishedAt: new Date().toISOString(), summary: "The most valued design leaders today are not the best practitioners — they are the best decision-makers. The ability to brief, evaluate, and redirect AI output is becoming the core leadership competency.", category: "Design Practice", tag: "discipline" },
    { id: "dis-2", title: "The rise of the design engineer: the most valuable hire in product", source: "Linear Blog", url: "#", publishedAt: new Date().toISOString(), summary: "Design engineers who translate visual vision into working code are becoming the highest-leverage hire in product-led companies. The role didn't exist as a category five years ago.", category: "Product Engineering", tag: "discipline" },
    { id: "dis-3", title: "The briefing gap: why AI-assisted design fails before it starts", source: "IBM Design", url: "#", publishedAt: new Date().toISOString(), summary: "Output quality correlates strongly with input precision. Design teams investing in briefing discipline outperform those focused on tool adoption by 3x.", category: "Enterprise Design", tag: "discipline" },
  ],
  landscape: [
    { id: "lan-1", title: "FTC moves to define AI accountability standards for consumer-facing products", source: "Politico", url: "#", publishedAt: new Date().toISOString(), summary: "The Federal Trade Commission has issued preliminary guidance on how companies must disclose AI-generated content to consumers. Design and product teams are scrambling to interpret implementation requirements.", category: "Policy & Regulation", tag: "landscape" },
    { id: "lan-2", title: "The agency model is under structural pressure from in-house AI teams", source: "The Verge", url: "#", publishedAt: new Date().toISOString(), summary: "Large brands are building internal AI-assisted creative capabilities, reducing reliance on external agencies for production work. Agencies that survive will offer judgment and strategy, not execution.", category: "Technology", tag: "landscape" },
    { id: "lan-3", title: "From prototypes to predictive: how design and ML are converging at scale", source: "MIT Tech Review", url: "#", publishedAt: new Date().toISOString(), summary: "The most sophisticated product teams are building design systems that generate data for model training, and models that generate inputs for design iteration. The loop is closing.", category: "Deep Technology", tag: "landscape" },
  ],
  culture: [
    { id: "cul-1", title: "Brutalism in architecture is back. The moral questions it raised never left.", source: "Architectural Review", url: "#", publishedAt: new Date().toISOString(), summary: "A wave of neo-brutalist buildings is emerging from young studios in Berlin, Seoul, and Mexico City. Unlike the 1970s movement, this version is obsessed with material honesty rather than social ideology.", category: "Architecture Criticism", tag: "culture" },
    { id: "cul-2", title: "The Brutalist is not a film about architecture. It's about what outlasts you.", source: "The Atlantic", url: "#", publishedAt: new Date().toISOString(), summary: "Brady Corbet's film uses architecture as a frame for the question of authorship — who gets credit for vision and who absorbs the labor. It's the most relevant film about creative work in years.", category: "Ideas & Culture", tag: "culture" },
  ],
}

// ─── Interleave ───────────────────────────────────────────────────────────────
// Prevent same-source runs in the feed

function interleave(items: Article[]): Article[] {
  const byTag: Record<string, Article[]> = {}
  for (const item of items) {
    if (!byTag[item.tag]) byTag[item.tag] = []
    byTag[item.tag].push(item)
  }
  const result: Article[] = []
  const queues = Object.values(byTag)
  let i = 0
  while (queues.some(q => q.length > 0)) {
    const q = queues[i % queues.length]
    if (q.length > 0) result.push(q.shift()!)
    i++
  }
  return result
}

// ─── Server-Side Annotation ──────────────────────────────────────────────────
// Annotates top articles via Claude Haiku during ISR. If it fails or times out,
// articles are returned unannotated — the client can still call /api/annotate.

const ANNOTATE_PROMPT = `You annotate news articles for DISPATCH — a personal intelligence system for Jeremy Grant, a Design Director positioning for senior design leadership in healthcare, technology, and culture.

DISPATCH processes signal through five intelligence layers:

1. OPPORTUNITY — Healthcare, pharma, AI-health intersection. Eli Lilly is the current primary target but not the only one.
2. POSITION — Jeremy's career trajectory. Design leadership hiring, compensation, talent dynamics.
3. DISCIPLINE — How design leadership is evolving as a function. CDO roles, AI impact on practice, design engineering convergence.
4. LANDSCAPE — Broader forces. AI policy and capability, technology business models, economics, regulation.
5. CULTURE — Taste, criticism, creative practice. Architecture, film, music, cultural theory.

For each numbered headline, return a JSON array. One object per article, same order:
{
  "synopsis": "one plain sentence — what this article covers, framed for the mandate",
  "hook": "one sharp sentence — why this signal matters. Never say 'not relevant' — find the signal.",
  "type": one of: DATA | CASE | OPINION | TREND | RESEARCH | NEWS | CULTURAL,
  "lens": one of: OPPORTUNITY | POSITION | DISCIPLINE | LANDSCAPE | CULTURE,
  "scores": { "opportunity": 0-10, "position": 0-10, "discipline": 0-10, "landscape": 0-10, "culture": 0-10, "urgency": 0-10 }
}

Return only valid JSON array. No prose.`

async function annotateArticles(articles: Article[]): Promise<Article[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || articles.length === 0) return articles

  const toAnnotate = articles.slice(0, 20)
  const items = toAnnotate.map((a, i) => `${i + 1}. [${a.category}] ${a.title}`).join("\n")

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 6000,
      system: ANNOTATE_PROMPT,
      messages: [{ role: "user", content: items + "\n\nReturn JSON array." }],
    })

    const text = response.content[0]?.type === "text" ? response.content[0].text : ""
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return articles

    const raw: { synopsis?: string; hook?: string; type?: string; lens?: string; scores?: { opportunity: number; position: number; discipline: number; landscape: number; culture: number; urgency: number } }[] =
      JSON.parse(match[0])

    // Merge annotations into the first N articles
    return articles.map((a, i) => {
      if (i >= toAnnotate.length || !raw[i]) return a
      return {
        ...a,
        synopsis:     raw[i].synopsis || "",
        relevance:    raw[i].hook || "",
        signalType:   raw[i].type || "",
        signalLens:   raw[i].lens || "",
        signalScores: raw[i].scores,
      }
    })
  } catch {
    return articles // graceful fallback — never break the feed
  }
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET() {
  const results = await Promise.allSettled(
    FEEDS.map(feed => fetchFeed(feed))
  )

  const allArticles: Article[] = []
  let liveCount = 0
  let failedCount = 0

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      allArticles.push(...result.value)
      if (result.value.some(a => a.url !== "#")) liveCount++
      else failedCount++
    } else {
      failedCount++
    }
  }

  // Fill in stubs for any category with no live articles
  const coveredTags = new Set(allArticles.filter(a => a.url !== "#").map(a => a.tag))
  for (const [tag, stubs] of Object.entries(STUBS)) {
    if (!coveredTags.has(tag)) {
      allArticles.push(...stubs)
    }
  }

  // Layers with no live source — on stub fallback
  const stubCategories = ALL_LAYERS.filter(layer => !coveredTags.has(layer))

  const LAYER_ORDER = ALL_LAYERS

  const sorted = interleave(
    allArticles.sort((a, b) =>
      LAYER_ORDER.indexOf(a.tag) - LAYER_ORDER.indexOf(b.tag)
    )
  )

  // Annotate top articles server-side (runs within ISR cache window)
  const annotated = await annotateArticles(sorted)

  return Response.json({
    articles: annotated,
    fetchedAt: new Date().toISOString(),
    isLive: liveCount > 0,
    feedHealth: {
      sourcesLive:    liveCount,
      sourcesTotal:   results.length,
      sourcesFailed:  failedCount,
      stubCategories,           // categories falling back to curated stubs
    },
  })
}
