// Returns TTL / age info for cached surfaces
import { kv } from "@vercel/kv"
import { PODCAST_FEEDS } from "@/lib/podcasts"

function getWeekKey(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  const weekNum = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7)
  return `dispatch:weekly:${now.getFullYear()}-w${weekNum}`
}

export async function GET() {
  if (!process.env.KV_REST_API_URL) {
    return Response.json({ audio: null, synthesis: null, dispatch: null })
  }

  try {
    // Check TTLs — TTL returns seconds remaining, -2 = key missing, -1 = no expiry
    const [synthTTL, dispatchTTL] = await Promise.all([
      kv.ttl("synthesis:weekly"),
      kv.ttl(getWeekKey()),
    ])

    // For audio, spot-check one show
    const firstShow = PODCAST_FEEDS[0]
    const audioKey = `audio-image:${firstShow.show.replace(/[^a-zA-Z0-9]/g, "_")}`
    const audioTTL = await kv.ttl(audioKey)

    // Convert TTL (seconds remaining) to approximate "last refreshed" timestamp
    const ttlToAge = (ttl: number, maxTTL: number) => {
      if (ttl <= 0) return null // key missing or no expiry
      const ageSeconds = maxTTL - ttl
      return new Date(Date.now() - ageSeconds * 1000).toISOString()
    }

    return Response.json({
      audio: ttlToAge(audioTTL, 60 * 60 * 24 * 14),      // 14-day TTL
      synthesis: ttlToAge(synthTTL, 60 * 60 * 12),         // 12-hour TTL
      dispatch: ttlToAge(dispatchTTL, 60 * 60 * 24 * 7),   // 7-day TTL
    })
  } catch {
    return Response.json({ audio: null, synthesis: null, dispatch: null })
  }
}
