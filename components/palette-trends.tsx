"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { TYPE, MONO, metaStyle } from "@/lib/styles"
import type { ColorMood, ColorSwatch } from "@/lib/gallery"

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrendingPalette {
  colors: string[]
  sources: string[]
  frequency: number
}

interface PaletteTrendsProps {
  snapshot: {
    moods: Record<string, number>
    avgHue: number
    avgSaturation: number
    avgLightness: number
    trendingPalettes: TrendingPalette[]
  } | null
  paletteIntel: {
    trend: string
    moodShifts: { mood: string; direction: "rising" | "falling"; delta: number }[]
    hueShift: number
    saturationShift: number
  } | null
  totalImages: number
  images: { source: string; mood?: ColorMood; palette?: ColorSwatch[] }[]
}

const MOOD_COLORS: Record<string, string> = {
  warm: "#D4A05A",
  cool: "#5A9EB0",
  earth: "#7BAF6A",
  vivid: "#C87A6A",
  neutral: "#888888",
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0]
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(...hexToRgb(hex1))
  const l2 = relativeLuminance(...hexToRgb(hex2))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function contrastLabel(ratio: number): string {
  if (ratio >= 7) return "AAA"
  if (ratio >= 4.5) return "AA"
  if (ratio >= 3) return "AA+"
  return ""
}

// ─── Generate palettes from image data ──────────────────────────────────────

interface GeneratedPalette {
  name: string
  colors: string[]
  description: string
  accessibilityScore: string
}

function generatePalettes(images: PaletteTrendsProps["images"]): GeneratedPalette[] {
  // Collect all colors from all images
  const allColors: { hex: string; hue: number; sat: number; light: number; count: number }[] = []
  const colorMap = new Map<string, { hex: string; hue: number; sat: number; light: number; count: number }>()

  for (const img of images) {
    if (!img.palette) continue
    for (const swatch of img.palette) {
      // Quantize to reduce noise
      const qHue = Math.round(swatch.hue / 15) * 15
      const qSat = Math.round(swatch.saturation * 10) / 10
      const qLight = Math.round(swatch.lightness * 10) / 10
      const key = `${qHue}-${qSat}-${qLight}`
      const existing = colorMap.get(key)
      if (existing) {
        existing.count++
      } else {
        colorMap.set(key, { hex: swatch.hex, hue: qHue, sat: qSat, light: qLight, count: 1 })
      }
    }
  }

  const sorted = [...colorMap.values()].sort((a, b) => b.count - a.count)
  if (sorted.length < 5) return []

  const palettes: GeneratedPalette[] = []

  // Palette 1: Dominant — the 5 most frequent colors
  const dominant = sorted.slice(0, 5).map(c => c.hex)
  palettes.push({
    name: "Dominant",
    colors: dominant,
    description: "The most prevalent colors across the current visual landscape",
    accessibilityScore: `${contrastRatio(dominant[0], dominant[dominant.length - 1]).toFixed(1)}:1`,
  })

  // Palette 2: Warm extraction — warmest hues with variation
  const warmColors = sorted.filter(c => (c.hue <= 50 || c.hue >= 320) && c.sat > 0.15)
  if (warmColors.length >= 3) {
    const warmPalette = warmColors.slice(0, 5).map(c => c.hex)
    palettes.push({
      name: "Warmth",
      colors: warmPalette,
      description: "Golden, amber, and terracotta tones emerging from the feed",
      accessibilityScore: `${contrastRatio(warmPalette[0], warmPalette[warmPalette.length - 1]).toFixed(1)}:1`,
    })
  }

  // Palette 3: Cool extraction
  const coolColors = sorted.filter(c => c.hue >= 180 && c.hue <= 300 && c.sat > 0.15)
  if (coolColors.length >= 3) {
    const coolPalette = coolColors.slice(0, 5).map(c => c.hex)
    palettes.push({
      name: "Stillness",
      colors: coolPalette,
      description: "Blue, teal, and steel tones — the quiet end of the spectrum",
      accessibilityScore: `${contrastRatio(coolPalette[0], coolPalette[coolPalette.length - 1]).toFixed(1)}:1`,
    })
  }

  // Palette 4: High contrast — pair lightest and darkest with mid-tones
  const byLight = [...sorted].sort((a, b) => a.light - b.light)
  const darkest = byLight.slice(0, 2)
  const lightest = byLight.slice(-2)
  const midtone = sorted.find(c => c.sat > 0.3 && c.light > 0.3 && c.light < 0.7)
  if (darkest.length && lightest.length) {
    const contrastPalette = [...darkest.map(c => c.hex), midtone?.hex || sorted[2]?.hex, ...lightest.map(c => c.hex)].filter(Boolean).slice(0, 5)
    palettes.push({
      name: "Contrast",
      colors: contrastPalette,
      description: "Maximum range — dark anchors, bright accents, accessible by nature",
      accessibilityScore: `${contrastRatio(contrastPalette[0], contrastPalette[contrastPalette.length - 1]).toFixed(1)}:1`,
    })
  }

  // Palette 5: Earth — natural, organic hues
  const earthColors = sorted.filter(c => c.hue >= 20 && c.hue <= 160 && c.sat > 0.1 && c.sat < 0.5)
  if (earthColors.length >= 3) {
    const earthPalette = earthColors.slice(0, 5).map(c => c.hex)
    palettes.push({
      name: "Grounded",
      colors: earthPalette,
      description: "Natural materials — wood, stone, foliage, terracotta",
      accessibilityScore: `${contrastRatio(earthPalette[0], earthPalette[earthPalette.length - 1]).toFixed(1)}:1`,
    })
  }

  // Palette 6: Vivid — highest saturation colors
  const vividColors = sorted.filter(c => c.sat > 0.5).sort((a, b) => b.sat - a.sat)
  if (vividColors.length >= 3) {
    const vividPalette = vividColors.slice(0, 5).map(c => c.hex)
    palettes.push({
      name: "Electric",
      colors: vividPalette,
      description: "High saturation signal — the boldest colors in the landscape",
      accessibilityScore: `${contrastRatio(vividPalette[0], vividPalette[vividPalette.length - 1]).toFixed(1)}:1`,
    })
  }

  return palettes
}

