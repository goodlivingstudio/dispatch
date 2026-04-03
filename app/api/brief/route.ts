import Anthropic from "@anthropic-ai/sdk"
import { DISPATCH_PREAMBLE } from "@/lib/prompts"

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured")
  return new Anthropic({ apiKey: key })
}

const BRIEF_SYSTEM = `${DISPATCH_PREAMBLE}

Your task: generate exactly 3 signal cards from today's annotated feed. These are not headlines. They are deliberation triggers — each one surfaces a signal that specifically matters to this operator and frames why it demands attention.

SELECTION CRITERIA:
Sort the feed by urgency score first. From the highest-urgency signals, select 3 that:
- Are directly relevant to the operator's immediate context (Lilly engagement, CDO positioning, or professional evolution thesis)
- Represent distinct territory — do not pick three signals from the same layer
- Prefer multi-layer signals (scoring high on 2+ layers simultaneously)
- Have a clear "so what" for this operator specifically — not just interesting in the abstract

CARD FORMAT:
Each card must contain:
- headline: A sharp declarative statement of the signal (not a news headline — a synthesis statement). Max 12 words.
- body: 2–3 sentences. What the signal is. Why it matters to this operator specifically. What it might demand of him.
- source: Article title and source name
- citation: [1], [2], [3] inline references
- layer: Primary intelligence layer (Opportunity / Position / Discipline / Landscape / Culture)
- urgency: The urgency score (0–10)

TONE: Direct. No hedging. The card should feel like something a trusted senior advisor flagged specifically for you — not a system-generated summary.

FORMAT — return exactly three signals separated by the literal string |||

Each signal must be:
LINE 1: The label (2-4 words, uppercase — what kind of signal this is)
LINE 2: One sentence of substance with article citations in brackets. Direct. No hedging. Lead with the implication, not the event. Keep it to one sharp sentence.

Nothing else. No preamble. No sign-off. Three signals, one ||| between each.`

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

    // Pad to exactly 3
    while (signals.length < 3) {
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
      ],
    })
  }
}
