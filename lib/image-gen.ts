// ─── Image Generation via Replicate (Flux Schnell) ──────────────────────────
// Generates painterly abstract images for all Dispatch surfaces.
// Global style + surface-specific substyles.
// Cost: ~$0.003 per image.

import { downloadAsDataUri } from "@/lib/image-utils"

export const REPLICATE_API = "https://api.replicate.com/v1"
export const REPLICATE_MODEL = "black-forest-labs/flux-schnell"

// ─── Global Art Direction ───────────────────────────────────────────────────
// The unified visual language across all Dispatch surfaces.
// Every generated image inherits this foundation.

export const GLOBAL_STYLE = `Painterly abstract. Wet-on-wet watercolor technique with visible paper texture. Pigment bleeding organically across damp surface. Translucent layered washes. Precise edges where color meets untouched paper. No text, no people, no logos, no icons, no UI elements, no objects, no literal depictions. Purely abstract — evocative, not illustrative. Horizontal 16:9 format.`

// ─── Surface Substyles ──────────────────────────────────────────────────────
// Each surface has a distinct character within the global language.

export const SURFACE_STYLES: Record<string, string> = {
  // AUDIO — warm, intimate, resonant. The feeling of sound as texture.
  // Darker, richer tones. Deep pools of color. Vibration implied through
  // organic bleeding patterns. Like listening in a quiet room.
  audio: `Warm and intimate. Deep indigo, burnt umber, and muted gold. Rich pigment density — less white paper showing. Darker atmospheric washes suggesting depth and resonance. The visual equivalent of a voice in a quiet room. Soft pooling, no sharp edges.`,

  // SYNTHESIS — analytical, layered, convergent. The feeling of patterns
  // emerging from data. Cooler palette. Multiple wash layers visible.
  // Structure implied through overlapping translucent planes.
  synthesis: `Analytical and layered. Cool grays, soft teals, and muted slate blue. Multiple translucent wash layers visible simultaneously — the feeling of patterns converging. Architectural undertone — structure emerging from fluid washes. More white paper breathing through. Measured, not expressive.`,

  // DISPATCH — directional, decisive, warm confidence. The feeling of
  // intelligence becoming action. Warm but controlled palette.
  // Deliberate marks. Forward momentum in the composition.
  dispatch: `Directional and decisive. Warm amber meeting cool steel. Deliberate brushwork — confident single strokes over atmospheric washes. The feeling of intelligence crystallizing into action. Slight asymmetric tension in the composition. Authority without aggression.`,
}

// ─── Layer Palette Hints ────────────────────────────────────────────────────
// Subtle color shifts based on which intelligence layer dominates.
// Applied as a secondary modifier after the surface style.

export const LAYER_PALETTES: Record<string, string> = {
  opportunity: "Lean cooler — soft clinical blues and teals suggesting healthcare precision.",
  position: "Lean warmer — amber and ochre suggesting professional authority.",
  discipline: "Lean greener — muted sage and deep indigo suggesting structural evolution.",
  landscape: "Stay neutral — silver grays with atmospheric depth.",
  culture: "Lean earthier — raw umber, oxide, burnt sienna suggesting material honesty.",
}

// ─── Prompt Assembly ────────────────────────────────────────────────────────

type Surface = "audio" | "synthesis" | "dispatch"

function buildPrompt(
  surface: Surface,
  concept: string,
  layers?: string[],
): string {
  const surfaceStyle = SURFACE_STYLES[surface] || SURFACE_STYLES.synthesis
  const layerHint = layers?.[0] ? LAYER_PALETTES[layers[0]] || "" : ""

  return `${GLOBAL_STYLE} ${surfaceStyle} Evoking: "${concept}". ${layerHint}`.trim()
}

// ─── Image Generation ───────────────────────────────────────────────────────

export async function generateCardImage(
  title: string,
  layers?: string[],
  surface: Surface = "synthesis",
): Promise<string | undefined> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return undefined

  const prompt = buildPrompt(surface, title, layers)

  try {
    // Submit prediction with retry on rate limit
    let submitRes: Response | null = null
    for (let retry = 0; retry < 3; retry++) {
      submitRes = await fetch(`${REPLICATE_API}/models/${REPLICATE_MODEL}/predictions`, {
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
      if (submitRes.ok) break
      if (submitRes.status === 429) {
        await new Promise(r => setTimeout(r, (retry + 1) * 5000))
        continue
      }
      return undefined
    }

    if (!submitRes?.ok) return undefined
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
        // Download image and convert to permanent data URI
        return await downloadAsDataUri(result.output[0])
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


// Generate images sequentially with rate limit handling
export async function generateCardImages(
  cards: { title: string; layers?: string[] }[],
  surface: Surface = "synthesis",
): Promise<(string | undefined)[]> {
  const results: (string | undefined)[] = []

  for (let i = 0; i < cards.length; i++) {
    const url = await generateCardImage(cards[i].title, cards[i].layers, surface)
    results.push(url)
    if (i < cards.length - 1) {
      await new Promise(r => setTimeout(r, 3000))
    }
  }

  return results
}
