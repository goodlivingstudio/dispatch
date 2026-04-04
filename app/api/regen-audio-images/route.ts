// Regenerate Dispatch-style podcast artwork — replaces expired images
// Accepts ?batch=N to process shows in groups (4 per call to stay under 60s timeout)
import { PODCAST_FEEDS } from "@/lib/podcasts"
import { kv } from "@vercel/kv"
import { downloadAsDataUri } from "@/lib/image-utils"
import { REPLICATE_API, REPLICATE_MODEL, GLOBAL_STYLE, LAYER_PALETTES } from "@/lib/image-gen"
import { SURFACE_STYLES } from "@/lib/image-gen"

const KV_TTL = 60 * 60 * 24 * 14 // 14 days
const BATCH_SIZE = 4

async function generateImage(showName: string, layer: string, token: string): Promise<string | undefined> {
  const hint = LAYER_PALETTES[layer] || ""
  const prompt = `${GLOBAL_STYLE} ${SURFACE_STYLES.audio} Evoking: "${showName}". ${hint}`

  for (let retry = 0; retry < 3; retry++) {
    const submitRes = await fetch(`${REPLICATE_API}/models/${REPLICATE_MODEL}/predictions`, {
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
      if (result.status === "succeeded" && result.output?.[0]) {
        return await downloadAsDataUri(result.output[0])
      }
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
