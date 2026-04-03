# DISPATCH — Architecture Brief v3
Updated: 2026-04-02 (end of day)

## WHAT DISPATCH IS

A personal intelligence system: **Directed Intelligence for Strategic Positioning Across Technology, Culture & Healthcare.** It monitors 48 RSS sources (38 news + 10 social/editorial) and 37 podcasts, classifies every article through AI annotation across five intelligence layers, synthesizes cross-domain patterns, generates weekly content briefs, and maintains a conversational strategic advisor (Cerebro). A full-screen image gallery provides ambient creative nourishment.

**Production:** dispatch.goodliving.studio
**Engine:** Anthropic Claude (Haiku 4.5 for annotation/brief/synthesis, Sonnet 4 for Cerebro/Dispatch)
**Search:** Exa API (live web intelligence)
**Memory:** Upstash Redis via Vercel KV (conversation persistence + 7-day article history)
**All three projects (Dispatch, Atlas, Lilly) run on Anthropic Claude — OpenAI fully removed.**

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

Multi-layer signals (high on 2+) are the highest value. Each article is scored 0-10 on all five layers plus urgency.

**Open question for architecture conversation:** Are these the right five layers? The labels feel abstract as user-facing filters. Consider whether the taxonomy needs restructuring now that the system is live and generating real signal.

---

## SIX AI SURFACES

All surfaces share operator context, Lilly intelligence, layer definitions, and voice directives from a single source of truth (`lib/prompts.ts`). Change once, propagate everywhere.

