#!/usr/bin/env npx tsx
// ─── Gallery Scraper — Visual Intelligence Agent ────────────────────────────
// Visits a list of design sites, extracts large images, pushes to Are.na.
// One agent, one shopping list. No site-specific code.
//
// Usage:
//   npx tsx scripts/gallery-scraper.ts                    # scrape all sites
//   npx tsx scripts/gallery-scraper.ts --dry-run          # preview without pushing
//   npx tsx scripts/gallery-scraper.ts --site fantasy.co  # scrape one site
//
// Requires:
//   ARENA_ACCESS_TOKEN env var for Are.na API writes
//   Playwright (chromium) installed

import { chromium } from "playwright"

// ─── Configuration ──────────────────────────────────────────────────────────

const ARENA_CHANNEL_SLUG = "dispatch-zen"
const ARENA_API = "https://api.are.na/v2"
const MIN_IMAGE_WIDTH = 400 // ignore images smaller than this
const MAX_IMAGES_PER_SITE = 12 // cap per site to avoid flooding
const SCROLL_PAUSE = 1500 // ms between scrolls
const MAX_SCROLLS = 5 // how far down to scroll

// ─── Shopping List ──────────────────────────────────────────────────────────
// Add a URL = add a source. The agent handles the rest.

interface ScrapeTarget {
  url: string
  name: string
  category: "gallery" | "agency" | "blog"
}

const TARGETS: ScrapeTarget[] = [
  // Gallery aggregators
  { url: "https://savee.it/", name: "Savee", category: "gallery" },
  { url: "https://mobbin.com/browse/ios/apps", name: "Mobbin", category: "gallery" },
  { url: "https://www.designspiration.com/", name: "Designspiration", category: "gallery" },
  { url: "https://godly.website/", name: "Godly", category: "gallery" },
  { url: "https://www.siteinspire.com/", name: "Siteinspire", category: "gallery" },
  { url: "https://dribbble.com/shots/popular", name: "Dribbble", category: "gallery" },
  { url: "https://www.behance.net/", name: "Behance", category: "gallery" },
  { url: "https://hoverstates.com/", name: "Hover States", category: "gallery" },
  { url: "https://minimal.gallery/", name: "Minimal Gallery", category: "gallery" },
  { url: "https://www.awwwards.com/websites/", name: "Awwwards", category: "gallery" },
  { url: "https://www.searchsystem.co/", name: "SearchSystem", category: "gallery" },
  { url: "https://www.designeverywhere.co/", name: "Design Everywhere", category: "gallery" },
  { url: "https://landing.love/", name: "Landing Love", category: "gallery" },
  { url: "https://www.curated.design/", name: "Curated Inspiration", category: "gallery" },
  { url: "https://www.visualjournal.it/", name: "Visual Journal", category: "gallery" },

  // Design agencies
  { url: "https://fantasy.co/", name: "Fantasy", category: "agency" },
  { url: "https://www.monks.com/work", name: "Monks", category: "agency" },
  { url: "https://erichu.info/", name: "Eric Hu", category: "agency" },
  { url: "https://www.daisychainstudio.net/", name: "Daisy Chain", category: "agency" },
  { url: "https://mouthwash.studio/", name: "Mouthwash Studio", category: "agency" },
  { url: "https://koto.studio/", name: "Koto", category: "agency" },
  { url: "https://dfrnt.com/", name: "DFRNT", category: "agency" },
  { url: "https://tendril.ca/", name: "Tendril", category: "agency" },
  { url: "https://watsondesign.com/", name: "Watson", category: "agency" },
  { url: "https://locomotive.ca/en", name: "Locomotive", category: "agency" },
  { url: "https://metalab.com/work", name: "Metalab", category: "agency" },
  { url: "https://portorocha.com/", name: "Porto Rocha", category: "agency" },

  // AI-generated visual art
  { url: "https://www.lummi.ai/creator/ricardomatos", name: "Ricardo Matos (Lummi)", category: "gallery" },
]

// ─── Image Extraction ───────────────────────────────────────────────────────

interface ExtractedImage {
  url: string
  width: number
  height: number
  alt: string
}

