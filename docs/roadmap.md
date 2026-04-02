# Dispatch Roadmap
Updated: 2026-04-02

## Completed Today
1. ✅ Server-side annotation — articles arrive pre-annotated from /api/news
2. ✅ Article persistence in Redis — 7-day rolling window for historical analysis
3. ✅ Synthesis activation — AI-generated briefing, patterns, blind spots
4. ✅ Dispatch tab — weekly brief → 4-5 content pitches with platform targeting
5. ✅ Atlas API key swap — all routes on Anthropic Claude
6. ✅ Lilly API key swap — chat route on Anthropic Claude
7. ✅ Type scale consolidation — 6 tokens, 92 tokenized declarations
8. ✅ Unified prompt architecture — lib/prompts.ts, single source of truth for all 5 AI surfaces
9. ✅ Braintrust — deferred to optimization phase (infrastructure ready)
10. ✅ Settings polish — manual feed refresh, Cerebro Station, diagnostics

## Also Completed Today (Design + Infrastructure)
- Full Anthropic Claude swap (Haiku for COS/Annotation, Sonnet for Cerebro/Dispatch)
- Exa web search + Upstash KV conversation memory + article persistence
- Citation hover popovers across COS and Cerebro
- Configuration page with full source inventory + diagnostics + Cerebro Station
- Social intelligence feeds (10 Substack/Medium sources)
- Typography system: Geist Sans everywhere, Mono reserved for Cerebro voice
- Card-based layouts across all views with unified 8px spacing
- Staggered reveal animations on all tabs
- Accessibility: contrast boost, 11px text floor, card tints per skin
- DCOS cards with collapsible panel
- Cerebro extracted to own component (580 lines out of page.tsx)
- 850+ lines dead code removed, React.memo, bundle trimmed
- Architecture brief v2 compiled

## Next Up
- **Mandate deep refinement** — restructure layers based on architecture conversation
- **Braintrust SDK integration** — when ready to evaluate prompt quality
- **Twitter/X integration** — if API access becomes viable
- **Dispatch cadence** — automated weekly brief generation (cron or scheduled)
- **Article deduplication** — across feeds with similar content
- **Synthesis depth** — expand from daily to multi-day trend analysis using article history
- **Mobile optimization** — responsive card layouts, touch interactions
