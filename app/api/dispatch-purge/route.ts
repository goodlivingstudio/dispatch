// Purge the dispatch weekly cache — forces regeneration on next visit
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

export async function POST() {
  if (!KV_AVAILABLE) {
    return Response.json({ error: "KV not available" }, { status: 500 })
  }

  try {
    const key = getWeekKey()
    await kv.del(key)
    return Response.json({ success: true, key, message: "Cache cleared. Next visit will regenerate." })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
