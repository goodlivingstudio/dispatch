# DISPATCH — Architecture Brief v2
Updated: 2026-04-02

## WHAT DISPATCH IS

A personal intelligence system: **Directed Intelligence for Strategic Positioning Across Technology, Culture & Healthcare.** It monitors 48 RSS sources (38 news + 10 social/editorial) and 37 podcasts, classifies every article through AI annotation across five intelligence layers, synthesizes cross-domain patterns, generates weekly content briefs, and maintains a conversational strategic advisor (Cerebro).

**Production:** dispatch.goodliving.studio
**Engine:** Anthropic Claude (Haiku 4.5 for annotation/brief, Sonnet 4 for Cerebro/Dispatch)
**Search:** Exa API (live web intelligence)
**Memory:** Upstash Redis via Vercel KV (conversation persistence + 7-day article history)

---

## THE OPERATOR

Jeremy Grant. Design Director, 15 years agency experience, founder of Good Living Studio.

- **Immediate priority:** Permalance engagement at Eli Lilly's innovation team
- **Five-year target:** Head of Design (or CDO equivalent) at a significant product organization at the intersection of technology, culture, and healthcare
- **Operating thesis:** The most important design problems of the next decade live at the intersection of AI capability, healthcare delivery, and human experience

### Lilly Context
- 51M patients, $80-83B projected 2026 revenue
- Diogo Rau (EVP & CIDO): mandated every employee engage with AI daily
- $1B NVIDIA AI partnership, active OpenAI collaboration
- LillyDirect: direct-to-patient pharmacy platform
- Donanemab: monthly infusions, biomarker monitoring, new care coordination challenge
- 7M Americans with Alzheimer's, most undiagnosed
- 73% of pharma digital transformations fail
- Strategic argument: Lilly's science has outpaced the experience of receiving it

---

## FIVE INTELLIGENCE LAYERS

| Layer | What It Tracks |
|-------|---------------|
| **Opportunity** | Healthcare, pharma, AI-health. Lilly primary but not exclusive |
| **Position** | Career trajectory — hiring, comp, competitive positioning |
| **Discipline** | Design leadership evolution — CDO roles, AI impact, tools |
| **Landscape** | Broader forces — AI policy, business models, regulation |
| **Culture** | Taste, criticism, creative practice — architecture, film, music |

Multi-layer signals (high on 2+) are the highest value.

---

## AI SURFACES

All five surfaces share operator context, Lilly intelligence, layer definitions, and voice directives from a single source of truth (`lib/prompts.ts`).

### 1. DCOS (Chief of Staff) — The Brief
- **Model:** Claude Haiku 4.5
- **Trigger:** Page load
- **Output:** 3 signal cards with inline citations
- **Role:** Surface the 3 signals that matter most right now

### 2. Cerebro — The Advisor
- **Model:** Claude Sonnet 4
- **Trigger:** User conversation
- **Capabilities:** Web search (Exa), conversation memory (KV), feed context injection, image analysis
- **Voice:** The Wise Counselor — composed, direct, challenges weak reasoning
- **Output:** Tight paragraphs with follow-up provocations

### 3. Annotation Engine — The Classifier
- **Model:** Claude Haiku 4.5
- **Trigger:** Server-side during ISR (30-min cache) + client-side fallback
- **Output:** Synopsis, relevance hook, signal type, primary layer, 5-layer scores + urgency

### 4. Synthesis — The Pattern Layer
- **Model:** Claude Haiku 4.5
- **Trigger:** When annotated articles are available
- **Output:** Narrative briefing, 2-4 convergence patterns, blind spot analysis

### 5. Dispatch — The Action Layer
- **Model:** Claude Sonnet 4
- **Trigger:** On-demand (weekly cadence)
- **Output:** 4-5 content pitches with thesis, platform targeting, evidence, urgency
- **Two modes:** Thought leadership (LinkedIn/Medium/Substack) vs. creative (IG/Lummi)

---

## FEED SOURCES

### News (38 sources)
- **Opportunity (6):** STAT News, BioPharma Dive, Fierce Healthcare, Endpoints News, Lilly Newsroom, NYT Health
- **Position (4):** Eye on Design, Fast Company, Core77, HBR
- **Discipline (8):** Vercel, Linear, IBM Design, Dezeen, Figma Blog, Anthropic, Cursor, Linear Blog
- **Landscape (12):** The Verge, Wired, MIT Tech Review, TechCrunch, Politico, Axios, Bloomberg, The Economist, NYT Tech/Business, Reuters
- **Culture (9):** The Atlantic, Slate, NYT Arts, Dezeen Architecture, Arch Review, Pitchfork, n+1, Fast Company, Criterion

