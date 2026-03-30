"use client"

import { useState } from "react"

export function Divider({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 9,
        flexShrink: 0,
        position: "relative",
        cursor: "col-resize",
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 4,
          width: 1,
          background: "var(--text-tertiary)",
          opacity: hovered ? 0.45 : 0.2,
          transition: "opacity 0.15s",
        }}
      />
    </div>
  )
}
