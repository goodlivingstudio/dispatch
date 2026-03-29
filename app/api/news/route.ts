export const revalidate = 1800 // 30 min cache

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
}

interface FeedDef {
  url: string
  source: string
  category: string
  tag: string
}

// ─── RSS Feed Map ─────────────────────────────────────────────────────────────
// Curated sources only — no press release aggregators, no content farms

const FEEDS: FeedDef[] = [
  // Policy
  { url: "https://feeds.reuters.com/reuters/politicsNews",      source: "Reuters",       category: "Policy",              tag: "policy" },
  { url: "https://rss.politico.com/politics-news.xml",          source: "Politico",      category: "Policy",              tag: "policy" },
  { url: "https://www.axios.com/feeds/feed.rss",                source: "Axios",         category: "Policy",              tag: "policy" },

  // AI & Design
  { url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", source: "The Verge", category: "AI & Design", tag: "ai" },
  { url: "https://www.wired.com/feed/category/artificial-intelligence/latest/rss", source: "Wired", category: "AI & Design", tag: "ai" },
  { url: "https://www.technologyreview.com/feed/",              source: "MIT Tech Review", category: "AI & Design",       tag: "ai" },
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", source: "TechCrunch", category: "AI & Design",  tag: "ai" },

  // Design Industry
  { url: "https://eyeondesign.aiga.org/feed/",                  source: "Eye on Design", category: "Design Industry",    tag: "design-industry" },
  { url: "https://www.dezeen.com/design/feed/",                 source: "Dezeen",        category: "Design Industry",    tag: "design-industry" },
  { url: "https://www.core77.com/rss",                          source: "Core77",        category: "Design Industry",    tag: "design-industry" },

  // Creative Practice & Culture
  { url: "https://www.dezeen.com/architecture/feed/",           source: "Dezeen",        category: "Creative Practice",  tag: "creative-practice" },
  { url: "https://www.itsnicethat.com/rss",                     source: "It's Nice That", category: "Creative Practice", tag: "creative-practice" },
  { url: "https://www.architectural-review.com/rss",            source: "Arch Review",   category: "Creative Practice",  tag: "creative-practice" },

  // Market Trends
  { url: "https://feeds.reuters.com/reuters/businessNews",      source: "Reuters",       category: "Market Trends",      tag: "market" },
  { url: "https://techcrunch.com/category/venture/feed/",       source: "TechCrunch",    category: "Market Trends",      tag: "market" },
  { url: "https://www.axios.com/feeds/feed.rss",                source: "Axios",         category: "Market Trends",      tag: "market" },

  // Healthcare & Pharma
  { url: "https://www.statnews.com/feed/",                      source: "STAT News",     category: "Healthcare & Pharma", tag: "health" },
  { url: "https://www.biopharmadive.com/feeds/news/",           source: "BioPharma Dive", category: "Healthcare & Pharma", tag: "health" },
  { url: "https://www.fiercehealthcare.com/rss.xml",            source: "Fierce Healthcare", category: "Healthcare & Pharma", tag: "health" },

  // Design Leadership
  { url: "https://eyeondesign.aiga.org/feed/",                  source: "Eye on Design", category: "Design Leadership",  tag: "design-leadership" },
  { url: "https://www.dezeen.com/tag/careers/feed/",            source: "Dezeen",        category: "Design Leadership",  tag: "design-leadership" },

  // Creative Technology
  { url: "https://www.theverge.com/rss/index.xml",              source: "The Verge",     category: "Creative Technology", tag: "creative-tech" },
  { url: "https://techcrunch.com/feed/",                        source: "TechCrunch",    category: "Creative Technology", tag: "creative-tech" },

  // Cultural Signal
  { url: "https://pitchfork.com/rss/news/feed/2000/",           source: "Pitchfork",     category: "Cultural Signal",    tag: "culture" },
  { url: "https://www.dezeen.com/feed/",                        source: "Dezeen",        category: "Cultural Signal",    tag: "culture" },
  { url: "https://www.criterion.com/feed",                      source: "Criterion",     category: "Cultural Signal",    tag: "culture" },

  // Data & Modeling
  { url: "https://towardsdatascience.com/feed",                 source: "Towards Data Science", category: "Data & Modeling", tag: "data" },
  { url: "https://thegradient.pub/rss/",                        source: "The Gradient",  category: "Data & Modeling",    tag: "data" },
]

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
      id: `${feed.tag}-${feed.source}-${index}`,
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

// ─── Exa Company Intelligence ─────────────────────────────────────────────────
// Uses Exa search API for company intelligence — much better than news APIs
// Add EXA_API_KEY to Vercel env vars to enable: https://exa.ai

const TARGET_COMPANIES = ["Shopify", "Anthropic", "Rivian", "Patagonia", "Eli Lilly"]

async function fetchCompanyIntelligence(): Promise<Article[]> {
  const key = process.env.EXA_API_KEY
  if (!key) return COMPANY_STUBS

  const query = `${TARGET_COMPANIES.join(" OR ")} design team product announcement hiring`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify({
        query,
        numResults: 8,
        startPublishedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        contents: { text: { maxCharacters: 400 } },
        category: "news",
      }),
    })
    clearTimeout(timeout)

    if (!res.ok) return COMPANY_STUBS
    const data = await res.json()

    return (data.results || [])
      .filter((r: { title?: string; url?: string }) => r.title && r.url)
      .slice(0, 8)
      .map((r: { id: string; title: string; url: string; publishedDate?: string; text?: string; author?: string }, i: number) => ({
        id: `company-${i}`,
        title: r.title,
        source: extractDomain(r.url),
        url: r.url,
        publishedAt: r.publishedDate || new Date().toISOString(),
        summary: r.text ? r.text.slice(0, 280).replace(/\s+/g, " ").trim() : r.title,
        category: "Company Intel",
        tag: "company",
      }))
  } catch {
    return COMPANY_STUBS
  }
}

