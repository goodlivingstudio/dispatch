# DISPATCH — Architecture Brief v4
Updated: 2026-04-02

---

## WHAT DISPATCH IS

Dispatch is a personal intelligence OS — a station chief for a single operator navigating a landscape that exceeds any individual's capacity to track. It monitors 85 sources (48 RSS + 37 podcasts), classifies every article through AI annotation, synthesizes cross-domain patterns, generates weekly content briefs, and maintains a conversational strategic advisor (Cerebro).

**The station chief model:** Dispatch doesn't just aggregate information. It knows who the operator is, what they're building toward, and what's at stake. Every surface — the daily brief, the synthesis layer, the content pipeline, the advisor — operates from that context. The goal is not coverage. The goal is counsel.

**Three modes of intelligence:**

- **Intelligence** — Keeps the operator current. Fast-moving signal on pharma, healthcare AI, design leadership, platform culture, policy. High volume, low depth. Skim, extract, flag for deliberation.
- **Formation** — Changes how the operator thinks. Culture, craft, deep POV, sensibility-building. Operates on a slower clock. Requires actual reading and absorption. This is not "ambient noise" — it is the mechanism by which judgment develops.
- **Positioning** — Tells the operator where to stand. The discourse around design leadership, CDO roles, org design, and what those roles are being hired to solve. The career market read as intelligence, not just job boards.

These modes are not tabs or filters. They describe the operator's relationship to a source — and that relationship should inform how signal from that source is surfaced and consumed.

**Production:** dispatch.goodliving.studio
**Engine:** Anthropic Claude (Haiku 4.5 for annotation/brief/synthesis, Sonnet 4 for Cerebro/Dispatch)
**Search:** Exa API (live web intelligence)
**Memory:** Upstash Redis via Vercel KV (conversation persistence + 7-day article history)
**All projects (Dispatch, Atlas, Lilly) run on Anthropic Claude — OpenAI fully removed.**

---

## THE OPERATOR

Jeremy Grant. Design Director, 15 years agency experience. Senior Design Director at Code and Theory. Founder, Good Living Studio.

### Immediate context
- Active engagement opportunity at Eli Lilly's innovation team (permalance, with strategic relationship to Laree Ross)
- Actively positioning for Head of Design / CDO equivalent at a significant product organization
- Operating at the intersection of design leadership, AI-augmented execution, and healthcare delivery

### Five-year target
Head of Design or CDO at a meaningful organization where design, technology, and human experience converge — with particular focus on healthcare, pharma, and AI-native product contexts.

### Professional evolution thesis
The role is no longer design leader alone. It is design leader + product leader + strategy leader simultaneously. The critical capability gap to close: not becoming an engineer, but developing sufficient technical and product fluency to hold complete conversations about implementation tradeoffs, to push back when technical decisions undermine experience, and to deliver more efficiently through AI-augmented execution. Dispatch exists in part to accelerate this development.

### Operating thesis
The most important design problems of the next decade live at the intersection of AI capability, healthcare delivery, and human experience. Organizations are hiring CDOs not to defend aesthetic territory but to resolve structural friction between functions that AI has thrown into disarray. The design leader who survives this moment is one who can architect cross-functional decision-making, not one who advocates for design's traditional scope.

### Lilly context
- 51M patients, $80–83B projected 2026 revenue
- Diogo Rau (EVP & CIDO): mandated every employee engage with AI daily
- $1B NVIDIA AI partnership, active OpenAI collaboration
- LillyDirect: direct-to-patient pharmacy platform
- Donanemab: monthly infusions, biomarker monitoring, new care coordination challenge
- 7M Americans with Alzheimer's, most undiagnosed
- 73% of pharma digital transformations fail
- Strategic argument: Lilly's science has outpaced the experience of receiving it

---

## THE GENERATIVE BRIEF CLUSTER

Three AI surfaces form a single logical pipeline — the core intelligence loop of Dispatch. Together they move from raw signal to pattern to action. This cluster is the reason Dispatch exists.

### Signal → Brief (DCOS)
The daily brief. Three high-value signal cards generated from the annotated feed on page load. Each card is a deliberation trigger — clicking it sends the signal to Cerebro for counsel. Not a news summary. A question addressed to the operator: *does this matter to you, and if so, how?*

