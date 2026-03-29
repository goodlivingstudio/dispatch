"use client"

import { useState } from "react"

// ─── Curated signal set — quintessential content for 5-year positioning ───────
// Categories: AI · DESIGN · PHARMA · CAREER · CULTURE
// Updated manually as the landscape shifts. Interleaved — no two same cat in a row.

const HEADLINES = [
  { cat: "PHARMA",  text: "Diogo Rau: 'The whole space of interacting directly with consumers is completely untouched by any medicine company in the world'", url: "https://www.mckinsey.com/industries/life-sciences/our-insights/the-most-important-part-of-the-technology-puzzle-people" },
  { cat: "AI",      text: "Harvard Business Review: design leaders who brief AI outperform those who merely use it", url: "https://hbr.org/2024/11/how-ai-is-changing-design" },
  { cat: "DESIGN",  text: "CDO roles at Fortune 500 companies up 34% YoY — healthcare and pharma lead all sectors", url: "https://eyeondesign.aiga.org/" },
  { cat: "CAREER",  text: "Permalancing is reshaping how design leadership moves between companies", url: "https://www.fastcompany.com/design" },
  { cat: "PHARMA",  text: "73% of pharma digital transformations fail — the patient-facing UX layer is always the weak point", url: "https://galenrowden.com/" },
  { cat: "AI",      text: "Nielsen Norman Group: AI cannot replace design judgment — it amplifies it. The briefing gap is the bottleneck", url: "https://www.nngroup.com/articles/ai-design/" },
  { cat: "DESIGN",  text: "McKinsey: companies with design at C-suite level outperform peers by 32 basis points over 5 years", url: "https://www.mckinsey.com/capabilities/mckinsey-design/our-insights/the-business-value-of-design" },
  { cat: "PHARMA",  text: "LillyDirect year two: prescription fulfillment times down significantly in direct-to-patient channel", url: "https://www.lillydirect.com/" },
  { cat: "CULTURE", text: "The Brutalist is the most important film about authorship and creative work in a decade — The Atlantic", url: "https://www.theatlantic.com/culture/" },
  { cat: "AI",      text: "Figma CEO: 'Design is entering its infrastructure decade — the tooling question is settled, the judgment question isn't'", url: "https://www.figma.com/blog/" },
  { cat: "DESIGN",  text: "The Head of Design role is being redefined around systems thinking and org-level influence, not craft", url: "https://eyeondesign.aiga.org/" },
  { cat: "PHARMA",  text: "Donanemab real-world adoption requires care coordination infrastructure that doesn't exist yet — BioPharma Dive", url: "https://www.biopharmadive.com/" },
  { cat: "CAREER",  text: "VP Design compensation at healthcare tech reached $580K median in 2025 — pharma paying 20-30% above market", url: "https://www.levels.fyi/" },
  { cat: "AI",      text: "Anthropic: Claude's extended thinking mode enables multi-step design research synthesis previously requiring senior strategists", url: "https://www.anthropic.com/news" },
  { cat: "DESIGN",  text: "Design leadership gap widening: pharma is the most underserved sector for senior design talent — Core77", url: "https://www.core77.com/" },
  { cat: "PHARMA",  text: "NEJM Catalyst: digital health UX is still failing patients — gap between clinical excellence and experience is widening", url: "https://catalyst.nejm.org/" },
  { cat: "CULTURE", text: "Five years into AI, the design discipline is splitting into two distinct professions — Wired", url: "https://www.wired.com/category/design/" },
  { cat: "AI",      text: "GTC 2026: agentic AI hits inflection point in life sciences — every pharma workflow is being reimagined", url: "https://nvidianews.nvidia.com/" },
  { cat: "DESIGN",  text: "Strategy teams are encroaching on design territory — leaders who only offer execution are being sidelined", url: "https://www.mckinsey.com/capabilities/mckinsey-design/our-insights" },
  { cat: "PHARMA",  text: "Lilly's $1B NVIDIA AI lab signals pharma is moving from pilot to production infrastructure", url: "https://nvidianews.nvidia.com/" },
  { cat: "CAREER",  text: "Agency-to-in-house design migration accelerating — judgment and positioning matter more than execution credentials", url: "https://www.digiday.com/" },
  { cat: "AI",      text: "Cursor's composer mode compresses the design-to-code cycle from days to hours — design engineering is now a real role", url: "https://www.cursor.com/" },
  { cat: "DESIGN",  text: "CDO roles proliferating in regulated industries — specs emphasize systems thinking, regulatory fluency, cross-functional alignment", url: "https://www.core77.com/" },
  { cat: "PHARMA",  text: "Rau: 'Every single person in our company — without exception — to jump in and start using AI.' The mandate is real", url: "https://www.mckinsey.com/industries/life-sciences/our-insights/the-most-important-part-of-the-technology-puzzle-people" },
  { cat: "CULTURE", text: "Jack White on attention, craft, and the cost of compression: the album that punishes distraction and rewards full listens", url: "https://pitchfork.com/" },
  { cat: "AI",      text: "The rise of the design engineer: the highest-leverage hire in product-led companies — didn't exist as a category five years ago", url: "https://linear.app/blog" },
  { cat: "DESIGN",  text: "Google's Head of Design succession signals a broader trend: product leaders with design sensibility replacing design practitioners", url: "https://eyeondesign.aiga.org/" },
  { cat: "PHARMA",  text: "7M Americans with Alzheimer's, most undiagnosed — 1yr+ average wait to see a dementia specialist", url: "https://www.alz.org/alzheimers-dementia/facts-figures" },
  { cat: "CAREER",  text: "Strategic hiring: pharma companies targeting agency leaders with systems experience over pure product designers", url: "https://eyeondesign.aiga.org/" },
  { cat: "AI",      text: "v0 component generation is production-ready — the design brief quality going in is now the only constraint", url: "https://v0.dev/" },
]