### Social/Editorial (10 sources)
- **Substack:** Lenny Rachitsky, Julie Zhuo, John Cutler, Brian Lovin, Digital Native, Stratechery
- **Medium:** Julie Zhuo, Google Design, UX Collective, Mule Design

### Podcasts (37 shows)
- **Opportunity (1):** The Readout Loud
- **Position (7):** Lenny's Podcast, Design Matters, HBR IdeaCast/Leadership/Strategy, McKinsey, Inside the Strategy Room
- **Discipline (6):** a16z, Hard Fork, AI Daily Brief, Acquired, Latent Space, No Priors
- **Landscape (12):** The Daily, Ezra Klein, Up First, Today Explained, Consider This, Bloomberg Tech/Big Take/Businessweek, Economist, Kara Swisher, Political Scene, Political Gabfest
- **Culture (11):** Radiolab, Hidden Brain, Throughline, Fresh Air, Time Sensitive, Broken Record, New Yorker Radio Hour, 99% Invisible, Code Switch, Book of the Day, The Rewatchables

---

## INFRASTRUCTURE

### Data Flow
1. RSS feeds fetched in parallel (30-min ISR cache)
2. Top 20 articles annotated server-side by Claude Haiku during ISR
3. Annotated articles persisted to Redis (7-day rolling window, 8-day TTL)
4. Client receives pre-annotated feed in single round-trip
5. Client-side annotation fallback for any articles not covered

### Storage
- **Vercel KV (Upstash Redis):** Cerebro conversation memory (30-day TTL, 30 messages max) + article history (7-day window)
- **localStorage:** Annotation cache (2-hour TTL), view preferences, excluded sources, session ID

### Prompt Architecture
All system prompts import from `lib/prompts.ts`:
- `OPERATOR` — who Jeremy is, what he's positioning for
- `LILLY_CONTEXT` — Lilly intelligence data points
- `FIVE_LAYERS` — layer definitions with scoring guidance
- `VOICE` — The Wise Counselor directive
- `DISPATCH_PREAMBLE` — combined context block for all surfaces

---

## DESIGN SYSTEM

### Typography
- **Geist Sans** — all interface text (labels, metadata, headlines, body)
- **Geist Mono** — Cerebro voice only (chat responses, processing animations, diagnostics terminal)
- **Type scale:** 6 tokens (xs/10, sm/11, body/12, reading/13, heading/15, display/17+)

### Color System (3 skins × 2 modes)
- **Mineral** (warm amber) — default
- **Slate** (cool blue)
- **Forest** (organic green)
- Each skin has dark and day modes with full variable sets

### Card Language
- 12px border-radius, bg-surface fill, 8px gaps
- Hover: bg-elevated shift (no scale on feed, subtle scale on audio/synthesis)
- Consistent across all views: Signal, Audio, Synthesis, Dispatch

### Semantic Boundaries
- Font = semantic signal: sans = interface presenting, mono = Cerebro speaking
- `--card-tint` per skin for insight popovers
- `--accent-secondary` marks machine presence (citations, labels, active states)

---

## CONFIGURATION PAGE

Accessible via gear icon (bottom-left of left rail):
- **News Sources** — 38 feeds, grouped by layer, toggleable
- **Social Sources** — 10 feeds, grouped by layer, toggleable
- **Podcast Sources** — 37 shows, grouped by layer, toggleable
- **Export Inventory** — copy full source list as Markdown for Claude analysis
- **Cerebro Station** — session info, export thread, clear memory
- **Diagnostics** — API health (Anthropic, Exa, KV), feed health, annotation cache
- **Preferences** — skin picker, theme toggle

---

## NAVIGATION

### Desktop
- Four-mode toggle: Signal / Audio / Synthesis / Dispatch
- Settings via gear icon (bottom-left)
- Arrow keys cycle through modes
- Cerebro sidebar always visible

### Mobile
- Tab bar: Signal / Audio / Synthesis / Dispatch / Cerebro / Config
- Dynamic width per tab count

---

## WHAT'S NEXT (Roadmap)

1. **Mandate refinement** — restructure layers based on architecture conversation
2. **Braintrust integration** — prompt quality evaluation and A/B testing
3. **Settings polish** — annotation TTL controls, manual feed refresh, session export
4. **Twitter/X integration** — if API access becomes viable
5. **Dispatch cadence** — automated weekly brief generation
6. **Article deduplication** — across feeds with similar content
