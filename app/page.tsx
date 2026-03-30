"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Ticker } from "@/components/ticker"
import { AnalyticsPanel } from "@/components/analytics-panel"
import { LeftRail } from "@/components/left-rail"
import { useChiefOfStaff, ChiefOfStaffBand, AnalysisPanelMobile } from "@/components/chief-of-staff"
import { FeedCard, SignalCard } from "@/components/feed-card"
import { Divider } from "@/components/divider"
import type { Article, Message, Signal, FeedHealth, Skin } from "@/lib/types"

// ─── Skin + mode system ───────────────────────────────────────────────────────

export type { Skin }

function applyThemeClasses(skin: Skin, day: boolean) {
  const el = document.documentElement
  el.classList.remove("day", "skin-slate", "skin-forest")
  if (day) el.classList.add("day")
  if (skin === "slate")  el.classList.add("skin-slate")
  if (skin === "forest") el.classList.add("skin-forest")
}

function useTheme() {
  const [skin, setSkinState] = useState<Skin>("mineral")
  const [isDay, setIsDay]     = useState(false)
  const skinRef               = useRef<Skin>("mineral")

  useEffect(() => {
    const storedSkin = (localStorage.getItem("dispatch-skin") as Skin) || "mineral"
    const storedMode = localStorage.getItem("dispatch-theme")
    const h   = new Date().getHours()
    const day = storedMode === "day" ? true : storedMode === "night" ? false : h >= 6 && h < 20
    skinRef.current = storedSkin
    setSkinState(storedSkin)
    setIsDay(day)
    applyThemeClasses(storedSkin, day)
  }, [])

  const toggleMode = useCallback(() => {
    setIsDay(prev => {
      const next = !prev
      applyThemeClasses(skinRef.current, next)
      localStorage.setItem("dispatch-theme", next ? "day" : "night")
      return next
    })
  }, [])

  const setSkin = useCallback((newSkin: Skin) => {
    skinRef.current = newSkin
    setSkinState(newSkin)
    localStorage.setItem("dispatch-skin", newSkin)
    setIsDay(prev => { applyThemeClasses(newSkin, prev); return prev })
  }, [])

  return { skin, isDay, toggleMode, setSkin }
}

// ─── Annotation cache helpers ─────────────────────────────────────────────────
// Annotations live in localStorage with a 2-hour TTL.
// Single-user tool; 5-10 visits/day — fresh enough, eliminates every load cost.

const ANNOTATION_CACHE_KEY = "dispatch-annotations-v3"
const ANNOTATION_TTL_MS    = 2 * 60 * 60 * 1000 // 2 hours

interface AnnotationEntry {
  id: string
  synopsis: string
  relevance: string
  signalType: string
  signalLens: string
  signalScores?: { lilly: number; hod: number; urgency: number }
}

function loadAnnotationCache(): AnnotationEntry[] | null {
  try {
    const raw = localStorage.getItem(ANNOTATION_CACHE_KEY)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > ANNOTATION_TTL_MS) return null
    // Reject empty-content caches — these are artifacts of failed annotation runs
    const hasContent = Array.isArray(data) && data.some((a: AnnotationEntry) => (a.synopsis && a.synopsis.length > 10) || (a.relevance && a.relevance.length > 10))
    if (!hasContent) return null
    return data
  } catch { return null }
}

function saveAnnotationCache(data: AnnotationEntry[]) {
  try { localStorage.setItem(ANNOTATION_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })) }
  catch { /* quota exceeded — silently skip */ }
}

function mergeAnnotations(articles: Article[], annotations: AnnotationEntry[]): Article[] {
  const map = new Map(annotations.map(a => [a.id, a]))
  return articles.map(a => {
    const ann = map.get(a.id)
    return ann ? { ...a, ...ann } : a
  })
}

