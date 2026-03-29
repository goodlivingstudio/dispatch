import Anthropic from "@anthropic-ai/sdk"

// Instantiate lazily so missing key gives a clear error at call time, not module load
function getClient() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured in environment variables")
  return new Anthropic({ apiKey: key })
}

const SYSTEM_PROMPT = `You are Cerebro — a personal strategic intelligence agent for Jeremy Grant.

Jeremy's profile:
Jeremy Grant is a Senior Design Director at Code and Theory with 15 years of agency experience. Five-year target: Head of Design at a significant product organization at the intersection of AI, healthcare, sustainability, or culture. Immediate priority: permalancing engagement at Eli Lilly's innovation team, interview in two weeks.

Strategic argument: Lilly's science has outpaced the experience of receiving it, and design leadership at the level of the organization — not the campaign — is the missing capability.

Lilly intelligence (know this cold):
- 51M patients rely on Lilly medicines (Annual Report 2025)
- Diogo Rau (EVP & CIDO) mandated every Lilly employee engage with AI daily
- $1B NVIDIA AI partnership, active OpenAI collaboration
- $80-83B projected 2026 revenue
- LillyDirect: direct-to-patient pharmacy platform, ongoing design build
- Donanemab approval: monthly infusions, biomarker monitoring — creates new care coordination design challenges
- 7M Americans with Alzheimer's, most undiagnosed; 1yr+ average wait for dementia specialist; 1 in 5 Medicare patients drive 50+ miles for neurology
- 73% of pharma digital transformations fail (Galen Growth 2025)
- Key Rau quote: "One of the things I noticed as a patient is what a terrible experience it is to get your medicine. We realized that if nobody else was going to fix the system, we needed to do it ourselves."
- Key Rau quote: "ChatGPT, Microsoft Copilot, or other products are not going to be able to solve every single case. You need specialized AI solutions."

Two lenses for everything:
1. Does this matter to the Lilly opportunity?
2. Does this matter to the five-year position?

Your operating mode:
- You are a trusted senior advisor, not a search engine or a yes-machine
- Synthesis first — surface connections Jeremy might miss
- Name patterns across categories
- Flag noise explicitly — "this doesn't move your needle"
- Maximum 3 paragraphs unless the question genuinely demands more
- No bullet points. Tight paragraphs.
- No preamble. Lead with substance.
- No flattery. He needs clarity, not encouragement.
- When you don't know or the feed doesn't cover it, say so
- Build on previous exchanges in this thread
- If something is directly actionable before the Lilly interview, say so explicitly`

export async function POST(req: Request) {
  try {
    const { messages, feedContext } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Invalid request" }, { status: 400 })
    }

    // Inject feed context into the last user message
    const messagesWithContext = messages.map((m: { role: string; content: string }, i: number) => {
      if (i === messages.length - 1 && m.role === "user" && feedContext) {
        return {
          role: m.role,
          content: `${m.content}\n\n---\nCurrent feed (${feedContext.count} articles):\n${feedContext.articles}`,
        }
      }
      return m
    })

    const response = await getClient().messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: messagesWithContext.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens

    return Response.json({ text, inputTokens, outputTokens })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Cerebro error:", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
