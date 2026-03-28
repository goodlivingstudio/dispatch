export const revalidate = 3600 // 1 hour cache

// Quality source allowlist — press releases and content farms excluded
const BLOCKED_DOMAINS = [
  "globenewswire.com", "prnewswire.com", "businesswire.com", "accesswire.com",
  "einpresswire.com", "prlog.org", "newswire.com", "prweb.com",
  "elearningindustry.com", "express-press-release.net", "trysight.ai",
  "nggroup.com", "css-tricks.com",
]

const QUALITY_SOURCES = "wired,the-verge,techcrunch,ars-technica,fast-company,reuters,the-guardian,bloomberg,fortune,mit-technology-review,hacker-news,mashable"

const CATEGORIES = [
  {
    id: "ai-design",
    label: "AI & Design",
    tag: "ai",
    query: "AI design OR generative AI OR LLM product",
    sources: "wired,the-verge,techcrunch,ars-technica,fast-company,mit-technology-review",
  },
  {
    id: "health-pharma",
    label: "Healthcare & Pharma",
    tag: "health",
    query: "pharmaceutical OR digital health OR FDA OR drug approval",
    sources: "reuters,the-guardian,bloomberg",
  },
  {
    id: "creative-tech",
    label: "Creative Technology",
    tag: "creative",
    query: "design tools OR creative AI OR Figma OR product design",
    sources: "wired,techcrunch,the-verge,fast-company",
  },
  {
    id: "design-industry",
    label: "Design Industry",
    tag: "design",
    query: "UX design OR product design OR design leadership OR design strategy",
    sources: "fast-company,wired,fortune,the-guardian",
  },
  {
    id: "market",
    label: "Market Trends",
    tag: "market",
    query: "venture capital OR startup funding OR tech market OR AI investment",
    sources: "bloomberg,reuters,fortune,techcrunch",
  },
]

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
}

// Compress article to 2-3 sentence summary for token efficiency
function compressSummary(description: string | null, title: string): string {
  if (!description) return title
  const clean = description.replace(/<[^>]+>/g, "").trim()
  const sentences = clean.split(/(?<=[.!?])\s+/)
  return sentences.slice(0, 2).join(" ")
}

async function fetchCategory(category: typeof CATEGORIES[0]): Promise<Article[]> {
  const apiKey = process.env.NEWSAPI_KEY
  if (!apiKey) return getStubArticles(category)

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(category.query)}&sources=${encodeURIComponent(category.sources)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) return getStubArticles(category)
    const data = await res.json()

    return (data.articles || [])
      .filter((a: { title?: string; url?: string }) => {
        if (!a.title || !a.url) return false
        if (a.title.includes("[Removed]")) return false
        const domain = new URL(a.url).hostname.replace("www.", "")
        return !BLOCKED_DOMAINS.includes(domain)
      })
      .slice(0, 5)
      .map((a: { title: string; source: { name: string }; url: string; publishedAt: string; description?: string; urlToImage?: string }, i: number) => ({
        id: `${category.id}-${i}`,
        title: a.title,
        source: a.source?.name || "Unknown",
        url: a.url,
        publishedAt: a.publishedAt,
        summary: compressSummary(a.description || null, a.title),
        category: category.label,
        tag: category.tag,
        imageUrl: a.urlToImage || undefined,
      }))
  } catch {
    return getStubArticles(category)
  }
}