### Pattern → Synthesis
The weekly pattern layer. Surfaces what's converging across the feed — not just what happened but what it means in aggregate. Quality improves as article history accumulates. The most underutilized surface in the current system; most valuable once 7-day history is fully populated.

### Action → Dispatch
The content pipeline. Translates pattern intelligence into thought leadership and creative positioning. Generates 4–5 content pitches with thesis, platform targeting, and evidence. Two modes: strategic positioning (LinkedIn/Medium/Substack) and creative expression (IG/Lummi). The output of the intelligence loop made visible and deployable.

**The pipeline:** Ingest → Annotate → Score → Brief → Synthesize → Dispatch → (future: Atlas)

The missing link in this pipeline is the Dispatch → Atlas handoff. Content pitches are generated but not developed. Deliberations with Cerebro happen but evaporate. Atlas closes the loop by capturing decisions and developed work — turning a monitoring instrument into a decision-support system over time.

---

## SOURCE TAXONOMY

Sources are organized by *mode* — the relationship the operator has to the information, and therefore how it should be consumed and surfaced. This is separate from annotation scoring, which operates on a five-layer domain model (see below).

### Intelligence Sources
Current events, market signal, fast-moving industry news. High volume. Skim and triage. Flag high-urgency items for Cerebro deliberation.

*Pharma & Health:* STAT News, BioPharma Dive, Fierce Healthcare, Endpoints News, Lilly Newsroom, NYT Health, The Readout Loud (podcast)

*AI & Platform:* The Verge, Wired, MIT Tech Review, TechCrunch, Anthropic, Cursor, Vercel, Hard Fork, AI Daily Brief, No Priors, Latent Space (podcasts)

*Business & Policy:* Bloomberg, Reuters, The Economist, Axios, Politico, NYT Business, Bloomberg Tech/Big Take/Businessweek (podcasts), McKinsey, Inside the Strategy Room (podcasts)

### Formation Sources
POV, craft, cultural depth, sensibility-building. Slower clock. These sources change how the operator thinks, not just what they know. Require actual reading and attention. Not subject to daily triage.

*Design & Product craft:* Linear, IBM Design, Figma Blog, Lenny Rachitsky (Substack + podcast), Julie Zhuo (Substack + Medium), John Cutler (Substack), Brian Lovin (Substack), Mule Design (Medium), UX Collective (Medium), HBR IdeaCast/Leadership/Strategy (podcasts), Acquired (podcast)

*Creative & Cultural:* The Atlantic, n+1, Criterion, Pitchfork, Radiolab, Hidden Brain, 99% Invisible, New Yorker Radio Hour, Time Sensitive, Broken Record, Fresh Air, Throughline, Code Switch, The Rewatchables, Slate, NYT Arts (podcasts and feeds)

*Architecture & Visual:* Dezeen (news + architecture), Architectural Review, Are.na (dispatch-zen channel — Gallery surface)

### Positioning Sources
The discourse around design leadership, CDO roles, org design, and the evolving market for senior design talent. This is the most underdeveloped category in the current system relative to the operator's five-year target. Needs intentional curation.

*Current:* Eye on Design, Fast Company, Core77, Digital Native (Substack), Stratechery (Substack), Google Design (Medium)

*Gap to address:* The CDO/Head of Design market signal — who's getting hired, into what kinds of organizations, with what backgrounds — is not currently well-covered. Job descriptions for senior design leadership roles read as intelligence (what problems organizations think they're hiring to solve). Substacks focused on design leadership and org design at the senior level (Khoi Vinh, John Maeda, etc.) should be evaluated for addition.

---

## FIVE ANNOTATION LAYERS

The annotation scoring system classifies *articles*, not *sources*. Every article is scored 0–10 across five layers plus urgency. Multi-layer signals (high on 2+) are the highest value.

| Layer | What It Tracks |
|-------|---------------|
| **Opportunity** | Healthcare, pharma, AI-health. Lilly primary but not exclusive |
| **Position** | Career trajectory — hiring, comp, competitive positioning |
| **Discipline** | Design leadership evolution — CDO roles, AI impact, tools |
| **Landscape** | Broader forces — AI policy, business models, regulation |
| **Culture** | Taste, criticism, creative practice |

