import Anthropic from "@anthropic-ai/sdk"
import { loadHistory, saveHistory, KV_AVAILABLE } from "@/lib/memory"
import { DISPATCH_PREAMBLE } from "@/lib/prompts"

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured")
  return new Anthropic({ apiKey: key })
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `${DISPATCH_PREAMBLE}

You are Cerebro — the conversational intelligence layer of Dispatch. You have access to:
- The operator's full mandate and context (above)
- Today's annotated signal feed (injected as context)
- Conversation history (persisted across sessions)
- Web search capability via Exa for real-time intelligence

Your operating mode:

STATION CHIEF. You are not a search engine or a summarizer. You are an active intelligence function. When a signal arrives, your job is not to explain it — it is to interpret it in context, say what it means, and say what it might demand.

SYNTHESIS OVER SUMMARY. Never summarize when you can synthesize. If you receive an article, don't explain what it says — say what it means given the current position, the Lilly engagement, and the five-year target.

MULTI-LAYER THINKING. Always ask: does this signal touch more than one layer? A CDO hire at a pharma company is simultaneously a Position signal and an Opportunity signal. Name the intersection.

WEB SEARCH USAGE. Use web_search proactively when:
- The operator is deliberating on a topic where current data would sharpen the analysis
- A signal references a company, person, or event you need current intelligence on
- The conversation would benefit from knowing what else is happening in the space right now
Search up to 5 times per response when needed. Cite all sources with [1][2] inline.

Citations: When you use information from web search results, cite inline using numbered brackets — [1], [2], etc. Weave citations naturally into the text. Do not list sources separately at the end.

INFORMATION QUALITY — label all claims:
- Established fact: verified, sourced, materially reliable
- Informed inference: reasonable conclusion from partial but credible data
- Working assumption: useful framing not yet tested
- Speculation: hypothesis without supporting evidence, offered for exploration

FORMATTING:
- Tight paragraphs. No bullet points.
- No preamble. Lead with the most important thing.
- Maximum 3 paragraphs unless the question genuinely demands more.
- Do not summarize what you just said at the end of your response.
- Citations inline: [1][2]

After every response, append a follow-up block in exactly this format (no exceptions):

---follow-up---
question: [A natural follow-up question that pushes thinking forward — strategic, not generic]
alt: [A short conversation starter, 4-8 words — a different direction]
alt: [Another conversation starter, 4-8 words]
alt: [A third conversation starter, 4-8 words]`

// ─── Follow-up parser ─────────────────────────────────────────────────────────

function parseFollowUp(text: string): {
  cleanText: string
  followUp: { question: string; alternatives: string[] } | null
} {
  const marker = "---follow-up---"
  const idx = text.indexOf(marker)

  if (idx === -1) return { cleanText: text.trim(), followUp: null }

  const cleanText = text.slice(0, idx).trim()
  const followSection = text.slice(idx + marker.length).trim()
  const lines = followSection.split("\n").map(l => l.trim()).filter(Boolean)

  let question = ""
  const alternatives: string[] = []

  for (const line of lines) {
    if (line.toLowerCase().startsWith("question:")) {
      question = line.slice(9).trim()
    } else if (line.toLowerCase().startsWith("alt:")) {
      alternatives.push(line.slice(4).trim())
    }
  }

  if (!question) return { cleanText: text.trim(), followUp: null }

  return { cleanText, followUp: { question, alternatives: alternatives.slice(0, 3) } }
}

// ─── Web Search Tool (Anthropic tool_use format) ────────────────────────────

const WEB_SEARCH_TOOL: Anthropic.Tool = {
  name: "web_search",
  description:
    "Search the live web for current intelligence. Use for: recent company news, executive interviews, hiring signals, analyst reports, anything post-training or requiring current specificity. Be precise with queries — include names, dates, organizations.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Specific search query. Example: 'Eli Lilly Diogo Rau AI design 2025'",
      },
    },
    required: ["query"],
  },
}

interface SearchSource { title: string; url: string }