function getStubArticles(category: typeof CATEGORIES[0]): Article[] {
  const stubs: Record<string, Article[]> = {
    "ai-design": [
      { id: "ai-1", title: "How AI is reshaping the role of the design director", source: "Fast Company", url: "#", publishedAt: new Date().toISOString(), summary: "Senior design leaders are finding that AI tools don't replace judgment — they amplify it. The designers thriving are those who can brief AI systems with precision and evaluate output with rigor.", category: "AI & Design", tag: "ai" },
      { id: "ai-2", title: "Figma's AI features are changing how teams prototype", source: "The Verge", url: "#", publishedAt: new Date().toISOString(), summary: "Figma's latest AI-assisted prototyping tools allow designers to generate interactive flows from rough sketches. Early adopters report 40% faster iteration cycles.", category: "AI & Design", tag: "ai" },
      { id: "ai-3", title: "The briefing gap: why most AI-assisted design fails", source: "Nielsen Norman Group", url: "#", publishedAt: new Date().toISOString(), summary: "Research suggests that poor AI output quality correlates strongly with poor input briefs. Design teams investing in briefing discipline outperform those focused on tool adoption.", category: "AI & Design", tag: "ai" },
    ],
    "health-pharma": [
      { id: "health-1", title: "Lilly's LillyDirect expands access to GLP-1 medications", source: "STAT News", url: "#", publishedAt: new Date().toISOString(), summary: "LillyDirect's direct-to-patient pharmacy infrastructure now serves patients in all 50 states. The platform's design team is focused on reducing friction in the refill and access flow.", category: "Healthcare & Pharma", tag: "health" },
      { id: "health-2", title: "Digital health UX is still failing patients", source: "NEJM Catalyst", url: "#", publishedAt: new Date().toISOString(), summary: "A new analysis finds that most pharmaceutical digital touchpoints score below average on usability benchmarks. The gap between clinical excellence and patient experience remains wide.", category: "Healthcare & Pharma", tag: "health" },
      { id: "health-3", title: "Pharma's AI mandate: from pilot to infrastructure", source: "BioPharma Dive", url: "#", publishedAt: new Date().toISOString(), summary: "Major pharmaceutical companies are moving AI from experimental programs to core operational infrastructure. Lilly's mandate that every employee engage with AI daily is being cited as a model.", category: "Healthcare & Pharma", tag: "health" },
    ],
    "creative-tech": [
      { id: "ct-1", title: "Vercel's v0 is changing how design ships", source: "TechCrunch", url: "#", publishedAt: new Date().toISOString(), summary: "v0's ability to generate production-ready React components from prompts is compressing the design-to-development cycle from weeks to hours. Design directors are becoming key evaluators of AI output quality.", category: "Creative Technology", tag: "creative" },
      { id: "ct-2", title: "The rise of the design engineer", source: "Linear Blog", url: "#", publishedAt: new Date().toISOString(), summary: "A new hybrid role is emerging at the intersection of design and engineering. Design engineers can translate creative vision into working code — a capability increasingly valued by product-led companies.", category: "Creative Technology", tag: "creative" },
    ],
    "design-industry": [
      { id: "di-1", title: "Design leadership is being redefined around judgment", source: "Harvard Business Review", url: "#", publishedAt: new Date().toISOString(), summary: "The most valued design leaders today are not the best practitioners — they are the best decision-makers. The ability to brief, evaluate, and redirect AI output is becoming a core leadership competency.", category: "Design Industry", tag: "design" },
      { id: "di-2", title: "Why strategy teams are encroaching on design territory", source: "McKinsey Design", url: "#", publishedAt: new Date().toISOString(), summary: "As AI tools lower the barrier to producing design artifacts, strategy teams are increasingly generating their own mockups and prototypes. Design leaders who can only offer execution are being sidelined.", category: "Design Industry", tag: "design" },
    ],
    "market": [
      { id: "mkt-1", title: "VC investment in design-led companies hits five-year high", source: "Bloomberg", url: "#", publishedAt: new Date().toISOString(), summary: "Venture capital firms are increasingly backing companies with design directors on the founding team. Product-market fit is being correlated with early investment in design leadership.", category: "Market Trends", tag: "market" },
      { id: "mkt-2", title: "The agency model is under pressure from in-house AI teams", source: "Digiday", url: "#", publishedAt: new Date().toISOString(), summary: "Large brands are building internal AI-assisted creative capabilities, reducing reliance on external agencies for production work. Agencies that survive will offer judgment and strategy, not execution.", category: "Market Trends", tag: "market" },
    ],
  }
  return stubs[category.id] || []
}

export async function GET() {
  const results = await Promise.allSettled(CATEGORIES.map(fetchCategory))

  const allArticles: Article[] = []
  for (const result of results) {
    if (result.status === "fulfilled") {
      allArticles.push(...result.value)
    }
  }

  return Response.json({
    articles: allArticles,
    categories: CATEGORIES.map(c => ({ id: c.id, label: c.label, tag: c.tag })),
    fetchedAt: new Date().toISOString(),
    isLive: !!process.env.NEWSAPI_KEY,
  })
}
