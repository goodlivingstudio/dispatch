# Dispatch Roadmap
Updated: 2026-04-02 (end of day)

## Tomorrow / Weekend Priority

### Bugs to Fix
1. **Gallery images not rendering** — 41 images detected but not displaying. Likely broken image URLs from RSS extraction. Debug the /api/gallery response and fix URL parsing.
2. **Dispatch tab slow load** — 10-20 second Sonnet call. Cache the result in KV so it doesn't regenerate every tab switch. Add a better loading animation.
3. **DCOS generating only 3 cards** — Haiku limitation with current prompt. Accepted. Cards fill equally.

### UX Refinements
4. **Dispatch pitch cards → full-page overlay** — user requested these open as overlays, not accordions
5. **Dispatch loading animation** — something more engaging than pulsing text for a 15-second wait
6. **Mobile tab bar** — 7 tabs is crowded. Consider icon-only or reorganizing
7. **Left rail empty void** — when on non-Signal views, the area below the toggle is empty. Consider showing layer filters on all views.

### Cerebro Refinements
8. **Conversation starter styling** — the follow-up alternatives need to feel like openers, not quiz answers. Restyle.
9. **Escalate button** — the "Claude" button in Cerebro header may conflict with collapse. Review placement.

### Architecture
10. **Dispatch → Atlas pipeline** — export content pitches to Atlas for deep development
11. **Mandate deep refinement** — restructure layers based on architecture conversation
12. **Article deduplication** — across feeds with similar content
13. **Dispatch cadence** — automated weekly brief (cron or scheduled)

### Future
14. **Braintrust SDK integration** — prompt quality evaluation
15. **Twitter/X integration** — if API access becomes viable
16. **Synthesis multi-day trends** — use article history for week-over-week analysis
17. **Mobile responsive polish** — card layouts, touch interactions

---

## Completed (April 2, 2026) — ~60 commits

### Infrastructure
- Full Anthropic Claude swap across 3 projects (Dispatch, Atlas, Lilly)
- Exa web search + Upstash KV conversation memory + article persistence
- Server-side annotation (single round-trip feed loading)
- 7-day article persistence in Redis
- Unified prompt architecture (lib/prompts.ts — single source of truth)
- /api/synthesis, /api/dispatch, /api/gallery, /api/history, /api/memory endpoints

### AI Surfaces
- DCOS: 3 signal cards with inline citations + hover popovers
- Cerebro: Claude Sonnet with web search, memory, citations, follow-up provocations
- Annotation: server-side via Haiku during ISR
- Synthesis: AI-generated briefing, convergence patterns, blind spots
- Dispatch: weekly content pitch pipeline (4-5 pitches with platform targeting)

### Design System
- Typography: Geist Sans everywhere, Mono reserved for Cerebro voice
- Type scale: 6 tokens (xs/sm/body/reading/heading/display), 92+ tokenized
- Letter-spacing: 0.04em on all section labels globally
- Card system: 12px radius, 8px gaps, bg-surface fill, uniform across all views
- 3 skins (Mineral/Slate/Forest) × 2 modes (dark/day)
- Staggered reveal animations on all tabs
- Layer-colored dots in feed card eyebrows (replaces left border)

### Features
- Configuration page: source inventory, Cerebro Station, diagnostics, gallery sources
- Cerebro Station: topic-threaded conversation log, selective purge, export
- Image gallery: full-screen masonry overlay with lightbox
- Hotkeys: ? overlay + keyboard icon in left rail, 1-4 view access, G for gallery, C for Cerebro
- Collapsible left rail + Cerebro panels (42px collapsed state)
- Global arrow key view cycling
- Social intelligence feeds (10 Substack/Medium sources)

### QA
- 850+ lines dead code removed
- Cerebro extracted to own component
- React.memo on FeedCard
- Shared feed data (lib/feeds.ts, lib/podcasts.ts)
- Duplicate Economist key error fixed
- Accessibility: contrast boost, 11px text floor, card tints per skin
- OpenAI fully removed from all 3 projects
