// ─── Gallery Feed Sources ───────────────────────────────────────────────────
// Curated image feeds for the visual intelligence gallery.
// Balanced across mood categories: warm, cool, mono, earth, vivid, muted.
// Uses Are.na channels and RSS image feeds.

export interface GallerySource {
  url: string
  name: string
  type: "arena" | "rss"
}

export const GALLERY_SOURCES: GallerySource[] = [
  // Are.na — manual curation channel
  { url: "https://api.are.na/v2/channels/dispatch-zen/contents?per=200", name: "Dispatch Zen", type: "arena" },

  // Architecture & built environment (Mono/Muted heavy — intentionally reduced)
  { url: "https://www.dezeen.com/architecture/feed/", name: "Dezeen", type: "rss" },
  { url: "https://www.architectural-review.com/rss", name: "Architectural Review", type: "rss" },
  { url: "https://www.archdaily.com/feed", name: "ArchDaily", type: "rss" },
  { url: "https://www.designboom.com/feed/", name: "Designboom", type: "rss" },
  { url: "https://leibal.com/feed/", name: "Leibal", type: "rss" },

  // Design & product (mixed moods)
  { url: "https://www.wallpaper.com/rss", name: "Wallpaper*", type: "rss" },
  { url: "https://www.ignant.com/feed/", name: "IGNANT", type: "rss" },
  { url: "https://minimalissimo.com/feed/", name: "Minimalissimo", type: "rss" },
  { url: "https://plainmagazine.com/feed/", name: "Plain Magazine", type: "rss" },
  { url: "https://www.yellowtrace.com.au/feed/", name: "Yellowtrace", type: "rss" },

  // Photography (fills Cool, Warm, Earth, Vivid)
  { url: "https://www.featureshoot.com/feed/", name: "Feature Shoot", type: "rss" },
  { url: "https://www.thisiscolossal.com/category/photography/feed/", name: "Colossal Photography", type: "rss" },
  { url: "https://trendland.com/feed/", name: "Trendland", type: "rss" },

  // Visual art & creative culture (Vivid, Warm)
  { url: "https://www.thisiscolossal.com/feed/", name: "Colossal", type: "rss" },
  { url: "https://www.booooooom.com/feed/", name: "Booooooom", type: "rss" },
  { url: "https://www.juxtapoz.com/feed/", name: "Juxtapoz", type: "rss" },
  { url: "https://www.fubiz.net/en/feed/", name: "Fubiz", type: "rss" },

  // Street culture & fashion (Vivid, Warm, Cool)
  { url: "https://hypebeast.com/feed", name: "Hypebeast", type: "rss" },
  { url: "https://highsnobiety.com/feed/", name: "Highsnobiety", type: "rss" },

  // Web design & digital craft (Mono/Cool)
  { url: "https://www.awwwards.com/feed", name: "Awwwards", type: "rss" },
  { url: "https://www.minimal.gallery/feed", name: "Minimal Gallery", type: "rss" },
  { url: "https://tympanus.net/codrops/feed/", name: "Codrops", type: "rss" },

  // Agency portfolios
  { url: "https://www.tendril.ca/feed", name: "Tendril", type: "rss" },
]

export type ColorMood = "warm" | "cool" | "earth" | "vivid" | "neutral"

export interface GalleryImage {
  id: string
  url: string
  title?: string
  source: string
  linkUrl?: string
  mood?: ColorMood
  hue?: number        // 0-360 — for tonal sorting within mood
  saturation?: number // 0-1
  lightness?: number  // 0-1
  mediaType?: "image" | "video"
  videoUrl?: string   // for video assets
}