### 1. DCOS (Dispatch Central Operating System) — The Brief
- **Model:** Claude Haiku 4.5
- **Trigger:** Page load
- **Output:** 3 signal cards (Haiku's reliable limit) with inline citations
- **Citations:** Bracket numbers [1][2] are clickable — hover shows source popover via portal
- **Interaction:** Clicking a card sends the signal to Cerebro for deliberation
- **Layout:** Equal-width grid cards, collapsible panel with chevron toggle

### 2. Cerebro — The Advisor
- **Model:** Claude Sonnet 4
- **Trigger:** User conversation
- **Capabilities:** Web search (Exa, 5 results per query, up to 5 search iterations), conversation memory (KV, 30-day TTL, 30 messages), feed context injection, image analysis
- **Voice:** The Wise Counselor — composed, direct, challenges weak reasoning
- **Output:** Tight paragraphs with inline citations + 3 conversation starter directions
- **Per-message actions:** Copy any message, flag assistant responses (copies report template to clipboard for Claude review)
- **Header:** "CEREBRO 22,504" — title + token count inline
- **Collapsible:** Horizontally to 42px strip

### 3. Annotation Engine — The Classifier
- **Model:** Claude Haiku 4.5
- **Trigger:** Server-side during ISR (30-min cache) — top 20 articles annotated automatically
- **Client fallback:** /api/annotate for any articles not covered server-side
- **Output:** Synopsis, relevance hook, signal type (DATA/CASE/OPINION/TREND/RESEARCH/NEWS/CULTURAL), primary layer, 5-layer scores + urgency

### 4. Synthesis — The Pattern Layer
- **Model:** Claude Haiku 4.5
- **Trigger:** When annotated articles are available
- **Output:** Narrative briefing (most important pattern today), 2-4 convergence patterns with layer mapping, blind spot analysis
- **Note:** Quality will improve as article history accumulates over the week

### 5. Dispatch — The Action Layer
- **Model:** Claude Sonnet 4
- **Trigger:** On-demand (Dispatch tab)
- **Output:** Week summary + 4-5 content pitches with thesis, platform targeting, evidence, urgency
- **Two modes:** Thought leadership (LinkedIn/Medium/Substack) vs. creative expression (IG/Lummi)
- **Pitch cards:** Open as full-page overlay modals with complete brief
- **Each pitch:** Copy brief as Markdown, or "Develop in Cerebro" button
- **Caching:** Module-level cache — tab switches don't re-fetch
- **Loading:** Terminal-style staged animation (matching DCOS boot sequence)

### 6. Gallery — Ambient Creative Nourishment
- **Sources:** Are.na (dispatch-zen channel) + Dezeen Architecture/Design + Architectural Review
- **Layout:** Full-screen overlay, 4-column masonry grid, natural aspect ratios (no cropping)
- **Lightbox:** Arrow key navigation, Escape to close, source caption
- **Launched from:** Aperture icon in left rail bottom bar

---

## FEED SOURCES (85 total)

### News (38 sources)
- **Opportunity (6):** STAT News, BioPharma Dive, Fierce Healthcare, Endpoints News, Lilly Newsroom, NYT Health
- **Position (4):** Eye on Design, Fast Company, Core77, HBR
- **Discipline (8):** Vercel, Linear (×2), IBM Design, Dezeen, Figma Blog, Anthropic, Cursor
- **Landscape (12):** The Verge, Wired, MIT Tech Review, TechCrunch, Politico, Axios, Bloomberg, The Economist (×2), NYT Tech/Business, Reuters
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
1. 48 RSS feeds fetched in parallel (30-min ISR cache)
2. Top 20 articles annotated server-side by Claude Haiku during ISR
3. Annotated articles persisted to Redis (7-day rolling window, 8-day TTL)
4. Client receives pre-annotated feed in single round-trip
5. Client-side annotation fallback for remaining articles (2-hour localStorage cache)

### Storage
- **Vercel KV (Upstash Redis):**
  - Cerebro conversation memory (30-day TTL, 30 messages max per session)
  - Article history (7-day rolling window, keyed by date)
- **localStorage:** Annotation cache (2-hour TTL), view preferences, excluded sources, session ID

### Prompt Architecture
All system prompts import from `lib/prompts.ts`:
- `OPERATOR` — who Jeremy is, what he's positioning for
- `LILLY_CONTEXT` — all Lilly intelligence data points
- `FIVE_LAYERS` — consistent layer definitions with scoring guidance
- `VOICE` — The Wise Counselor directive
- `DISPATCH_PREAMBLE` — combined context block for all surfaces

### API Routes
| Route | Model | Purpose |
|-------|-------|---------|
| `/api/news` | Haiku (annotation) | Fetch + annotate 48 RSS feeds |
| `/api/podcasts` | — | Fetch 37 podcast shows |
| `/api/brief` | Haiku | Generate 3 DCOS signal cards |
| `/api/chat` | Sonnet | Cerebro advisor (agentic, web search) |
| `/api/annotate` | Haiku | Client-side fallback annotation |
| `/api/synthesis` | Haiku | Daily pattern analysis |
| `/api/dispatch` | Sonnet | Weekly content pitch pipeline |
| `/api/gallery` | — | Aggregate gallery images |
| `/api/history` | — | Read 7-day article history |
| `/api/memory` | — | Cerebro memory CRUD (GET/DELETE/PATCH) |
| `/api/health` | Haiku (ping) | Diagnostics |

---

## DESIGN SYSTEM

### Typography
- **Geist Sans** — all interface text (labels, metadata, headlines, body)
- **Geist Mono** — Cerebro voice only (chat responses, processing animations, diagnostics terminal, DCOS/Cerebro/Dispatch headers)
- **Type scale:** 6 tokens defined in `lib/styles.ts`
  - `TYPE.xs` (10px) — badges, dots
  - `TYPE.sm` (11px) — labels, metadata
  - `TYPE.body` (12px) — body text
  - `TYPE.reading` (13px) — primary reading
  - `TYPE.heading` (15px, weight 500) — headlines
  - Display (17-28px) — masthead, clock
- **Letter-spacing:** 0.04em on all uppercase section labels (baked into `labelStyle`)

### Color System (3 skins × 2 modes)
- **Mineral** (warm amber) — default
- **Slate** (cool blue)
- **Forest** (organic green)
- `--card-tint` per skin for insight card popovers
- `--accent-secondary` marks machine/Cerebro presence

### Card Language
- 12px border-radius, `bg-surface` fill, 8px gaps (universal)
- Hover: `bg-elevated` shift (feed cards), scale 1.01 (DCOS, audio, synthesis)
- Layer-colored dots in feed card eyebrows
- Staggered `signal-reveal` animation on all views

### Semantic Boundaries
- Font = semantic signal: sans = interface presenting, mono = Cerebro speaking
- All toolbar icons neutral (`text-tertiary`, no accent colors)
- Section headers: accent-secondary color, uppercase, 0.04em tracking

---

## NAVIGATION

### Desktop (4 views + utilities)
- **View toggle:** Signal / Audio / Synthesis / Dispatch (left rail, 4 icons)
- **Arrow keys:** ← → cycle views globally (no focus needed)
- **Number keys:** 1-4 for direct access
- **Settings:** Gear icon (bottom-left of left rail)
- **Gallery:** Aperture icon (bottom-left)
- **Hotkeys:** Keyboard icon (bottom-left) or press `?`
- **G** opens gallery, **C** or **/** focuses Cerebro
- **Left rail:** Collapsible to 42px vertical "Dispatch" strip
- **Cerebro:** Collapsible to 42px vertical "Cerebro" strip
- Both collapse widths match ticker daypart button (42px)

### Mobile (5 tabs)
- Signal / Audio / Synthesis / Dispatch / Cerebro
- Config accessible on desktop only (gear icon)
- Dynamic tab width calculation

---

## CONFIGURATION PAGE

Accessible via gear icon (bottom-left of left rail):
- **News Sources** — 38 feeds in two-column grid, grouped by layer, toggleable
- **Social Sources** — 10 feeds, same layout
- **Podcast Sources** — 37 shows, same layout
- **Gallery Sources** — Are.na + RSS image feeds
- **Export Inventory** — copy full source list as Markdown for Claude analysis
- **Cerebro Station** — conversation memory management:
  - Active session status (message count, session ID)
  - Conversation log grouped by topic threads (collapsible)
  - Per-thread: copy individual thread, purge individual thread
  - Global: export all threads as Markdown, purge all memory
- **Diagnostics** — Anthropic API, Exa, KV status with live health check

---

## WHAT'S WORKING

- The core intelligence loop: ingest → annotate → score → surface → deliberate
- Cerebro with web search and citations is genuinely useful for strategic thinking
- The Dispatch tab's content pitch pipeline is a powerful new capability
- Design cohesion across all views — cards, typography, spacing, animations
- Configuration gives full operational visibility and control
- Unified prompt architecture means changes propagate everywhere

## WHAT NEEDS ATTENTION

- **Data depth:** Only ~1 day of article history in Redis. Synthesis and Dispatch will get dramatically better after a full week of accumulation.
- **Gallery:** Image URL extraction from some RSS feeds is fragile. Need to expand and validate gallery sources.
- **Mandate refinement:** The five layers work as an analytical framework but may need restructuring based on real usage patterns. This is the architecture conversation to have.
- **Dispatch → Atlas pipeline:** The content pitches are generated but there's no handoff mechanism to Atlas for deep development yet.
- **Synthesis depth:** Currently single-day analysis. Should leverage 7-day history for trend detection.

## WHAT TO BUILD NEXT

1. **Mandate restructuring** — based on architecture conversation findings
2. **Dispatch → Atlas handoff** — export pitches into Atlas knowledge base
3. **Synthesis multi-day trends** — week-over-week pattern analysis
4. **Dispatch cadence automation** — scheduled weekly brief generation
5. **Article deduplication** — across feeds with similar content
6. **Braintrust integration** — prompt quality evaluation when stable
7. **Gallery expansion** — more image sources, validate URL extraction
