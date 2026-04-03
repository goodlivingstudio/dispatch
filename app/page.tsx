"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Radio, AudioLines, Blend, Send, Brain, Settings, ChevronRight, ChevronLeft, Minimize2 } from "lucide-react"
import { Ticker } from "@/components/ticker"
import { LeftRail } from "@/components/left-rail"
import { useChiefOfStaff, ChiefOfStaffBand } from "@/components/chief-of-staff"
import { FeedCard, SignalCard } from "@/components/feed-card"
import { Cerebro } from "@/components/cerebro"
import { SynthesisView } from "@/components/synthesis-view"
import { AudioView } from "@/components/audio-view"
import { ConfigView } from "@/components/config-view"
import { DispatchView } from "@/components/dispatch-view"
import { SourcePulseView } from "@/components/source-pulse"
import { GalleryOverlay } from "@/components/gallery"
import { HotkeysOverlay } from "@/components/hotkeys"
import { ExportPanel } from "@/components/export-panel"
import { Divider } from "@/components/divider"
import type { Article, Signal, FeedHealth, Skin, ViewMode } from "@/lib/types"
import { TYPE, MONO } from "@/lib/styles"

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
  signalScores?: { opportunity: number; position: number; discipline: number; landscape: number; culture: number; urgency: number }
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
        articles: articles.slice(0, 15).map(a => ({ id: a.id, title: a.title, category: a.category })),
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const annotations: AnnotationEntry[] = data.annotations || []
    if (annotations.length > 0) saveAnnotationCache(annotations)
    return annotations
  } catch { return null }
}

