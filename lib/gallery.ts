// ─── Gallery Feed Sources ───────────────────────────────────────────────────
// Curated image feeds for the visual intelligence gallery.
// Uses Are.na channels and RSS image feeds.

export interface GallerySource {
  url: string
  name: string
  type: "arena" | "rss"
}

export const GALLERY_SOURCES: GallerySource[] = [
  // Are.na channels — curated visual streams
  { url: "https://api.are.na/v2/channels/dispatch-zen/contents?per=40", name: "Dispatch Zen", type: "arena" },

  // RSS image feeds — architecture, design, photography
  { url: "https://www.dezeen.com/architecture/feed/", name: "Dezeen Architecture", type: "rss" },
  { url: "https://www.dezeen.com/design/feed/", name: "Dezeen Design", type: "rss" },
  { url: "https://www.dezeen.com/interiors/feed/", name: "Dezeen Interiors", type: "rss" },
  { url: "https://www.architectural-review.com/rss", name: "Architectural Review", type: "rss" },
  { url: "https://www.archdaily.com/feed", name: "ArchDaily", type: "rss" },
  { url: "https://www.designboom.com/feed/", name: "Designboom", type: "rss" },
  { url: "https://www.wallpaper.com/rss", name: "Wallpaper*", type: "rss" },
  { url: "https://www.ignant.com/feed/", name: "IGNANT", type: "rss" },

  // Visual art, photography, creative practice
  { url: "https://www.thisiscolossal.com/feed/", name: "Colossal", type: "rss" },
  { url: "https://www.booooooom.com/feed/", name: "Booooooom", type: "rss" },
  { url: "https://minimalissimo.com/feed/", name: "Minimalissimo", type: "rss" },

  // Web design, interactive, digital craft
  { url: "https://www.awwwards.com/feed", name: "Awwwards", type: "rss" },
  { url: "https://www.minimal.gallery/feed", name: "Minimal Gallery", type: "rss" },
  { url: "https://tympanus.net/codrops/feed/", name: "Codrops", type: "rss" },

  // Agency portfolios
  { url: "https://www.tendril.ca/feed", name: "Tendril", type: "rss" },

  // Design journalism, visual culture, creative practice
  { url: "https://www.yellowtrace.com.au/feed/", name: "Yellowtrace", type: "rss" },
  { url: "https://www.fubiz.net/en/feed/", name: "Fubiz", type: "rss" },
  { url: "https://plainmagazine.com/feed/", name: "Plain Magazine", type: "rss" },
  { url: "https://hypebeast.com/feed", name: "Hypebeast", type: "rss" },
  { url: "https://highsnobiety.com/feed/", name: "Highsnobiety", type: "rss" },
  { url: "https://www.juxtapoz.com/feed/", name: "Juxtapoz", type: "rss" },
  { url: "https://leibal.com/feed/", name: "Leibal", type: "rss" },
]

export type ColorMood = "warm" | "cool" | "mono" | "earth" | "vivid" | "muted"

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
}
