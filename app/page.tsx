"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// ─── Types ───────────────────────────────────────────────────────

interface Article {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  summary: string
  category: string
  tag: string
  imageUrl?: string
}

interface Message {
  role: "user" | "assistant"
  content: string
}

// ─── Config ──────────────────────────────────────────────────────

const CATEGORY_CONFIG = [
  { id: "policy",            label: "Policy",               tag: "policy"            },
  { id: "ai",                label: "AI & Design",          tag: "ai"                },
  { id: "design-industry",   label: "Design Industry",      tag: "design-industry"   },
  { id: "creative-practice", label: "Creative Practice",    tag: "creative-practice" },
  { id: "market",            label: "Market Trends",        tag: "market"            },
  { id: "health",            label: "Healthcare & Pharma",  tag: "health"            },
  { id: "company",           label: "Company Intel",        tag: "company"           },
  { id: "design-leadership", label: "Design Leadership",    tag: "design-leadership" },
  { id: "creative-tech",     label: "Creative Technology",  tag: "creative-tech"     },
  { id: "culture",           label: "Cultural Signal",      tag: "culture"           },
  { id: "data",              label: "Data & Modeling",      tag: "data"              },
]

const TARGET_COMPANIES = ["Shopify", "Anthropic", "Rivian", "Patagonia", "Lilly"]

// ─── Dark mode hook ───────────────────────────────────────────────

