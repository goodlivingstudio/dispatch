// Diagnostic endpoint — confirms env vars and Anthropic reachability
// Visit /api/health to debug deployment issues

export async function GET() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  const status = {
    env: {
      ANTHROPIC_API_KEY: anthropicKey
        ? `set (${anthropicKey.length} chars)`
        : "MISSING",
    },
    anthropic: "not tested",
    timestamp: new Date().toISOString(),
    node: process.version,
  }

  // List available models to find correct IDs for this account
  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok) {
        const data = await res.json()
        const models = (data.data || []).map((m: { id: string }) => m.id)
        status.anthropic = `ok — ${models.length} models available`
        ;(status as Record<string, unknown>).available_models = models
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
