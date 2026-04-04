// Serve generated podcast artwork by show name
// Usage: /api/audio-image?show=The_Daily
import { kv } from "@vercel/kv"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const show = searchParams.get("show")
  if (!show) return new Response("Missing show param", { status: 400 })

  if (!process.env.KV_REST_API_URL) return new Response("KV unavailable", { status: 500 })

  try {
    const key = `audio-image:${show}`
    const dataUri = await kv.get<string>(key)
    if (!dataUri || !dataUri.startsWith("data:")) {
      return new Response("Not found", { status: 404 })
    }

    // Parse data URI: data:image/webp;base64,XXXX
    const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!match) return new Response("Invalid data", { status: 500 })

    const contentType = match[1]
    const buffer = Buffer.from(match[2], "base64")

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800", // 1 day browser, 7 day CDN
      },
    })
  } catch {
    return new Response("KV error", { status: 500 })
  }
}