function useDarkMode() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("dispatch-theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = stored ? stored === "dark" : false // light default
    setDark(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  const toggle = useCallback(() => {
    setDark(prev => {
      const next = !prev
      document.documentElement.classList.toggle("dark", next)
      localStorage.setItem("dispatch-theme", next ? "dark" : "light")
      return next
    })
  }, [])

  return { dark, toggle }
}

// ─── Helpers ─────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 36e5)
  if (h < 1) return "< 1h"
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ─── Article Tile ─────────────────────────────────────────────────

function ArticleTile({ article, featured = false }: { article: Article; featured?: boolean }) {
  const isExternal = article.url !== "#"
  const [imgFailed, setImgFailed] = useState(false)
  const hasImage = !!article.imageUrl && !imgFailed

  const hoverIn = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.boxShadow = "var(--shadow-hover)"
    e.currentTarget.style.transform = "translateY(-2px)"
  }
  const hoverOut = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.boxShadow = "var(--shadow)"
    e.currentTarget.style.transform = "translateY(0)"
  }

  const tile = hasImage ? (
    /* ── Image tile ─────────────────────────────────────────── */
    <div
      className="group flex flex-col overflow-hidden cursor-pointer h-full"
      style={{
        background: "var(--surf)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
      }}
      onMouseEnter={hoverIn}
      onMouseLeave={hoverOut}
    >
      <div
        className="relative overflow-hidden shrink-0"
        style={{
          aspectRatio: featured ? "16 / 7" : "3 / 2",
          borderRadius: "var(--radius) var(--radius) 0 0",
          background: "var(--surf2)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={article.imageUrl}
          alt=""
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
          onError={() => setImgFailed(true)}
        />
      </div>
      <div className="flex flex-col flex-1 p-4">
        <span className={`cat-${article.tag} text-[9.5px] font-mono uppercase tracking-[0.1em] mb-2 block`}>
          {article.category}
        </span>
        <h3
          className="flex-1 leading-[1.3] group-hover:opacity-60 transition-opacity duration-150"
          style={{
            color: "var(--t1)",
            fontSize: featured ? "17px" : "14.5px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          {article.title}
        </h3>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="text-[10.5px]" style={{ color: "var(--t3)" }}>{article.source}</span>
          <span style={{ color: "var(--bdr2)" }}>·</span>
          <span className="text-[10.5px]" style={{ color: "var(--t4)" }}>{timeAgo(article.publishedAt)}</span>
        </div>
      </div>
    </div>
  ) : (
    /* ── Text tile ─────────────────────────────────────────── */
    <div
      className="group flex flex-col cursor-pointer h-full"
      style={{
        background: "var(--surf)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        padding: "22px 20px 20px",
        minHeight: 172,
        borderTop: `3px solid var(--cat-${article.tag})`,
      }}
      onMouseEnter={hoverIn}
      onMouseLeave={hoverOut}
    >
      <h3
        className="flex-1 leading-[1.3] group-hover:opacity-60 transition-opacity duration-150"
        style={{
          color: "var(--t1)",
          fontSize: featured ? "20px" : "15.5px",
          fontWeight: 650,
          letterSpacing: "-0.022em",
        }}
      >
        {article.title}
      </h3>
      <div className="mt-4 flex flex-col gap-1">
        <span className={`cat-${article.tag} text-[9.5px] font-mono uppercase tracking-[0.1em]`}>
          {article.category}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10.5px]" style={{ color: "var(--t3)" }}>{article.source}</span>
          <span style={{ color: "var(--bdr2)" }}>·</span>
          <span className="text-[10.5px]" style={{ color: "var(--t4)" }}>{timeAgo(article.publishedAt)}</span>
        </div>
      </div>
    </div>
  )

  if (isExternal) {
    return (
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
        style={{ gridColumn: featured ? "span 2" : "span 1" }}
      >
        {tile}
      </a>
    )
  }
  return (
    <div className="h-full" style={{ gridColumn: featured ? "span 2" : "span 1" }}>
      {tile}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────

function Sidebar({
  articles,
  active,
  onSelect,
  isLive,
  loading,
  dark,
  onToggleDark,
}: {
  articles: Article[]
  active: string
  onSelect: (tag: string) => void
  isLive: boolean
  loading: boolean
  dark: boolean
  onToggleDark: () => void
}) {
  const now = new Date()
  const date = now.toLocaleDateString("en-US", { month: "long", day: "numeric" })
  const day = now.toLocaleDateString("en-US", { weekday: "long" })

  const countFor = (tag: string) => articles.filter(a => a.tag === tag).length

  return (
    <aside
      className="flex flex-col shrink-0 overflow-hidden"
      style={{
        width: 212,
        background: "var(--surf)",
        borderRight: "0.5px solid var(--bdr)",
        boxShadow: "1px 0 0 var(--bdr)",
      }}
    >
      {/* Wordmark */}
      <div className="px-6 pt-7 pb-6" style={{ borderBottom: "0.5px solid var(--bdr)" }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.05em",
            color: "var(--t1)",
            lineHeight: 1,
          }}
        >
          Dispatch
        </div>
        <div className="mt-1.5" style={{ fontSize: "11px", color: "var(--t3)", letterSpacing: "-0.01em" }}>
          {day}, {date}
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: loading ? "var(--t4)" : isLive ? "var(--acc)" : "var(--t4)" }}
            />
            <span
              className="text-[9.5px] font-mono uppercase tracking-[0.1em]"
              style={{ color: loading ? "var(--t4)" : isLive ? "var(--acc)" : "var(--t4)" }}
            >
              {loading ? "Loading" : isLive ? "Live" : "Demo"}
            </span>
          </div>
          {/* Dark mode toggle */}
          <button
            onClick={onToggleDark}
            className="transition-opacity duration-150 hover:opacity-60"
            style={{ fontSize: 14, color: "var(--t3)", lineHeight: 1 }}
            title={dark ? "Switch to light" : "Switch to dark"}
          >
            {dark ? "☀" : "☽"}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {/* All */}
        <button
          onClick={() => onSelect("all")}
          className="w-full flex items-center justify-between px-6 py-2.5 transition-colors duration-100"
          style={{
            color: active === "all" ? "var(--t1)" : "var(--t3)",
            background: active === "all" ? "var(--surf2)" : "transparent",
          }}
        >
          <span
            className="text-[12px] tracking-[-0.01em]"
            style={{ fontWeight: active === "all" ? 600 : 400 }}
          >
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
              className="w-full flex items-center gap-2.5 px-6 py-2 transition-colors duration-100"
              style={{
                color: isActive ? "var(--t1)" : "var(--t3)",
                background: isActive ? "var(--surf2)" : "transparent",
              }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 cat-${cat.tag}`}
                style={{
                  background: `var(--cat-${cat.tag})`,
                  opacity: isActive ? 1 : 0.5,
                }}
              />
              <span
                className="flex-1 text-left text-[11.5px] tracking-[-0.01em]"
                style={{ fontWeight: isActive ? 600 : 400 }}
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

        <div className="mx-6 my-3" style={{ borderTop: "0.5px solid var(--bdr)" }} />

        <div className="px-6 mb-1.5">
          <span
            className="text-[9px] font-mono uppercase tracking-[0.14em]"
            style={{ color: "var(--t4)" }}
          >
            Watching
          </span>
        </div>
        {TARGET_COMPANIES.map(co => (
          <button
            key={co}
            onClick={() => onSelect("company")}
            className="w-full flex items-center gap-2.5 px-6 py-1.5 hover:opacity-60 transition-opacity duration-100"
          >
            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--t4)" }} />
            <span className="text-[11px]" style={{ color: "var(--t3)" }}>{co}</span>
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

// ─── Brief Widget ─────────────────────────────────────────────────

function BriefWidget({ articles }: { articles: Article[] }) {
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
            content: "Synthesize today's feed. What are the 2–3 most important patterns or signals? Be direct. No bullets.",
          }],
          feedContext: { count: articles.length, articles: context },
        }),
      })
      const data = await res.json()
      setSynthesis(data.text || "")
      setLastRun(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
    } catch {
      setSynthesis("Could not reach Cerebro.")
    }
    setRunning(false)
  }

  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        background: "var(--surf)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center justify-between px-5 shrink-0"
        style={{ height: 44, borderBottom: "0.5px solid var(--bdr)" }}
      >
        <span
          className="text-[10px] font-mono uppercase tracking-[0.12em]"
          style={{ color: "var(--t3)" }}
        >
          Today's Brief
        </span>
        <div className="flex items-center gap-2.5">
          {lastRun && (
            <span className="text-[9px] font-mono" style={{ color: "var(--t4)" }}>
              {lastRun}
            </span>
          )}
          <button
            onClick={run}
            disabled={running || !articles.length}
            className="text-[10px] px-2.5 py-1 transition-all duration-150"
            style={{
              background: "transparent",
              color: running ? "var(--t4)" : "var(--acc)",
              border: "0.5px solid var(--bdr2)",
              borderRadius: 6,
              cursor: running || !articles.length ? "not-allowed" : "pointer",
              letterSpacing: "0.02em",
            }}
          >
            {running ? "Running…" : "Run"}
          </button>
        </div>
      </div>
      <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 180 }}>
        {synthesis ? (
          <p className="text-[13px] leading-[1.85]" style={{ color: "var(--t2)" }}>
            {synthesis}
          </p>
        ) : (
          <p className="text-[12px] leading-[1.7]" style={{ color: "var(--t4)" }}>
            Surface patterns and signals across today's feed.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Cerebro Widget ───────────────────────────────────────────────

function CerebroWidget({ articles }: { articles: Article[] }) {
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
      articles: articles.slice(0, 15).map(a => `[${a.category}] ${a.title}: ${a.summary}`).join("\n"),
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
      setMessages(prev => [...prev, { role: "assistant", content: "Could not reach Cerebro." }])
    }
    setLoading(false)
  }, [messages, loading, articles])

  return (
    <div
      className="flex flex-col flex-1 min-h-0"
      style={{
        background: "var(--surf)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 shrink-0"
        style={{ height: 44, borderBottom: "0.5px solid var(--bdr)" }}
      >
        <span
          className="text-[10px] font-mono uppercase tracking-[0.12em]"
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
          <p className="text-[12px] leading-[1.7]" style={{ color: "var(--t4)" }}>
            Ask about the feed, research a company, or explore a signal.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <span
                className="inline-block text-[12.5px] leading-[1.5] px-3 py-1.5"
                style={{
                  background: "var(--acc-l)",
                  color: "var(--acc)",
                  maxWidth: "84%",
                  border: "0.5px solid var(--bdr2)",
                  borderRadius: 8,
                }}
              >
                {m.content}
              </span>
            ) : (
              <p className="text-[13px] leading-[1.85]" style={{ color: "var(--t2)" }}>
                {m.content}
              </p>
            )}
          </div>
        ))}
        {loading && (
          <p className="text-[10.5px] font-mono" style={{ color: "var(--t4)" }}>
            Thinking…
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-3.5 shrink-0" style={{ borderTop: "0.5px solid var(--bdr)" }}>
        <div className="flex items-end gap-2.5">
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
            className="flex-1 resize-none text-[13px] leading-[1.5] outline-none bg-transparent"
            style={{ color: "var(--t1)", caretColor: "var(--acc)" }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 text-[10.5px] px-3 py-1.5 transition-all duration-150"
            style={{
              background: input.trim() && !loading ? "var(--acc)" : "transparent",
              color: input.trim() && !loading ? "#fff" : "var(--t4)",
              border: "0.5px solid var(--bdr2)",
              borderRadius: 6,
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────

export default function Page() {
  const [articles, setArticles] = useState<Article[]>([])
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState("all")
  const { dark, toggle } = useDarkMode()

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

      {/* Sidebar */}
      <Sidebar
        articles={articles}
        active={active}
        onSelect={setActive}
        isLive={isLive}
        loading={loading}
        dark={dark}
        onToggleDark={toggle}
      />

      {/* Center — bento grid */}
      <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="text-[11px] font-mono" style={{ color: "var(--t4)" }}>Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <span className="text-[11px] font-mono" style={{ color: "var(--t4)" }}>No articles</span>
          </div>
        ) : (
          <div
            className="p-5"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(256px, 1fr))",
              gap: "16px",
            }}
          >
            {filtered.map((a, i) => (
              <ArticleTile key={a.id} article={a} featured={i === 0} />
            ))}
          </div>
        )}
      </main>

      {/* Right panel — widget stack */}
      <aside
        className="flex flex-col shrink-0 gap-4 p-4 overflow-hidden"
        style={{
          width: 340,
          background: "var(--bg)",
          borderLeft: "0.5px solid var(--bdr)",
        }}
      >
        <BriefWidget articles={filtered} />
        <CerebroWidget articles={articles} />
      </aside>
    </div>
  )
}
