// Synthesis endpoint — generates narrative intelligence briefing from today's feed + 7-day history
import Anthropic from "@anthropic-ai/sdk"
import { DISPATCH_PREAMBLE } from "@/lib/prompts"
import { loadArticleHistory } from "@/lib/article-store"

const SYSTEM_PROMPT = `${DISPATCH_PREAMBLE}

You are the pattern intelligence layer of Dispatch. Your job is not to summarize today's feed. Your job is to tell the operator what the feed means — what's converging, what's building, and what it demands of him.

You are operating in the middle of a Signal → Pattern → Action pipeline. Signal (the feed) is upstream. Action (Dispatch content pitches) is downstream. You are the interpretive layer between them.

WHAT TO PRODUCE:

1. MAIN BRIEFING (1 tight paragraph):
The single most important pattern across today's (or this week's) signal. Not the most-read article. Not the highest-urgency score. The pattern that, when named, makes several signals suddenly make more sense together. Written as a briefing, not a summary. Should feel like the station chief's opening read.

2. CONVERGENCE PATTERNS (2–4 patterns):
Each pattern:
- NAME: A short declarative label for the pattern (e.g., "Pharma AI moving from discovery to delivery")
- OBSERVATION: 2–3 sentences. What signals are converging. What the convergence means.
- LAYERS: Which intelligence layers this pattern touches (list 2–3)
- IMPLICATION: 1 sentence. What this means specifically for this operator.

3. BLIND SPOT:
What should be showing up in the feed this week but isn't? What's conspicuously absent? This is the station chief's job — not just reading the signal, but noticing the silence.

4. CEREBRO PROVOCATION:
One sharp question the operator should be asking Cerebro right now, based on what you've seen in the feed. Make it specific enough to generate a useful response — not "what does this mean" but the actual question that opens the right conversation.

TONE: Briefing voice. Direct. No hedging. No bullet-pointed lists masquerading as analysis. Write paragraphs that contain interpretive claims, not descriptions.

When 7-day article history is available, weight the briefing toward trend detection over single-day analysis. What's been building all week matters more than what just arrived this morning.

Return a JSON object with this structure:
{
  "briefing": "The main briefing paragraph.",
  "patterns": [
    {
      "title": "Pattern name (3-5 words)",
      "description": "2-3 sentences explaining the convergence and its strategic implication.",
      "layers": ["opportunity", "discipline"],
      "signalCount": 4
    }
  ],
  "blindSpotNote": "What's conspicuously absent from the feed.",
  "cerebroProvocation": "One sharp question for Cerebro."
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

    // Build context from today's annotated articles
    const context = articles.slice(0, 25).map((a: { title: string; source: string; category: string; tag: string; synopsis?: string; relevance?: string; signalScores?: Record<string, number> }, i: number) => {
      const scores = a.signalScores ? Object.entries(a.signalScores).filter(([, v]) => v >= 5).map(([k, v]) => `${k}:${v}`).join(", ") : ""
      return `${i + 1}. [${a.tag}] ${a.source}: ${a.title}${a.synopsis ? ` — ${a.synopsis}` : ""}${scores ? ` (scores: ${scores})` : ""}`
    }).join("\n")

    // Load 7-day history for trend detection (lightweight: titles, scores, layers only)
    let historyContext = ""
    try {
      const history = await loadArticleHistory(7)
      // Exclude today's articles (already in context above) — group by date
      const todayStr = new Date().toISOString().slice(0, 10)
      const priorArticles = history.filter(a => !a.publishedAt.startsWith(todayStr))
      if (priorArticles.length > 0) {
        const byDate: Record<string, typeof priorArticles> = {}
        for (const a of priorArticles) {
          const date = a.publishedAt.slice(0, 10)
          if (!byDate[date]) byDate[date] = []
          byDate[date].push(a)
        }
        const lines = Object.entries(byDate)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, arts]) => {
            const entries = arts.slice(0, 10).map(a => {
              const urgency = a.signalScores?.urgency ?? 0
              return `  - [${a.tag}] ${a.title} (urgency: ${urgency})`
            }).join("\n")
            return `${date}:\n${entries}`
          }).join("\n\n")
        historyContext = `\n\nPrior 6 days (for trend detection):\n${lines}`
      }
    } catch {
      // KV unavailable — proceed without history
    }

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Today's feed (${articles.length} articles):\n\n${context}${historyContext}\n\nGenerate synthesis.` }],
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
