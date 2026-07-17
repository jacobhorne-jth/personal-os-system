import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Lets a second instance (tests, scratch runs) build into its own directory
  // instead of corrupting the main dev server's .next cache
  distDir: process.env.NEXT_DIST_DIR || ".next"
};

export default nextConfig;
