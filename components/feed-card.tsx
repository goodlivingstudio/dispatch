"use client"

import { useState, useRef, memo } from "react"
import type { Article } from "@/lib/types"
import { timeAgo, LENS_COLOR } from "@/lib/types"
import { TYPE, labelStyle, bodyStyle, metaStyle } from "@/lib/styles"

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
      background: "var(--bg-elevated)",
      borderRadius: 8,
      border: "1px solid var(--border)",
      overflow: "hidden",
    }}>
      {/* Synopsis — Cerebro: what this article is about */}
      {article.synopsis && (
        <div style={{ padding: "12px 14px", paddingBottom: article.relevance ? 8 : 12 }}>
          <div style={{
            ...labelStyle,
            marginBottom: 6,
          }}>
            Synopsis
          </div>
          <div style={{
            ...bodyStyle,
            lineHeight: 1.55,
          }}>
            {article.synopsis}
          </div>
        </div>
      )}

      {/* Relevance — Cerebro: why it matters */}
      {article.relevance && (
        <div style={{
          padding: "12px 14px",
          borderTop: article.synopsis ? "1px solid var(--border)" : "none",
        }}>
          <div style={{
            ...labelStyle,
            marginBottom: 6,
          }}>
            Relevance
          </div>
          <div style={{
            ...TYPE.body,
            lineHeight: 1.55, color: "var(--text-primary)",
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

export const FeedCard = memo(function FeedCard({ article, index, onSignalEnter, onSignalMove, onSignalLeave }: { article: Article; index?: number } & SignalCallbacks) {
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
        padding: "16px 20px",
        borderRadius: 12,
        borderLeft: `2px solid ${
          article.signalLens === "OPPORTUNITY" ? "var(--accent-secondary)" : "transparent"
        }`,
        background: hovered ? "var(--bg-elevated)" : "var(--bg-surface)",
        cursor: isExternal ? "pointer" : "default",
        transition: "background 0.15s",
        animation: index !== undefined ? `signal-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(index * 50, 500)}ms both` : undefined,
        gap: 0,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Eyebrow */}
        <div
          style={{
            ...metaStyle,
            marginBottom: 6,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "opacity 0.3s ease",
          }}
        >
          {article.source}
          <span style={{ opacity: 0.4 }}>&middot;</span>
          {article.category}
          <span style={{ opacity: 0.4 }}>&middot;</span>
          {timeAgo(article.publishedAt)}
        </div>

        {/* Headline */}
        <div
          style={{
            ...TYPE.heading,
            color: hovered ? "var(--text-primary)" : "var(--text-secondary)",
            marginBottom: article.summary ? 6 : 0,
          }}
        >
          {article.title}
        </div>

        {/* Summary */}
        {article.summary && (
          <div
            style={{
              ...TYPE.body,
              color: "var(--text-tertiary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              transition: "opacity 0.3s ease",
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
})
