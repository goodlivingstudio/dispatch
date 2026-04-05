"use client"

import { useState, useRef } from "react"
import { createPortal } from "react-dom"
import { TYPE, labelStyle } from "@/lib/styles"
import type { CitationSource } from "@/lib/types"
export type { CitationSource }

// ─── Citation chip — fixed popover with source details ──────────────────────

function CitationChip({ num, src }: { num: string; src: CitationSource }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const chipRef = useRef<HTMLSpanElement>(null)

  const handleEnter = () => {
    if (chipRef.current) {
      const rect = chipRef.current.getBoundingClientRect()
      setPos({ x: rect.left + rect.width / 2, y: rect.top })
    }
    setShow(true)
  }

  // Derive display name: use source if available, otherwise extract hostname
  const displayName = src.source || (() => {
    try { return new URL(src.url).hostname.replace("www.", "") } catch { return "Source" }
  })()

  return (
    <>
      <span
        ref={chipRef}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        onClick={e => {
          e.stopPropagation()
          window.open(src.url, "_blank", "noopener,noreferrer")
        }}
        style={{
          color: "var(--accent-secondary)",
          cursor: "pointer",
          transition: "color 0.15s",
        }}
      >
        {num}
      </span>
      {show && createPortal(
        <div
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          onClick={e => e.stopPropagation()}
          style={{
            position: "fixed",
            left: Math.min(pos.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 240),
            top: Math.max(8, pos.y - 8),
            transform: "translateY(-100%)",
            width: 220,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 12px",
            zIndex: 1000,
            animation: "status-fade 0.15s ease both",
          }}
        >
          <div style={{
            ...labelStyle, marginBottom: 4,
          }}>
            {displayName}
          </div>
          <a
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              ...TYPE.sm, color: "var(--text-primary)", lineHeight: 1.5,
              textDecoration: "none", display: "block",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--accent-secondary)" }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-primary)" }}
          >
            {src.title}
          </a>
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Citation renderer — parses [1][2] into hoverable chips ─────────────────

export function renderCitedBody(body: string, sources?: CitationSource[]) {
  if (!sources || sources.length === 0) return body
  const parts = body.split(/(\[\d+\])/)
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/)
    if (!match) return part
    const idx = parseInt(match[1], 10) - 1
    const src = sources[idx]
    if (!src) return part
    return <CitationChip key={i} num={part} src={src} />
  })
}
