import Anthropic from "@anthropic-ai/sdk"
import { DISPATCH_PREAMBLE, VOICE } from "@/lib/prompts"

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured")
  return new Anthropic({ apiKey: key })
}

const BRIEF_SYSTEM = `You are the chief of staff inside DISPATCH. Your job is to brief the operator on what matters most right now.

${DISPATCH_PREAMBLE}

${VOICE}

Read the feed and surface the three signals that matter most right now. One may be Lilly-specific. One may be broader market/career positioning. One should be something the operator might miss.

CRITICAL — cite your sources. Reference specific articles by their number in brackets, e.g. [3], [7], [15]. Every claim must trace to at least one article.

FORMAT — return exactly five signals separated by the literal string |||

Each signal must be:
LINE 1: The label (2-4 words, uppercase — what kind of signal this is)
LINE 2: One sentence of substance with article citations in brackets. Direct. No hedging. Lead with the implication, not the event. Keep it to one sharp sentence.

Nothing else. No preamble. No sign-off. Five signals, one ||| between each.`

interface ArticleInput {
  title: string
  source: string
  category: string
  summary?: string
  url?: string
}

export async function POST(req: Request) {
  try {
    const { articles }: { articles: ArticleInput[] } = await req.json()

    if (!articles?.length) {
      return Response.json({
        signals: [
          { label: "FEED UNAVAILABLE", body: "No articles to analyze.", sources: [] },
          { label: "—", body: "", sources: [] },
          { label: "—", body: "", sources: [] },
          { label: "—", body: "", sources: [] },
          { label: "—", body: "", sources: [] },
        ],
      })
    }

    const inputArticles = articles.slice(0, 25)

    const context = inputArticles
      .map((a, i) => `${i + 1}. [${a.category}] ${a.source}: ${a.title}${a.summary ? ` — ${a.summary.slice(0, 120)}` : ""}`)
      .join("\n")

    const response = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 900,
      system: BRIEF_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Feed (${articles.length} articles):\n\n${context}\n\nGenerate the brief.`,
        },
      ],
    })

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : ""

    // Parse three signals separated by |||
    const parts = text.split("|||").map(s => s.trim()).filter(Boolean)
    const signals = parts.slice(0, 3).map(part => {
      const lines = part.split("\n").map(l => l.trim()).filter(Boolean)
      const label = lines[0] || "SIGNAL"
      const rawBody = lines.slice(1).join(" ").trim() || ""

      // Extract citation indices [1], [3], [15] from body text
      const citationMatches = rawBody.match(/\[(\d+)\]/g) || []
      const citedIndices = [...new Set(citationMatches.map(m => parseInt(m.replace(/[\[\]]/g, ""), 10) - 1))]

      // Map cited indices to actual articles
      let sources = citedIndices
        .filter(idx => idx >= 0 && idx < inputArticles.length)
        .map(idx => {
          const a = inputArticles[idx]
          return { title: a.title, url: a.url || "#", source: a.source }
        })

      // Fallback: if model didn't cite, match by keyword overlap
      if (sources.length === 0 && rawBody.length > 0) {
        const bodyLower = rawBody.toLowerCase()
        const matched = inputArticles
          .filter(a => {
            const words = a.title.toLowerCase().split(/\s+/).filter(w => w.length > 4)
            return words.some(w => bodyLower.includes(w))
          })
          .slice(0, 3)
          .map(a => ({ title: a.title, url: a.url || "#", source: a.source }))
        // Deduplicate by source name
        const seen = new Set<string>()
        sources = matched.filter(s => { if (seen.has(s.source)) return false; seen.add(s.source); return true })
      }

      // Renumber citations so [N] matches sources array index (1-based)
      let body = rawBody
      const renumberMap = new Map<number, number>()
      citedIndices.forEach((origIdx, i) => renumberMap.set(origIdx + 1, i + 1))
      body = body.replace(/\[(\d+)\]/g, (match, num) => {
        const newNum = renumberMap.get(parseInt(num, 10))
        return newNum ? `[${newNum}]` : match
      })

      return { label, body, sources }
    })

    // Pad to exactly 5
    while (signals.length < 5) {
      signals.push({ label: "—", body: "", sources: [] })
    }

    return Response.json({ signals })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Brief error:", message)
    return Response.json({
      signals: [
        { label: "BRIEF ERROR", body: message, sources: [] },
        { label: "—", body: "", sources: [] },
        { label: "—", body: "", sources: [] },
        { label: "—", body: "", sources: [] },
        { label: "—", body: "", sources: [] },
      ],
    })
  }
}
