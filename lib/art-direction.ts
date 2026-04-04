// ─── Dispatch Art Direction — Generative Image System ───────────────────────
// Controls the visual language for AI-generated imagery across all surfaces.
// Claude interprets each card's content through this art direction template
// before sending to the image generation API.
//
// The art direction stays constant. The content-specific elements change
// per card. The result: visual consistency across Synthesis, Audio, and
// Dispatch with each image uniquely reflecting its intelligence content.

export const ART_DIRECTION = `Abstract, atmospheric, editorial.
Evocative, not literal. The image should feel like the visual equivalent of the concept — not an illustration of it.

VISUAL LANGUAGE:
- Abstract forms, light, texture, and space
- Soft gradients with intentional color relationships
- Architectural sense of composition — grids implied, not drawn
- Depth through layering and atmospheric perspective
- Material honesty — surfaces that feel real (glass, stone, water, light)
- No text, no people, no logos, no UI elements, no screens
- No stock photography aesthetics — nothing that looks generated or artificial

COLOR:
- Restrained palette — 2-3 dominant tones per image
- Favor natural color relationships (not neon, not oversaturated)
- Allow the content to suggest the palette: healthcare = cool clarity,
  design leadership = warm authority, technology = precise neutrals,
  culture = rich depth

MOOD:
- Contemplative, not urgent
- Confident, not aggressive
- The feeling of looking at something important from the right distance
- Early morning light, not midday harshness

COMPOSITION:
- Asymmetric balance
- Generous negative space
- One clear focal element with supporting atmosphere
- Horizontal format (16:9 or 3:2)
`

// Generates a content-specific prompt by combining art direction with card content
export function generateImagePrompt(title: string, description: string, layers?: string[]): string {
  const layerHints = layers?.length
    ? `Conceptual territory: ${layers.join(", ")}. `
    : ""

  return `${ART_DIRECTION}

SUBJECT: Create an abstract atmospheric image that evokes the concept of: "${title}"

CONTEXT: ${layerHints}${description}

The image should make someone feel the weight and direction of this idea without depicting it literally. Think: if this concept had a landscape, what would it look like?`
}