async function exaSearch(query: string): Promise<{ text: string; sources: SearchSource[] }> {
  const key = process.env.EXA_API_KEY
  if (!key) return { text: "[web search unavailable — EXA_API_KEY not configured]", sources: [] }

  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify({
        query,
        numResults: 5,
        contents: { text: { maxCharacters: 600 } },
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return { text: `[search error: ${res.status}]`, sources: [] }
    const data = await res.json()
    const results = (data.results || []).slice(0, 5)
    if (!results.length) return { text: "[no results found]", sources: [] }

    const sources: SearchSource[] = results.map(
      (r: { title: string; url: string }) => ({ title: r.title, url: r.url })
    )

    const text = results
      .map(
        (r: { title: string; url: string; text?: string; publishedDate?: string }) =>
          [
            `TITLE: ${r.title}`,
            `URL: ${r.url}`,
            r.publishedDate ? `DATE: ${new Date(r.publishedDate).toLocaleDateString()}` : "",
            r.text?.slice(0, 500) || "",
          ]
            .filter(Boolean)
            .join("\n")
      )
      .join("\n\n---\n\n")

    return { text, sources }
  } catch (err) {
    return { text: `[search exception: ${err instanceof Error ? err.message : String(err)}]`, sources: [] }
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { messages, feedContext, sessionId, images } = await req.json()
    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Invalid request" }, { status: 400 })
    }

    const client   = getClient()
    const hasExa   = !!process.env.EXA_API_KEY
    const tools    = hasExa ? [WEB_SEARCH_TOOL] : []

    // ── Load persisted history (if KV configured and sessionId provided) ─────
    let baseMessages: Array<{ role: "user" | "assistant"; content: string }> = messages
    if (KV_AVAILABLE && sessionId && messages.length <= 2) {
      const history = await loadHistory(sessionId)
      if (history.length > 0) {
        const historyContents = new Set(history.map(m => m.content))
        const newOnly = messages.filter((m: { content: string }) => !historyContents.has(m.content))
        baseMessages = [...history, ...newOnly]
      }
    }

    // Build Anthropic messages array
    const anthropicMessages: Anthropic.MessageParam[] = []

    for (let i = 0; i < baseMessages.length; i++) {
      const m = baseMessages[i]
      const isLast = i === baseMessages.length - 1 && m.role === "user"
      let textContent = m.content
      if (isLast && feedContext) {
        textContent = `${m.content}\n\n---\nCurrent feed (${feedContext.count} articles):\n${feedContext.articles}`
      }

      // Multimodal: attach images to the last user message
      if (isLast && Array.isArray(images) && images.length > 0) {
        const content: Anthropic.ContentBlockParam[] = images.map(
          (img: { media_type: string; data: string }) => ({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: img.media_type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: img.data,
            },
          })
        )
        content.push({ type: "text" as const, text: textContent })
        anthropicMessages.push({ role: "user" as const, content })
      } else {
        anthropicMessages.push({ role: m.role as "user" | "assistant", content: textContent })
      }
    }

    // ── Agentic loop — handles tool calls ────────────────────────────────────
    let currentMessages = [...anthropicMessages]
    const searchesPerformed: string[] = []
    const searchSources: SearchSource[] = []
    let totalInput  = 0
    let totalOutput = 0
    let finalText   = ""

    for (let iteration = 0; iteration < 5; iteration++) {
      const response = await client.messages.create({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system:     SYSTEM_PROMPT,
        tools:      tools.length > 0 ? tools : undefined,
        messages:   currentMessages,
      })

      totalInput  += response.usage?.input_tokens || 0
      totalOutput += response.usage?.output_tokens || 0

      // Extract text from response
      const textBlocks = response.content.filter(b => b.type === "text")
      const toolBlocks = response.content.filter(b => b.type === "tool_use")

      // No tool calls — we have a final answer
      if (response.stop_reason !== "tool_use" || toolBlocks.length === 0) {
        finalText = textBlocks.map(b => b.type === "text" ? b.text : "").join("")
        break
      }

      // Tool calls — execute and loop
      if (toolBlocks.length > 0) {
        // Append assistant turn with all content blocks
        currentMessages.push({ role: "assistant", content: response.content })

        // Execute each tool and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of toolBlocks) {
          if (block.type === "tool_use" && block.name === "web_search") {
            const query = (block.input as { query: string }).query
            searchesPerformed.push(query)
            const { text: searchText, sources } = await exaSearch(query)
            searchSources.push(...sources)
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: searchText,
            })
          }
        }

        currentMessages.push({ role: "user", content: toolResults })
      } else {
        finalText = textBlocks.map(b => b.type === "text" ? b.text : "").join("")
        break
      }
    }

    // ── Parse follow-up prompts from response ──────────────────────────────
    const { cleanText, followUp } = parseFollowUp(finalText)

    // ── Persist updated conversation to KV ───────────────────────────────────
    if (KV_AVAILABLE && sessionId && cleanText) {
      const toStore = [
        ...baseMessages.filter(m => typeof m.content === "string").map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content as string,
        })),
        { role: "assistant" as const, content: cleanText },
      ]
      await saveHistory(sessionId, toStore)
    }

    return Response.json({
      text:         cleanText,
      inputTokens:  totalInput,
      outputTokens: totalOutput,
      searches:     searchesPerformed,
      sources:      searchSources,
      memoryActive: KV_AVAILABLE,
      followUp,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Cerebro error:", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
