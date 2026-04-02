// Dispatch endpoint — weekly intelligence brief → content pitch pipeline
// Analyzes 7 days of article history and generates publishable content briefs
import Anthropic from "@anthropic-ai/sdk"
import { loadArticleHistory, ARTICLE_STORE_AVAILABLE } from "@/lib/article-store"
import { DISPATCH_PREAMBLE, VOICE } from "@/lib/prompts"

const SYSTEM_PROMPT = `You are the Dispatch engine — the action layer of DISPATCH. You turn intelligence into output.

${DISPATCH_PREAMBLE}

${VOICE}

You receive a week's worth of scored and annotated intelligence signals. Your job is to identify the 4-5 strongest publishable angles and produce comprehensive content briefs.

The operator publishes across two modes:
1. THOUGHT LEADERSHIP — LinkedIn, Medium, Substack. Analytical, strategic, positioned. Establishes authority.
2. CREATIVE EXPRESSION — Instagram, Lummi. Visual, atmospheric, cultural. Establishes taste.

For each pitch, return:
{
  "title": "Working title (compelling, not clickbait)",
  "thesis": "One clear sentence — the argument or perspective.",
  "mode": "thought_leadership" or "creative",
  "layers": ["which intelligence layers this draws from"],
  "brief": "3-4 sentences: what the piece covers, the structure, the hook, and the payoff.",
  "platforms": {
    "primary": "Best platform for this piece",
    "adaptations": ["How to adapt for other platforms — 1 sentence each"]
  },
  "evidence": ["2-3 specific signals from the week that support this angle"],
  "urgency": "Why now? What makes this timely?"
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
    return Response.json({
      available: true,
      weekSummary: result.weekSummary || null,
      pitches: result.pitches || [],
      articleCount: articles.length,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
