// Diagnostic endpoint — confirms env vars and Anthropic API reachability
// Visit /api/health to debug deployment issues

export async function GET() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const exaKey       = process.env.EXA_API_KEY
  const kvUrl        = process.env.KV_REST_API_URL
  const arenaToken   = process.env.ARENA_ACCESS_TOKEN

  const status: Record<string, unknown> = {
    env: {
      ANTHROPIC_API_KEY:  anthropicKey ? `set (${anthropicKey.length} chars)` : "MISSING",
      EXA_API_KEY:        exaKey       ? `set (${exaKey.length} chars)`       : "not configured (web search disabled)",
      KV_REST_API_URL:    kvUrl        ? "set"                                : "not configured (memory disabled)",
      ARENA_ACCESS_TOKEN: arenaToken   ? "set"                                : "not configured (gallery scraper disabled)",
    },
    anthropic: "not tested",
    timestamp: new Date().toISOString(),
    node: process.version,
  }

  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 5,
          messages: [{ role: "user", content: "ping" }],
        }),
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok) {
        status.anthropic = "ok — API responding"
      } else {
        const body = await res.json().catch(() => ({}))
        status.anthropic = `error ${res.status}: ${JSON.stringify(body).slice(0, 200)}`
      }
    } catch (err) {
      status.anthropic = `exception: ${err instanceof Error ? err.message : String(err)}`
    }
  } else {
    status.anthropic = "skipped — no key"
  }

  return Response.json(status, {
    headers: { "Cache-Control": "no-store" },
  })
}