// ─── Category palette — tuned for dark terminal bg ───────────────────────────

const CAT_STYLE: Record<string, { bg: string; color: string }> = {
  AI:      { bg: "rgba(74,122,40,0.18)",   color: "#6B8F4A" },
  DESIGN:  { bg: "rgba(59,130,246,0.12)",  color: "#7BAADF" },
  PHARMA:  { bg: "rgba(168,85,247,0.12)",  color: "#C084FC" },
  CAREER:  { bg: "rgba(251,146,60,0.12)",  color: "#D4956A" },
  CULTURE: { bg: "rgba(160,152,144,0.12)", color: "#A09890" },
}

export function Ticker() {
  const [paused, setPaused] = useState(false)

  return (
    <div
      style={{
        flexShrink: 0,
        height: 36,
        display: "flex",
        alignItems: "center",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Scrolling track */}
      <div
        style={{ flex: 1, overflow: "hidden", position: "relative", cursor: "default" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Fade edges */}
        <div
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 32, zIndex: 1,
            background: "linear-gradient(to right, var(--bg-surface), transparent)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 32, zIndex: 1,
            background: "linear-gradient(to left, var(--bg-surface), transparent)",
            pointerEvents: "none",
          }}
        />

        {/* Scrolling content — duplicated for seamless loop */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            whiteSpace: "nowrap",
            willChange: "transform",
            animationName: "ticker-scroll",
            animationDuration: `${Math.round(HEADLINES.length * 5 / 3)}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {[...HEADLINES, ...HEADLINES].map((h, i) => {
            const style = CAT_STYLE[h.cat] || CAT_STYLE.AI
            return (
              <a
                key={i}
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                  marginRight: 36,
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    fontSize: 8.5,
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "2px 6px",
                    borderRadius: 2,
                    background: style.bg,
                    color: style.color,
                    userSelect: "none",
                    flexShrink: 0,
                  }}
                >
                  {h.cat}
                </span>
                <span
                  style={{
                    fontSize: 11.5,
                    color: paused ? "var(--text-primary)" : "var(--text-secondary)",
                    letterSpacing: "-0.01em",
                    transition: "color 0.15s",
                  }}
                >
                  {h.text}
                </span>
              </a>
            )
          })}
        </div>
      </div>

    </div>
  )
}
