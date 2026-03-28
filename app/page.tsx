"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Article {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  summary: string
  category: string
  tag: string
}

interface Message {
  role: "user" | "assistant"
  content: string
}

// ─── Config ──────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG = [
  { id: "policy",            label: "Policy",               tag: "policy",            color: "var(--cat-policy)" },
  { id: "ai",                label: "AI & Design",          tag: "ai",                color: "var(--cat-ai)" },
  { id: "design-industry",   label: "Design Industry",      tag: "design-industry",   color: "var(--cat-design-industry)" },
  { id: "creative-practice", label: "Creative Practice",    tag: "creative-practice", color: "var(--cat-creative-practice)" },
  { id: "market",            label: "Market Trends",        tag: "market",            color: "var(--cat-market)" },
  { id: "health",            label: "Healthcare & Pharma",  tag: "health",            color: "var(--cat-health)" },
  { id: "company",           label: "Company Intel",        tag: "company",           color: "var(--cat-company)" },
  { id: "design-leadership", label: "Design Leadership",    tag: "design-leadership", color: "var(--cat-design-leadership)" },
  { id: "creative-tech",     label: "Creative Technology",  tag: "creative-tech",     color: "var(--cat-creative-tech)" },
  { id: "culture",           label: "Cultural Signal",      tag: "culture",           color: "var(--cat-culture)" },
  { id: "data",              label: "Data & Modeling",      tag: "data",              color: "var(--cat-data)" },
]

const TARGET_COMPANIES = ["Shopify", "Anthropic", "Rivian", "Patagonia", "Lilly"]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 36e5)
  if (h < 1) return "< 1h"
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? "1d" : `${d}d`
}

// ─── ArticleCard ─────────────────────────────────────────────────────────────