async function fetchAnnotations(articles: Article[]): Promise<AnnotationEntry[] | null> {
  // Return cached if still fresh
  const cached = loadAnnotationCache()
  if (cached) return cached

  try {
    const res = await fetch("/api/annotate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articles: articles.slice(0, 20).map(a => ({ id: a.id, title: a.title, category: a.category })),
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const annotations: AnnotationEntry[] = data.annotations || []
    if (annotations.length > 0) saveAnnotationCache(annotations)
    return annotations
  } catch { return null }
}

// ─── Cerebro ──────────────────────────────────────────────────────────────────

// ─── Speech Recognition helper ───────────────────────────────────────────────
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

function Cerebro({ articles, pendingPrompt }: {
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

  // Rotating provocations — keep the mind active
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
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  useEffect(() => {
    setPlaceholderIdx(Math.floor(Math.random() * PROVOCATIONS.length))
    const t = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % PROVOCATIONS.length)
    }, 12000)
    return () => clearInterval(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
          // Inject search lines into the display thread before the response
          const searchLines: Message[] = (data.searches || []).map(
            (q: string) => ({ role: "search" as const, content: q })
          )
          setMessages(prev => [
            ...prev,
            ...searchLines,
            { role: "assistant", content: data.text || "// empty response" },
          ])
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
    [messages, loading, articles]
  )

  // Keep ref current so the pending-prompt effect never captures a stale send
  sendRef.current = send

  // Auto-fire a deliberation prompt seeded from ChiefOfStaffBand
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
            fontSize: 10,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            letterSpacing: "0.08em",
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
                fontSize: 9,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                color: "var(--accent-muted)",
                letterSpacing: "0.04em",
                opacity: 0.7,
              }}
            >
              ◈ mem
            </span>
          )}
          {tokens > 0 && (
            <span
              style={{
                fontSize: 10,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
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
                borderRadius: 5,
                border: "1px solid var(--border)",
                background: escalateCopied ? "var(--accent-secondary)" : "transparent",
                color: escalateCopied ? "var(--bg-primary)" : "var(--text-tertiary)",
                fontSize: 9,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                letterSpacing: "0.02em",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M5 3L3 3C1.9 3 1 3.9 1 5V13C1 14.1 1.9 15 3 15H11C12.1 15 13 14.1 13 13V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 1H15V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 1L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
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
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 0",
        }}
      >
        {messages.length === 0 && (
          <div style={{ padding: "24px 16px" }}>
            <div
              style={{
                fontSize: 12.5,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                color: "var(--text-tertiary)",
                lineHeight: 1.8,
                letterSpacing: "-0.01em",
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
          <div key={i} style={{ marginBottom: m.role === "search" ? 4 : 16 }}>
            {m.role === "user" ? (
              // User prompt
              <div
                style={{
                  padding: "0 16px",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  lineHeight: 1.6,
                  wordBreak: "break-word",
                  fontWeight: 500,
                }}
              >
                {m.content}
              </div>
            ) : m.role === "search" ? (
              // Web search activity
              <div
                style={{
                  padding: "0 16px",
                  fontSize: 11,
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  color: "var(--text-tertiary)",
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ color: "var(--accent-muted)", opacity: 0.7 }}>↗</span>
                <span style={{ opacity: 0.6 }}>searched &ldquo;{m.content}&rdquo;</span>
              </div>
            ) : (
              // Assistant response — mono for machine voice
              <div
                style={{
                  padding: "0 16px",
                  fontSize: 12.5,
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  color: "var(--text-secondary)",
                  lineHeight: 1.75,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  letterSpacing: "-0.01em",
                }}
              >
                {m.content}
              </div>
            )}
          </div>
        ))}

        {/* Follow-up prompts */}
        {followUps && !loading && (
          <div style={{
            margin: "8px 14px 12px",
            padding: "14px 14px 12px",
            background: "var(--bg-elevated)",
            borderRadius: 10,
            borderLeft: "2px solid var(--accent-secondary)",
            animation: "signal-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}>
            {/* Inline follow-up question — machine voice */}
            <div style={{
              fontSize: 12,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              color: "var(--accent-muted)",
              lineHeight: 1.65,
              fontStyle: "italic",
              letterSpacing: "-0.01em",
              marginBottom: followUps.alternatives.length > 0 ? 12 : 0,
            }}>
              {followUps.question}
            </div>
            {/* Alternative direction pills — human-facing affordance */}
            {followUps.alternatives.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {followUps.alternatives.map((alt, i) => (
                  <button
                    key={i}
                    onClick={() => send(alt)}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "7px 12px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      textAlign: "left",
                      lineHeight: 1.4,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "var(--accent-secondary)"
                      e.currentTarget.style.color = "var(--text-primary)"
                      e.currentTarget.style.background = "var(--bg-surface)"
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--border)"
                      e.currentTarget.style.color = "var(--text-secondary)"
                      e.currentTarget.style.background = "transparent"
                    }}
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
            <span
              className="cursor-blink"
              style={{
                fontSize: 13,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            >
              ▊
            </span>
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
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div style={{ display: "flex", gap: 6, padding: "8px 14px 0", flexWrap: "wrap" }}>
            {attachments.map((att, i) => (
              <div key={i} style={{ position: "relative" }}>
                {att.preview ? (
                  <img src={att.preview} alt={att.name} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: 6, border: "1px solid var(--border)",
                    background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase",
                  }}>
                    {att.name.split(".").pop()}
                  </div>
                )}
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                  aria-label={`Remove ${att.name}`}
                  style={{
                    position: "absolute", top: -4, right: -4, width: 16, height: 16,
                    borderRadius: "50%", background: "var(--text-tertiary)", color: "var(--bg-primary)",
                    border: "none", cursor: "pointer", fontSize: 10, lineHeight: 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main input bar — two-zone: textarea above, toolbar below */}
        <div style={{ padding: "0 14px 12px" }}>
          <div
            style={{
              background: "var(--bg-elevated)",
              borderRadius: 12,
              border: "1px solid var(--border)",
              transition: "border-color 0.15s",
              overflow: "hidden",
            }}
          >
            {/* Zone 1: Textarea — full width */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              placeholder={PROVOCATIONS[placeholderIdx]}
              rows={2}
              style={{
                width: "100%", resize: "none", background: "transparent", border: "none", outline: "none",
                fontSize: 13, fontFamily: "inherit", color: "var(--text-primary)",
                caretColor: "var(--accent-secondary)", lineHeight: "22px", maxHeight: 120,
                minHeight: 48, padding: "12px 14px 0",
              }}
            />

            {/* Zone 2: Toolbar row */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "4px 10px 8px",
            }}>
              {/* Discuss — sends the current provocation to Cerebro */}
              {!input.trim() ? (
                <button
                  onClick={() => send(PROVOCATIONS[placeholderIdx])}
                  aria-label="Discuss this prompt"
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 11, color: "var(--accent-muted)", padding: "6px 10px",
                    borderRadius: 6, transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--accent-secondary)"; e.currentTarget.style.background = "var(--bg-surface)" }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--accent-muted)"; e.currentTarget.style.background = "transparent" }}
                >
                  BUMP ↗
                </button>
              ) : <div />}
              <div style={{ display: "flex", gap: 2 }}>
              <button
                onClick={() => fileRef.current?.click()}
                aria-label="Attach file"
                style={{
                  width: 30, height: 30, display: "flex",
                  alignItems: "center", justifyContent: "center", borderRadius: 7,
                  border: "none", background: "transparent",
                  color: attachments.length > 0 ? "var(--accent-secondary)" : "var(--text-tertiary)",
                  cursor: "pointer", transition: "all 0.15s", padding: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-surface)"; if (!attachments.length) e.currentTarget.style.color = "var(--text-secondary)" }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = attachments.length > 0 ? "var(--accent-secondary)" : "var(--text-tertiary)" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 7.5L7.5 13.5C6.12 14.88 3.88 14.88 2.5 13.5C1.12 12.12 1.12 9.88 2.5 8.5L9.5 1.5C10.33 0.67 11.67 0.67 12.5 1.5C13.33 2.33 13.33 3.67 12.5 4.5L6.5 10.5C6.22 10.78 5.78 10.78 5.5 10.5C5.22 10.22 5.22 9.78 5.5 9.5L10.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </button>
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
                  style={{
                    width: 30, height: 30, display: "flex",
                    alignItems: "center", justifyContent: "center", borderRadius: 7,
                    border: "none", background: isRecording ? "rgba(239,68,68,0.15)" : "transparent",
                    color: isRecording ? "#ef4444" : "var(--text-tertiary)",
                    cursor: "pointer", transition: "all 0.15s", padding: 0,
                  }}
                  onMouseEnter={e => { if (!isRecording) { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.color = "var(--text-secondary)" } }}
                  onMouseLeave={e => { if (!isRecording) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)" } }}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="5.5" y="1" width="5" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M3 7.5C3 10.26 5.24 12.5 8 12.5C10.76 12.5 13 10.26 13 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="8" y1="12.5" x2="8" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

function useMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])
  return isMobile
}

export default function Page() {
  const { skin, isDay, toggleMode, setSkin } = useTheme()
  const isMobile = useMobile()
  const [articles,       setArticles]       = useState<Article[]>([])
  const [isLive,         setIsLive]         = useState(false)
  const [feedHealth,     setFeedHealth]     = useState<FeedHealth | null>(null)
  const [feedLoading,    setFeedLoading]    = useState(true)
  const [showAnalytics,  setShowAnalytics]  = useState(false)
  const [active,         setActive]         = useState("all")
  const [mobileTab,      setMobileTab]      = useState<"feed" | "analysis" | "cerebro">("feed")
  const [cerebroPrompt,  setCerebroPrompt]  = useState<{ text: string; id: number } | null>(null)
  const { signals, briefLoading } = useChiefOfStaff(articles)

  const handleDeliberate = useCallback((signal: Signal) => {
    const text = `I want to deliberate on this signal from the brief:\n\n"${signal.label}"\n\n${signal.body}\n\nWalk me through the strategic implications. What should I be thinking about, and what questions should I be exploring?`
    setCerebroPrompt({ text, id: Date.now() })
    setMobileTab("cerebro")
  }, [])

  const handleAnalyticsDeliberate = useCallback((text: string) => {
    setCerebroPrompt({ text, id: Date.now() })
    setMobileTab("cerebro")
  }, [])

  // Signal card hover state — desktop only
  const [signal, setSignal] = useState<{ article: Article; x: number; y: number } | null>(null)
  const handleSignalEnter = useCallback((article: Article, x: number, y: number) => { setSignal({ article, x, y }) }, [])
  const handleSignalMove  = useCallback((x: number, y: number) => { setSignal(s => s ? { ...s, x, y } : s) }, [])
  const handleSignalLeave = useCallback(() => { setSignal(null) }, [])

  // Resizable column widths
  const [leftWidth,  setLeftWidth]  = useState(220)
  const [rightWidth, setRightWidth] = useState(320)
  const dragRef = useRef<{ side: "left"|"right"; startX: number; startW: number } | null>(null)

  const startResize = useCallback((side: "left"|"right", e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = {
      side,
      startX: e.clientX,
      startW: side === "left" ? leftWidth : rightWidth,
    }
    document.body.style.cursor    = "col-resize"
    document.body.style.userSelect = "none"

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = ev.clientX - dragRef.current.startX
      if (dragRef.current.side === "left") {
        setLeftWidth(clamp(dragRef.current.startW + delta, 160, 380))
      } else {
        setRightWidth(clamp(dragRef.current.startW - delta, 220, 520))
      }
    }
    const onUp = () => {
      dragRef.current = null
      document.body.style.cursor    = ""
      document.body.style.userSelect = ""
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup",   onUp)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup",   onUp)
  }, [leftWidth, rightWidth])

  useEffect(() => {
    fetch("/api/news")
      .then(r => r.json())
      .then(data => {
        const fresh: Article[] = data.articles || []
        setIsLive(data.isLive || false)
        if (data.feedHealth) setFeedHealth(data.feedHealth)

        // Merge any cached annotations immediately before render
        const cached = loadAnnotationCache()
        setArticles(cached ? mergeAnnotations(fresh, cached) : fresh)
        setFeedLoading(false)

        // Fetch fresh annotations (uses localStorage cache, 2hr TTL)
        fetchAnnotations(fresh).then(annotations => {
          if (annotations) setArticles(mergeAnnotations(fresh, annotations))
        })
      })
      .catch(() => setFeedLoading(false))
  }, [])

  const filtered =
    active === "all" ? articles : articles.filter(a => a.tag === active)

  const feedContent = (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      {!isMobile && <ChiefOfStaffBand signals={signals} briefLoading={briefLoading} onDeliberate={handleDeliberate} />}
      <div id="main-feed" role="feed" aria-label="Intelligence feed" tabIndex={-1} style={{ flex: 1, overflowY: "auto" }}>
        {feedLoading ? (
          <div style={{ padding: "32px 20px" }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="loading-pulse"
                style={{
                  padding: "14px 20px 14px 18px",
                  borderBottom: "1px solid var(--border)",
                  borderLeft: "2px solid transparent",
                }}
              >
                <div style={{ height: 10, width: `${60 + (i % 3) * 15}%`, background: "var(--border)", borderRadius: 2, marginBottom: 8 }} />
                <div style={{ height: 13, width: `${70 + (i % 4) * 8}%`, background: "var(--bg-elevated)", borderRadius: 2 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, fontSize: 13, color: "var(--text-tertiary)" }}>
            No articles
          </div>
        ) : (
          filtered.map(a => (
            <FeedCard
              key={a.id}
              article={a}
              onSignalEnter={handleSignalEnter}
              onSignalMove={handleSignalMove}
              onSignalLeave={handleSignalLeave}
            />
          ))
        )}
      </div>
    </main>
  )

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden", background: "var(--bg-primary)" }}>
        <Ticker isDay={isDay} onToggle={toggleMode} skin={skin} onSkinChange={setSkin} />

        {/* Mobile: show active tab panel */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {mobileTab === "feed"     && feedContent}
          {mobileTab === "analysis" && <AnalysisPanelMobile signals={signals} briefLoading={briefLoading} />}
          {mobileTab === "cerebro"  && <div style={{ flex: 1, overflow: "hidden" }}><Cerebro articles={articles} pendingPrompt={cerebroPrompt} /></div>}
        </div>

        {/* Mobile bottom tab bar */}
        <div
          style={{
            flexShrink: 0,
            height: 52,
            display: "flex",
            alignItems: "stretch",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-surface)",
          }}
        >
          {([
            { id: "feed",     icon: "≡",  label: "Feed"     },
            { id: "analysis", icon: "◎",  label: "Analysis" },
            { id: "cerebro",  icon: "◈",  label: "Cerebro"  },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              aria-label={tab.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                borderTop: `2px solid ${mobileTab === tab.id ? "var(--accent-secondary)" : "transparent"}`,
              }}
            >
              <span style={{ fontSize: 15 }}>{tab.icon}</span>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  color: mobileTab === tab.id ? "var(--accent-secondary)" : "var(--text-tertiary)",
                }}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-primary)",
      }}
    >
      {/* Signal ticker — full width, pinned top */}
      <Ticker isDay={isDay} onToggle={toggleMode} skin={skin} onSkinChange={setSkin} />

      {/* Three-column workspace */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <LeftRail
          articles={articles}
          active={active}
          onSelect={setActive}
          isLive={isLive}
          feedHealth={feedHealth}
          feedLoading={feedLoading}
          width={leftWidth}
          showAnalytics={showAnalytics}
          onToggleAnalytics={() => setShowAnalytics(v => !v)}
        />
        <Divider onMouseDown={e => startResize("left", e)} />
        {showAnalytics
          ? <AnalyticsPanel articles={articles} onDeliberate={handleAnalyticsDeliberate} />
          : feedContent}
        <Divider onMouseDown={e => startResize("right", e)} />
        <div style={{ width: rightWidth, flexShrink: 0 }}>
          <Cerebro articles={articles} pendingPrompt={cerebroPrompt} />
        </div>
      </div>

      {/* Signal card — intelligence briefing on hover */}
      <SignalCard
        x={signal?.x ?? 0}
        y={signal?.y ?? 0}
        article={signal?.article ?? null}
      />
    </div>
  )
}
