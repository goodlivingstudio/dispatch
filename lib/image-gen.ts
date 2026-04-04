// ─── Image Generation via Replicate (Flux Schnell) ──────────────────────────
// Generates painterly abstract watercolor images for synthesis and dispatch cards.
// Cost: ~$0.003 per image.

const REPLICATE_API = "https://api.replicate.com/v1"
const MODEL = "black-forest-labs/flux-schnell"

const STYLE_PREFIX = `Painterly abstract watercolor. Wet-on-wet technique, pigment bleeding into damp paper. Organic washes with precise edges where color meets white space. Paper texture visible through translucent layers. No text, no people, no logos, no objects. Horizontal format.`

const PALETTE_HINTS: Record<string, string> = {
  opportunity: "Cool blues and soft teals. Clinical clarity meeting organic fluidity.",
  position: "Warm amber and burnt sienna. Gold and ochre over cool gray undertones. Authority through restraint.",
  discipline: "Muted greens and deep indigo. Precise marks meeting organic washes. Structural intention.",
  landscape: "Neutral grays and silver with subtle warmth. Atmospheric depth. Expansive negative space.",
  culture: "Earth pigments — raw umber, oxide green, burnt sienna. Minimal marks, maximum presence.",
}

export async function generateCardImage(
  title: string,
  layers?: string[],
): Promise<string | undefined> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return undefined

  const palette = layers?.[0] ? PALETTE_HINTS[layers[0]] || "" : ""
  const prompt = `${STYLE_PREFIX} Evoking the concept: "${title}". ${palette}`

  try {
    // Submit prediction
    const submitRes = await fetch(`${REPLICATE_API}/models/${MODEL}/predictions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: "16:9",
          output_format: "webp",
          output_quality: 85,
        },
      }),
    })

    if (!submitRes.ok) return undefined
    const prediction = await submitRes.json()
    const predictionId = prediction.id
    if (!predictionId) return undefined

    // Poll for result (max 30 seconds)
    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise(r => setTimeout(r, 2000))

      const pollRes = await fetch(`${REPLICATE_API}/predictions/${predictionId}`, {
        headers: { "Authorization": `Bearer ${token}` },
      })
      if (!pollRes.ok) continue

      const result = await pollRes.json()
      if (result.status === "succeeded" && result.output?.[0]) {
        return result.output[0]
      }
      if (result.status === "failed" || result.status === "canceled") {
        return undefined
      }
    }

    return undefined
  } catch {
    return undefined
  }
}

// Generate images in parallel batches (2 concurrent, then next batch)
export async function generateCardImages(
  cards: { title: string; layers?: string[] }[],
): Promise<(string | undefined)[]> {
  const CONCURRENCY = 2
  const results: (string | undefined)[] = new Array(cards.length).fill(undefined)

  for (let i = 0; i < cards.length; i += CONCURRENCY) {
    const batch = cards.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.allSettled(
      batch.map(card => generateCardImage(card.title, card.layers))
    )
    batchResults.forEach((result, j) => {
      results[i + j] = result.status === "fulfilled" ? result.value : undefined
    })
    // Brief pause between batches
    if (i + CONCURRENCY < cards.length) {
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  return results
}
