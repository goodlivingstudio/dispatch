# DISPATCH — Integration Doctrine
Updated: 2026-04-03

*This document defines how Dispatch acquires intelligence from external platforms and why the integration architecture matters more than the raw data.*

---

## THE INTEGRATION HIERARCHY

Every external platform Dispatch touches falls into one of four tiers, ordered by depth of access and intelligence value:

### Tier 1 — In-Platform (Plugin / Extension)
The system operates inside the platform itself. Full access to platform data, user context, and actions. The richest integration point.

*Examples: Figma plugin creating decks from Dispatch output, browser extension capturing articles with annotation context, Slack bot surfacing signals in-channel.*

### Tier 2 — Bidirectional API / MCP
The system both reads from and writes to the platform. Can pull data and push actions. Enables the Machine as intermediary — bringing data from one platform into another when valuable.

*Examples: Exa web search (query + results), KV memory (read + write), future LinkedIn API (read career signals + publish content), future Atlas API (export deliberations + query decisions).*

### Tier 3 — Unidirectional Pull
The system reads from the platform but cannot write back. Most current Dispatch integrations live here. Sufficient for intelligence gathering; insufficient for action.

*Examples: RSS feeds (48 news + 10 social), podcast RSS, Are.na API, Google News proxy feeds.*

### Tier 4 — Manual Bridge
Data enters the system through operator action — copy/paste, file upload, screenshot, conversation. The lowest integration tier but sometimes the only path to gated intelligence.

*Examples: Pasting a job description into Cerebro for analysis, uploading a Lilly internal brief, sharing a screenshot of a competitor's product.*

**The strategic directive: push every valuable source up at least one tier.** A Tier 3 source that could be Tier 2 is leaving value on the table. A Tier 4 source that recurs frequently enough to justify automation should become Tier 3 at minimum.

---

## THE MACHINE AS INTERMEDIARY

One of the most powerful capabilities of an intelligence OS is not just pulling data from platforms, but routing data *between* platforms through the system. Dispatch is the connective tissue.

**Cross-platform intelligence routing:**
- Signal from RSS (Tier 3) → annotated and scored → synthesized into a content pitch → exported as a Figma deck (Tier 1) or LinkedIn post (future Tier 2)
- Cerebro deliberation (internal) → decision captured → pushed to Atlas knowledge base (Tier 2) → informs future synthesis
- Job posting from LinkedIn (future Tier 2) → annotated as Position signal → compared against operator's target profile → surfaces in DCOS brief
- Lilly internal brief (Tier 4 today) → analyzed by Cerebro → cross-referenced with public pharma intelligence → generates engagement-specific positioning

The value isn't in any single platform's data. It's in the synthesis that happens when data from multiple platforms converges through a system that knows what the operator needs.

---

## WHAT MAKES DISPATCH NON-COMMODITY

The raw signal layer — pulling public feeds, scoring them, surfacing urgency — becomes commodity infrastructure as AI tools proliferate. Anyone with Claude and a weekend can build a personal news scorer. Three things compound into defensible value:

### 1. Operator Specificity
Dispatch doesn't score articles generically. It scores them against a specific mandate, career trajectory, engagement opportunity, and five-year target. The annotation engine knows that a CDO hire at a pharma company is simultaneously a Position signal and an Opportunity signal *for this operator*. That interpretive layer is personal and non-transferable. When information silos multiply, the operator with the sharpest model of what they need — and the system architecture to express that model computationally — has the advantage.

### 2. Temporal Depth
Single-day annotation is commodity. Seven-day trend detection is harder. Thirty-day pattern memory is rare. The longer Dispatch runs, the more its synthesis layer can see — what's been building, what disappeared, what recurred. Temporal depth is a function of persistence and continuous operation. It cannot be replicated by signing up for a tool.

