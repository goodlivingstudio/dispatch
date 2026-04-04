"use client"

import { useState } from "react"
import { Copy, Check, Sun, Moon, Upload, ChevronDown } from "lucide-react"
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

// ─── Dark mode color derivation ─────────────────────────────────────────────

function deriveDarkColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const lum = relativeLuminance(r, g, b)

  let dr: number, dg: number, db: number
  if (lum > 0.7) {
    // Very light → invert to dark
    dr = Math.round(255 - r * 0.7)
    dg = Math.round(255 - g * 0.7)
    db = Math.round(255 - b * 0.7)
  } else if (lum < 0.05) {
    // Very dark → lighten significantly
    dr = Math.min(255, r + 200)
    dg = Math.min(255, g + 200)
    db = Math.min(255, b + 200)
  } else if (lum < 0.2) {
    // Dark → lighten
    dr = Math.min(255, Math.round(r * 1.5 + 40))
    dg = Math.min(255, Math.round(g * 1.5 + 40))
    db = Math.min(255, Math.round(b * 1.5 + 40))
  } else {
    // Mid-range → shift slightly deeper and more saturated
    dr = Math.max(0, Math.round(r * 0.82))
    dg = Math.max(0, Math.round(g * 0.82))
    db = Math.max(0, Math.round(b * 0.82))
  }

  return `#${[dr, dg, db].map(c => Math.min(255, Math.max(0, c)).toString(16).padStart(2, "0")).join("")}`
}

// ─── Palette Card — the hero element ────────────────────────────────────────

function PaletteDisplay({ palette, index }: { palette: GeneratedPalette; index: number }) {
  const [isDark, setIsDark] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [pushed, setPushed] = useState(false)

  const activeColors = isDark ? palette.colors.map(deriveDarkColor) : palette.colors

  const handleCopy = (format: string) => {
    let text = ""
    if (format === "hex") {
      text = activeColors.join(", ")
    } else if (format === "css") {
      text = activeColors.map((c, i) => `--${palette.name.toLowerCase()}-${i + 1}: ${c};`).join("\n")
    } else if (format === "tailwind") {
      const obj: Record<string, string> = {}
      activeColors.forEach((c, i) => { obj[`${(i + 1) * 100}`] = c })
      text = `"${palette.name.toLowerCase()}": ${JSON.stringify(obj, null, 2)}`
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopied(format)
      setMenuOpen(false)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const handlePushToFigma = async () => {
    // Get Figma file key from localStorage or prompt
    const fileKey = localStorage.getItem("dispatch-figma-file-key")
    if (!fileKey) {
      const key = prompt("Enter your Figma file key (from the URL: figma.com/design/FILE_KEY/...)")
      if (!key) return
      localStorage.setItem("dispatch-figma-file-key", key)
    }

    setPushing(true)
    try {
      const colors = palette.colors.map((hex, i) => ({
        light: hex,
        dark: deriveDarkColor(hex),
      }))

      const res = await fetch("/api/figma-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileKey: localStorage.getItem("dispatch-figma-file-key"),
          paletteName: palette.name,
          colors,
        }),
      })

      if (res.ok) {
        setPushed(true)
        setTimeout(() => setPushed(false), 3000)
      } else {
        const err = await res.json()
        console.error("Figma push failed:", err.error)
        // Fallback: copy as JSON
        const figmaJson = JSON.stringify({ palette: palette.name, colors }, null, 2)
        await navigator.clipboard.writeText(figmaJson)
        setPushed(true)
        setTimeout(() => setPushed(false), 3000)
      }
    } catch {
      // Fallback: copy
      const figmaJson = JSON.stringify({ palette: palette.name, colors: palette.colors }, null, 2)
      await navigator.clipboard.writeText(figmaJson)
    }
    setPushing(false)
  }

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
      {/* Color bands — with smooth transition between light/dark */}
      <div style={{ display: "flex", height: 140, transition: "all 0.4s ease" }}>
        {activeColors.map((hex, i) => (
          <div key={i} style={{
            flex: 1,
            background: hex,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "flex-end",
            padding: "0 0 14px",
            transition: "background 0.4s ease",
          }}>
            <span style={{
              ...TYPE.xs, fontFamily: MONO,
              color: textColor(hex),
              letterSpacing: "0.02em",
              transition: "color 0.3s ease",
            }}>
              {hex}
            </span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{
        padding: "12px 18px",
        background: "var(--bg-surface)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...TYPE.sm, color: "var(--text-primary)", fontWeight: 600 }}>
            {palette.name}
          </div>
          {/* Light/Dark toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            title={isDark ? "Switch to light" : "Switch to dark"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26, borderRadius: 6,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-tertiary)", cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
          >
            {isDark ? <Sun size={12} /> : <Moon size={12} />}
          </button>
          {/* Accessibility badge */}
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
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, position: "relative" }}>
          {/* Copy dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 3,
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
              <ChevronDown size={10} />
            </button>
            {menuOpen && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 4px)", right: 0, zIndex: 100,
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "4px 0", minWidth: 160,
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              }}>
                {[
                  { id: "hex", label: "Hex values" },
                  { id: "css", label: "CSS variables" },
                  { id: "tailwind", label: "Tailwind config" },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleCopy(opt.id)}
                    style={{
                      width: "100%", display: "block", padding: "6px 14px",
                      background: "transparent", border: "none", textAlign: "left",
                      ...TYPE.xs, color: "var(--text-secondary)",
                      cursor: "pointer", transition: "background 0.1s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-surface)" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Push to Figma */}
          <button
            onClick={handlePushToFigma}
            disabled={pushing}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 6,
              border: "1px solid var(--border)",
              background: pushed ? "var(--accent-secondary)" : "transparent",
              ...TYPE.xs,
              color: pushed ? "var(--bg-primary)" : pushing ? "var(--text-tertiary)" : "var(--text-tertiary)",
              cursor: pushing ? "default" : "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!pushing && !pushed) e.currentTarget.style.background = "var(--bg-elevated)" }}
            onMouseLeave={e => { if (!pushed) e.currentTarget.style.background = "transparent" }}
          >
            {pushed ? <Check size={11} /> : <Upload size={11} />}
            {pushed ? "Copied for Figma" : pushing ? "..." : "Figma"}
          </button>
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: "0 18px 12px", background: "var(--bg-surface)" }}>
        <div style={{ ...TYPE.xs, color: "var(--text-tertiary)" }}>
          {palette.description}
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
