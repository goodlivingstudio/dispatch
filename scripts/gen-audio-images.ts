#!/usr/bin/env npx tsx
// ─── Audio Image Generator ──────────────────────────────────────────────────
// Pre-generates Dispatch-style artwork for each podcast show.
// Stores image URLs in KV keyed by show name.
// The podcast API reads from KV and replaces original artwork.
//
// Usage:
//   npx tsx scripts/gen-audio-images.ts              # generate all
//   npx tsx scripts/gen-audio-images.ts --show "Radiolab"  # one show
//
// Requires: REPLICATE_API_TOKEN + KV env vars

import { PODCAST_FEEDS } from "@/lib/podcasts"
import { REPLICATE_API, REPLICATE_MODEL, GLOBAL_STYLE, SURFACE_STYLES, LAYER_PALETTES } from "@/lib/image-gen"
import { downloadAsDataUri } from "@/lib/image-utils"

async function generateImage(showName: string, layer: string): Promise<string | undefined> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return undefined

  const hint = LAYER_PALETTES[layer] || ""
  const prompt = `${GLOBAL_STYLE} ${SURFACE_STYLES.audio} Evoking: "${showName}". ${hint}`

  try {
    let submitRes: Response | null = null
    for (let retry = 0; retry < 3; retry++) {
      submitRes = await fetch(`${REPLICATE_API}/models/${REPLICATE_MODEL}/predictions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { prompt, num_outputs: 1, aspect_ratio: "16:9", output_format: "webp", output_quality: 85 },
        }),
      })
      if (submitRes.ok) break
      if (submitRes.status === 429) {
        await new Promise(r => setTimeout(r, (retry + 1) * 5000))
        continue
      }
      return undefined
    }

    if (!submitRes?.ok) return undefined
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
    return undefined
  } catch { return undefined }
}

async function storeToKV(showName: string, imageUrl: string): Promise<void> {
  const kvUrl = process.env.KV_REST_API_URL
  const kvToken = process.env.KV_REST_API_TOKEN
  if (!kvUrl || !kvToken) return

  const key = `audio-image:${showName.replace(/[^a-zA-Z0-9]/g, "_")}`
  try {
    await fetch(`${kvUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(imageUrl)}/ex/2592000`, {
      headers: { "Authorization": `Bearer ${kvToken}` },
    })
  } catch { /* */ }
}

async function loadFromKV(showName: string): Promise<string | null> {
  const kvUrl = process.env.KV_REST_API_URL
  const kvToken = process.env.KV_REST_API_TOKEN
  if (!kvUrl || !kvToken) return null

  const key = `audio-image:${showName.replace(/[^a-zA-Z0-9]/g, "_")}`
  try {
    const res = await fetch(`${kvUrl}/get/${encodeURIComponent(key)}`, {
      headers: { "Authorization": `Bearer ${kvToken}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.result || null
  } catch { return null }
}

async function main() {
  const args = process.argv.slice(2)
  const showFilter = args.find(a => a.startsWith("--show="))?.split("=").slice(1).join("=")
  const forceAll = args.includes("--force")

  const shows = showFilter
    ? PODCAST_FEEDS.filter(f => f.show.toLowerCase().includes(showFilter.toLowerCase()))
    : PODCAST_FEEDS

  console.log(`\n🎧 Audio Image Generator — ${shows.length} shows${forceAll ? " (force regenerate)" : ""}\n`)

  let generated = 0
  let skipped = 0
  let failed = 0

  for (const feed of shows) {
    // Check if already in KV (skip unless --force)
    if (!forceAll) {
      const existing = await loadFromKV(feed.show)
      if (existing) {
        console.log(`  ✓ ${feed.show} — cached`)
        skipped++
        continue
      }
    }

    console.log(`  Generating: ${feed.show}...`)
    const url = await generateImage(feed.show, feed.layer)

    if (url) {
      await storeToKV(feed.show, url)
      console.log(`  ✓ ${feed.show} — done`)
      generated++
    } else {
      console.log(`  ✗ ${feed.show} — failed`)
      failed++
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 4000))
  }

  console.log(`\n── Summary ──`)
  console.log(`Generated: ${generated}`)
  console.log(`Cached (skipped): ${skipped}`)
  console.log(`Failed: ${failed}`)
}

main().catch(err => { console.error("Fatal:", err); process.exit(1) })
