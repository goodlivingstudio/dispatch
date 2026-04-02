// ─── Shared style constants ─────────────────────────────────────────────────
// Extracted from repeated inline patterns across components.

import type { CSSProperties } from "react"

/** Monospace font stack — used across all signal/synthesis surfaces */
export const MONO = "var(--font-geist-mono), monospace"

/** Common label style: 11px mono, uppercase, accent-secondary */
export const labelStyle: CSSProperties = {
  fontSize: 11,
  fontFamily: MONO,
  color: "var(--accent-secondary)",
  textTransform: "uppercase",
}

/** Common body text: 12px mono, text-secondary, 1.6 line height */
export const bodyStyle: CSSProperties = {
  fontSize: 12,
  fontFamily: MONO,
  color: "var(--text-secondary)",
  lineHeight: 1.6,
}

/** Mono text at 12.5px — Cerebro message style */
export const cerebroTextStyle: CSSProperties = {
  fontSize: 12.5,
  fontFamily: MONO,
  color: "var(--text-secondary)",
  lineHeight: 1.75,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
}

/** Small tertiary text: 10px mono */
export const tertiaryStyle: CSSProperties = {
  fontSize: 10,
  fontFamily: MONO,
  color: "var(--text-tertiary)",
}