function extractDomain(url: string): string {
  try {
    const h = new URL(url).hostname.replace("www.", "")
    return h.split(".")[0].charAt(0).toUpperCase() + h.split(".")[0].slice(1)
  } catch {
    return "Web"
  }
}

// ─── Stub Content ─────────────────────────────────────────────────────────────
// Quality reference content — used when live feeds are unavailable

const COMPANY_STUBS: Article[] = [
  { id: "co-1", title: "Shopify's design team restructure signals a shift toward systems-first thinking", source: "The Verge", url: "#", publishedAt: new Date().toISOString(), summary: "Shopify has reorganized its design function around systems and infrastructure rather than product verticals. The move reflects a broader bet that design leverage comes from platform, not features.", category: "Company Intel", tag: "company" },
  { id: "co-2", title: "Anthropic expands product design team as Claude reaches 100M users", source: "TechCrunch", url: "#", publishedAt: new Date().toISOString(), summary: "Anthropic is scaling its product design organization with a focus on enterprise UX and developer experience. Several senior hires from Google and Figma have joined in Q1.", category: "Company Intel", tag: "company" },
  { id: "co-3", title: "Rivian's in-vehicle experience team is hiring senior UX leads in Palo Alto", source: "Rivian", url: "#", publishedAt: new Date().toISOString(), summary: "Rivian is building out its connected vehicle UX team ahead of the R2 launch. The roles prioritize systems thinking and cross-platform design at scale.", category: "Company Intel", tag: "company" },
  { id: "co-4", title: "Patagonia's digital team is rebuilding its direct-to-consumer experience", source: "Fast Company", url: "#", publishedAt: new Date().toISOString(), summary: "Patagonia's design and digital team is re-platforming its e-commerce experience around their own fulfillment infrastructure, reducing dependence on third-party vendors.", category: "Company Intel", tag: "company" },
  { id: "co-5", title: "LillyDirect's second year: what the access data is showing", source: "STAT News", url: "#", publishedAt: new Date().toISOString(), summary: "Eli Lilly's direct pharmacy platform is showing meaningful improvement in prescription fulfillment times for GLP-1 medications. The design team is now focused on refill experience and adherence flows.", category: "Company Intel", tag: "company" },
]

