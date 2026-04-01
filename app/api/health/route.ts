// Temporary OpenAI swap — restore to Anthropic when Claude Console access is back
// Diagnostic endpoint — confirms env vars and OpenAI reachability
// Visit /api/health to debug deployment issues

export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY

  const status = {
    env: {
      OPENAI_API_KEY: openaiKey
        ? `set (${openaiKey.length} chars)`
        : "MISSING",
    },
    openai: "not tested",
    timestamp: new Date().toISOString(),
    node: process.version,
  }

  // List available models to confirm API connectivity
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
        },
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok) {
        const data = await res.json()
        const models = (data.data || []).map((m: { id: string }) => m.id)
        status.openai = `ok — ${models.length} models available`
        ;(status as Record<string, unknown>).available_models = models
      } else {
        const body = await res.json().catch(() => ({}))
        status.openai = `error ${res.status}: ${JSON.stringify(body).slice(0, 200)}`
      }
    } catch (err) {
      status.openai = `exception: ${err instanceof Error ? err.message : String(err)}`
    }
  } else {
    status.openai = "skipped — no key"
  }

  return Response.json(status, {
    headers: { "Cache-Control": "no-store" },
  })
}