// ─── Palette Card — the hero element ────────────────────────────────────────

function PaletteDisplay({ palette, index }: { palette: GeneratedPalette; index: number }) {
  const [copied, setCopied] = useState(false)

  const copyPalette = () => {
    const text = palette.colors.join(", ")
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Find best text color for each swatch
  const textColor = (hex: string) => {
    const [r, g, b] = hexToRgb(hex)
    const lum = relativeLuminance(r, g, b)
    return lum > 0.4 ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.65)"
  }

  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      animation: `signal-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 100}ms both`,
    }}>
      {/* Color bands — immersive, the colors are everything */}
      <div style={{ display: "flex", height: 140 }}>
        {palette.colors.map((hex, i) => (
          <div key={i} style={{
            flex: 1,
            background: hex,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "flex-end",
            padding: "0 0 14px",
            transition: "flex 0.3s ease",
          }}>
            <span style={{
              ...TYPE.xs, fontFamily: MONO,
              color: textColor(hex),
              letterSpacing: "0.02em",
            }}>
              {hex}
            </span>
          </div>
        ))}
      </div>
      {/* Details */}
      <div style={{
        padding: "14px 18px",
        background: "var(--bg-surface)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ ...TYPE.sm, color: "var(--text-primary)", fontWeight: 600 }}>
            {palette.name}
          </div>
          <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", marginTop: 2 }}>
            {palette.description}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {palette.accessibilityScore && (() => {
            const ratio = parseFloat(palette.accessibilityScore)
            const label = contrastLabel(ratio)
            return label ? (
              <span style={{
                ...TYPE.xs, fontFamily: MONO, padding: "2px 8px", borderRadius: 6,
                background: label === "AAA" ? "rgba(123, 175, 106, 0.2)" : label === "AA" ? "rgba(212, 160, 90, 0.2)" : "rgba(136,136,136,0.15)",
                color: label === "AAA" ? "#7BAF6A" : label === "AA" ? "#D4A05A" : "var(--text-tertiary)",
                fontWeight: 600,
              }}>
                {label}
              </span>
            ) : null
          })()}
          <button
            onClick={copyPalette}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 6,
              border: "1px solid var(--border)", background: "transparent",
              ...TYPE.xs, color: copied ? "var(--accent-secondary)" : "var(--text-tertiary)",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Mood Spectrum ──────────────────────────────────────────────────────────

function MoodSpectrum({ moods, total }: { moods: Record<string, number>; total: number }) {
  if (total === 0) return null
  const entries = Object.entries(moods).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div style={{ display: "flex", height: 40, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
        {entries.map(([mood, count]) => {
          const pct = Math.round((count / total) * 100)
          return (
            <div key={mood} style={{
              width: `${pct}%`,
              background: MOOD_COLORS[mood] || "var(--text-tertiary)",
              transition: "width 0.6s",
              display: "flex", alignItems: "center", justifyContent: "center",
              minWidth: pct > 4 ? 40 : 0,
            }}>
              {pct > 8 && (
                <span style={{
                  ...TYPE.xs, color: "rgba(0,0,0,0.4)", fontWeight: 700,
                  textTransform: "uppercase",
                }}>
                  {pct}%
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {entries.map(([mood, count]) => (
          <div key={mood} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: MOOD_COLORS[mood] || "var(--text-tertiary)" }} />
            <span style={{ ...TYPE.sm, color: "var(--text-secondary)", textTransform: "capitalize" }}>{mood}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Palette Trends Panel ───────────────────────────────────────────────────

export function PaletteTrends({ snapshot, paletteIntel, totalImages, images }: PaletteTrendsProps) {
  const palettes = generatePalettes(images)

  if (!snapshot && palettes.length === 0) {
    return (
      <div style={{ padding: "48px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 24, color: "var(--text-primary)", marginBottom: 12 }}>
          Analyzing the visual landscape
        </div>
        <div style={{ ...TYPE.body, color: "var(--text-tertiary)", maxWidth: 400, margin: "0 auto", lineHeight: 1.7 }}>
          Palettes will emerge as gallery images are classified. Check back after the next refresh cycle.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "24px 32px 48px" }}>

      {/* ── Shift Indicators ── */}
      {paletteIntel && paletteIntel.moodShifts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, animation: "signal-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) 100ms both" }}>
          {paletteIntel.moodShifts.map(shift => (
            <div key={shift.mood} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--bg-surface)", borderRadius: 9999, padding: "6px 14px",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: MOOD_COLORS[shift.mood] || "var(--text-tertiary)" }} />
              <span style={{ ...TYPE.sm, color: "var(--text-secondary)", textTransform: "capitalize" }}>{shift.mood}</span>
              <span style={{
                ...TYPE.sm, fontFamily: MONO, fontWeight: 600,
                color: shift.direction === "rising" ? "var(--live)" : "#ef4444",
              }}>
                {shift.direction === "rising" ? "+" : "-"}{shift.delta}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Generated Palettes — the main event ── */}
      {palettes.length > 0 && (
        <div>
          <div style={{ ...TYPE.xs, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Palettes from the Zeitgeist
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {palettes.map((p, i) => (
              <PaletteDisplay key={p.name} palette={p} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
