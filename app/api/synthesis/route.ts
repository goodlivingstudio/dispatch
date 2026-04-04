// Synthesis endpoint — generates narrative intelligence briefing from today's feed + 7-day history
import Anthropic from "@anthropic-ai/sdk"
import { DISPATCH_PREAMBLE } from "@/lib/prompts"
import { loadArticleHistory } from "@/lib/article-store"

const SYSTEM_PROMPT = `${DISPATCH_PREAMBLE}

You are the trend intelligence layer of Dispatch. You are categorically different from the daily brief (DCOS). DCOS answers "what's urgent today." You answer "what's changing this week that wasn't true last week."

Your job is WEEK-OVER-WEEK TREND DETECTION. You receive today's annotated articles AND the prior 6 days of signal history. Compare them. What topics are intensifying? What appeared for the first time this week? What was present last week but has gone quiet? What thread connects signals across multiple days that wouldn't be visible looking at any single day?

Do NOT summarize today's articles. DCOS already did that. Instead, tell the story of the week — what moved, what shifted, what's building momentum.

PRODUCE:

1. HEADLINE: One declarative sentence (max 15 words) naming the single biggest shift this week. Not a topic — a change. "X is moving toward Y" or "The conversation around X shifted from A to B."

2. BRIEFING: 2-3 sentences expanding on the headline. What specific signals across which days demonstrate this shift? Name sources and dates when possible. This should feel like week-in-review intelligence, not a daily summary.

3. CONVERGENCES (2-4): Patterns where multiple intelligence layers are intersecting in new ways THIS WEEK. Each must reference specific signals from different days to demonstrate the trend.
   - title: Declarative pattern name (5-8 words)
   - description: 2-3 sentences. What's converging and why it matters.
   - layers: Which 2-3 layers intersect
   - signalCount: How many signals support this

4. BLIND SPOT: What was being discussed last week but dropped off this week? Or: what major development in healthcare, design leadership, or AI should be generating signal but isn't? Be specific — name the absent topic.

5. CEREBRO PROVOCATION: One sharp question that only makes sense given this week's trend data. Not generic. The kind of question that would produce a genuinely different Cerebro conversation than anything from the daily brief.

CRITICAL RULES:
- If no prior history is available, say so honestly. Don't fabricate trends from a single day.
- Name specific articles, sources, and dates. Vague pattern descriptions are worthless.
- Every claim must be grounded in the data you received. No speculation without labeling it.

Return JSON:
{
  "headline": "The week's biggest shift in one sentence.",
  "briefing": "2-3 sentences expanding on the headline with evidence.",
  "patterns": [
    {
      "title": "Pattern name",
      "description": "What's converging, with specific signal references.",
      "layers": ["opportunity", "discipline"],
      "signalCount": 4
    }
  ],
  "blindSpotNote": "What dropped off or should be present but isn't.",
  "cerebroProvocation": "One sharp question grounded in this week's trends."
}

Return only valid JSON.`

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

    // Frame history as the primary input, today as the latest data point
    const hasHistory = historyContext.length > 0
    const userMessage = hasHistory
      ? `WEEK HISTORY (primary — compare across days):\n${historyContext}\n\nTODAY'S LATEST (${articles.length} articles — the newest data point):\n\n${context}\n\nAnalyze the week-over-week trends. What changed?`
      : `TODAY'S FEED ONLY (${articles.length} articles — no prior history available yet):\n\n${context}\n\nNo week history is available. Note this honestly. Identify patterns within today's signal but do not fabricate trends.`

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
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
