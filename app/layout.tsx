import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

const geist = localFont({
  src: "./fonts/Geist-Medium.woff2",
  weight: "500",
  variable: "--font-geist-sans",
  display: "swap",
})

const geistMono = localFont({
  src: "./fonts/GeistMono-Medium.woff2",
  weight: "500",
  variable: "--font-geist-mono",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://dispatch.goodliving.studio"),
  title: "Dispatch",
  description: "Directed Intelligence for Strategic Positioning Across Technology, Culture & Healthcare",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full`}>
      <body className="h-full antialiased">
        <a href="#main-feed" className="skip-link">Skip to feed</a>
        {children}
        {process.env.NODE_ENV === "development" && (
          <div style={{
            position: "fixed", bottom: 8, left: 8, zIndex: 9999, pointerEvents: "none",
            background: "#1a6cf0", color: "#fff", fontSize: 10, fontFamily: "monospace",
            padding: "3px 8px", borderRadius: 3, opacity: 0.85,
          }}>
            DISPATCH · :3001
          </div>
        )}
      </body>
    </html>
  )
}
