"use client"

import { useState, useRef } from "react"
import type { Article } from "@/lib/types"
import { timeAgo, LENS_COLOR } from "@/lib/types"

// ─── Signal Card — hover intelligence briefing ──────────────────────────────

export function SignalCard({ x, y, article }: { x: number; y: number; article: Article | null }) {
  if (!article) return null

  const vw          = typeof window !== "undefined" ? window.innerWidth : 1200
  const left        = Math.min(x + 18, vw - 276)
  const top         = Math.max(8, y - 44)
  const lens        = article.signalLens || ""
  const accentColor = LENS_COLOR[lens] || "var(--border)"

  return (
    <div style={{
      position: "fixed",
      left,
      top,
      width: 260,
      pointerEvents: "none",
      zIndex: 1000,
      background: "var(--bg-surface)",
      borderRadius: 3,
      border: "1px solid var(--border)",
      borderLeft: `3px solid ${accentColor}`,
      overflow: "hidden",
    }}>
      {/* Synopsis — AI: what this article is about, mandate-framed */}
      {article.synopsis && (
        <div style={{ padding: article.relevance ? "10px 12px 9px" : "10px 12px" }}>
          <div style={{
            fontSize: 12,
            fontWeight: 400,
            lineHeight: 1.55,
            color: "var(--text-tertiary)",
            letterSpacing: "-0.01em",
          }}>
            {article.synopsis}
          </div>
        </div>
      )}

      {/* Relevance — AI: why it matters to the mandate */}
      {article.relevance && (
        <div style={{
          padding: "9px 12px 11px",
          borderTop: article.synopsis ? "1px solid var(--border)" : "none",
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 400,
            lineHeight: 1.55,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}>
            {article.relevance}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Feed Card ──────────────────────────────────────────────────────────────

export type SignalCallbacks = {
  onSignalEnter: (article: Article, x: number, y: number) => void
  onSignalMove:  (x: number, y: number) => void
  onSignalLeave: () => void
}

export function FeedCard({ article, onSignalEnter, onSignalMove, onSignalLeave }: { article: Article } & SignalCallbacks) {
  const isExternal   = article.url !== "#"
  const hasSignal    = !!(article.synopsis || article.relevance)
  const [hovered, setHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const signalActiveRef = useRef(false)

  const isLeftHalf = (clientX: number) => {
    if (!cardRef.current) return true
    const rect = cardRef.current.getBoundingClientRect()
    return clientX < rect.left + rect.width * 0.5
  }

  const handleMouseEnter = (e: React.MouseEvent) => {
    setHovered(true)
    if (hasSignal && isLeftHalf(e.clientX)) {
      signalActiveRef.current = true
      onSignalEnter(article, e.clientX, e.clientY)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!hasSignal) return
    if (isLeftHalf(e.clientX)) {
      if (!signalActiveRef.current) {
        signalActiveRef.current = true
        onSignalEnter(article, e.clientX, e.clientY)
      } else {
        onSignalMove(e.clientX, e.clientY)
      }
    } else {
      if (signalActiveRef.current) {
        signalActiveRef.current = false
        onSignalLeave()
      }
    }
  }

  const handleMouseLeave = () => {
    setHovered(false)
    signalActiveRef.current = false
    onSignalLeave()
  }

  const content = (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        display: "flex",
        padding: "14px 20px 14px 18px",
        borderBottom: "1px solid var(--border)",
        borderLeft: `2px solid ${article.signalLens === "OPPORTUNITY" ? "var(--accent-secondary)" : "transparent"}`,
        background: hovered ? "var(--bg-surface)" : "transparent",
        cursor: isExternal ? "pointer" : hasSignal ? "default" : "default",
        transition: "background 0.12s",
        gap: 0,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Eyebrow: source · category · time */}
        <div
          style={{
            fontSize: 11,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            color: "var(--text-tertiary)",
            letterSpacing: "-0.01em",
            marginBottom: 6,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {article.source}
          <span style={{ margin: "0 5px", opacity: 0.4 }}>·</span>
          {article.category}
          <span style={{ margin: "0 5px", opacity: 0.4 }}>·</span>
          {timeAgo(article.publishedAt)}
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 550,
            color: hovered ? "var(--text-primary)" : "var(--text-secondary)",
            lineHeight: 1.4,
            letterSpacing: "-0.02em",
            marginBottom: article.summary ? 7 : 0,
          }}
        >
          {article.title}
        </div>

        {/* Summary — static one-liner, always shown, never swaps to relevancy */}
        {article.summary && (
          <div
            style={{
              fontSize: 13,
              color: "var(--text-tertiary)",
              lineHeight: 1.55,
              letterSpacing: "-0.005em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {article.summary}
          </div>
        )}
      </div>
    </div>
  )

  if (isExternal) {
    return (
      <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none" }}>
        {content}
      </a>
    )
  }
  return content
}
