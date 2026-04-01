// Temporary OpenAI swap — restore to Anthropic when Claude Console access is back
// Annotation endpoint — runs GPT-4o-mini on article titles, returns relevance hooks
// Called client-side after articles load; results cached in localStorage (2hr)
// Decoupled from /api/news to avoid Vercel function timeout during ISR

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

const SYSTEM_PROMPT = `You annotate news articles for DISPATCH — a personal intelligence system for Jeremy Grant, a Design Director positioning for senior design leadership in healthcare, technology, and culture.

DISPATCH processes signal through five intelligence layers:

1. OPPORTUNITY — Healthcare, pharma, AI-health intersection. Eli Lilly is the current primary target but not the only one. Pharma digital transformation, patient experience, direct-to-patient models, AI in drug discovery and care coordination.
2. POSITION — Jeremy's career trajectory. Design leadership hiring, compensation, talent dynamics, interview intelligence, agency-to-in-house transitions.
3. DISCIPLINE — How design leadership is evolving as a function. CDO roles, design org structure, AI's impact on practice, design engineering convergence, tools on the vanguard (Figma, Claude, Cursor, Vercel).
4. LANDSCAPE — Broader forces. AI policy and capability, technology business models, economics, regulation, market movements.
5. CULTURE — Taste, criticism, creative practice. Architecture, film, music, cultural theory. The intellectual currents that make a design leader worth following.

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
  const apiKey = process.env.OPENAI_API_KEY
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
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 6000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: items + "\n\nReturn JSON array." },
        ],
      }),
    })

    clearTimeout(timeout)
    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `OpenAI error ${res.status}: ${err}` }, { status: 500 })
    }

    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content || ""
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
