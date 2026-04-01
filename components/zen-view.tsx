"use client"

import { useState, useEffect } from "react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ZenBlock {
  id: string
  imageUrl: string
  title: string
  source?: string
  sourceUrl?: string
}

// ─── Zen View — Masonry Grid ─────────────────────────────────────────────────
// Ambient creative nourishment. A curated visual stream.
// Inspired by searchsystem.co — masonry layout, minimal text, gallery aesthetic.

export function ZenView() {
  const [blocks, setBlocks] = useState<ZenBlock[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/zen")
      .then(r => r.json())
      .then(data => {
        setBlocks(data.blocks || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
        <div className="loading-pulse" style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          Loading visual stream...
        </div>
      </main>
    )
  }

  if (blocks.length === 0) {
    return (
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
        <div style={{ textAlign: "center", maxWidth: 360, padding: "0 20px" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
            Zen
          </div>
          <div style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
            Ambient creative nourishment. Add images to your Are.na channel to populate this view.
          </div>
          <a
            href="https://www.are.na/jeremy-grant/dispatch-zen"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block", marginTop: 16, fontSize: 12,
              color: "var(--accent-secondary)", textDecoration: "none",
            }}
          >
            Open Are.na channel →
          </a>
        </div>
      </main>
    )
  }

  return (
    <main style={{ flex: 1, overflowY: "auto", background: "var(--bg-primary)" }}>
      {/* Header */}
      <div style={{ padding: "24px 24px 16px" }}>
        <div style={{
          fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase",
          fontWeight: 600,
        }}>
          Zen
        </div>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
          {blocks.length} images
        </div>
      </div>

      {/* Masonry grid */}
      <div
        style={{
          columnCount: 3,
          columnGap: 8,
          padding: "0 24px 24px",
        }}
      >
        {blocks.map(block => (
          <ZenCard key={block.id} block={block} />
        ))}
      </div>

    </main>
  )
}

// ─── Zen Card — single image in masonry grid ─────────────────────────────────

function ZenCard({ block }: { block: ZenBlock }) {
  const [hovered, setHovered] = useState(false)
  const href = block.sourceUrl || block.imageUrl

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        marginBottom: 8,
        breakInside: "avoid",
        borderRadius: 8,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: hovered ? "scale(1.02)" : "scale(1)",
      }}
    >
      <img
        src={block.imageUrl}
        alt={block.title || ""}
        loading="lazy"
        style={{
          width: "100%",
          display: "block",
          borderRadius: 8,
        }}
      />
      {/* Title overlay on hover */}
      {block.title && (
        <div
          style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            padding: "24px 8px 8px",
            background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.2s",
          }}
        >
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>
            {block.title}
          </div>
        </div>
      )}
    </a>
  )
}
