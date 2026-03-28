"use client"

import { useState, useEffect, useRef, useCallback } from "react"

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

interface Category {
  id: string
  label: string
  tag: string
}

interface Message {
  role: "user" | "assistant"
  content: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 36e5)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ArticleCard({ article }: { article: Article }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article
      className="group cursor-pointer"
      style={{ borderBottom: "0.5px solid var(--bdr)" }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="px-7 py-5">
        {/* Meta line */}
        <div className="flex items-baseline gap-2 mb-2.5">
          <span
            className={`cat-${article.tag} text-[10px] font-mono uppercase tracking-[0.1em]`}
          >
            {article.category}
          </span>
          <span style={{ color: "var(--bdr2)" }}>·</span>
          <span className="text-[11px]" style={{ color: "var(--t3)" }}>
            {article.source}
          </span>
          <span style={{ color: "var(--bdr2)" }}>·</span>
          <span className="text-[11px]" style={{ color: "var(--t3)" }}>
            {timeAgo(article.publishedAt)}
          </span>
        </div>

        {/* Headline + optional thumbnail */}
        <div className="flex items-start gap-4">
          <p
            className="flex-1 text-[14.5px] leading-[1.55] group-hover:opacity-70 transition-opacity duration-150"
            style={{
              color: "var(--t1)",
              fontWeight: 500,
              letterSpacing: "-0.015em",
            }}
          >
            {article.title}
          </p>
          {article.imageUrl && (
            <div
              className="shrink-0 rounded-sm overflow-hidden"
              style={{ width: 64, height: 64, background: "var(--surf2)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.imageUrl}
                alt=""
                className="w-full h-full object-cover opacity-80 group-hover:opacity-50 transition-opacity duration-150"
                onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            </div>
          )}
        </div>

        {/* Expanded */}
        {expanded && (
          <div className="mt-4 pt-4" style={{ borderTop: "0.5px solid var(--bdr)" }}>
            <p
              className="text-[13px] leading-[1.85] mb-3"
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

function FeedPanel({ articles, categories, isLive, loading }: {
  articles: Article[]
  categories: Category[]
  isLive: boolean
  loading: boolean
}) {
  const [active, setActive] = useState("all")
  const allCats = [{ id: "all", label: "All", tag: "all" }, ...categories]
  const filtered = active === "all" ? articles : articles.filter(a => a.tag === active)

  return (
    <div className="flex flex-col h-full" style={{ borderRight: "0.5px solid var(--bdr)" }}>
      {/* Tab bar */}
      <div
        className="flex items-center shrink-0 overflow-x-auto"
        style={{ borderBottom: "0.5px solid var(--bdr)", height: "46px" }}
      >
        {allCats.map(c => (
          <button
            key={c.id}
            onClick={() => setActive(c.tag)}
            className="flex items-center h-full px-5 text-[10.5px] font-mono uppercase tracking-[0.09em] shrink-0 whitespace-nowrap transition-all duration-150"
            style={{
              color: active === c.tag ? "var(--t1)" : "var(--t3)",
              borderBottom: active === c.tag
                ? "1px solid var(--acc)"
                : "1px solid transparent",
            }}
          >
            {c.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 px-6 shrink-0">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isLive ? "var(--acc)" : "var(--t4)", display: "inline-block" }}
          />
          <span
            className="text-[10px] font-mono uppercase tracking-[0.08em]"
            style={{ color: "var(--t3)" }}
          >
            {isLive ? "Live" : "Demo"}
          </span>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="text-[12px]" style={{ color: "var(--t3)" }}>
              Loading feed…
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <span className="text-[12px]" style={{ color: "var(--t3)" }}>
              No articles
            </span>
          </div>
        ) : (
          filtered.map(a => <ArticleCard key={a.id} article={a} />)
        )}
      </div>
    </div>
  )
}

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
            content: "Synthesize today's feed. What are the 2–3 most important patterns or signals for someone in my position? Be direct and specific.",
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-7 shrink-0"
        style={{ borderBottom: "0.5px solid var(--bdr)", height: "46px" }}
      >
        <span
          className="text-[10.5px] font-mono uppercase tracking-[0.1em]"
          style={{ color: "var(--t3)" }}
        >
          Today's Brief
        </span>
        <div className="flex items-center gap-3">
          {lastRun && (
            <span className="text-[10px] font-mono" style={{ color: "var(--t4)" }}>
              {lastRun}
            </span>
          )}
          <button
            onClick={run}
            disabled={running || !articles.length}
            className="text-[11px] px-3 py-1 rounded-sm transition-all duration-150"
            style={{
              background: "transparent",
              color: running ? "var(--t3)" : "var(--acc)",
              border: "0.5px solid var(--bdr2)",
              cursor: running || !articles.length ? "not-allowed" : "pointer",
              letterSpacing: "0.02em",
            }}
          >
            {running ? "Thinking…" : "Run"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-7 py-6">
        {synthesis ? (
          <p
            className="text-[13.5px] leading-[1.95]"
            style={{ color: "var(--t2)" }}
          >
            {synthesis}
          </p>
        ) : (
          <p
            className="text-[12px] leading-[1.75]"
            style={{ color: "var(--t3)", maxWidth: 240 }}
          >
            Run to surface what matters in today's feed — patterns, signals, and anything directly relevant to your positioning.
          </p>
        )}
      </div>
    </div>
  )
}

function CerebroChat({ articles }: { articles: Article[] }) {
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
      el.style.height = Math.min(el.scrollHeight, 96) + "px"
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
        body: JSON.stringify({
          messages: updated.map(m => ({ role: m.role, content: m.content })),
          feedContext,
        }),
      })
      const data = await res.json()
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.text || "No response." },
      ])
      setTotalTokens(t => t + (data.inputTokens || 0) + (data.outputTokens || 0))
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Failed to reach Cerebro." },
      ])
    }
    setLoading(false)
  }, [messages, loading, articles])

  return (
    <div
      className="shrink-0"
      style={{ borderTop: "0.5px solid var(--bdr)", background: "var(--surf)" }}
    >
      {/* Thread */}
      {messages.length > 0 && (
        <div
          className="overflow-y-auto px-7 pt-5 pb-3 space-y-4"
          style={{ maxHeight: "260px", borderBottom: "0.5px solid var(--bdr)" }}
        >
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "user" ? (
                <span
                  className="inline-block text-[12.5px] leading-[1.55] px-4 py-2 rounded-sm"
                  style={{
                    background: "var(--acc-l)",
                    color: "var(--acc)",
                    maxWidth: "65%",
                    border: "0.5px solid var(--bdr2)",
                  }}
                >
                  {m.content}
                </span>
              ) : (
                <p
                  className="text-[13.5px] leading-[1.85]"
                  style={{ color: "var(--t2)", maxWidth: "82%" }}
                >
                  {m.content}
                </p>
              )}
            </div>
          ))}
          {loading && (
            <p className="text-[12px]" style={{ color: "var(--t3)" }}>
              Cerebro is thinking…
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-4 px-7 py-3.5">
        <span
          className="text-[10.5px] font-mono uppercase tracking-[0.1em] shrink-0"
          style={{ color: "var(--acc)" }}
        >
          Cerebro
        </span>
        <div className="w-px h-3.5 shrink-0" style={{ background: "var(--bdr2)" }} />
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
          placeholder="Ask anything about the feed…"
          rows={1}
          className="flex-1 resize-none text-[13px] leading-[1.5] outline-none bg-transparent"
          style={{ color: "var(--t1)", caretColor: "var(--acc)" }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="shrink-0 text-[11px] px-3.5 py-1.5 rounded-sm transition-all duration-150"
          style={{
            background: input.trim() && !loading ? "var(--acc)" : "transparent",
            color: input.trim() && !loading ? "#0D0F0B" : "var(--t4)",
            border: "0.5px solid var(--bdr2)",
            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
          }}
        >
          Send
        </button>
        {totalTokens > 0 && (
          <span className="shrink-0 text-[10px] font-mono" style={{ color: "var(--t4)" }}>
            {totalTokens.toLocaleString()}t
          </span>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(true)

  const now = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  useEffect(() => {
    fetch("/api/news")
      .then(r => r.json())
      .then(data => {
        setArticles(data.articles || [])
        setCategories(data.categories || [])
        setIsLive(data.isLive || false)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Masthead */}
      <header
        className="flex items-center justify-between shrink-0"
        style={{
          height: "52px",
          borderBottom: "0.5px solid var(--bdr)",
          background: "var(--surf)",
          paddingLeft: "28px",
          paddingRight: "28px",
        }}
      >
        <div className="flex items-baseline gap-4">
          <span
            style={{
              color: "var(--t1)",
              fontSize: "15px",
              fontWeight: 600,
              letterSpacing: "-0.04em",
            }}
          >
            Dispatch
          </span>
          <span
            style={{
              color: "var(--t3)",
              fontSize: "12px",
              letterSpacing: "-0.01em",
            }}
          >
            {now}
          </span>
        </div>
        <span
          className="text-[11px] font-mono"
          style={{ color: "var(--t3)", letterSpacing: "0.04em" }}
        >
          Jeremy Grant
        </span>
      </header>

      {/* Body — two columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Feed — 60% */}
        <div className="overflow-hidden" style={{ flex: "3" }}>
          <FeedPanel
            articles={articles}
            categories={categories}
            isLive={isLive}
            loading={loading}
          />
        </div>
        {/* Brief / Synthesis — 40% */}
        <div className="overflow-hidden" style={{ flex: "2" }}>
          <SynthesisPanel articles={articles} />
        </div>
      </div>

      {/* Cerebro — pinned bottom */}
      <CerebroChat articles={articles} />
    </div>
  )
}
