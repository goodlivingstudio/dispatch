// Dispatch endpoint — weekly intelligence brief → content pitch pipeline
// Analyzes 7 days of article history and generates publishable content briefs
import Anthropic from "@anthropic-ai/sdk"
import { generateCardImages } from "@/lib/image-gen"
import { loadArticleHistory, ARTICLE_STORE_AVAILABLE } from "@/lib/article-store"
import { DISPATCH_PREAMBLE } from "@/lib/prompts"
import { kv } from "@vercel/kv"

const KV_AVAILABLE = !!(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
)

function getWeekKey(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  const weekNum = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7)
  return `dispatch:weekly:${now.getFullYear()}-w${weekNum}`
}

const WEEK_TTL = 7 * 24 * 60 * 60 // 7 days

const SYSTEM_PROMPT = `${DISPATCH_PREAMBLE}

You are the action intelligence layer of Dispatch. Your job is to translate the week's signal into publishable content — thought leadership that advances the positioning, demonstrates expertise, and builds toward the five-year target.

CONTEXT: The operator is a senior design leader positioning for CDO/Head of Design roles at the intersection of AI, healthcare, and human experience. His content should establish him as someone who thinks at the level where design, technology, healthcare, and strategy converge — not as a design craftsperson or tool commentator.

PRODUCE: 4–5 content pitches. Each pitch must be grounded in at least one specific signal from this week's feed — not generic trend commentary, but intelligence-driven argument.

TWO MODES — distribute pitches across both:

STRATEGIC POSITIONING (LinkedIn / Medium / Substack):
Long-form argument or perspective. 600–1200 words when developed. The voice of someone with hard-won expertise and a clear point of view. Not listicles. Not "here's what I learned." Thesis-driven essays, analysis, or provocations.

CREATIVE EXPRESSION (Instagram / Lummi):
Visual/editorial. A concept, an image direction, a short statement. The aesthetic intelligence layer of the public presence.

PITCH FORMAT (for each):
{
  "title": "The content title or opening line",
  "thesis": "The central argument or claim (1-2 sentences). This must be a specific, arguable claim — not a topic description.",
  "mode": "thought_leadership" or "creative",
  "layers": ["which intelligence layers this draws from"],
  "brief": "3-4 sentences: what the piece covers, the structure, the hook, and the payoff.",
  "platforms": {
    "primary": "Best platform for this piece",
    "adaptations": ["How to adapt for other platforms — 1 sentence each"]
  },
  "evidence": ["2-3 specific signals from the week that support this thesis, with source citations [1][2]"],
  "angle": "What makes this piece worth reading from this author specifically — what unique perspective does it carry",
  "urgency": "Why publish now vs. later (1 sentence)",
  "wordCount": 800
}

Return a JSON object:
{
  "weekSummary": "2-3 sentences: the week's dominant narrative across all layers.",
  "pitches": [4-5 pitch objects]
}

Be specific. Name companies, cite data points, reference real trends from the articles. Every pitch must trace to multiple signals from the week.

Return only valid JSON. No prose outside the JSON.`

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return Response.json({ error: "No API key" }, { status: 500 })

  if (!ARTICLE_STORE_AVAILABLE) {
    return Response.json({
      available: false,
      weekSummary: null,
      pitches: [],
      message: "Article history not available — KV storage required for weekly analysis.",
    })
  }

  try {
    // Check KV cache first — avoid 10-20s Sonnet call on repeat visits
    if (KV_AVAILABLE) {
      try {
        const cached = await kv.get<{ weekSummary: string | null; pitches: unknown[]; articleCount: number; generatedAt: string }>(getWeekKey())
        if (cached && cached.pitches && cached.pitches.length > 0) {
          return Response.json({
            available: true,
            weekSummary: cached.weekSummary,
            pitches: cached.pitches,
            articleCount: cached.articleCount,
            generatedAt: cached.generatedAt,
            cached: true,
          })
        }
      } catch {
        // KV read failed — fall through to generation
      }
    }

    const articles = await loadArticleHistory(7)

    if (articles.length === 0) {
      return Response.json({
        available: true,
        weekSummary: null,
        pitches: [],
        message: "No article history yet. Check back after a day of feed ingestion.",
      })
    }

    // Build context from the week's articles, prioritizing annotated ones
    const annotated = articles.filter(a => a.synopsis || a.relevance)
    const context = (annotated.length > 10 ? annotated : articles).slice(0, 40).map((a, i) => {
      const scores = a.signalScores ? Object.entries(a.signalScores).filter(([, v]) => v >= 4).map(([k, v]) => `${k}:${v}`).join(", ") : ""
      return `${i + 1}. [${a.tag}] ${a.source}: ${a.title}${a.synopsis ? ` — ${a.synopsis}` : ""}${a.relevance ? ` | Why: ${a.relevance}` : ""}${scores ? ` (${scores})` : ""}`
    }).join("\n")

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `This week's intelligence (${articles.length} articles across 7 days):\n\n${context}\n\nGenerate the weekly dispatch.`,
      }],
    })

    const text = response.content[0]?.type === "text" ? response.content[0].text : ""
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      return Response.json({ available: true, weekSummary: null, pitches: [], message: "Synthesis failed to parse." })
    }

    const result = JSON.parse(match[0])

    // Generate images: header + each pitch
    let pitches = result.pitches || []
    let headerImageUrl: string | undefined
    if (process.env.REPLICATE_API_TOKEN) {
      try {
        const allCards = [
          { title: result.weekSummary?.split(/[.!?]/)[0] || "Weekly dispatch", layers: ["landscape"] },
          ...pitches.map((p: { title: string; layers?: string[] }) => ({
            title: p.title,
            layers: p.layers,
          }))
        ]
        const imageUrls = await generateCardImages(allCards)
        headerImageUrl = imageUrls[0] || undefined
        const pitchImageUrls = imageUrls.slice(1)
        pitches = pitches.map((p: Record<string, unknown>, i: number) => ({
          ...p,
          imageUrl: pitchImageUrls[i] || undefined,
        }))
      } catch {
        // Image generation failure shouldn't break dispatch
      }
    }

    const responseData = {
      weekSummary: result.weekSummary || null,
      pitches,
      headerImageUrl,
      articleCount: articles.length,
      generatedAt: new Date().toISOString(),
    }

    // Cache in KV for fast subsequent loads
    if (KV_AVAILABLE) {
      kv.set(getWeekKey(), responseData, { ex: WEEK_TTL }).catch(() => {})
    }

    return Response.json({
      available: true,
      ...responseData,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