**Note on urgency:** Urgency (0–10) is a first-class signal, not just a metadata field. The Signal view should treat urgency as the primary sort axis. Layers are filters, not the primary organizational dimension. What does this signal ask of me *today* is a more useful daily question than *what domain does this belong to.*

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
- **Voice:** The Station Chief — composed, direct, challenges weak reasoning, operates from full operator context
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
- **Output:** Narrative briefing (most important pattern today), 2–4 convergence patterns with layer mapping, blind spot analysis
- **Note:** Quality improves as article history accumulates. Should leverage 7-day history for trend detection — this is the primary near-term upgrade target.

### 5. Dispatch — The Action Layer
- **Model:** Claude Sonnet 4
- **Trigger:** On-demand (Dispatch tab)
- **Output:** Week summary + 4–5 content pitches with thesis, platform targeting, evidence, urgency
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
- `OPERATOR` — who Jeremy is, what he's positioning for, professional evolution thesis
- `LILLY_CONTEXT` — all Lilly intelligence data points
- `FIVE_LAYERS` — consistent layer definitions with scoring guidance
- `VOICE` — The Station Chief directive
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
  - Display (17–28px) — masthead, clock
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
- **Number keys:** 1–4 for direct access
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
- Cerebro with web search and citations is the highest-value surface — the station chief model is working
- The Dispatch tab's content pitch pipeline is powerful and underused
- Design cohesion across all views — cards, typography, spacing, animations hold
- Configuration gives full operational visibility and control
- Unified prompt architecture means changes propagate everywhere

---

## WHAT NEEDS ATTENTION

**Signal quality in the Positioning category** — This is the most underdeveloped feed cluster relative to the operator's five-year target. The current sources cover design culture, not design leadership market intelligence. Needs intentional curation: senior design leadership Substacks, CDO hiring discourse, org design thinking. Job descriptions for Head of Design/CDO roles should be read as primary source intelligence.

**Urgency as primary sort** — The Signal view currently organizes around layers. Urgency (already scored per article) should be the primary sort axis on the Signal view, with layers as secondary filters. The daily question is "what needs my attention today," not "what category is this."

**Synthesis depth** — Currently single-day analysis. The 7-day article history in Redis enables week-over-week pattern detection. This is the highest-value near-term upgrade to the intelligence layer.

**Dispatch → Atlas handoff** — Content pitches are generated but not developed. Cerebro deliberations happen but evaporate. Without a capture mechanism, Dispatch remains a monitoring instrument rather than a decision-support system. This handoff is the critical architectural gap.

**Gallery source fragility** — Image URL extraction from some RSS feeds is fragile. Gallery sources need expansion and validation.

**Cerebro voice directive** — Should be updated to reflect "station chief" framing explicitly, and the operator's professional evolution thesis (design + product + strategy simultaneously) should be a first-class context block in `lib/prompts.ts`.

---

## WHAT TO BUILD NEXT

Priority ordered by strategic impact, not technical sequencing.

1. **Positioning feed curation** — Audit and expand the sources that feed career market intelligence. This directly supports the five-year target and the Lilly engagement.

2. **Dispatch → Atlas handoff** — Export pitch briefs and Cerebro deliberations into Atlas knowledge base. Closes the loop from monitoring to decision-support.

3. **Synthesis multi-day trends** — Leverage 7-day Redis history for week-over-week pattern analysis. Single biggest quality improvement available without new infrastructure.

4. **Urgency-first Signal view** — Reorder Signal view to sort by urgency score as primary axis. Layers become filters. Makes daily triage faster.

5. **Cerebro prompt update** — Update voice directive and operator context block to reflect station chief model and professional evolution thesis.

6. **Dispatch cadence automation** — Scheduled weekly brief generation.

7. **Article deduplication** — Across feeds with similar content.

8. **Braintrust integration** — Prompt quality evaluation when system is stable.

9. **Gallery expansion** — More image sources, validate URL extraction pipeline.
