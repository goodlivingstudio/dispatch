// Dispatch endpoint — weekly intelligence brief → content pitch pipeline
// Analyzes 7 days of article history and generates publishable content briefs
import Anthropic from "@anthropic-ai/sdk"
import { generateCardImages } from "@/lib/image-gen"
import { loadArticleHistory, ARTICLE_STORE_AVAILABLE } from "@/lib/article-store"
import { DISPATCH_PREAMBLE } from "@/lib/prompts"
import { kv } from "@vercel/kv"

const KV_AVAILABLE = !!(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
)

function getWeekKey(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  const weekNum = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7)
  return `dispatch:weekly:${now.getFullYear()}-w${weekNum}`
}

const WEEK_TTL = 7 * 24 * 60 * 60 // 7 days

// ─── Citation resolution ────────────────────────────────────────────────────

interface ContextArticle {
  title: string
  url: string
  source: string
}

function resolveCitations(body: string, contextArticles: ContextArticle[]): { body: string; sources: { title: string; url: string; source: string }[] } {
  const citationMatches = body.match(/\[(\d+)\]/g) || []
  const citedIndices = [...new Set(citationMatches.map(m => parseInt(m.replace(/[\[\]]/g, ""), 10) - 1))]

  const sources = citedIndices
    .filter(idx => idx >= 0 && idx < contextArticles.length)
    .map(idx => ({
      title: contextArticles[idx].title,
      url: contextArticles[idx].url || "#",
      source: contextArticles[idx].source,
    }))

  // Renumber citations sequentially so [N] matches sources array index (1-based)
  let resolved = body
  const renumberMap = new Map<number, number>()
  citedIndices
    .filter(idx => idx >= 0 && idx < contextArticles.length)
    .forEach((origIdx, i) => renumberMap.set(origIdx + 1, i + 1))
  resolved = resolved.replace(/\[(\d+)\]/g, (match, num) => {
    const newNum = renumberMap.get(parseInt(num, 10))
    return newNum ? `[${newNum}]` : match
  })

  return { body: resolved, sources }
}

// ─── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `${DISPATCH_PREAMBLE}

You are the action intelligence layer of Dispatch. Your job is to translate the week's signal into publishable content — thought leadership that advances the positioning, demonstrates expertise, and builds toward the five-year target.

CONTEXT: The operator is a senior design leader positioning for CDO/Head of Design roles at the intersection of AI, healthcare, and human experience. His content should establish him as someone who thinks at the level where design, technology, healthcare, and strategy converge — not as a design craftsperson or tool commentator.

PRODUCE:
1. A one-line editorial headline for the week (weekSummary)
2. 3-4 perspectives — each analyzing the week through a different intelligence layer lens, with [N] source citations
3. 7 content pitches with evidence citations

TWO MODES for pitches — distribute across both:

STRATEGIC POSITIONING (LinkedIn / Medium / Substack):
Long-form argument or perspective. 600–1200 words when developed. The voice of someone with hard-won expertise and a clear point of view. Not listicles. Not "here's what I learned." Thesis-driven essays, analysis, or provocations.

CREATIVE EXPRESSION (Instagram / Lummi):
Visual/editorial. A concept, an image direction, a short statement. The aesthetic intelligence layer of the public presence.

Return a JSON object:
{
  "weekSummary": "One-line editorial headline capturing the week's dominant narrative.",
  "perspectives": [
    {
      "title": "Perspective title — a sharp framing of the week through this lens",
      "body": "2-3 sentences analyzing the week through this intelligence layer, with source citations [1][2]. Lead with the implication, not the event.",
      "layer": "opportunity|position|discipline|landscape|culture"
    }
  ],
  "pitches": [
    {
      "title": "The content title or opening line",
      "thesis": "The central argument or claim (1-2 sentences). Must be specific and arguable.",
      "mode": "thought_leadership" or "creative",
      "layers": ["which intelligence layers this draws from"],
      "brief": "3-4 sentences: what the piece covers, the structure, the hook, and the payoff.",
      "platforms": {
        "primary": "Best platform for this piece",
        "adaptations": ["How to adapt for other platforms — 1 sentence each"]
      },
      "evidence": ["2-3 specific signals from the week that support this thesis, with source citations [1][2]"],
      "angle": "What makes this piece worth reading from this author specifically",
      "urgency": "Why publish now vs. later (1 sentence)",
      "wordCount": 800
    }
  ]
}

PERSPECTIVES: Generate 3-4 perspectives. Each must analyze the week through a DIFFERENT intelligence layer. Cover at least opportunity, position, and one of discipline/landscape/culture. Use [N] citations referencing the numbered articles.

PITCHES: Generate exactly 7 pitches. Be specific. Name companies, cite data points, reference real trends from the articles. Every pitch must trace to multiple signals.

