"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Paperclip, Mic, MicOff, ExternalLink, ArrowUpRight, Copy, Check, Flag } from "lucide-react"
import type { Article, Message } from "@/lib/types"
import { renderCitedBody, CitationSource } from "@/components/citation"

// ─── Speech Recognition helpers ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createSpeechRecognition(): any {
  if (typeof window === "undefined") return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!SR) return null
  const recognition = new SR()
  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = "en-US"
  return recognition
}

function hasSpeechSupport() {
  if (typeof window === "undefined") return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

// ─── Provocations — rotating prompts ────────────────────────────────────────

const PROVOCATIONS = [
  "What's the sharpest thing you read today?",
  "What would Rau ask you in the first five minutes?",
  "Where does design sit in Lilly's AI stack?",
  "What's the difference between your pitch and everyone else's?",
  "What signal are you ignoring?",
  "If you had the role today, what's day-one?",
  "What's the question you're afraid they'll ask?",
  "Who else is circling this opportunity?",
  "What does 'Head of Design' mean at a pharma company?",
  "What would you kill from your portfolio right now?",
  "What's the systems argument, not the craft argument?",
  "Where does patient experience break down first?",
  "What's the five-year move if Lilly doesn't happen?",
  "What does design leadership look like without a team?",
  "What are you over-indexing on?",
  "What would make them say no?",
  "How do you talk about AI without sounding like everyone else?",
  "What's the organizational layer no one is designing?",
]

// ─── Cerebro — strategic intelligence advisor ───────────────────────────────

export function Cerebro({ articles, pendingPrompt }: {
  articles: Article[]
  pendingPrompt?: { text: string; id: number } | null
}) {
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState("")
  const [loading,   setLoading]   = useState(false)
  const [tokens,    setTokens]    = useState(0)
  const [memory,    setMemory]    = useState(false)
  const [sessionId, setSessionId] = useState("")
  const [followUps, setFollowUps] = useState<{ question: string; alternatives: string[] } | null>(null)
  const [lastSources, setLastSources] = useState<Array<{ title: string; url: string }>>([])
  const [sourcesByMsg, setSourcesByMsg] = useState<Record<number, CitationSource[]>>({})
  const [attachments, setAttachments] = useState<{ data: string; media_type: string; name: string; preview: string }[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // Generate or restore a persistent session ID
  useEffect(() => {
    let id = localStorage.getItem("cerebro-session")
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      localStorage.setItem("cerebro-session", id)
    }
    setSessionId(id)
  }, [])

  const [speechSupported, setSpeechSupported] = useState(false)
  useEffect(() => { setSpeechSupported(hasSpeechSupport()) }, [])

  // Typewriter provocation system
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [typedChars, setTypedChars] = useState(0)
  const [provFading, setProvFading] = useState(false)

  useEffect(() => {
    setPlaceholderIdx(Math.floor(Math.random() * PROVOCATIONS.length))
  }, [])

  useEffect(() => {
    setTypedChars(0)
    setProvFading(false)
    const target = PROVOCATIONS[placeholderIdx]?.length || 0
    let frame = 0
    const interval = setInterval(() => {
      frame++
      if (frame <= target) {
        setTypedChars(frame)
      } else {
        clearInterval(interval)
      }
    }, 32)
    return () => clearInterval(interval)
  }, [placeholderIdx])

  useEffect(() => {
    const target = PROVOCATIONS[placeholderIdx]?.length || 0
    if (typedChars < target) return
    const fadeTimer = setTimeout(() => setProvFading(true), 9000)
    const swapTimer = setTimeout(() => {
      setPlaceholderIdx(i => (i + 1) % PROVOCATIONS.length)
    }, 9600)
    return () => { clearTimeout(fadeTimer); clearTimeout(swapTimer) }
  }, [typedChars, placeholderIdx])

  const typedText = (PROVOCATIONS[placeholderIdx] || "").slice(0, typedChars)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  useEffect(() => {
    const el = inputRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = Math.min(el.scrollHeight, 96) + "px"
    }
  }, [input])

  const sendRef = useRef<((text: string) => Promise<void>) | undefined>(undefined)

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return
      const updated = [...messages, { role: "user" as const, content: text.trim() }]
      setMessages(updated)
      setInput("")
      setFollowUps(null)
      setAttachments([])
      setLoading(true)

      const feedContext = articles.length
        ? {
            count: articles.length,
            articles: articles
              .slice(0, 15)
              .map(a => `[${a.category}] ${a.source}: ${a.title}${a.relevance ? ` — ${a.relevance}` : ""}`)
              .join("\n"),
          }
        : null

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updated.filter(m => m.role !== "search"),
            feedContext,
            sessionId,
            images: attachments.length > 0 ? attachments.map(a => ({ media_type: a.media_type, data: a.data })) : undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setMessages(prev => [...prev, { role: "assistant", content: `// error: ${data.error || res.status}` }])
        } else {
          const searchLines: Message[] = (data.searches || []).map(
            (q: string) => ({ role: "search" as const, content: q })
          )
          setMessages(prev => {
            const newMsgs = [...prev, ...searchLines, { role: "assistant" as const, content: data.text || "// empty response" }]
            if (data.sources?.length > 0) {
              setLastSources(data.sources)
              const assistantIdx = newMsgs.length - 1
              setSourcesByMsg(prev => ({ ...prev, [assistantIdx]: data.sources }))
            }
            return newMsgs
          })
          setTokens(t => t + (data.inputTokens || 0) + (data.outputTokens || 0))
          if (data.memoryActive) setMemory(true)
          if (data.followUp) setFollowUps(data.followUp)
        }
      } catch (err) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `// network error: ${err instanceof Error ? err.message : String(err)}` },
        ])
      }
      setLoading(false)
    },
    [messages, loading, articles, sessionId, attachments]
  )

  sendRef.current = send

  // Auto-fire a deliberation prompt seeded from COS band
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (pendingPrompt?.text) sendRef.current?.(pendingPrompt.text)
  }, [pendingPrompt?.id])

  const [escalateCopied, setEscalateCopied] = useState(false)
  const assistantCount = messages.filter(m => m.role === "assistant").length
  const showEscalate = assistantCount >= 2

  const handleEscalate = useCallback(() => {
    const header = `Continue this Cerebro conversation in Claude Desktop. Context below.\n\n---\n\nYou are Cerebro — a strategic intelligence agent for Jeremy Grant, Senior Design Director at Code and Theory. Five-year target: Head of Design at a significant product organization (AI, healthcare, sustainability, or culture). Immediate priority: Eli Lilly permalance engagement.\n\nTwo lenses: (1) Does this matter to Lilly? (2) Does this matter to the five-year position?\n\nConversation so far:\n\n`
    const thread = messages
      .filter(m => m.role !== "search")
      .map(m => `${m.role === "user" ? "Jeremy" : "Cerebro"}: ${m.content}`)
      .join("\n\n")
    const footer = `\n\n---\n\nContinue from here. Go deeper — this thread has been escalated for extended strategic thinking.`
    navigator.clipboard.writeText(header + thread + footer).then(() => {
      setEscalateCopied(true)
      setTimeout(() => setEscalateCopied(false), 2500)
    })
  }, [messages])

  // Suppress unused var warning — lastSources reserved for future citation UI
  void lastSources

  const [threadCopied, setThreadCopied] = useState(false)
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null)

  const handleCopyThread = useCallback(() => {
    const thread = messages.filter(m => m.role !== "search").map(m => `${m.role === "user" ? "Jeremy" : "Cerebro"}: ${m.content}`).join("\n\n")
    navigator.clipboard.writeText(thread).then(() => { setThreadCopied(true); setTimeout(() => setThreadCopied(false), 2000) })
  }, [messages])

  const handleCopyMessage = (idx: number) => {
    const m = messages[idx]
    if (!m) return
    navigator.clipboard.writeText(m.content).then(() => { setCopiedMsgIdx(idx); setTimeout(() => setCopiedMsgIdx(null), 2000) })
  }

  const handleFlagMessage = (idx: number) => {
    const m = messages[idx]
    if (!m) return
    const context = messages.slice(Math.max(0, idx - 2), idx + 1).map(msg => `${msg.role}: ${msg.content}`).join("\n\n")
    const report = `# Cerebro Response Flag\n\nFlagged message:\n${m.content}\n\n---\n\nContext:\n${context}\n\n---\n\nIssue: [describe the problem — hallucination, wrong source, bad reasoning, etc.]`
    navigator.clipboard.writeText(report)
  }

  return (
    <section
      aria-label="Cerebro strategic advisor"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-geist-mono), monospace",
            textTransform: "uppercase",
            color: "var(--accent-muted)",
          }}
        >
          Cerebro
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {memory && (
            <span
              title="Conversation memory active — Cerebro remembers previous sessions"
              style={{
                fontSize: 10,
                fontFamily: "var(--font-geist-mono), monospace",
                color: "var(--accent-muted)",
                opacity: 0.7,
              }}
            >
              ◈ mem
            </span>
          )}
          {tokens > 0 && (
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-geist-mono), monospace",
                fontVariantNumeric: "tabular-nums",
                color: "var(--text-tertiary)",
              }}
            >
              {tokens.toLocaleString()}t
            </span>
          )}
          {showEscalate && (
            <button
              onClick={handleEscalate}
              title="Copy conversation to clipboard for Claude Desktop"
              aria-label="Continue in Claude Desktop"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 4,
                border: "1px solid var(--border)",
                background: escalateCopied ? "var(--accent-secondary)" : "transparent",
                color: escalateCopied ? "var(--bg-primary)" : "var(--text-tertiary)",
                fontSize: 10,
                fontFamily: "var(--font-geist-mono), monospace",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <ExternalLink size={11} strokeWidth={1.8} />
              {escalateCopied ? "Copied" : "Claude"}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        role="log"
        aria-label="Cerebro conversation"
        aria-live="polite"
        style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}
      >
        {messages.length === 0 && (
          <div style={{ padding: "24px 16px" }}>
            <div
              style={{
                fontSize: 12.5,
                fontFamily: "var(--font-geist-mono), monospace",
                color: "var(--text-tertiary)",
                lineHeight: 1.8,
              }}
            >
              Strategic intelligence ready.
              <br />
              <span style={{ color: "var(--accent-muted)" }}>
                Feed analysis, Lilly positioning, career trajectory.
              </span>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className="cerebro-msg"
            style={{ marginBottom: m.role === "search" ? 4 : 16, position: "relative" }}
            onMouseEnter={e => { const actions = e.currentTarget.querySelector('.msg-actions') as HTMLElement; if (actions) actions.style.opacity = "1" }}
            onMouseLeave={e => { const actions = e.currentTarget.querySelector('.msg-actions') as HTMLElement; if (actions) actions.style.opacity = "0" }}
          >
            {/* Per-message actions — visible on hover */}
            {m.role !== "search" && (
              <div className="msg-actions" style={{ position: "absolute", top: 0, right: 16, display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s" }}>
                <button
                  onClick={() => handleCopyMessage(i)}
                  title="Copy this message"
                  style={{ width: 22, height: 22, borderRadius: 4, border: "none", background: "var(--bg-elevated)", color: copiedMsgIdx === i ? "var(--accent-secondary)" : "var(--text-tertiary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, transition: "color 0.15s" }}
                >
                  {copiedMsgIdx === i ? <Check size={11} /> : <Copy size={11} />}
                </button>
                {m.role === "assistant" && (
                  <button
                    onClick={() => handleFlagMessage(i)}
                    title="Flag this response — copies report to clipboard"
                    style={{ width: 22, height: 22, borderRadius: 4, border: "none", background: "var(--bg-elevated)", color: "var(--text-tertiary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, transition: "color 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#ef4444" }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)" }}
                  >
                    <Flag size={11} />
                  </button>
                )}
              </div>
            )}
            {m.role === "user" ? (
              <div style={{ padding: "0 16px", fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, wordBreak: "break-word", fontWeight: 500 }}>
                {m.content}
              </div>
            ) : m.role === "search" ? (
              <div style={{ padding: "0 16px", fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", color: "var(--text-tertiary)", lineHeight: 1.5, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--accent-muted)", opacity: 0.7 }}>↗</span>
                <span style={{ opacity: 0.6 }}>searched &ldquo;{m.content}&rdquo;</span>
              </div>
            ) : (
              <div style={{ padding: "0 16px" }}>
                <div style={{ fontSize: 12.5, fontFamily: "var(--font-geist-mono), monospace", color: "var(--text-secondary)", lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {sourcesByMsg[i] ? renderCitedBody(m.content, sourcesByMsg[i]) : m.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Follow-up prompts */}
        {followUps && !loading && (
          <div style={{ margin: "8px 16px 16px", padding: "16px 16px 16px", background: "var(--bg-elevated)", borderRadius: 8, animation: "signal-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
            <div style={{ fontSize: 12, fontFamily: "var(--font-geist-mono), monospace", color: "var(--accent-muted)", lineHeight: 1.65, marginBottom: followUps.alternatives.length > 0 ? 16 : 0 }}>
              {followUps.question}
            </div>
            {followUps.alternatives.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {followUps.alternatives.map((alt, i) => (
                  <button
                    key={i}
                    onClick={() => send(alt)}
                    style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 16px", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s", textAlign: "left", lineHeight: 1.4 }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--bg-surface)" }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "transparent" }}
                  >
                    {alt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div style={{ padding: "0 16px" }}>
            <span className="cursor-blink" style={{ fontSize: 13, fontFamily: "var(--font-geist-mono), monospace" }}>▊</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        style={{ display: "none" }}
        onChange={e => {
          const files = e.target.files
          if (!files) return
          Array.from(files).forEach(file => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result as string
              const base64 = result.split(",")[1]
              const media_type = file.type || "image/png"
              const preview = media_type.startsWith("image/") ? result : ""
              setAttachments(prev => [...prev, { data: base64, media_type, name: file.name, preview }])
            }
            reader.readAsDataURL(file)
          })
          e.target.value = ""
        }}
      />

      {/* Input */}
      <div style={{ flexShrink: 0 }}>
        {attachments.length > 0 && (
          <div style={{ display: "flex", gap: 8, padding: "8px 16px 0", flexWrap: "wrap" }}>
            {attachments.map((att, i) => (
              <div key={i} style={{ position: "relative" }}>
                {att.preview ? (
                  <img src={att.preview} alt={att.name} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                    {att.name.split(".").pop()}
                  </div>
                )}
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                  aria-label={`Remove ${att.name}`}
                  style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "var(--text-tertiary)", color: "var(--bg-primary)", border: "none", cursor: "pointer", fontSize: 11, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ background: "var(--bg-elevated)", borderRadius: 14, border: "1px solid var(--border)", transition: "border-color 0.15s", overflow: "hidden" }}>
            {/* Textarea with typewriter provocation overlay */}
            <div style={{ position: "relative" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) } }}
                placeholder=" "
                rows={2}
                style={{ width: "100%", resize: "none", background: "transparent", border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", color: "var(--text-primary)", caretColor: "var(--accent-secondary)", lineHeight: "22px", maxHeight: 120, minHeight: 48, padding: "12px 14px 0", position: "relative", zIndex: 1 }}
              />
              {!input && (
                <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px 14px 0", fontSize: 13, fontFamily: "inherit", lineHeight: "22px", color: "var(--text-tertiary)", pointerEvents: "none", opacity: provFading ? 0 : 0.6, transition: "opacity 0.5s ease" }}>
                  {typedText}
                  {typedChars < (PROVOCATIONS[placeholderIdx]?.length || 0) && (
                    <span style={{ color: "var(--accent-secondary)", opacity: 0.7 }}>|</span>
                  )}
                </div>
              )}
            </div>

            {/* Toolbar row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 8px" }}>
              {!input.trim() ? (
                <button
                  onClick={() => send(PROVOCATIONS[placeholderIdx])}
                  aria-label="Discuss this prompt"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--accent-muted)", width: 30, height: 30, borderRadius: 8, transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--accent-secondary)"; e.currentTarget.style.background = "var(--bg-surface)" }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--accent-muted)"; e.currentTarget.style.background = "transparent" }}
                >
                  <ArrowUpRight size={16} strokeWidth={1.5} />
                </button>
              ) : <div />}
              <div style={{ display: "flex", gap: 2 }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  aria-label="Attach file"
                  style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", background: "transparent", color: attachments.length > 0 ? "var(--accent-secondary)" : "var(--text-tertiary)", cursor: "pointer", transition: "all 0.15s", padding: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-surface)"; if (!attachments.length) e.currentTarget.style.color = "var(--text-secondary)" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = attachments.length > 0 ? "var(--accent-secondary)" : "var(--text-tertiary)" }}
                >
                  <Paperclip size={16} strokeWidth={1.5} />
                </button>
                {messages.length > 0 && (
                  <button
                    onClick={handleCopyThread}
                    aria-label="Copy conversation"
                    title="Copy entire conversation"
                    style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", background: "transparent", color: "var(--text-tertiary)", cursor: "pointer", transition: "all 0.15s", padding: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.color = "var(--text-secondary)" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)" }}
                  >
                    {threadCopied ? <Check size={15} strokeWidth={1.5} /> : <Copy size={15} strokeWidth={1.5} />}
                  </button>
                )}
                {speechSupported && (
                  <button
                    onClick={() => {
                      if (isRecording) {
                        recognitionRef.current?.stop()
                        setIsRecording(false)
                      } else {
                        const rec = createSpeechRecognition()
                        if (!rec) return
                        recognitionRef.current = rec
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        rec.onresult = (e: any) => {
                          const text = e.results?.[0]?.[0]?.transcript || ""
                          setInput(prev => prev ? `${prev} ${text}` : text)
                        }
                        rec.onend = () => setIsRecording(false)
                        rec.onerror = () => setIsRecording(false)
                        rec.start()
                        setIsRecording(true)
                      }
                    }}
                    aria-label={isRecording ? "Stop recording" : "Voice input"}
                    style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", background: isRecording ? "rgba(239,68,68,0.15)" : "transparent", color: isRecording ? "#ef4444" : "var(--text-tertiary)", cursor: "pointer", transition: "all 0.15s", padding: 0 }}
                    onMouseEnter={e => { if (!isRecording) { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.color = "var(--text-secondary)" } }}
                    onMouseLeave={e => { if (!isRecording) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)" } }}
                  >
                    {isRecording ? <MicOff size={15} strokeWidth={1.5} /> : <Mic size={15} strokeWidth={1.5} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
