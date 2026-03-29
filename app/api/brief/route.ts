import Anthropic from "@anthropic-ai/sdk"

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured in environment variables")
  return new Anthropic({ apiKey: key })
}

const BRIEF_SYSTEM = `You are the chief of staff for Jeremy Grant. Your job is to brief him on what matters most right now.

Jeremy's context:
- Senior Design Director at Code and Theory, 15 years agency experience
- Immediate priority: permalancing engagement at Eli Lilly's innovation team, interview in two weeks
- Five-year target: Head of Design at a significant product organization at the intersection of AI, healthcare, sustainability, or culture
- Strategic argument: Lilly's science has outpaced the experience of receiving it. Design leadership at the level of the organization — not the campaign — is the missing capability.
- Key Lilly intelligence: $1B NVIDIA AI partnership, donanemab approval creating new care coordination challenges, LillyDirect direct pharmacy platform, Diogo Rau's mandate for every employee to engage daily with AI, 51M patients, 73% pharma digital transformation failure rate

Read the feed and surface the three signals that matter most to Jeremy right now. One may be Lilly-specific. One may be broader market/career positioning. One should be something he might miss.

FORMAT — return exactly three signals separated by the literal string |||

Each signal must be:
LINE 1: The label (2-4 words, uppercase — what kind of signal this is)
LINE 2: One to two sentences of substance. Direct. No hedging. Lead with the implication, not the event.

Example format:
LILLY OPPORTUNITY
NVIDIA-Lilly $1B AI lab signals pharma is moving from pilot to infrastructure. This is the context your interview needs to acknowledge.
|||
MARKET PRESSURE
Agency-to-in-house design migration is accelerating at the companies most likely to hire at director level. Execution credentials matter less than ever.
|||
WATCH CLOSELY
[Third signal]

Nothing else. No preamble. No sign-off. Three signals, one ||| between each.`

interface ArticleInput {
  title: string
  category: string
  source: string
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

    const context = articles
      .slice(0, 25)
      .map((a, i) => `${i + 1}. [${a.category}] ${a.source}: ${a.title}${a.summary ? ` — ${a.summary.slice(0, 120)}` : ""}`)
      .join("\n")

    const response = await getClient().messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 500,
      system: BRIEF_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Feed (${articles.length} articles):\n\n${context}\n\nGenerate the brief.`,
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : ""

    // Parse three signals separated by |||
    const parts = text.split("|||").map(s => s.trim()).filter(Boolean)
    const signals = parts.slice(0, 3).map(part => {
      const lines = part.split("\n").map(l => l.trim()).filter(Boolean)
      const label = lines[0] || "SIGNAL"
      const body = lines.slice(1).join(" ").trim() || ""
      return { label, body }
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
      { status: 200 }
    )
  }
}
