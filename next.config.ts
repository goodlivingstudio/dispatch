import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: { unoptimized: process.env.NODE_ENV === "development" },
  compress: true,
  reactStrictMode: true,
}

export default nextConfig
