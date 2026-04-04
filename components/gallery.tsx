"use client"

import { useState, useEffect, useCallback } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { TYPE, MONO } from "@/lib/styles"
import type { GalleryImage, ColorMood } from "@/lib/gallery"

// ─── Color Mood Display ─────────────────────────────────────────────────────

const MOOD_LABELS: Record<ColorMood, string> = {
  warm: "Warm",
  cool: "Cool",
  earth: "Earth",
  vivid: "Vivid",
  neutral: "Neutral",
}

const MOOD_COLORS: Record<ColorMood, string> = {
  warm: "#D4A05A",
  cool: "#5A9EB0",
  earth: "#7BAF6A",
  vivid: "#C87A6A",
  neutral: "#888888",
}

// ─── Lightbox ───────────────────────────────────────────────────────────────

function Lightbox({ image, onClose, onPrev, onNext }: {
  image: GalleryImage
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") onPrev()
      if (e.key === "ArrowRight") onNext()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose, onPrev, onNext])

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.92)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "zoom-out",
      }}
    >
      <button
        onClick={e => { e.stopPropagation(); onClose() }}
        style={{
          position: "absolute", top: 20, right: 20, zIndex: 2,
          background: "transparent", border: "none",
          color: "rgba(255,255,255,0.6)", cursor: "pointer",
          transition: "color 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,1)" }}
        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.6)" }}
      >
        <X size={24} strokeWidth={1.5} />
      </button>

      <button
        onClick={e => { e.stopPropagation(); onPrev() }}
        style={{
          position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)",
          background: "transparent", border: "none",
          color: "rgba(255,255,255,0.4)", cursor: "pointer",
          transition: "color 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.8)" }}
        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)" }}
      >
        <ChevronLeft size={32} strokeWidth={1} />
      </button>

      <button
        onClick={e => { e.stopPropagation(); onNext() }}
        style={{
          position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
          background: "transparent", border: "none",
          color: "rgba(255,255,255,0.4)", cursor: "pointer",
          transition: "color 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.8)" }}
        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)" }}
      >
        <ChevronRight size={32} strokeWidth={1} />
      </button>

      {/* Media — image or video */}
      {image.mediaType === "video" && image.videoUrl ? (
        <video
          src={image.videoUrl}
          autoPlay
          muted
          loop
          playsInline
          controls
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: "90vw", maxHeight: "80vh",
            objectFit: "contain", cursor: "default",
            borderRadius: 4,
          }}
        />
      ) : (
        <img
          src={image.url}
          alt=""
          referrerPolicy="no-referrer"
          onClick={e => e.stopPropagation()}
          onError={e => { e.currentTarget.style.display = "none" }}
          style={{
            maxWidth: "90vw", maxHeight: "80vh",
            objectFit: "contain", cursor: "default",
            borderRadius: 4,
          }}
        />
      )}

      {/* Caption — entire block is clickable to source */}
      <div style={{
        position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
        maxWidth: "80vw", textAlign: "center",
      }}>
        {image.linkUrl ? (
          <a
            href={image.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              ...TYPE.sm, color: "rgba(255,255,255,0.5)",
              textDecoration: "none", transition: "color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; e.currentTarget.style.textDecoration = "underline" }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.textDecoration = "none" }}
          >
            {image.title && <span>{image.title}</span>}
            {image.title && image.source && <span style={{ opacity: 0.4 }}>·</span>}
            <span style={{ fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.04em" }}>{image.source}</span>
          </a>
        ) : (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            ...TYPE.sm, color: "rgba(255,255,255,0.5)",
          }}>
            {image.title && <span>{image.title}</span>}
            {image.title && image.source && <span style={{ opacity: 0.4 }}>·</span>}
            <span style={{ fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.04em" }}>{image.source}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Gallery Overlay ────────────────────────────────────────────────────────

export function GalleryOverlay({ onClose }: { onClose: () => void }) {
  const [allImages, setAllImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [activeMood, setActiveMood] = useState<ColorMood | null>(null)
  const [paletteIntel, setPaletteIntel] = useState<{
    trend: string
    moodShifts: { mood: string; direction: "rising" | "falling"; delta: number }[]
    hueShift: number
    saturationShift: number
  } | null>(null)
  const [snapshot, setSnapshot] = useState<{ moods: Record<string, number>; avgHue: number; avgSaturation: number; avgLightness: number } | null>(null)

  useEffect(() => {
    fetch("/api/gallery")
      .then(r => r.json())
      .then(data => {
        setAllImages(data.images || [])
        if (data.paletteIntel) setPaletteIntel(data.paletteIntel)
        if (data.snapshot) setSnapshot(data.snapshot)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Mood counts from server-classified data
  const moodCounts: Record<ColorMood, number> = { warm: 0, cool: 0, earth: 0, vivid: 0, neutral: 0 }
  for (const img of allImages) { if (img.mood) moodCounts[img.mood]++ }
  const classifiedCount = allImages.filter(img => img.mood).length

  // Apply mood filter + sort by hue for tonal coherence (like Ricardo's galleries)
  const images = activeMood
    ? allImages
        .filter(img => img.mood === activeMood)
        .sort((a, b) => (a.hue ?? 0) - (b.hue ?? 0))
    : allImages

  // Close on Escape (when lightbox isn't open)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxIdx === null) onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose, lightboxIdx])

  const handlePrev = useCallback(() => {
    setLightboxIdx(i => i !== null ? (i - 1 + images.length) % images.length : null)
  }, [images.length])

  const handleNext = useCallback(() => {
    setLightboxIdx(i => i !== null ? (i + 1) % images.length : null)
  }, [images.length])

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 5000,
      background: "var(--bg-primary)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, display: "flex", flexDirection: "column",
        borderBottom: "1px solid var(--border)",
      }}>
        {/* Top row: title + mood filters + count + close */}
        <div style={{
          height: 52, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 24px",
        }}>
          <span style={{
            ...TYPE.sm, fontFamily: MONO,
            color: "var(--accent-muted)", textTransform: "uppercase",
            letterSpacing: "0.08em", flexShrink: 0,
          }}>
            Gallery
          </span>

          {/* Color mood filters */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, justifyContent: "center" }}>
            <button
              onClick={() => setActiveMood(null)}
              style={{
                ...TYPE.sm, padding: "3px 10px", borderRadius: 9999, border: "none",
                background: activeMood === null ? "var(--accent-primary)" : "transparent",
                color: activeMood === null ? "var(--accent-secondary)" : "var(--text-tertiary)",
                fontWeight: activeMood === null ? 600 : 400,
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (activeMood !== null) e.currentTarget.style.background = "var(--bg-elevated)" }}
              onMouseLeave={e => { if (activeMood !== null) e.currentTarget.style.background = "transparent" }}
            >
              All
            </button>
            {(Object.keys(MOOD_LABELS) as ColorMood[]).map(mood => {
              const isActive = activeMood === mood
              const count = moodCounts[mood]
              if (count === 0 && classifiedCount > 10) return null
              return (
                <button
                  key={mood}
                  onClick={() => setActiveMood(isActive ? null : mood)}
                  style={{
                    ...TYPE.sm, padding: "3px 10px", borderRadius: 9999, border: "none",
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: isActive ? "var(--accent-primary)" : "transparent",
                    color: isActive ? "var(--accent-secondary)" : "var(--text-tertiary)",
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg-elevated)" }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? "var(--accent-primary)" : "transparent" }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: MOOD_COLORS[mood], flexShrink: 0 }} />
                  {MOOD_LABELS[mood]}
                  {count > 0 && <span style={{ opacity: 0.5 }}>{count}</span>}
                </button>
              )
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ ...TYPE.sm, color: "var(--text-tertiary)" }}>
              {images.length} images
            </span>
            <button
              onClick={onClose}
              style={{
                background: "transparent", border: "none",
                color: "var(--text-tertiary)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)" }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)" }}
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

      </div>

      {/* ── Palette Intelligence — trend annotation ── */}
      {(paletteIntel || snapshot) && !loading && (
        <div style={{
          padding: "12px 32px 0",
          display: "flex", alignItems: "center", gap: 16,
          flexShrink: 0,
        }}>
          {/* Hue indicator — a subtle color swatch showing today's average */}
          {snapshot && (
            <div style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              background: `hsl(${snapshot.avgHue}, ${Math.round(snapshot.avgSaturation * 100)}%, ${Math.round(snapshot.avgLightness * 100)}%)`,
              border: "1px solid rgba(255,255,255,0.1)",
            }} />
          )}

          {/* Trend text */}
          <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
            {paletteIntel ? (
              <>
                {paletteIntel.moodShifts.length > 0 ? (
                  paletteIntel.moodShifts.map((shift, i) => (
                    <span key={shift.mood}>
                      {i > 0 && <span style={{ opacity: 0.4 }}> · </span>}
                      <span style={{ color: MOOD_COLORS[shift.mood as ColorMood] || "var(--text-tertiary)" }}>
                        {shift.mood}
                      </span>
                      <span style={{ color: shift.direction === "rising" ? "var(--live)" : "var(--text-tertiary)" }}>
                        {" "}{shift.direction === "rising" ? "↑" : "↓"}{shift.delta}%
                      </span>
                    </span>
                  ))
                ) : (
                  <span>Palette stable — no significant shifts from weekly average</span>
                )}
                {paletteIntel.hueShift !== 0 && (
                  <span style={{ opacity: 0.5 }}>
                    {" · "}hue {paletteIntel.hueShift > 0 ? "+" : ""}{paletteIntel.hueShift}°
                  </span>
                )}
              </>
            ) : snapshot ? (
              <span>
                avg hue {snapshot.avgHue}° · sat {Math.round(snapshot.avgSaturation * 100)}% · light {Math.round(snapshot.avgLightness * 100)}%
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* Masonry grid — manual 3-column distribution, vertical scroll */}
      <div style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        padding: 32,
      }}>
        {loading ? (
          <div style={{ ...TYPE.body, color: "var(--text-tertiary)", padding: 32 }}>
            <span className="loading-pulse">Loading gallery...</span>
          </div>
        ) : images.length === 0 ? (
          <div style={{ ...TYPE.body, color: "var(--text-tertiary)", padding: 32 }}>
            No images available.
          </div>
        ) : (() => {
          // Build index lookup and distribute round-robin into 3 columns
          const idxMap = new Map<string, number>()
          images.forEach((img, i) => idxMap.set(img.id, i))
          const cols: typeof images[] = [[], [], []]
          images.forEach((img, i) => cols[i % 3].push(img))

          return (
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              {cols.map((col, colIdx) => (
                <div key={colIdx} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
                  {col.map((img) => {
                    const globalIdx = idxMap.get(img.id) ?? 0
                    return (
                      <div
                        key={img.id}
                        onClick={() => setLightboxIdx(globalIdx)}
                        style={{
                          borderRadius: 8,
                          overflow: "hidden",
                          cursor: "zoom-in",
                          transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                          animation: `signal-reveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(globalIdx * 20, 600)}ms both`,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.015)" }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)" }}
                      >
                        {img.mediaType === "video" && img.videoUrl ? (
                          <video
                            src={img.videoUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = "none" }}
                            style={{
                              width: "100%",
                              height: "auto",
                              display: "block",
                            }}
                          />
                        ) : (
                          <img
                            src={img.url}
                            alt={img.title || ""}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = "none" }}
                            style={{
                              width: "100%",
                              height: "auto",
                              display: "block",
                            }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && images[lightboxIdx] && (
        <Lightbox
          image={images[lightboxIdx]}
          onClose={() => setLightboxIdx(null)}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </div>
  )
}
