// ─── News Feed Definitions — Five-Layer Mandate ────────────────────────────
// Source: docs/mandate.md
// Every feed maps to a primary intelligence layer. Articles are scored across
// all five layers by the annotation engine regardless of primary assignment.

export interface FeedDef {
  url: string
  source: string
  category: string
  tag: string
  layer: string
  type?: "news" | "social"
}

export const FEEDS: FeedDef[] = [

  // ── OPPORTUNITY — Healthcare, pharma, AI-health intersection ──────────────
  { url: "https://www.statnews.com/feed/",                       source: "STAT News",         category: "Healthcare & Pharma",  tag: "opportunity",  layer: "opportunity" },
  { url: "https://www.biopharmadive.com/feeds/news/",            source: "BioPharma Dive",    category: "Healthcare & Pharma",  tag: "opportunity",  layer: "opportunity" },
  { url: "https://www.fiercehealthcare.com/rss.xml",             source: "Fierce Healthcare", category: "Healthcare & Pharma",  tag: "opportunity",  layer: "opportunity" },
  { url: "https://endpts.com/feed/",                             source: "Endpoints News",    category: "Pharma Deals & FDA",   tag: "opportunity",  layer: "opportunity" },
  { url: "https://investor.lilly.com/rss/news-releases.xml",     source: "Lilly Newsroom",    category: "Eli Lilly",            tag: "opportunity",  layer: "opportunity" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Health.xml", source: "New York Times",  category: "Health",              tag: "opportunity",  layer: "opportunity" },

  // ── POSITION — Design leadership careers, hiring, compensation ────────────
  { url: "https://eyeondesign.aiga.org/feed/",                   source: "Eye on Design",     category: "Design Leadership",    tag: "position",     layer: "position" },
  { url: "https://www.fastcompany.com/co-design/rss",            source: "Fast Company",      category: "Design & Business",    tag: "position",     layer: "position" },
  { url: "https://www.core77.com/feed",                          source: "Core77",            category: "Design Industry",      tag: "position",     layer: "position" },
  { url: "https://designobserver.com/feed/",                     source: "Design Observer",   category: "Design Criticism",     tag: "position",     layer: "position" },
  { url: "https://www.nngroup.com/feed/rss/",                    source: "NNGroup",           category: "UX Research & Org",    tag: "position",     layer: "position" },
  { url: "https://www.svpg.com/feed/",                           source: "SVPG",              category: "Product & Design Org", tag: "position",     layer: "position" },
  { url: "https://www.mobihealthnews.com/feed",                  source: "MobiHealthNews",    category: "Healthcare Digital",   tag: "opportunity",  layer: "opportunity" },

  // ── DISCIPLINE — How design leadership is evolving as a function ──────────
  { url: "https://vercel.com/atom",                              source: "Vercel",            category: "Platform & Tooling",   tag: "discipline",   layer: "discipline" },
  { url: "https://linear.app/changelog.xml",                     source: "Linear",            category: "Product Engineering",  tag: "discipline",   layer: "discipline" },
  { url: "https://medium.com/feed/design-ibm",                   source: "IBM Design",        category: "Enterprise Design",    tag: "discipline",   layer: "discipline" },
  { url: "https://news.google.com/rss/search?q=site:research.ibm.com/blog&hl=en-US&gl=US", source: "IBM Research", category: "AI & Enterprise Research", tag: "discipline", layer: "discipline" },
  { url: "https://www.dezeen.com/design/feed/",                  source: "Dezeen",            category: "Design Practice",      tag: "discipline",   layer: "discipline" },

  // ── LANDSCAPE — Technology, policy, economics, AI capability ──────────────
  { url: "https://www.theverge.com/rss/index.xml",               source: "The Verge",         category: "Technology",           tag: "landscape",    layer: "landscape" },
  { url: "https://www.wired.com/feed/rss",                       source: "Wired",             category: "Technology & Culture", tag: "landscape",    layer: "landscape" },
  { url: "https://www.technologyreview.com/feed/",               source: "MIT Tech Review",   category: "Deep Technology",      tag: "landscape",    layer: "landscape" },
  { url: "https://techcrunch.com/feed/",                         source: "TechCrunch",        category: "Startups & Venture",   tag: "landscape",    layer: "landscape" },
  { url: "https://rss.politico.com/politics-news.xml",           source: "Politico",          category: "Policy & Regulation",  tag: "landscape",    layer: "landscape" },
  { url: "https://www.axios.com/feeds/feed.rss",                 source: "Axios",             category: "Policy & Tech",        tag: "landscape",    layer: "landscape" },
  { url: "https://feeds.bloomberg.com/markets/news.rss",         source: "Bloomberg",         category: "Markets & Finance",    tag: "landscape",    layer: "landscape" },
  { url: "https://www.economist.com/business/rss.xml",           source: "The Economist",     category: "Global Business",      tag: "landscape",    layer: "landscape" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", source: "New York Times", category: "Technology",        tag: "landscape",    layer: "landscape" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",  source: "New York Times", category: "Business",          tag: "landscape",    layer: "landscape" },

  // ── CULTURE — Taste, criticism, creative practice ─────────────────────────
  { url: "https://www.theatlantic.com/feed/all/",                source: "The Atlantic",      category: "Ideas & Culture",      tag: "culture",      layer: "culture" },
  { url: "https://slate.com/feeds/all.rss",                      source: "Slate",             category: "Culture & Commentary", tag: "culture",      layer: "culture" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml", source: "New York Times",   category: "Arts & Culture",       tag: "culture",      layer: "culture" },
  { url: "https://www.dezeen.com/architecture/feed/",            source: "Dezeen",            category: "Architecture",         tag: "culture",      layer: "culture" },
  { url: "https://www.architectural-review.com/rss",             source: "Arch Review",       category: "Architecture Criticism", tag: "culture",    layer: "culture" },
  { url: "https://pitchfork.com/feed/feed-news/rss",             source: "Pitchfork",         category: "Music & Criticism",    tag: "culture",      layer: "culture" },
  { url: "https://www.nplusonemag.com/feed/",                    source: "n+1",               category: "Literary & Ideas",     tag: "culture",      layer: "culture" },
  { url: "https://www.fastcompany.com/latest/rss",               source: "Fast Company",      category: "Innovation & Culture", tag: "culture",      layer: "culture" },
  { url: "https://news.google.com/rss/search?q=site:criterion.com&hl=en-US&gl=US", source: "Criterion", category: "Film & Cinema", tag: "culture", layer: "culture" },

  // ── SHOPIFY — Engineering, design, and product culture ─────────────────────
  { url: "https://medium.com/feed/shopify-ux",                                source: "Shopify UX",                category: "Product Design",        tag: "discipline",   layer: "discipline", type: "social" },
  { url: "https://news.google.com/rss/search?q=site:shopify.engineering&hl=en-US&gl=US", source: "Shopify Engineering", category: "Design Engineering", tag: "discipline",   layer: "discipline" },
  { url: "https://news.google.com/rss/search?q=%22shopify+editions%22&hl=en-US&gl=US", source: "Shopify Editions",    category: "Product Platform",      tag: "discipline",   layer: "discipline" },

  // ── GOOGLE NEWS PROXY — Sources without native RSS ────────────────────────
  { url: "https://news.google.com/rss/search?q=site:hbr.org&hl=en-US&gl=US", source: "Harvard Business Review", category: "Business & Leadership", tag: "position", layer: "position" },
  { url: "https://news.google.com/rss/search?q=site:figma.com/blog&hl=en-US&gl=US", source: "Figma Blog", category: "Design Tooling", tag: "discipline", layer: "discipline" },
  { url: "https://news.google.com/rss/search?q=site:anthropic.com&hl=en-US&gl=US", source: "Anthropic", category: "AI Platform", tag: "discipline", layer: "discipline" },
  { url: "https://news.google.com/rss/search?q=site:cursor.com/blog+OR+site:cursor.sh/blog&hl=en-US&gl=US", source: "Cursor", category: "Design Engineering", tag: "discipline", layer: "discipline" },
  { url: "https://news.google.com/rss/search?q=site:linear.app/blog&hl=en-US&gl=US", source: "Linear", category: "Product Engineering", tag: "discipline", layer: "discipline" },
  { url: "https://news.google.com/rss/search?q=site:reuters.com&hl=en-US&gl=US", source: "Reuters", category: "Global Wire", tag: "landscape", layer: "landscape" },
  { url: "https://news.google.com/rss/search?q=site:economist.com&hl=en-US&gl=US", source: "The Economist", category: "Global Analysis", tag: "landscape", layer: "landscape" },

  // ── SOCIAL INTELLIGENCE — Substack, Medium, editorial voices ──────────
  // Same pipeline as news — fetched, annotated, scored, filtered.

  // Substack — Position & Discipline
  { url: "https://www.lennysnewsletter.com/feed",                 source: "Lenny Rachitsky",   category: "Product & Design",     tag: "position",     layer: "position",   type: "social" },
  { url: "https://lg.substack.com/feed",                           source: "Julie Zhuo",        category: "Design Leadership",    tag: "position",     layer: "position",   type: "social" },
  { url: "https://cutlefish.substack.com/feed",                    source: "John Cutler",       category: "Product Strategy",     tag: "discipline",   layer: "discipline", type: "social" },
  { url: "https://www.proofofconcept.pub/feed",                    source: "Brian Lovin",       category: "Design Engineering",   tag: "discipline",   layer: "discipline", type: "social" },
  { url: "https://www.digitalnative.tech/feed",                    source: "Digital Native",    category: "Tech & Culture",       tag: "landscape",    layer: "landscape",  type: "social" },
  { url: "https://stratechery.com/feed/",                          source: "Stratechery",       category: "Tech Strategy",        tag: "landscape",    layer: "landscape",  type: "social" },

  // Medium — Discipline & Culture
  { url: "https://medium.com/feed/@joulee",                        source: "Julie Zhuo (Medium)", category: "Design Leadership", tag: "position",     layer: "position",   type: "social" },
  { url: "https://medium.com/feed/google-design",                  source: "Google Design",     category: "Design Practice",      tag: "discipline",   layer: "discipline", type: "social" },
  { url: "https://medium.com/feed/ux-collective",                  source: "UX Collective",     category: "Design Discourse",     tag: "discipline",   layer: "discipline", type: "social" },
  { url: "https://medium.com/feed/mule-design",                    source: "Mule Design",       category: "Design Ethics",        tag: "discipline",   layer: "discipline", type: "social" },

  // Positioning — Senior design leadership voices
  { url: "https://www.subtraction.com/feed/",                      source: "Khoi Vinh",         category: "Design Authority",     tag: "position",     layer: "position",   type: "social" },
  { url: "https://medium.com/feed/@khoi",                          source: "Khoi Vinh (Medium)", category: "Design Leadership",  tag: "position",     layer: "position",   type: "social" },
  { url: "https://maeda.pm/feed/",                                 source: "John Maeda",        category: "Design & Technology",  tag: "position",     layer: "position",   type: "social" },
  { url: "https://frankchimero.com/feed.xml",                      source: "Frank Chimero",     category: "Design Philosophy",    tag: "position",     layer: "position",   type: "social" },
  { url: "https://carlrivera.substack.com/feed",                   source: "Carl Rivera",       category: "Design Operations",    tag: "position",     layer: "position",   type: "social" },
  { url: "https://medium.com/feed/@carlrivera",                    source: "Carl Rivera (Medium)", category: "Design Leadership", tag: "position",     layer: "position",   type: "social" },
]
