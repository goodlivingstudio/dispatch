"use client"

import { useState, useEffect, useCallback } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { TYPE, MONO } from "@/lib/styles"
import type { GalleryImage } from "@/lib/gallery"

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

      <img
        src={image.url}
        alt={image.title || ""}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: "90vw", maxHeight: "85vh",
          objectFit: "contain", cursor: "default",
          borderRadius: 4,
        }}
      />

      {/* Caption */}
      <div style={{
        position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 12,
        ...TYPE.sm, color: "rgba(255,255,255,0.5)",
      }}>
        {image.title && <span>{image.title}</span>}
        {image.title && image.source && <span style={{ opacity: 0.4 }}>·</span>}
        <span style={{ fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.04em" }}>{image.source}</span>
      </div>
    </div>
  )
}

// ─── Gallery Overlay ────────────────────────────────────────────────────────

export function GalleryOverlay({ onClose }: { onClose: () => void }) {
  const [allImages, setAllImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [activeSource, setActiveSource] = useState<string | null>(null) // null = show all

  useEffect(() => {
    fetch("/api/gallery")
      .then(r => r.json())
      .then(data => { setAllImages(data.images || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Derive unique sources for filter chips
  const sources = [...new Set(allImages.map(img => img.source))].sort()
  const images = activeSource ? allImages.filter(img => img.source === activeSource) : allImages

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
        flexShrink: 0, height: 52, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 24px",
        borderBottom: "1px solid var(--border)",
      }}>
        <span style={{
          ...TYPE.sm, fontFamily: MONO,
          color: "var(--accent-muted)", textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}>
          Gallery
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Source filter chips */}
          {sources.length > 1 && (
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => setActiveSource(null)}
                style={{
                  ...TYPE.sm, padding: "3px 10px", borderRadius: 9999, border: "none",
                  background: activeSource === null ? "var(--accent-primary)" : "transparent",
                  color: activeSource === null ? "var(--accent-secondary)" : "var(--text-tertiary)",
                  fontWeight: activeSource === null ? 600 : 400,
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (activeSource !== null) e.currentTarget.style.background = "var(--bg-elevated)" }}
                onMouseLeave={e => { if (activeSource !== null) e.currentTarget.style.background = "transparent" }}
              >
                All
              </button>
              {sources.map(src => {
                const isActive = activeSource === src
                const count = allImages.filter(img => img.source === src).length
                return (
                  <button
                    key={src}
                    onClick={() => setActiveSource(isActive ? null : src)}
                    style={{
                      ...TYPE.sm, padding: "3px 10px", borderRadius: 9999, border: "none",
                      background: isActive ? "var(--accent-primary)" : "transparent",
                      color: isActive ? "var(--accent-secondary)" : "var(--text-tertiary)",
                      fontWeight: isActive ? 600 : 400,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg-elevated)" }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? "var(--accent-primary)" : "transparent" }}
                  >
                    {src} ({count})
                  </button>
                )
              })}
            </div>
          )}
          <span style={{ ...TYPE.sm, color: "var(--text-tertiary)" }}>
            {images.length}{activeSource ? `/${allImages.length}` : ""} images
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

      {/* Masonry grid — true vertical packing, no row gaps */}
      <div style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        padding: 32,
        columns: "3 240px",
        columnGap: 14,
      }}>
        {loading ? (
          <div style={{ ...TYPE.body, color: "var(--text-tertiary)", padding: 32 }}>
            <span className="loading-pulse">Loading gallery...</span>
          </div>
        ) : images.length === 0 ? (
          <div style={{ ...TYPE.body, color: "var(--text-tertiary)", padding: 32 }}>
            No images available.
          </div>
        ) : (
          images.map((img, i) => (
            <div
              key={img.id}
              onClick={() => setLightboxIdx(i)}
              style={{
                breakInside: "avoid",
                marginBottom: 14,
                borderRadius: 8,
                overflow: "hidden",
                cursor: "zoom-in",
                transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                animation: `signal-reveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(i * 30, 600)}ms both`,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.015)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)" }}
            >
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
                  borderRadius: 8,
                }}
              />
            </div>
          ))
        )}
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
