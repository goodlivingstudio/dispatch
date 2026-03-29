// Diagnostic endpoint — confirms env vars and Anthropic reachability
// Visit /api/health to debug deployment issues

export async function GET() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const newsApiKey   = process.env.NEWSAPI_KEY

  const status = {
    env: {
      ANTHROPIC_API_KEY: anthropicKey
        ? `set (${anthropicKey.length} chars, starts ${anthropicKey.slice(0, 7)}...)`
        : "MISSING",
      NEWSAPI_KEY: newsApiKey
        ? `set (${newsApiKey.length} chars)`
        : "not set (optional)",
    },
    anthropic: "not tested",
    timestamp: new Date().toISOString(),
    node: process.version,
  }

  // Ping Anthropic with minimal request to confirm key + connectivity
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
          model: "claude-3-5-haiku-20241022",
          max_tokens: 10,
          messages: [{ role: "user", content: "hi" }],
        }),
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok) {
        status.anthropic = `ok (${res.status})`
      } else {
        const body = await res.json().catch(() => ({}))
        status.anthropic = `error ${res.status}: ${JSON.stringify(body).slice(0, 120)}`
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