function ArticleCard({ article }: { article: Article }) {
  const [expanded, setExpanded] = useState(false)
  const cat = CATEGORY_CONFIG.find(c => c.tag === article.tag)

  return (
    <article
      className="group cursor-pointer"
      style={{ borderBottom: "0.5px solid var(--bdr)" }}
      onClick={() => setExpanded(e => !e)}
    >
      <div
        className="px-8 py-4 transition-colors duration-100"
        style={{ background: expanded ? "var(--surf)" : "transparent" }}
      >
        {/* Meta */}
        <div className="flex items-center gap-2 mb-1.5">
          {cat && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: cat.color }}
            />
          )}
          <span
            className="text-[10px] font-mono uppercase tracking-[0.08em]"
            style={{ color: "var(--t3)" }}
          >
            {article.source}
          </span>
          <span style={{ color: "var(--bdr2)" }}>·</span>
          <span className="text-[10px] font-mono" style={{ color: "var(--t4)" }}>
            {timeAgo(article.publishedAt)}
          </span>
        </div>

        {/* Headline */}
        <p
          className="leading-[1.45] group-hover:opacity-60 transition-opacity duration-150"
          style={{
            color: "var(--t1)",
            fontSize: "14px",
            fontWeight: 500,
            letterSpacing: "-0.016em",
          }}
        >
          {article.title}
        </p>

        {/* Expanded */}
        {expanded && (
          <div className="mt-3 pt-3" style={{ borderTop: "0.5px solid var(--bdr)" }}>
            <p
              className="text-[12.5px] leading-[1.8] mb-3"
              style={{ color: "var(--t2)" }}
            >
              {article.summary}
            </p>
            {article.url !== "#" && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-[11px] hover:underline"
                style={{ color: "var(--acc)" }}
              >
                Read full article →
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({
  articles,
  active,
  onSelect,
  isLive,
  loading,
}: {
  articles: Article[]
  active: string
  onSelect: (tag: string) => void
  isLive: boolean
  loading: boolean
}) {
  const now = new Date()
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const day = now.toLocaleDateString("en-US", { weekday: "long" })

  const countFor = (tag: string) => articles.filter(a => a.tag === tag).length

  return (
    <aside
      className="flex flex-col shrink-0"
      style={{
        width: 196,
        borderRight: "0.5px solid var(--bdr)",
        background: "var(--surf)",
      }}
    >
      {/* Masthead */}
      <div className="px-6 pt-6 pb-5" style={{ borderBottom: "0.5px solid var(--bdr)" }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.04em",
            color: "var(--t1)",
            lineHeight: 1,
          }}
        >
          Dispatch
        </div>
        <div
          className="mt-1.5"
          style={{ fontSize: "10.5px", color: "var(--t3)", letterSpacing: "-0.01em" }}
        >
          {day}, {date}
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <span
            className="w-1 h-1 rounded-full"
            style={{ background: loading ? "var(--t4)" : isLive ? "var(--acc)" : "var(--t4)" }}
          />
          <span
            className="text-[9px] font-mono uppercase tracking-[0.09em]"
            style={{ color: loading ? "var(--t4)" : isLive ? "var(--acc)" : "var(--t4)" }}
          >
            {loading ? "Loading" : isLive ? "Live" : "Demo"}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {/* All */}
        <button
          onClick={() => onSelect("all")}
          className="w-full flex items-center justify-between px-6 py-2 transition-colors duration-100"
          style={{
            color: active === "all" ? "var(--t1)" : "var(--t3)",
            background: active === "all" ? "var(--surf2)" : "transparent",
          }}
        >
          <span className="text-[11px] tracking-[-0.01em]" style={{ fontWeight: active === "all" ? 500 : 400 }}>
            All
          </span>
          <span className="text-[10px] font-mono" style={{ color: "var(--t4)" }}>
            {articles.length}
          </span>
        </button>

        <div className="mx-6 my-2" style={{ borderTop: "0.5px solid var(--bdr)" }} />

        {CATEGORY_CONFIG.map(cat => {
          const n = countFor(cat.tag)
          if (n === 0 && !loading) return null
          const isActive = active === cat.tag
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.tag)}
              className="w-full flex items-center gap-2.5 px-6 py-[7px] transition-colors duration-100"
              style={{
                color: isActive ? "var(--t1)" : "var(--t3)",
                background: isActive ? "var(--surf2)" : "transparent",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 transition-opacity duration-100"
                style={{ background: cat.color, opacity: isActive ? 1 : 0.5 }}
              />
              <span
                className="flex-1 text-left text-[11px] tracking-[-0.01em]"
                style={{ fontWeight: isActive ? 500 : 400 }}
              >
                {cat.label}
              </span>
              {n > 0 && (
                <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--t4)" }}>
                  {n}
                </span>
              )}
            </button>
          )
        })}

        {/* Watching */}
        <div className="mx-6 my-3" style={{ borderTop: "0.5px solid var(--bdr)" }} />
        <div className="px-6 mb-2">
          <span
            className="text-[9px] font-mono uppercase tracking-[0.12em]"
            style={{ color: "var(--t4)" }}
          >
            Watching
          </span>
        </div>
        {TARGET_COMPANIES.map(co => (
          <button
            key={co}
            onClick={() => onSelect("company")}
            className="w-full flex items-center gap-2.5 px-6 py-[6px] hover:opacity-70 transition-opacity duration-100"
          >
            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--t4)" }} />
            <span className="text-[10.5px]" style={{ color: "var(--t3)" }}>{co}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4" style={{ borderTop: "0.5px solid var(--bdr)" }}>
        <span className="text-[10px] font-mono" style={{ color: "var(--t4)" }}>
          Jeremy Grant
        </span>
      </div>
    </aside>
  )
}

// ─── SynthesisPanel ──────────────────────────────────────────────────────────

function SynthesisPanel({ articles }: { articles: Article[] }) {
  const [synthesis, setSynthesis] = useState("")
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)

  const run = async () => {
    if (running || !articles.length) return
    setRunning(true)
    const context = articles
      .slice(0, 12)
      .map(a => `[${a.category}] ${a.title}: ${a.summary}`)
      .join("\n")
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: "Synthesize today's feed. What are the 2–3 most important patterns or signals for someone in my position? Be direct and specific. No bullets.",
          }],
          feedContext: { count: articles.length, articles: context },
        }),
      })
      const data = await res.json()
      setSynthesis(data.text || "")
      setLastRun(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
    } catch {
      setSynthesis("Failed to reach Cerebro.")
    }
    setRunning(false)
  }

  return (
    <div style={{ borderBottom: "0.5px solid var(--bdr)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 shrink-0"
        style={{ borderBottom: "0.5px solid var(--bdr)", height: 40 }}
      >
        <span
          className="text-[9px] font-mono uppercase tracking-[0.12em]"
          style={{ color: "var(--t3)" }}
        >
          Today's Brief
        </span>
        <div className="flex items-center gap-3">
          {lastRun && (
            <span className="text-[9px] font-mono" style={{ color: "var(--t4)" }}>
              {lastRun}
            </span>
          )}
          <button
            onClick={run}
            disabled={running || !articles.length}
            className="text-[10px] px-2.5 py-1 rounded-sm transition-all duration-150"
            style={{
              background: "transparent",
              color: running ? "var(--t4)" : "var(--acc)",
              border: "0.5px solid var(--bdr2)",
              cursor: running || !articles.length ? "not-allowed" : "pointer",
              letterSpacing: "0.02em",
            }}
          >
            {running ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 180 }}>
        {synthesis ? (
          <p className="text-[12.5px] leading-[1.85]" style={{ color: "var(--t2)" }}>
            {synthesis}
          </p>
        ) : (
          <p className="text-[11px] leading-[1.7]" style={{ color: "var(--t4)" }}>
            Surface patterns and signals across today's feed.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── CerebroPanel ────────────────────────────────────────────────────────────

function CerebroPanel({ articles }: { articles: Article[] }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [totalTokens, setTotalTokens] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = Math.min(el.scrollHeight, 80) + "px"
    }
  }, [input])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const updated = [...messages, { role: "user" as const, content: text.trim() }]
    setMessages(updated)
    setInput("")
    setLoading(true)

    const feedContext = articles.length ? {
      count: articles.length,
      articles: articles
        .slice(0, 15)
        .map(a => `[${a.category}] ${a.title}: ${a.summary}`)
        .join("\n"),
    } : null

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, feedContext }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: "assistant", content: data.text || "No response." }])
      setTotalTokens(t => t + (data.inputTokens || 0) + (data.outputTokens || 0))
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Failed to reach Cerebro." }])
    }
    setLoading(false)
  }, [messages, loading, articles])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 shrink-0"
        style={{ borderBottom: "0.5px solid var(--bdr)", height: 40 }}
      >
        <span
          className="text-[9px] font-mono uppercase tracking-[0.12em]"
          style={{ color: "var(--acc)" }}
        >
          Cerebro
        </span>
        {totalTokens > 0 && (
          <span className="text-[9px] font-mono" style={{ color: "var(--t4)" }}>
            {totalTokens.toLocaleString()}t
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-[11px] leading-[1.75]" style={{ color: "var(--t4)" }}>
            Ask about the feed, research a company, or explore a signal.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <span
                className="inline-block text-[12px] leading-[1.5] px-3 py-1.5 rounded-sm"
                style={{
                  background: "var(--acc-l)",
                  color: "var(--acc)",
                  maxWidth: "84%",
                  border: "0.5px solid var(--bdr2)",
                }}
              >
                {m.content}
              </span>
            ) : (
              <p
                className="text-[12.5px] leading-[1.85]"
                style={{ color: "var(--t2)" }}
              >
                {m.content}
              </p>
            )}
          </div>
        ))}
        {loading && (
          <p className="text-[10px] font-mono" style={{ color: "var(--t4)" }}>
            Thinking…
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-3 shrink-0" style={{ borderTop: "0.5px solid var(--bdr)" }}>
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder="Ask anything…"
            rows={1}
            className="flex-1 resize-none text-[12.5px] leading-[1.5] outline-none bg-transparent"
            style={{ color: "var(--t1)", caretColor: "var(--acc)" }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 text-[10px] px-3 py-1.5 rounded-sm transition-all duration-150"
            style={{
              background: input.trim() && !loading ? "var(--acc)" : "transparent",
              color: input.trim() && !loading ? "#0A0A08" : "var(--t4)",
              border: "0.5px solid var(--bdr2)",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              letterSpacing: "0.02em",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const [articles, setArticles] = useState<Article[]>([])
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState("all")

  useEffect(() => {
    fetch("/api/news")
      .then(r => r.json())
      .then(data => {
        setArticles(data.articles || [])
        setIsLive(data.isLive || false)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = active === "all" ? articles : articles.filter(a => a.tag === active)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Left: category nav */}
      <Sidebar
        articles={articles}
        active={active}
        onSelect={setActive}
        isLive={isLive}
        loading={loading}
      />

      {/* Center: article feed */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ borderRight: "0.5px solid var(--bdr)" }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-[11px] font-mono" style={{ color: "var(--t4)" }}>
              Loading…
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-[11px] font-mono" style={{ color: "var(--t4)" }}>
              No articles
            </span>
          </div>
        ) : (
          filtered.map(a => <ArticleCard key={a.id} article={a} />)
        )}
      </main>

      {/* Right: brief + cerebro */}
      <aside
        className="flex flex-col shrink-0"
        style={{ width: 316, background: "var(--surf)" }}
      >
        <SynthesisPanel articles={filtered} />
        <CerebroPanel articles={articles} />
      </aside>
    </div>
  )
}
