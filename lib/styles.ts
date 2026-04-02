// ─── Shared style constants ─────────────────────────────────────────────────
// Extracted from repeated inline patterns across components.

import type { CSSProperties } from "react"

/** Monospace font stack — used across all signal/synthesis surfaces */
export const MONO = "var(--font-geist-mono), monospace"

/** Common label style: 11px sans, uppercase, accent-secondary */
export const labelStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--accent-secondary)",
  textTransform: "uppercase",
  fontWeight: 500,
}

/** Common body text: 12px sans, text-secondary, 1.6 line height */
export const bodyStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--text-secondary)",
  lineHeight: 1.6,
}

/** Mono text at 12.5px — Cerebro message style (machine voice) */
export const cerebroTextStyle: CSSProperties = {
  fontSize: 12.5,
  fontFamily: MONO,
  color: "var(--text-secondary)",
  lineHeight: 1.75,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
}

/** Small tertiary text: 10px sans */
export const tertiaryStyle: CSSProperties = {
  fontSize: 10,
  color: "var(--text-tertiary)",
}