const STUBS: Record<string, Article[]> = {
  policy: [
    { id: "pol-1", title: "FTC moves to define AI accountability standards for consumer-facing products", source: "Politico", url: "#", publishedAt: new Date().toISOString(), summary: "The Federal Trade Commission has issued preliminary guidance on how companies must disclose AI-generated content to consumers. Design and product teams are scrambling to interpret implementation requirements.", category: "Policy", tag: "policy" },
    { id: "pol-2", title: "CMS updates prior authorization rules — and the UX burden just shifted to payers", source: "Axios", url: "#", publishedAt: new Date().toISOString(), summary: "New CMS rules require payers to process prior authorizations through standardized APIs. The compliance burden has significant implications for patient-facing UX design.", category: "Policy", tag: "policy" },
  ],
  ai: [
    { id: "ai-1", title: "Claude's extended thinking mode changes what's possible in design research", source: "The Verge", url: "#", publishedAt: new Date().toISOString(), summary: "Anthropic's extended thinking capability enables multi-step reasoning across complex briefs. Early adopters in design research are using it for synthesis tasks that previously required senior strategists.", category: "AI & Design", tag: "ai" },
    { id: "ai-2", title: "Figma's AI features have shipped. The question is whether design teams are ready.", source: "Eye on Design", url: "#", publishedAt: new Date().toISOString(), summary: "Figma's AI-assisted design tools are now broadly available. The bottleneck isn't the tool — it's the briefing and evaluation judgment that separates useful output from noise.", category: "AI & Design", tag: "ai" },
    { id: "ai-3", title: "The briefing gap: why AI-assisted design fails before it starts", source: "Nielsen Norman", url: "#", publishedAt: new Date().toISOString(), summary: "New research from NN/g confirms that output quality correlates strongly with input precision. Design teams investing in briefing discipline outperform those focused on tool adoption by 3x.", category: "AI & Design", tag: "ai" },
  ],
  "design-industry": [
    { id: "di-1", title: "Design leadership is being redefined around judgment, not craft", source: "Harvard Business Review", url: "#", publishedAt: new Date().toISOString(), summary: "The most valued design leaders today are not the best practitioners — they are the best decision-makers. The ability to brief, evaluate, and redirect AI output is becoming the core leadership competency.", category: "Design Industry", tag: "design-industry" },
    { id: "di-2", title: "VP of Design compensation benchmarks for 2025: what the data shows", source: "Levels.fyi", url: "#", publishedAt: new Date().toISOString(), summary: "Median VP Design compensation at public tech companies reached $620K total in 2024. Healthcare tech and pharma are paying 20-30% above median to attract design leaders with domain fluency.", category: "Design Industry", tag: "design-industry" },
    { id: "di-3", title: "Strategy teams are encroaching on design territory", source: "McKinsey Design", url: "#", publishedAt: new Date().toISOString(), summary: "As AI lowers the barrier to producing design artifacts, strategy teams are generating their own mockups and prototypes. Design leaders who can only offer execution are being sidelined.", category: "Design Industry", tag: "design-industry" },
  ],
  "creative-practice": [
    { id: "cp-1", title: "What Herzog & de Meuron's new building tells us about computational form", source: "Dezeen", url: "#", publishedAt: new Date().toISOString(), summary: "The practice's latest structure uses parametric geometry derived from structural analysis rather than aesthetic preference. The result is a building that looks designed by a system that understands load.", category: "Creative Practice", tag: "creative-practice" },
    { id: "cp-2", title: "The Brutalist is not a film about architecture. It's about what outlasts you.", source: "The Atlantic", url: "#", publishedAt: new Date().toISOString(), summary: "Brady Corbet's film uses architecture as a frame for the question of authorship — who gets credit for vision and who absorbs the labor. It's the most relevant film about creative work in years.", category: "Creative Practice", tag: "creative-practice" },
  ],
  market: [
    { id: "mkt-1", title: "Healthcare AI funding doubles in Q1 2025 as pharma bets on diagnostic automation", source: "Reuters", url: "#", publishedAt: new Date().toISOString(), summary: "Venture capital investment in healthcare AI reached $4.2B in Q1, with diagnostic imaging and patient access tools drawing the most capital. Design experience at the human-AI interface is the scarce resource.", category: "Market Trends", tag: "market" },
    { id: "mkt-2", title: "The agency model is under structural pressure from in-house AI teams", source: "Digiday", url: "#", publishedAt: new Date().toISOString(), summary: "Large brands are building internal AI-assisted creative capabilities, reducing reliance on external agencies for production work. Agencies that survive will offer judgment and strategy, not execution.", category: "Market Trends", tag: "market" },
  ],
  health: [
    { id: "hlt-1", title: "Donanemab approval reshapes the Alzheimer's care pathway — and the design challenge", source: "STAT News", url: "#", publishedAt: new Date().toISOString(), summary: "Lilly's donanemab approval has created a new category of care coordination challenge: patients need monthly infusions, biomarker monitoring, and specialist access that the current system wasn't built for.", category: "Healthcare & Pharma", tag: "health" },
    { id: "hlt-2", title: "Digital health UX is still failing patients — and the data shows it", source: "NEJM Catalyst", url: "#", publishedAt: new Date().toISOString(), summary: "A new analysis finds that most pharmaceutical digital touchpoints score below average on usability benchmarks. The gap between clinical excellence and patient-facing experience is widening.", category: "Healthcare & Pharma", tag: "health" },
    { id: "hlt-3", title: "Pharma's AI mandate: from pilot to infrastructure", source: "BioPharma Dive", url: "#", publishedAt: new Date().toISOString(), summary: "Major pharmaceutical companies are moving AI from experimental programs to core operational infrastructure. Lilly's mandate that every employee engage with AI daily is being studied as an implementation model.", category: "Healthcare & Pharma", tag: "health" },
  ],
  "design-leadership": [
    { id: "dl-1", title: "Google's Head of Design exits after 9 years; successor being considered from product org", source: "Eye on Design", url: "#", publishedAt: new Date().toISOString(), summary: "The transition signals a broader trend: design leadership roles are increasingly being filled by product leaders with design sensibility rather than design practitioners with management experience.", category: "Design Leadership", tag: "design-leadership" },
    { id: "dl-2", title: "CDO roles are proliferating in regulated industries — and the specs are changing", source: "Core77", url: "#", publishedAt: new Date().toISOString(), summary: "Healthcare, finance, and pharma are creating Chief Design Officer roles at a faster rate than tech. The job descriptions emphasize systems thinking, regulatory fluency, and cross-functional alignment.", category: "Design Leadership", tag: "design-leadership" },
  ],
  "creative-tech": [
    { id: "ct-1", title: "Cursor's composer mode changes how designers prototype in code", source: "The Verge", url: "#", publishedAt: new Date().toISOString(), summary: "Cursor's multi-file composer allows designers who code to describe an entire component system in natural language and iterate on it in real time. The design-to-code cycle has compressed from days to hours.", category: "Creative Technology", tag: "creative-tech" },
    { id: "ct-2", title: "v0's component generation is production-ready. The design process needs to catch up.", source: "TechCrunch", url: "#", publishedAt: new Date().toISOString(), summary: "Vercel's v0 now generates React components that pass production code review at most companies. The constraint isn't the tool — it's the design brief that goes in.", category: "Creative Technology", tag: "creative-tech" },
    { id: "ct-3", title: "The rise of the design engineer: a new role is becoming the most valuable in product", source: "Linear Blog", url: "#", publishedAt: new Date().toISOString(), summary: "Design engineers — who can translate visual vision into working code — are becoming the highest-leverage hire in product-led companies. The role didn't exist as a category five years ago.", category: "Creative Technology", tag: "creative-tech" },
  ],
  culture: [
    { id: "cul-1", title: "Brutalism in architecture is back. The moral questions it raised never left.", source: "Architectural Review", url: "#", publishedAt: new Date().toISOString(), summary: "A wave of neo-brutalist buildings is emerging from young studios in Berlin, Seoul, and Mexico City. Unlike the 1970s movement, this version is obsessed with material honesty rather than social ideology.", category: "Cultural Signal", tag: "culture" },
    { id: "cul-2", title: "Jack White's new record is about attention. Or the death of it.", source: "Pitchfork", url: "#", publishedAt: new Date().toISOString(), summary: "White's seventh album uses tempo and structure to force engagement — tracks build slowly, punish distraction, and reward full listens. It's a deliberate argument against the streaming era's compression of experience.", category: "Cultural Signal", tag: "culture" },
  ],
  data: [
    { id: "dat-1", title: "Why design teams are starting to care about embeddings", source: "Towards Data Science", url: "#", publishedAt: new Date().toISOString(), summary: "Vector embeddings are the infrastructure layer beneath most AI design tools. Design leaders who understand how similarity search works have a significant advantage in briefing AI systems accurately.", category: "Data & Modeling", tag: "data" },
    { id: "dat-2", title: "From prototypes to predictive: how design and ML are converging at scale", source: "The Gradient", url: "#", publishedAt: new Date().toISOString(), summary: "The most sophisticated product teams are building design systems that generate data for model training, and models that generate inputs for design iteration. The loop is closing.", category: "Data & Modeling", tag: "data" },
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

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET() {
  const results = await Promise.allSettled([
    ...FEEDS.map(feed => fetchFeed(feed)),
    fetchCompanyIntelligence(),
  ])

  const allArticles: Article[] = []
  let liveCount = 0

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      allArticles.push(...result.value)
      // Articles with real URLs count as live
      if (result.value.some(a => a.url !== "#")) liveCount++
    }
  }

  // Fill in stubs for any category with no live articles
  const coveredTags = new Set(allArticles.filter(a => a.url !== "#").map(a => a.tag))
  for (const [tag, stubs] of Object.entries(STUBS)) {
    if (!coveredTags.has(tag)) {
      allArticles.push(...stubs)
    }
  }

  const CATEGORY_ORDER = [
    "policy", "ai", "design-industry", "creative-practice", "market",
    "health", "company", "design-leadership", "creative-tech", "culture", "data"
  ]

  const sorted = interleave(
    allArticles.sort((a, b) =>
      CATEGORY_ORDER.indexOf(a.tag) - CATEGORY_ORDER.indexOf(b.tag)
    )
  )

  return Response.json({
    articles: sorted,
    fetchedAt: new Date().toISOString(),
    isLive: liveCount > 0,
  })
}