// Cerebro extracted to components/cerebro.tsx

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
  const [fetchedAt,      setFetchedAt]      = useState<string | null>(null)
  const [viewMode,       setViewMode]       = useState<ViewMode>("signal")
  const [cerebroCollapsed, setCerebroCollapsed] = useState(false)
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [hotkeysOpen, setHotkeysOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [activeLayers,   setActiveLayers]   = useState<Set<string>>(new Set())
  const [sortBy,         setSortBy]         = useState<"urgency" | "layer">("urgency")
  const [mobileTab,      setMobileTab]      = useState<"signal" | "audio" | "synthesis" | "dispatch" | "cerebro" | "config">("signal")
  const [excludedSources, setExcludedSources] = useState<Set<string>>(new Set())

  // Global keyboard shortcuts
  useEffect(() => {
    const modes: ViewMode[] = ["signal", "audio", "synthesis", "dispatch"]
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const isTyping = tag === "INPUT" || tag === "TEXTAREA"

      // ? — toggle hotkeys (always works)
      if (e.key === "?" && !isTyping) {
        e.preventDefault()
        setHotkeysOpen(v => !v)
        return
      }

      // Don't intercept other keys when typing
      if (isTyping) return

      // Arrow keys — cycle views
      const current = modes.indexOf(viewMode as typeof modes[number])
      if (e.key === "ArrowRight" && current !== -1) {
        e.preventDefault()
        setViewMode(modes[(current + 1) % modes.length])
      } else if (e.key === "ArrowLeft" && current !== -1) {
        e.preventDefault()
        setViewMode(modes[(current - 1 + modes.length) % modes.length])
      }

      // Number keys — direct view access
      else if (e.key === "1") setViewMode("signal")
      else if (e.key === "2") setViewMode("audio")
      else if (e.key === "3") setViewMode("synthesis")
      else if (e.key === "4") setViewMode("dispatch")

      // F — focus mode
      else if (e.key === "f" || e.key === "F") setFocusMode(v => !v)

      // G — gallery
      else if (e.key === "g" || e.key === "G") setGalleryOpen(true)

      // C or / — focus Cerebro input
      else if (e.key === "c" || e.key === "C" || e.key === "/") {
        e.preventDefault()
        const input = document.querySelector('[aria-label="Cerebro strategic advisor"] textarea') as HTMLTextAreaElement
        if (input) input.focus()
      }

      // Escape — close overlays
      else if (e.key === "Escape") {
        if (hotkeysOpen) setHotkeysOpen(false)
        else if (galleryOpen) setGalleryOpen(false)
        else if (focusMode) setFocusMode(false)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [viewMode, hotkeysOpen, galleryOpen, focusMode])

  const handleToggleSource = useCallback((source: string) => {
    setExcludedSources(prev => {
      const next = new Set(prev)
      if (next.has(source)) next.delete(source)
      else next.add(source)
      try { localStorage.setItem("dispatch-excluded-sources", JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])

  // Restore persisted state on mount
  useEffect(() => {
    try {
      const savedLayers = localStorage.getItem("dispatch-active-layers")
      if (savedLayers) {
        const parsed = JSON.parse(savedLayers)
        if (Array.isArray(parsed)) setActiveLayers(new Set(parsed))
      }

      const savedSort = localStorage.getItem("dispatch-sort-by")
      if (savedSort === "urgency" || savedSort === "layer") setSortBy(savedSort)

      const savedView = localStorage.getItem("dispatch-view-mode")
      if (savedView === "signal" || savedView === "audio" || savedView === "synthesis" || savedView === "dispatch" || savedView === "config" || savedView === "pulse") setViewMode(savedView)

      const savedTab = localStorage.getItem("dispatch-mobile-tab")
      if (savedTab === "signal" || savedTab === "audio" || savedTab === "synthesis" || savedTab === "dispatch" || savedTab === "cerebro" || savedTab === "config") setMobileTab(savedTab)

      const savedExcluded = localStorage.getItem("dispatch-excluded-sources")
      if (savedExcluded) setExcludedSources(new Set(JSON.parse(savedExcluded)))
    } catch { /* localStorage unavailable — use defaults */ }
  }, [])

  // Persist active layers and sort
  useEffect(() => {
    try { localStorage.setItem("dispatch-active-layers", JSON.stringify([...activeLayers])) } catch {}
  }, [activeLayers])
  useEffect(() => {
    try { localStorage.setItem("dispatch-sort-by", sortBy) } catch {}
  }, [sortBy])

  // Persist view mode
  useEffect(() => {
    try { localStorage.setItem("dispatch-view-mode", viewMode) } catch {}
  }, [viewMode])

  // Persist mobile tab
  useEffect(() => {
    try { localStorage.setItem("dispatch-mobile-tab", mobileTab) } catch {}
  }, [mobileTab])
  const [cerebroPrompt,  setCerebroPrompt]  = useState<{ text: string; id: number } | null>(null)
  const { signals, briefLoading, briefError } = useChiefOfStaff(articles)

  const handleDeliberate = useCallback((signal: Signal) => {
    const text = `I want to deliberate on this signal from the brief:\n\n"${signal.label}"\n\n${signal.body}\n\nWalk me through the strategic implications. What should I be thinking about, and what questions should I be exploring?`
    setCerebroPrompt({ text, id: Date.now() })
    setMobileTab("cerebro")
  }, [])

  const handleSynthesisDeliberate = useCallback((text: string) => {
    setCerebroPrompt({ text, id: Date.now() })
    setMobileTab("cerebro")
  }, [])

  // Signal card hover state — desktop only
  const [signal, setSignal] = useState<{ article: Article; x: number; y: number } | null>(null)
  const handleSignalEnter = useCallback((article: Article, x: number, y: number) => { setSignal({ article, x, y }) }, [])
  const handleSignalMove  = useCallback((x: number, y: number) => { setSignal(s => s ? { ...s, x, y } : s) }, [])
  const handleSignalLeave = useCallback(() => { setSignal(null) }, [])

  // Resizable column widths
  const [leftWidth,  setLeftWidth]  = useState(300)
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
        if (data.fetchedAt) setFetchedAt(data.fetchedAt)
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

  const sourceFiltered = excludedSources.size > 0
    ? articles.filter(a => !excludedSources.has(a.source))
    : articles
  const layerFiltered =
    activeLayers.size === 0 ? sourceFiltered : sourceFiltered.filter(a => activeLayers.has(a.tag))
  const filtered = [...layerFiltered].sort((a, b) => {
    if (sortBy === "urgency") {
      const ua = a.signalScores?.urgency ?? 0
      const ub = b.signalScores?.urgency ?? 0
      if (ub !== ua) return ub - ua
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    }
    // layer sort: original order from API
    return 0
  })

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
      {!isMobile && <ChiefOfStaffBand signals={signals} briefLoading={briefLoading} briefError={briefError} onDeliberate={handleDeliberate} />}
      {/* Section header */}
      <div style={{
        flexShrink: 0, height: 48, display: "flex", alignItems: "center",
        padding: "0 20px", marginTop: 4,
      }}>
        <span style={{ ...TYPE.sm, color: "var(--accent-secondary)", textTransform: "uppercase", fontWeight: 500, letterSpacing: "0.04em" }}>
          News Sources
        </span>
        <span style={{ ...TYPE.sm, color: "var(--text-primary)", marginLeft: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {filtered.length}/{articles.length} Active
        </span>
      </div>
      <div id="main-feed" role="feed" aria-label="Intelligence feed" tabIndex={-1} style={{ flex: 1, overflowY: "auto", padding: "8px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {feedLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="loading-pulse"
                style={{
                  padding: "16px 20px",
                  borderRadius: 12,
                  background: "var(--bg-surface)",
                }}
              >
                <div style={{ height: 10, width: `${60 + (i % 3) * 15}%`, background: "var(--border)", borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 13, width: `${70 + (i % 4) * 8}%`, background: "var(--bg-elevated)", borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, fontSize: 13, color: "var(--text-tertiary)" }}>
            No articles
          </div>
        ) : (
          filtered.map((a, i) => (
            <FeedCard
              key={a.id}
              article={a}
              index={i}
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
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden", background: "var(--bg-primary)", position: "fixed", inset: 0 }}>
        <Ticker isDay={isDay} onToggle={toggleMode} skin={skin} onSkinChange={setSkin} />

        {/* Mobile: show active tab panel with transition */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div key={mobileTab} className="mobile-tab-content" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {mobileTab === "signal" && feedContent}
            {mobileTab === "synthesis" && <SynthesisView articles={articles} onDeliberate={handleSynthesisDeliberate} />}
            {mobileTab === "audio"     && <AudioView onDeliberate={handleSynthesisDeliberate} excludedSources={excludedSources} />}
            {mobileTab === "dispatch"  && <DispatchView onDeliberate={handleSynthesisDeliberate} />}
            {mobileTab === "cerebro"   && <div style={{ flex: 1, overflow: "hidden" }}><Cerebro articles={articles} pendingPrompt={cerebroPrompt} /></div>}
            {mobileTab === "config"    && <ConfigView excludedSources={excludedSources} onToggleSource={handleToggleSource} feedHealth={feedHealth} articles={articles} />}
          </div>
        </div>

        {/* Mobile bottom tab bar with sliding indicator */}
        {(() => {
          const tabs = [
            { id: "signal" as const,    Icon: Radio,      label: "Signal"    },
            { id: "audio" as const,     Icon: AudioLines, label: "Sound"     },
            { id: "synthesis" as const, Icon: Blend,      label: "Synthesis" },
            { id: "dispatch" as const,  Icon: Send,       label: "Dispatch"  },
            { id: "cerebro" as const,   Icon: Brain,      label: "Cerebro"   },
          ]
          const activeIdx = tabs.findIndex(t => t.id === mobileTab)
          return (
            <div
              style={{
                flexShrink: 0,
                height: 72,
                display: "flex",
                alignItems: "stretch",
                borderTop: "1px solid var(--border)",
                background: "var(--bg-surface)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Sliding blob indicator */}
              <div
                style={{
                  position: "absolute",
                  top: 4,
                  left: `calc(${activeIdx * (100 / tabs.length)}% + 4px)`,
                  width: `calc(${100 / tabs.length}% - 8px)`,
                  height: "calc(100% - 8px)",
                  background: "var(--bg-elevated)",
                  borderRadius: 14,
                  transition: "left 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                  zIndex: 0,
                }}
              />
              {tabs.map(tab => {
                const isActive = mobileTab === tab.id
                return (
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
                      gap: 4,
                      minHeight: 72,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <tab.Icon
                      size={20}
                      strokeWidth={1.5}
                      style={{
                        color: isActive ? "var(--accent-secondary)" : "var(--text-tertiary)",
                        transition: "color 0.3s ease",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        fontWeight: 500,
                        color: isActive ? "var(--accent-secondary)" : "var(--text-tertiary)",
                        transition: "color 0.3s ease",
                      }}
                    >
                      {tab.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })()}
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

      {/* Focus Mode — DCOS strip + full-width Cerebro */}
      {focusMode && !isMobile && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Compact DCOS strip */}
          <div style={{
            flexShrink: 0, borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "stretch", gap: 0,
          }}>
            {/* Exit focus mode button */}
            <button
              onClick={() => setFocusMode(false)}
              title="Exit focus mode (Esc)"
              style={{
                flexShrink: 0, width: 48,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--bg-surface)", border: "none", borderRight: "1px solid var(--border)",
                cursor: "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-surface)" }}
            >
              <Minimize2 size={16} strokeWidth={1.5} style={{ color: "var(--accent-secondary)" }} />
            </button>
            {/* DCOS cards as compact clickable strips */}
            {signals.filter(s => s.body).map((signal, i) => (
              <button
                key={i}
                onClick={() => handleDeliberate(signal)}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", gap: 2,
                  padding: "10px 16px", background: "transparent",
                  border: "none", borderRight: i < signals.filter(s => s.body).length - 1 ? "1px solid var(--border)" : "none",
                  cursor: "pointer", textAlign: "left", transition: "background 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-surface)" }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
              >
                <span style={{ ...TYPE.xs, color: "var(--accent-secondary)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>
                  {signal.label}
                </span>
                <span style={{ ...TYPE.sm, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {signal.body.replace(/\[\d+\]/g, "").slice(0, 80)}
                </span>
              </button>
            ))}
          </div>
          {/* Full-width Cerebro */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <Cerebro articles={articles} pendingPrompt={cerebroPrompt} />
          </div>
        </div>
      )}

      {/* Three-column workspace — hidden in focus mode */}
      <div style={{ flex: 1, display: focusMode ? "none" : "flex", overflow: "hidden" }}>
        <div
          style={{
            width: leftRailCollapsed ? 42 : leftWidth,
            flexShrink: 0,
            transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            overflow: "hidden",
            position: "relative",
            height: "100%",
          }}
        >
          {leftRailCollapsed ? (
            <button
              onClick={() => setLeftRailCollapsed(false)}
              title="Expand panel"
              style={{
                width: 42, height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--bg-primary)",
                border: "none", borderRight: "1px solid var(--border)",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-surface)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-primary)" }}
            >
              <span style={{ writingMode: "vertical-rl", ...TYPE.sm, color: "var(--accent-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>
                Dispatch
              </span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setLeftRailCollapsed(true)}
                title="Collapse panel"
                style={{
                  position: "absolute", top: 8, right: 8, zIndex: 2,
                  width: 28, height: 28,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "transparent", border: "none", borderRadius: 6,
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
              >
                <ChevronLeft size={14} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
              </button>
              <LeftRail
                articles={articles}
                activeLayers={activeLayers}
                onToggleLayer={(layer: string) => setActiveLayers(prev => {
                  const next = new Set(prev)
                  if (next.has(layer)) next.delete(layer)
                  else next.add(layer)
                  return next
                })}
                sortBy={sortBy}
                onSortChange={setSortBy}
                isLive={isLive}
                feedLoading={feedLoading}
                width={leftRailCollapsed ? 42 : leftWidth}
                viewMode={viewMode}
                onViewChange={setViewMode}
                excludedSources={excludedSources}
                onToggleSource={handleToggleSource}
                onGalleryOpen={() => setGalleryOpen(true)}
                onHotkeysOpen={() => setHotkeysOpen(true)}
                onFocusMode={() => setFocusMode(true)}
                onExportOpen={() => setExportOpen(true)}
                feedHealth={feedHealth}
              />
            </>
          )}
        </div>
        <Divider onMouseDown={e => startResize("left", e)} />
        {viewMode === "config"
          ? <ConfigView excludedSources={excludedSources} onToggleSource={handleToggleSource} feedHealth={feedHealth} articles={articles} />
          : viewMode === "pulse"
          ? <SourcePulseView articles={articles} feedHealth={feedHealth} fetchedAt={fetchedAt} />
          : viewMode === "dispatch"
          ? <DispatchView onDeliberate={handleSynthesisDeliberate} />
          : viewMode === "synthesis"
          ? <SynthesisView articles={articles} onDeliberate={handleSynthesisDeliberate} />
          : viewMode === "audio"
          ? <AudioView onDeliberate={handleSynthesisDeliberate} excludedSources={excludedSources} />
          : feedContent}
        <Divider onMouseDown={e => startResize("right", e)} />
        <div
          style={{
            width: cerebroCollapsed ? 42 : rightWidth,
            flexShrink: 0,
            transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {cerebroCollapsed ? (
            <button
              onClick={() => setCerebroCollapsed(false)}
              title="Expand Cerebro"
              style={{
                width: 42, height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--bg-surface)",
                border: "none", borderLeft: "1px solid var(--border)",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-surface)" }}
            >
              <span style={{ writingMode: "vertical-rl", ...TYPE.sm, color: "var(--accent-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>
                Cerebro
              </span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setCerebroCollapsed(true)}
                title="Collapse Cerebro"
                style={{
                  position: "absolute", top: 0, right: 0, zIndex: 2,
                  width: 40, height: 40,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "transparent", border: "none",
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
              >
                <ChevronRight size={14} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
              </button>
              <Cerebro articles={articles} pendingPrompt={cerebroPrompt} />
            </>
          )}
        </div>
      </div>

      {/* Signal card — intelligence briefing on hover */}
      <SignalCard
        x={signal?.x ?? 0}
        y={signal?.y ?? 0}
        article={signal?.article ?? null}
      />

      {/* Gallery overlay */}
      {galleryOpen && <GalleryOverlay onClose={() => setGalleryOpen(false)} />}

      {/* Hotkeys overlay */}
      {hotkeysOpen && <HotkeysOverlay onClose={() => setHotkeysOpen(false)} />}

      {/* Export panel */}
      {exportOpen && <ExportPanel onClose={() => setExportOpen(false)} signals={signals} articles={articles} />}
    </div>
  )
}
