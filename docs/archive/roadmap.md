# Dispatch Roadmap
Updated: 2026-04-02

---

## Active Bugs

1. **Gallery images not rendering** — 41 images detected, not displaying. Debug `/api/gallery` response and fix URL parsing from RSS feeds.
2. **Dispatch tab slow load** — 10–20s Sonnet call on every tab switch. Cache result in KV. Add terminal-style loading animation matching DCOS boot sequence.
3. **DCOS 3-card limit** — Haiku limitation with current prompt. Accepted behavior. Cards fill equal width.

---

## Priority 1 — Prompt Architecture Update
*Highest leverage. Changes what the system says without touching infrastructure.*

4. **Update `lib/prompts.ts` from PROMPTS.md v2** — Propagate station chief voice directive, updated OPERATOR block with professional evolution thesis, SOURCE_MODES block, and all six surface prompts. This is the single most impactful change available.
5. **Urgency-first Signal view** — Reorder Signal view to sort by urgency score as primary axis. Layers become secondary filters. The daily question is "what demands my attention today," not "what category is this."
6. **DCOS brief framing** — Update card copy format: each card should frame "what this demands of the operator," not just what the signal is.

---

## Priority 2 — Intelligence Quality
*Feed and synthesis improvements that compound over time.*

7. **Positioning feed audit** — This is the most underdeveloped source category relative to the five-year target. Evaluate additions: senior design leadership Substacks (Khoi Vinh, John Maeda, Maggie Gram), CDO hiring discourse, org design thinking. Target 4–6 new Positioning sources.
8. **Synthesis multi-day trends** — Leverage 7-day Redis article history for week-over-week pattern detection. Shift Synthesis prompt from single-day analysis to trend-over-time briefing. See PROMPTS.md for updated Synthesis prompt which already accounts for this.
9. **Article deduplication** — Across feeds with similar content. High-volume news events generate redundant cards across sources.

---

## Priority 3 — Atlas Handoff
*Closes the loop. Transforms Dispatch from monitoring to decision-support.*

10. **Dispatch → Atlas export** — Content pitches generated in Dispatch tab should be exportable to Atlas knowledge base for deep development. Minimum viable: copy pitch brief as structured Markdown with a single action. Ideal: direct API call to Atlas ingest endpoint.
11. **Cerebro deliberation capture** — Lightweight mechanism at end of a Cerebro thread: "Did this change anything?" (yes/no + one-line note). Creates a record of what's generating value vs. what's interesting but passive. Feeds Atlas over time.

---

## Priority 4 — UX Refinements

12. **Dispatch pitch cards → full-page overlay** — Open as overlays, not accordions. Already specced.
13. **Conversation starter styling** — Follow-up alternatives need to feel like genuine provocations, not quiz answers. Restyle as open-ended directions.
14. **Left rail empty void** — When on non-Signal views, area below toggle is empty. Consider showing layer filters or urgency sort control on all views.
15. **Escalate button placement** — "Claude" button in Cerebro header may conflict with collapse. Review placement.
16. **Mobile tab bar** — 5 tabs is workable but dense. Consider icon-only or consolidation on mobile.

---

## Priority 5 — Infrastructure

17. **Dispatch cadence automation** — Scheduled weekly brief generation via cron or Vercel scheduled function.
18. **Gallery source expansion** — More image sources, validate URL extraction pipeline. Are.na + Dezeen + Arch Review is a thin set.
19. **Braintrust SDK integration** — Prompt quality evaluation when system is stable enough to instrument.

---

## Future Exploration

- **Positioning feed: JD intelligence** — Job descriptions for Head of Design / CDO roles read as primary source intelligence. Automate or manually curate weekly.
- **Twitter/X integration** — If API access becomes viable. High-signal but fragmented source.
- **PWA** — Offline capability, installable. Lower priority given it's a daily desktop tool.
- **Mobile responsive polish** — Card layouts, touch interactions. After desktop feature stability.

---

## Archive — Completed (April 2, 2026 — ~60 commits)

### Infrastructure
- Full Anthropic Claude swap across 3 projects (Dispatch, Atlas, Lilly). OpenAI fully removed.
- Exa web search + Upstash KV conversation memory + article persistence
- Server-side annotation during ISR (single round-trip feed loading)
- 7-day article persistence in Redis
- Unified prompt architecture (`lib/prompts.ts` — single source of truth)
- `/api/synthesis`, `/api/dispatch`, `/api/gallery`, `/api/history`, `/api/memory` endpoints

### AI Surfaces
- DCOS: 3 signal cards with inline citations + hover popovers
- Cerebro: Sonnet with web search, memory, citations, follow-up provocations
- Annotation: server-side via Haiku during ISR, client fallback
- Synthesis: AI-generated briefing, convergence patterns, blind spots
- Dispatch: Weekly content pitch pipeline (4–5 pitches with platform targeting)

### Design System
- Typography: Geist Sans everywhere, Mono reserved for Cerebro voice
- Type scale: 6 tokens (xs / sm / body / reading / heading / display)
- Letter-spacing: 0.04em on all section labels globally
- Card system: 12px radius, 8px gaps, bg-surface fill, uniform across all views
- 3 skins (Mineral / Slate / Forest) × 2 modes (dark / day)
- Staggered reveal animations on all tabs
- Layer-colored dots in feed card eyebrows

### Features
- Configuration page: source inventory, Cerebro Station, diagnostics, gallery sources
- Cerebro Station: topic-threaded conversation log, selective purge, export
- Image gallery: full-screen masonry overlay with lightbox
- Hotkeys: ? overlay, 1–4 view access, G for gallery, C for Cerebro
- Collapsible left rail + Cerebro panels (42px collapsed state)
- Global arrow key view cycling
- Social intelligence feeds (10 Substack/Medium sources)

### QA
- 850+ lines dead code removed
- React.memo on FeedCard
- Shared feed data (`lib/feeds.ts`, `lib/podcasts.ts`)
- Accessibility: contrast boost, 11px text floor, card tints per skin
