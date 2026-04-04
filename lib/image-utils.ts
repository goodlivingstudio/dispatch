// ─── Shared image utilities ─────────────────────────────────────────────────

/**
 * Download an image from a URL and return as a permanent data URI.
 * Used to convert temporary Replicate delivery URLs into permanent base64 strings.
 */
export async function downloadAsDataUri(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return undefined
    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    const contentType = res.headers.get("content-type") || "image/webp"
    return `data:${contentType};base64,${base64}`
  } catch {
    return undefined
  }
}
