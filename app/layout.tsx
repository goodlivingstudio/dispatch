import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL("https://dispatch.goodliving.studio"),
  title: "Dispatch",
  description: "Personal field intelligence — Jeremy Grant",
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
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full antialiased">
        {children}
        {process.env.NODE_ENV === "development" && (
          <div style={{
            position: "fixed", bottom: 8, left: 8, zIndex: 9999, pointerEvents: "none",
            background: "#1a6cf0", color: "#fff", fontSize: 10, fontFamily: "monospace",
            letterSpacing: "0.1em", padding: "3px 8px", borderRadius: 3, opacity: 0.85,
          }}>
            DISPATCH · :3001
          </div>
        )}
      </body>
    </html>
  )
}
