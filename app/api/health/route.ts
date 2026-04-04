// Diagnostic endpoint — live connectivity probes for all services
// Visit /api/health to debug deployment issues
import { kv } from "@vercel/kv"

const TIMEOUT = 6000

async function probeAnthropic(key: string): Promise<string> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 5,
        messages: [{ role: "user", content: "ping" }],
      }),
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (res.ok) return "ok"
    const body = await res.json().catch(() => ({}))
    return `error ${res.status}: ${JSON.stringify(body).slice(0, 120)}`
  } catch (err) {
    return `failed: ${err instanceof Error ? err.message : String(err)}`
  }
}

async function probeExa(key: string): Promise<string> {
  try {
    // Send a minimal invalid request — a 400 (bad request) means the key is valid
    // and the API is reachable. Only a 401/403 means auth failure.
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "x-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (res.ok || res.status === 400 || res.status === 422) return "ok"
    return `error ${res.status}`
  } catch (err) {
    return `failed: ${err instanceof Error ? err.message : String(err)}`
  }
}

async function probeKV(): Promise<string> {
  try {
    const ttl = await kv.ttl("synthesis:weekly")
    // ttl returns a number: -2 (key missing), -1 (no expiry), or seconds remaining
    return typeof ttl === "number" ? "ok" : "unexpected response"
  } catch (err) {
    return `failed: ${err instanceof Error ? err.message : String(err)}`
  }
}

async function probeArena(token: string): Promise<string> {
  try {
    const res = await fetch("https://api.are.na/v2/channels/dispatch-zen/contents?per=1&page=1", {
      headers: { "Authorization": `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (res.ok) return "ok"
    return `error ${res.status}`
  } catch (err) {
    return `failed: ${err instanceof Error ? err.message : String(err)}`
  }
}

async function probeReplicate(token: string): Promise<string> {
  try {
    // List recent predictions — free, no generation cost
    const res = await fetch("https://api.replicate.com/v1/predictions?limit=1", {
      headers: { "Authorization": `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (res.ok) return "ok"
    return `error ${res.status}`
  } catch (err) {
    return `failed: ${err instanceof Error ? err.message : String(err)}`
  }
}

export async function GET() {
  const anthropicKey   = process.env.ANTHROPIC_API_KEY
  const exaKey         = process.env.EXA_API_KEY
  const kvUrl          = process.env.KV_REST_API_URL
  const arenaToken     = process.env.ARENA_ACCESS_TOKEN
  const replicateToken = process.env.REPLICATE_API_TOKEN

  // Run all probes in parallel
  const [anthropic, exa, kvStatus, arena, replicate] = await Promise.all([
    anthropicKey   ? probeAnthropic(anthropicKey)   : Promise.resolve("no key"),
    exaKey         ? probeExa(exaKey)               : Promise.resolve("no key"),
    kvUrl          ? probeKV()                      : Promise.resolve("no key"),
    arenaToken     ? probeArena(arenaToken)          : Promise.resolve("no key"),
    replicateToken ? probeReplicate(replicateToken)  : Promise.resolve("no key"),
  ])

  return Response.json({
    anthropic,
    exa,
    kv: kvStatus,
    arena,
    replicate,
    timestamp: new Date().toISOString(),
    node: process.version,
  }, {
    headers: { "Cache-Control": "no-store" },
  })
}