### 3. Cross-Silo Synthesis
Each integration Dispatch adds makes the synthesis layer more valuable because it can see across boundaries that most systems can't cross simultaneously. The operator who has built the integration layer — editorial RSS, web search, podcast intelligence, visual culture feeds, and eventually career signal APIs and internal engagement tools — has a compound advantage. The synthesis that emerges from crossing those boundaries is the actual product.

**The strategic move is not to defend the commodity layer. It is to push deeper into operator specificity, temporal depth, and cross-silo synthesis.**

---

## THE GATED INTELLIGENCE QUESTION

The trend is toward more information silos, more paywalls, more API-gated access. This favors architectures like Dispatch for two reasons:

1. **Integration as moat.** Each gated source you crack widens the gap between what your system can see and what a generic tool can assemble. The more integrations you build, the harder your intelligence picture is to replicate.

2. **Synthesis across gates.** Most gated platforms are useful in isolation. They become powerful when cross-referenced. A LinkedIn job posting (gated) cross-referenced with a pharma earnings call (public) cross-referenced with a design leadership Substack (semi-public) produces an insight that none of those sources could produce alone.

### Priority Gated Sources by Domain

The highest-value gated source depends on the operator's domain. For Dispatch's current mandate:

**Healthcare / Pharma:**
- Clinical trial registries (ClinicalTrials.gov API — public but structured)
- Pharma earnings call transcripts (semi-gated, available via financial APIs)
- FDA regulatory filings (public but require structured parsing)
- Health system innovation lab newsletters (gated, Tier 4 today)

**Design Leadership / Career Positioning:**
- LinkedIn API (job postings, hiring signals, network activity)
- Greenhouse/Lever/Ashby job board APIs (CDO/Head of Design role specifications read as intelligence)
- Closed Slack/Discord communities where senior design leaders discuss (Tier 4)
- Conference speaker lists and panel compositions (semi-structured, scrapable)

**Technology / AI Platform:**
- GitHub trending + release feeds (public, structured)
- Product Hunt / Hacker News APIs (public, high signal-to-noise)
- AI research paper feeds (arXiv API — public, structured)
- Venture funding data (Crunchbase API — gated, Tier 2)

**The universal high-value integration regardless of domain: the operator's own calendar, email, and notes.** The system that can see what you're *doing* — not just what's happening in the world — can synthesize at a level that purely external intelligence cannot match.

---

## INTEGRATION ROADMAP

Current state and target tier for each integration category:

| Source | Current Tier | Target Tier | Priority |
|--------|-------------|-------------|----------|
| RSS feeds (48) | 3 | 3 (stable) | Maintained |
| Podcast RSS (37) | 3 | 3 (stable) | Maintained |
| Are.na | 3 | 3 | Maintained |
| Exa web search | 2 | 2 (stable) | Maintained |
| Vercel KV | 2 | 2 (stable) | Maintained |
| Gallery image feeds | 3 | 3 | Maintained |
| Figma | 4 (manual) | 1 (plugin) | High |
| Atlas knowledge base | 4 (clipboard) | 2 (API) | High |
| LinkedIn | — | 2 (API) | High |
| Job posting APIs | — | 3 (pull) | Medium |
| Calendar/email | — | 3 (pull) | Medium |
| Lilly internal tools | — | 4 → 3 | Engagement-dependent |
| Clinical trial data | — | 3 (API) | Low (until needed) |
| Venture/funding data | — | 3 (API) | Low |

---

## MAINTENANCE

**When to update this document:** When a new integration is added or an existing one changes tier. When the operator's domain shifts. When new platform APIs become available that change the calculus.

**When to revisit the hierarchy:** Quarterly. Ask: which Tier 4 sources are we using frequently enough to justify automation? Which Tier 3 sources could become Tier 2 with a weekend of work?

**Principle:** Every integration decision should be evaluated against three questions: (1) Does this source add intelligence that can't be synthesized from what we already have? (2) What tier can we realistically achieve? (3) Does this widen the cross-silo synthesis advantage?
