// Synthesis endpoint — generates narrative intelligence briefing from today's feed
import Anthropic from "@anthropic-ai/sdk"

const SYSTEM_PROMPT = `You are the synthesis engine for DISPATCH — a personal intelligence system for Jeremy Grant, a Design Director positioning for senior design leadership at the intersection of technology, culture, and healthcare.

You receive today's scored and annotated articles. Your job is to produce a narrative intelligence briefing that answers:
1. What is the single most important pattern across today's signals?
2. What multi-layer convergences are emerging (signals that score high on 2+ layers)?
3. What should Jeremy be paying attention to that he might miss?

VOICE: Composed, direct, analytical. No filler. Lead with the implication, not the event.

Return a JSON object with this structure:
{
  "briefing": "2-3 sentences. The single most important insight from today's feed, framed for the mandate. Lead with why it matters, not what happened.",
  "patterns": [
    {
      "title": "Pattern name (3-5 words)",
      "description": "2-3 sentences explaining the convergence and its strategic implication.",
      "layers": ["opportunity", "discipline"],
      "signalCount": 4
    }
  ],
  "blindSpotNote": "One sentence about which intelligence layer is underrepresented today and what that might mean."
}

Return 2-4 patterns. Each pattern must involve 2+ layers. Be specific — name companies, trends, and numbers from the articles.

Return only valid JSON. No prose outside the JSON.`

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return Response.json({ error: "No API key" }, { status: 500 })

  try {
    const { articles } = await req.json()
    if (!articles?.length) {
      return Response.json({ briefing: null, patterns: [], blindSpotNote: null })
    }

    // Build context from annotated articles
    const context = articles.slice(0, 25).map((a: { title: string; source: string; category: string; tag: string; synopsis?: string; relevance?: string; signalScores?: Record<string, number> }, i: number) => {
      const scores = a.signalScores ? Object.entries(a.signalScores).filter(([, v]) => v >= 5).map(([k, v]) => `${k}:${v}`).join(", ") : ""
      return `${i + 1}. [${a.tag}] ${a.source}: ${a.title}${a.synopsis ? ` — ${a.synopsis}` : ""}${scores ? ` (scores: ${scores})` : ""}`
    }).join("\n")

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Today's feed (${articles.length} articles):\n\n${context}\n\nGenerate synthesis.` }],
    })

    const text = response.content[0]?.type === "text" ? response.content[0].text : ""
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return Response.json({ briefing: null, patterns: [], blindSpotNote: null })

    const result = JSON.parse(match[0])
    return Response.json(result)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