Return only valid JSON. No prose outside the JSON.`

export async function GET() {
  const apiKey = (process.env.DISPATCH_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY)
  if (!apiKey) return Response.json({ error: "No API key" }, { status: 500 })

  if (!ARTICLE_STORE_AVAILABLE) {
    return Response.json({
      available: false,
      weekSummary: null,
      pitches: [],
      message: "Article history not available — KV storage required for weekly analysis.",
    })
  }

  try {
    // Check KV cache first — avoid 10-20s Sonnet call on repeat visits
    if (KV_AVAILABLE) {
      try {
        const cached = await kv.get<Record<string, unknown>>(getWeekKey())
        if (cached && (cached.pitches as unknown[])?.length > 0) {
          return Response.json({
            available: true,
            ...cached,
            cached: true,
          })
        }
      } catch {
        // KV read failed — fall through to generation
      }
    }

    const articles = await loadArticleHistory(7)

    if (articles.length === 0) {
      return Response.json({
        available: true,
        weekSummary: null,
        pitches: [],
        message: "No article history yet. Check back after a day of feed ingestion.",
      })
    }

    // Build context from the week's articles, prioritizing annotated ones
    const annotated = articles.filter(a => a.synopsis || a.relevance)
    const contextArticles = (annotated.length > 10 ? annotated : articles).slice(0, 40)
    const context = contextArticles.map((a, i) => {
      const scores = a.signalScores ? Object.entries(a.signalScores).filter(([, v]) => v >= 4).map(([k, v]) => `${k}:${v}`).join(", ") : ""
      return `${i + 1}. [${a.tag}] ${a.source}: ${a.title}${a.synopsis ? ` — ${a.synopsis}` : ""}${a.relevance ? ` | Why: ${a.relevance}` : ""}${scores ? ` (${scores})` : ""}`
    }).join("\n")

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `This week's intelligence (${articles.length} articles across 7 days):\n\n${context}\n\nGenerate the weekly dispatch.`,
      }],
    })

    const text = response.content[0]?.type === "text" ? response.content[0].text : ""
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      return Response.json({ available: true, weekSummary: null, pitches: [], message: "Synthesis failed to parse." })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any
    try {
      result = JSON.parse(match[0])
    } catch {
      console.error("[dispatch] Failed to parse Claude response as JSON")
      return Response.json({ available: true, weekSummary: null, pitches: [], message: "Parse failed." })
    }

    // Generate images: header + each pitch
    let pitches = result.pitches || []
    let headerImageUrl: string | undefined
    if (process.env.REPLICATE_API_TOKEN) {
      try {
        const allCards = [
          { title: result.weekSummary?.split(/[.!?]/)[0] || "Weekly dispatch", layers: ["landscape"] },
          ...pitches.map((p: { title: string; layers?: string[] }) => ({
            title: p.title,
            layers: p.layers,
          }))
        ]
        const imageUrls = await generateCardImages(allCards, "dispatch")
        headerImageUrl = imageUrls[0] || undefined
        const pitchImageUrls = imageUrls.slice(1)
        pitches = pitches.map((p: Record<string, unknown>, i: number) => ({
          ...p,
          imageUrl: pitchImageUrls[i] || undefined,
        }))
      } catch (err) {
        // Image generation failure shouldn't break dispatch — log and continue
        console.error("[dispatch] Image generation failed:", err instanceof Error ? err.message : err)
      }
    }

    // Resolve citations in perspectives
    const ctxForCitations: ContextArticle[] = contextArticles.map(a => ({ title: a.title, url: a.url, source: a.source }))
    const perspectives = (result.perspectives || []).map((p: { title: string; body: string; layer: string }) => {
      const { body, sources } = resolveCitations(p.body, ctxForCitations)
      return { title: p.title, body, layer: p.layer, sources }
    })

    // Resolve citations in pitch evidence
    pitches = pitches.map((p: Record<string, unknown>) => {
      const evidence = (p.evidence as string[]) || []
      const resolvedEvidence = evidence.map(e => resolveCitations(e, ctxForCitations))
      return {
        ...p,
        evidence: resolvedEvidence.map(r => r.body),
        evidenceSources: resolvedEvidence.map(r => r.sources),
      }
    })

    // Resolve citations in weekSummary
    const { body: resolvedSummary, sources: weekSummarySources } = resolveCitations(
      result.weekSummary || "", ctxForCitations
    )

    const responseData = {
      weekSummary: resolvedSummary || null,
      weekSummarySources: weekSummarySources.length > 0 ? weekSummarySources : undefined,
      perspectives: perspectives.length > 0 ? perspectives : undefined,
      pitches,
      headerImageUrl,
      articleCount: articles.length,
      generatedAt: new Date().toISOString(),
    }

    // Cache if we have content — don't gate on images (Sonnet call is expensive)
    if (KV_AVAILABLE && pitches.length > 0) {
      kv.set(getWeekKey(), responseData, { ex: WEEK_TTL }).catch(() => {})
    }

    return Response.json({
      available: true,
      ...responseData,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
