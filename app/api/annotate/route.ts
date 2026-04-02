// Annotation endpoint — runs Claude Haiku on article titles, returns relevance hooks
// Called client-side after articles load; results cached in localStorage (2hr)
// Decoupled from /api/news to avoid Vercel function timeout during ISR

import Anthropic from "@anthropic-ai/sdk"
import { DISPATCH_PREAMBLE } from "@/lib/prompts"

interface ArticleInput {
  id: string
  title: string
  category: string
}

interface Annotation {
  id: string
  synopsis: string
  relevance: string
  signalType: string
  signalLens: string
  signalScores?: { opportunity: number; position: number; discipline: number; landscape: number; culture: number; urgency: number }
}

const SYSTEM_PROMPT = `You annotate news articles for DISPATCH.

${DISPATCH_PREAMBLE}

For each numbered headline, return a JSON array. One object per article, same order:
{
  "synopsis": "one plain sentence — what this article actually covers, framed for someone tracking design leadership and strategic positioning across technology, culture, and healthcare",
  "hook": "one sharp sentence — why this signal matters to the DISPATCH mandate. What it reveals, what it implies, what connection it makes. Never say 'not relevant' — find the signal, even if indirect.",
  "type": one of: DATA | CASE | OPINION | TREND | RESEARCH | NEWS | CULTURAL,
  "lens": the PRIMARY layer this maps to — one of: OPPORTUNITY | POSITION | DISCIPLINE | LANDSCAPE | CULTURE,
  "scores": { "opportunity": 0-10, "position": 0-10, "discipline": 0-10, "landscape": 0-10, "culture": 0-10, "urgency": 0-10 }
}

Score definitions (0 = no relevance to this layer, 10 = essential):
opportunity — strengthens healthcare/pharma positioning
position — directly advances the career trajectory
discipline — reveals how design leadership is evolving
landscape — illuminates the broader operating environment
culture — enriches creative authority and taste
urgency — time-sensitivity (0 = evergreen, 10 = act now)

Multi-layer signals (scoring high on 2+ layers) are the most valuable. Flag them.

Return only valid JSON array. No prose.`

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return Response.json({ error: "No API key" }, { status: 500 })

  let articles: ArticleInput[] = []
  try {
    const body = await req.json()
    articles = body.articles || []
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (articles.length === 0) {
    return Response.json({ annotations: [] })
  }

  const items = articles
    .map((a, i) => `${i + 1}. [${a.category}] ${a.title}`)
    .join("\n")

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: items + "\n\nReturn JSON array." },
      ],
    })

    const text = response.content[0]?.type === "text" ? response.content[0].text : ""
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return Response.json({ annotations: [] })

    const raw: { synopsis?: string; hook?: string; type?: string; lens?: string; scores?: { opportunity: number; position: number; discipline: number; landscape: number; culture: number; urgency: number } }[] =
      JSON.parse(match[0])

    const annotations: Annotation[] = articles.map((a, i) => ({
      id:           a.id,
      synopsis:     raw[i]?.synopsis  || "",
      relevance:    raw[i]?.hook      || "",
      signalType:   raw[i]?.type      || "",
      signalLens:   raw[i]?.lens      || "",
      signalScores: raw[i]?.scores,
    }))

    return Response.json({ annotations })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
