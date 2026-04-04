// Regenerate Dispatch-style podcast artwork — replaces expired Replicate URLs
// Accepts ?batch=N to process shows in groups (default 4 per call to stay under 60s timeout)
// Source Pulse UI calls this in rounds until all shows are done.
import { PODCAST_FEEDS } from "@/lib/podcasts"
import { kv } from "@vercel/kv"

const REPLICATE_API = "https://api.replicate.com/v1"
const MODEL = "black-forest-labs/flux-schnell"

const STYLE = `Painterly abstract watercolor. Wet-on-wet technique, pigment bleeding into damp paper. Organic washes with precise edges where color meets white space. Paper texture visible through translucent layers. No text, no people, no logos, no icons, no objects. Horizontal 16:9 format. Warm and intimate. Deep indigo, burnt umber, and muted gold. Rich pigment density — less white paper showing. Darker atmospheric washes suggesting depth and resonance. The visual equivalent of a voice in a quiet room. Soft pooling, no sharp edges.`

const LAYER_HINTS: Record<string, string> = {
  opportunity: "Lean cooler — soft clinical blues and teals.",
  position: "Lean warmer — amber and ochre tones.",
  discipline: "Lean greener — muted sage and deep indigo.",
  landscape: "Stay neutral — silver grays with atmospheric depth.",
  culture: "Lean earthier — raw umber, oxide, burnt sienna.",
}

const KV_TTL = 60 * 60 * 24 * 14 // 14 days
const BATCH_SIZE = 4 // ~12s per image (generate + poll), 4 fits in 60s

async function generateImage(showName: string, layer: string, token: string): Promise<string | undefined> {
  const hint = LAYER_HINTS[layer] || ""
  const prompt = `${STYLE} Evoking: "${showName}". ${hint}`

  for (let retry = 0; retry < 3; retry++) {
    const submitRes = await fetch(`${REPLICATE_API}/models/${MODEL}/predictions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: { prompt, num_outputs: 1, aspect_ratio: "16:9", output_format: "webp", output_quality: 85 } }),
    })
    if (!submitRes.ok) {
      if (submitRes.status === 429) { await new Promise(r => setTimeout(r, (retry + 1) * 5000)); continue }
      return undefined
    }
    const prediction = await submitRes.json()
    if (!prediction.id) return undefined

    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(`${REPLICATE_API}/predictions/${prediction.id}`, {
        headers: { "Authorization": `Bearer ${token}` },
      })
      if (!pollRes.ok) continue
      const result = await pollRes.json()
      if (result.status === "succeeded" && result.output?.[0]) return result.output[0]
      if (result.status === "failed" || result.status === "canceled") return undefined
    }
  }
  return undefined
}

export const maxDuration = 60

export async function POST(req: Request) {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return Response.json({ error: "No REPLICATE_API_TOKEN" }, { status: 500 })
  if (!process.env.KV_REST_API_URL) return Response.json({ error: "No KV" }, { status: 500 })

  const { searchParams } = new URL(req.url)
  const batchIndex = parseInt(searchParams.get("batch") || "0", 10)

  const uniqueShows = [...new Map(PODCAST_FEEDS.map(f => [f.show, f])).values()]
  const totalBatches = Math.ceil(uniqueShows.length / BATCH_SIZE)
  const slice = uniqueShows.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE)

  if (slice.length === 0) {
    return Response.json({ generated: 0, failed: 0, batch: batchIndex, totalBatches, done: true })
  }

  let generated = 0
  let failed = 0

  for (const feed of slice) {
    const url = await generateImage(feed.show, feed.layer, token)
    if (url) {
      const key = `audio-image:${feed.show.replace(/[^a-zA-Z0-9]/g, "_")}`
      try { await kv.set(key, url, { ex: KV_TTL }) } catch { /* */ }
      generated++
    } else {
      failed++
    }
    await new Promise(r => setTimeout(r, 1000))
  }

  return Response.json({
    generated, failed,
    batch: batchIndex,
    totalBatches,
    done: batchIndex + 1 >= totalBatches,
    shows: slice.map(f => f.show),
  })
}
