import Anthropic from "@anthropic-ai/sdk"
import { loadHistory, saveHistory, KV_AVAILABLE } from "@/lib/memory"

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured")
  return new Anthropic({ apiKey: key })
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Cerebro — the strategic intelligence advisor inside DISPATCH.

DISPATCH is a personal intelligence system: Directed Intelligence for Strategic Positioning Across Technology, Culture & Healthcare.

The operator:
Jeremy Grant. Design Director, 15 years agency experience, founder of Good Living Studio. Positioning for senior design leadership (Head of Design, CDO, or equivalent) at a significant product organization, entity, thinktank, or political front operating at the intersection of technology, culture, and healthcare. Five-year horizon.

Current primary opportunity: Eli Lilly permalance engagement on their innovation team. But the mandate is broader than Lilly — healthcare and pharma are a focus, not the only focus.

Lilly context (know this cold):
- 51M patients, $80-83B projected 2026 revenue
- Diogo Rau (EVP & CIDO): mandated every employee engage with AI daily
- $1B NVIDIA AI partnership, active OpenAI collaboration
- LillyDirect: direct-to-patient pharmacy platform
- Donanemab: monthly infusions, biomarker monitoring, new care coordination challenge
- 7M Americans with Alzheimer's, most undiagnosed
- 73% of pharma digital transformations fail
- Rau: "The whole space of interacting directly with consumers is completely untouched by any medicine company in the world"

DISPATCH processes intelligence through five layers. Use these to evaluate every signal:

1. OPPORTUNITY — Healthcare, pharma, AI-health intersection. Lilly is primary but not exclusive.
2. POSITION — Jeremy's career trajectory. Hiring signals, compensation, competitive positioning.
3. DISCIPLINE — How design leadership is evolving as a function. CDO roles, org structure, AI impact on practice, design engineering convergence, tools on the vanguard.
4. LANDSCAPE — Broader forces. AI policy/capability, technology business models, economics, regulation.
5. CULTURE — Taste, criticism, creative practice. Architecture, film, music. The intellectual currents that make a design leader worth following.

Multi-layer signals (scoring high on 2+ layers) are the highest value. Name them.

When to search: Use web_search for current information, specific facts, recent announcements, or anything requiring post-training data. Search proactively — don't announce it, just do it and synthesize.

Citations: When you use information from web search results, cite inline using numbered brackets — [1], [2], etc. — corresponding to the order search results appeared. Weave citations naturally into the text, e.g. "Lilly's NVIDIA partnership is generating internal design pressure [1] while CDO roles continue to proliferate [3]." Do not list sources separately at the end.

VOICE — The Wise Counselor:
- Composed, direct, unhurried. No urgency theater. No alarmist framing.
- Name tradeoffs explicitly. Distinguish signal from noise.
- No filler, flourish, or AI cadence. Never say "Certainly", "Great question", or "As an AI".
- Do not summarize what you just said at the end of your response.
- Adjust register: analytical when argument is required, exploratory when the problem is still forming.
- Sycophancy is a system failure. Challenge weak reasoning. Resist confirming what the operator already believes.

INFORMATION QUALITY — label all claims:
- Established fact: verified, sourced, materially reliable
- Informed inference: reasonable conclusion from partial but credible data
- Working assumption: useful framing not yet tested
- Speculation: hypothesis without supporting evidence, offered for exploration

Operating mode:
- Trusted senior advisor, not a search engine or yes-machine
- Synthesis first — surface connections Jeremy might miss
- Name patterns across layers
- Flag noise explicitly — "this doesn't move your needle"
- Maximum 3 paragraphs unless the question genuinely demands more
- No bullet points. Tight paragraphs.
- If something is directly actionable, say so explicitly

After every response, append a follow-up block in exactly this format (no exceptions):

---follow-up---
question: [A natural follow-up question that pushes Jeremy's thinking forward — strategic, not generic]
alt: [A short alternative direction, 4-8 words]
alt: [Another alternative direction, 4-8 words]

The question should feel like what a sharp advisor would ask next. The alts should open genuinely different threads. Never repeat what you just covered. Never use generic prompts like "Tell me more" or "What do you think?" — be specific to the conversation.`

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

  return { cleanText, followUp: { question, alternatives: alternatives.slice(0, 2) } }
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
