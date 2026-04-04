// Audio Brief — generates 3 signal cards from podcast episodes
// Same pattern as /api/brief but specific to audio content
import Anthropic from "@anthropic-ai/sdk"
import { DISPATCH_PREAMBLE } from "@/lib/prompts"

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured")
  return new Anthropic({ apiKey: key })
}

const BRIEF_SYSTEM = `${DISPATCH_PREAMBLE}

Your task: generate exactly 3 signal cards from the podcast episodes below. These are audio intelligence — conversations, interviews, and analysis that carry different weight than written news.

SELECTION CRITERIA:
- Select the 3 episodes most relevant to the mandate right now
- Prefer episodes that surface insights not available in the news feed (interviews, practitioner perspective, long-form analysis)
- Each card should represent distinct territory

CARD FORMAT:
Each card must contain:
- headline: A sharp statement of why this episode matters. Max 12 words.
- body: ONE sentence only. Max 30 words. What this episode reveals or demands.

TONE: Direct. The card should make someone want to listen immediately.

FORMAT — return exactly three signals separated by the literal string |||

Each signal must be:
LINE 1: The label (2-4 words, uppercase)
LINE 2: One sentence with the episode reference.

Nothing else. No preamble. No sign-off. Three signals, one ||| between each.`

interface EpisodeInput {
  title: string
  showName: string
  category: string
  summary?: string
}

export async function POST(req: Request) {
  try {
    const { episodes }: { episodes: EpisodeInput[] } = await req.json()

    if (!episodes?.length) {
      return Response.json({
        signals: [
          { label: "NO EPISODES", body: "", sources: [] },
          { label: "—", body: "", sources: [] },
          { label: "—", body: "", sources: [] },
        ],
      })
    }

    const inputEpisodes = episodes.slice(0, 20)
    const context = inputEpisodes
      .map((e, i) => `${i + 1}. [${e.category}] ${e.showName}: ${e.title}${e.summary ? ` — ${e.summary.slice(0, 100)}` : ""}`)
      .join("\n")

    const response = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: BRIEF_SYSTEM,
      messages: [{ role: "user", content: `Podcast episodes (${episodes.length}):\n\n${context}\n\nGenerate the audio brief.` }],
    })

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : ""
    const parts = text.split("|||").map(s => s.trim()).filter(Boolean)

    const signals = parts.slice(0, 3).map(part => {
      const lines = part.split("\n").map(l => l.trim()).filter(Boolean)
      const label = lines[0] || "SIGNAL"
      const body = lines.slice(1).join(" ").trim() || ""
      return { label, body, sources: [] }
    })

    while (signals.length < 3) {
      signals.push({ label: "—", body: "", sources: [] })
    }

    return Response.json({ signals })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({
      signals: [
        { label: "BRIEF ERROR", body: message, sources: [] },
        { label: "—", body: "", sources: [] },
        { label: "—", body: "", sources: [] },
      ],
    })
  }
}
