// Purge the synthesis cache — forces regeneration on next visit
import { kv } from "@vercel/kv"

const KV_KEY = "synthesis:weekly"

export async function POST() {
  if (!process.env.KV_REST_API_URL) {
    return Response.json({ error: "KV not available" }, { status: 500 })
  }

  try {
    await kv.del(KV_KEY)
    return Response.json({ success: true, message: "Synthesis cache cleared. Next visit will regenerate." })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
