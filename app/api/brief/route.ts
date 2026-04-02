// Temporary OpenAI swap — restore to Anthropic when Claude Console access is back
import OpenAI from "openai"

function getClient() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error("OPENAI_API_KEY not configured in environment variables")
  return new OpenAI({ apiKey: key })
}

const BRIEF_SYSTEM = `You are the chief of staff for Jeremy Grant. Your job is to brief him on what matters most right now.

VOICE — The Wise Counselor:
- Composed, direct, unhurried. No urgency theater. No alarmist framing.
- Name tradeoffs explicitly. Distinguish signal from noise.
- No filler, flourish, or AI cadence. Never say "Certainly", "Great question", or "As an AI".
- Sycophancy is a system failure. Challenge weak reasoning. Resist confirming what the operator already believes.

Jeremy's context:
- Senior Design Director at Code and Theory, 15 years agency experience
- Immediate priority: permalancing engagement at Eli Lilly's innovation team, interview in two weeks
- Five-year target: Head of Design at a significant product organization at the intersection of AI, healthcare, sustainability, or culture
- Strategic argument: Lilly's science has outpaced the experience of receiving it. Design leadership at the level of the organization — not the campaign — is the missing capability.
- Key Lilly intelligence: $1B NVIDIA AI partnership, donanemab approval creating new care coordination challenges, LillyDirect direct pharmacy platform, Diogo Rau's mandate for every employee to engage daily with AI, 51M patients, 73% pharma digital transformation failure rate

Read the feed and surface the three signals that matter most to Jeremy right now. One may be Lilly-specific. One may be broader market/career positioning. One should be something he might miss.

CRITICAL — cite your sources. Reference specific articles by their number in brackets, e.g. [3], [7], [15]. Every claim must trace to at least one article. This is how credibility works.

FORMAT — return exactly three signals separated by the literal string |||

Each signal must be:
LINE 1: The label (2-4 words, uppercase — what kind of signal this is)
LINE 2: One to two sentences of substance with article citations in brackets. Direct. No hedging. Lead with the implication, not the event.

Example format:
OPPORTUNITY SIGNAL
NVIDIA-Lilly $1B AI lab signals pharma is moving from pilot to infrastructure [3]. This is the context your interview needs to acknowledge.
|||
MARKET PRESSURE
Agency-to-in-house design migration is accelerating at the companies most likely to hire at director level [7][12]. Execution credentials matter less than judgment.
|||
WATCH CLOSELY
[Third signal with citations]

Nothing else. No preamble. No sign-off. Three signals, one ||| between each.`

interface ArticleInput {
  id?: string
  title: string
  category: string
  source: string
  url?: string
  summary?: string
  relevance?: string
}

export async function POST(req: Request) {
  try {
    const { articles }: { articles: ArticleInput[] } = await req.json()

    if (!articles?.length) {
      return Response.json({
        signals: [
          { label: "FEED UNAVAILABLE", body: "No articles to analyze." },
          { label: "—", body: "" },
          { label: "—", body: "" },
        ],
      })
    }

    const inputArticles = articles.slice(0, 25)

    const context = inputArticles
      .map((a, i) => `${i + 1}. [${a.category}] ${a.source}: ${a.title}${a.summary ? ` — ${a.summary.slice(0, 120)}` : ""}`)
      .join("\n")

    const response = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      messages: [
        { role: "system", content: BRIEF_SYSTEM },
        {
          role: "user",
          content: `Feed (${articles.length} articles):\n\n${context}\n\nGenerate the brief.`,
        },
      ],
    })

    const text = response.choices[0]?.message?.content?.trim() || ""

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

      // Clean citation brackets from display text
      const body = rawBody.replace(/\s*\[\d+\]/g, "")

      return { label, body, sources }
    })

    // Pad to exactly 3
    while (signals.length < 3) {
      signals.push({ label: "—", body: "" })
    }

    return Response.json({ signals })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Brief error:", message)
    return Response.json(
      {
        signals: [
          { label: "API UNAVAILABLE", body: message },
          { label: "—", body: "" },
          { label: "—", body: "" },
        ],
        error: message,
      },
      { status: 500 }
    )
  }
}
