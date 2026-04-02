// Cerebro memory management — load, export, selective purge
import { loadHistory, clearHistory, saveHistory, KV_AVAILABLE } from "@/lib/memory"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")

  if (!KV_AVAILABLE) {
    return Response.json({ available: false, messages: [] })
  }

  if (!sessionId) {
    return Response.json({ error: "sessionId required" }, { status: 400 })
  }

  const messages = await loadHistory(sessionId)
  return Response.json({ available: true, messages })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")

  if (!KV_AVAILABLE) {
    return Response.json({ available: false })
  }

  if (!sessionId) {
    return Response.json({ error: "sessionId required" }, { status: 400 })
  }

  await clearHistory(sessionId)
  return Response.json({ cleared: true })
}

// PATCH — selective purge: remove messages by index range
export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")

  if (!KV_AVAILABLE || !sessionId) {
    return Response.json({ error: "Not available" }, { status: 400 })
  }

  const { removeFrom, removeTo } = await req.json()
  if (typeof removeFrom !== "number" || typeof removeTo !== "number") {
    return Response.json({ error: "removeFrom and removeTo required" }, { status: 400 })
  }

  const messages = await loadHistory(sessionId)
  const filtered = messages.filter((_, i) => i < removeFrom || i > removeTo)
  await saveHistory(sessionId, filtered)

  return Response.json({ remaining: filtered.length })
}
