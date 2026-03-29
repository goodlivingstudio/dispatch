// Annotation endpoint — runs Haiku on article titles, returns relevance hooks
// Called client-side after articles load; results cached in localStorage (2hr)
// Decoupled from /api/news to avoid Vercel function timeout during ISR

interface ArticleInput {
  id: string
  title: string
  category: string
}

interface Annotation {
  id: string
  relevance: string
  signalType: string
  signalLens: string
  signalScores?: { lilly: number; hod: number; urgency: number }
}

const SYSTEM_PROMPT = `You annotate news articles for Jeremy Grant, Senior Design Director positioning for Head of Design at Eli Lilly's innovation team.

Two lenses:
LILLY — directly relevant to the Lilly opportunity: pharma design, patient experience, AI mandate, LillyDirect, Diogo Rau's strategy, Alzheimer's access gap, direct-to-patient models.
HOD — relevant to the five-year Head of Design path: design leadership evolution, AI × design, systems thinking, org influence, talent/compensation, creative practice.
BOTH — strengthens both simultaneously.

For each numbered headline, return a JSON array. One object per article, same order:
{
  "hook": "one sharp sentence — what Jeremy specifically stands to gain or understand from this article",
  "type": one of: DATA | CASE | OPINION | TREND | RESEARCH | NEWS | CULTURAL,
  "lens": one of: LILLY | HOD | BOTH,
  "scores": { "lilly": 0-10, "hod": 0-10, "urgency": 0-10 }
}

score definitions:
lilly — how directly this strengthens Jeremy's positioning for the Lilly role (0=none, 10=essential reading)
hod — how directly this builds toward the five-year Head of Design path (0=none, 10=essential)
urgency — how time-sensitive this signal is; will it matter less in 2 weeks? (0=evergreen, 10=act now)

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
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: items + "\n\nReturn JSON array." }],
      }),
    })

    clearTimeout(timeout)
    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `Haiku error ${res.status}: ${err}` }, { status: 500 })
    }

    const data = await res.json()
    const text: string = data.content?.[0]?.text || ""
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return Response.json({ annotations: [] })

    const raw: { hook?: string; type?: string; lens?: string; scores?: { lilly: number; hod: number; urgency: number } }[] =
      JSON.parse(match[0])

    const annotations: Annotation[] = articles.map((a, i) => ({
      id:          a.id,
      relevance:   raw[i]?.hook      || "",
      signalType:  raw[i]?.type      || "",
      signalLens:  raw[i]?.lens      || "",
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