async function scrapeImages(url: string, name: string): Promise<ExtractedImage[]> {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  })

  try {
    console.log(`  Visiting ${url}...`)
    // Use domcontentloaded + manual wait — some sites (heavy video/animation) never reach networkidle
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })
    await page.waitForTimeout(3000) // give JS time to render images

    // Scroll down to trigger lazy loading
    for (let i = 0; i < MAX_SCROLLS; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight))
      await page.waitForTimeout(SCROLL_PAUSE)
    }

    // Extract all images with their rendered dimensions
    const images = await page.evaluate((minWidth: number) => {
      const imgs = Array.from(document.querySelectorAll("img"))
      return imgs
        .map(img => ({
          url: img.src || img.dataset.src || "",
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          alt: img.alt || "",
        }))
        .filter(img =>
          img.url.startsWith("http") &&
          img.width >= minWidth &&
          !img.url.includes("favicon") &&
          !img.url.includes("logo") &&
          !img.url.includes("icon") &&
          !img.url.includes("avatar") &&
          !img.url.includes("sprite") &&
          !img.url.includes("pixel") &&
          !img.url.includes("tracking") &&
          !img.url.includes("1x1")
        )
        .sort((a, b) => (b.width * b.height) - (a.width * a.height))
    }, MIN_IMAGE_WIDTH)

    // Also check for background images on large elements
    const bgImages = await page.evaluate((minWidth: number) => {
      const elements = Array.from(document.querySelectorAll("div, section, figure, a"))
      return elements
        .map(el => {
          const style = window.getComputedStyle(el)
          const bg = style.backgroundImage
          const rect = el.getBoundingClientRect()
          if (bg && bg !== "none" && rect.width >= minWidth) {
            const match = bg.match(/url\(["']?([^"')]+)["']?\)/)
            if (match?.[1]?.startsWith("http")) {
              return { url: match[1], width: Math.round(rect.width), height: Math.round(rect.height), alt: "" }
            }
          }
          return null
        })
        .filter(Boolean) as { url: string; width: number; height: number; alt: string }[]
    }, MIN_IMAGE_WIDTH)

    const all = [...images, ...bgImages]

    // Deduplicate by URL
    const seen = new Set<string>()
    const unique = all.filter(img => {
      if (seen.has(img.url)) return false
      seen.add(img.url)
      return true
    })

    if (unique.length === 0) {
      const videoCount = await page.evaluate(() => document.querySelectorAll("video").length)
      if (videoCount > 0) {
        console.log(`  No images — site uses ${videoCount} video elements (manual curation via Are.na recommended)`)
      }
    }

    console.log(`  Found ${unique.length} images from ${name}`)
    return unique.slice(0, MAX_IMAGES_PER_SITE)
  } catch (err) {
    console.error(`  Error scraping ${name}: ${err instanceof Error ? err.message : String(err)}`)
    return []
  } finally {
    await browser.close()
  }
}

// ─── Are.na Dedup — load existing blocks to avoid duplicates ────────────────

async function loadExistingUrls(): Promise<Set<string>> {
  const token = process.env.ARENA_ACCESS_TOKEN
  if (!token) return new Set()
  try {
    const res = await fetch(`${ARENA_API}/channels/${ARENA_CHANNEL_SLUG}/contents?per=200`, {
      headers: { "Authorization": `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return new Set()
    const data = await res.json()
    const urls = new Set<string>()
    for (const block of (data.contents || [])) {
      if (block.image?.display?.url) urls.add(block.image.display.url)
      if (block.source?.url) urls.add(block.source.url)
    }
    console.log(`  Loaded ${urls.size} existing URLs from Are.na for dedup\n`)
    return urls
  } catch {
    return new Set()
  }
}

// ─── Are.na Push ────────────────────────────────────────────────────────────

async function pushToArena(imageUrl: string, title: string, sourceUrl: string): Promise<boolean> {
  const token = process.env.ARENA_ACCESS_TOKEN
  if (!token) {
    console.log(`  [dry-run] Would push: ${title} — ${imageUrl.slice(0, 80)}`)
    return true
  }

  try {
    const res = await fetch(`${ARENA_API}/channels/${ARENA_CHANNEL_SLUG}/blocks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        source: imageUrl,
        title: title,
        description: `Source: ${sourceUrl}`,
      }),
    })

    if (res.ok) {
      console.log(`  ✓ Pushed: ${title}`)
      return true
    } else {
      const error = await res.text()
      console.error(`  ✗ Failed to push ${title}: ${res.status} ${error.slice(0, 100)}`)
      return false
    }
  } catch (err) {
    console.error(`  ✗ Push error: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run") || !process.env.ARENA_ACCESS_TOKEN
  const siteFilter = args.find(a => a.startsWith("--site="))?.split("=")[1]

  if (dryRun) {
    console.log("🔍 DRY RUN — no images will be pushed to Are.na")
    console.log("   Set ARENA_ACCESS_TOKEN to enable pushing\n")
  }

  const targets = siteFilter
    ? TARGETS.filter(t => t.url.includes(siteFilter) || t.name.toLowerCase().includes(siteFilter.toLowerCase()))
    : TARGETS

  if (targets.length === 0) {
    console.log(`No targets matching "${siteFilter}"`)
    process.exit(1)
  }

  console.log(`\n📷 Gallery Scraper — ${targets.length} sites\n`)

  // Load existing Are.na URLs to avoid duplicates
  const existingUrls = dryRun ? new Set<string>() : await loadExistingUrls()

  let totalFound = 0
  let totalPushed = 0
  let totalSkipped = 0

  for (const target of targets) {
    console.log(`\n── ${target.name} (${target.category}) ──`)
    const images = await scrapeImages(target.url, target.name)
    totalFound += images.length

    if (images.length === 0) {
      console.log("  No images found")
      continue
    }

    for (const img of images) {
      // Skip if already in Are.na
      if (existingUrls.has(img.url)) {
        totalSkipped++
        continue
      }

      const title = img.alt || `${target.name} — visual`
      if (dryRun) {
        console.log(`  [preview] ${img.width}×${img.height} ${img.url.slice(0, 80)}`)
      } else {
        const ok = await pushToArena(img.url, title, target.url)
        if (ok) {
          totalPushed++
          existingUrls.add(img.url) // prevent within-run duplicates too
        }
        await new Promise(r => setTimeout(r, 100))
      }
    }
  }

  console.log(`\n── Summary ──`)
  console.log(`Sites visited: ${targets.length}`)
  console.log(`Images found: ${totalFound}`)
  console.log(`Skipped (already in Are.na): ${totalSkipped}`)
  if (!dryRun) console.log(`Images pushed: ${totalPushed}`)
  console.log("")
}

main().catch(err => {
  console.error("Fatal:", err)
  process.exit(1)
})
