import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static since API is handled by a separate Cloudflare Worker (Hono)
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  }
};

export default nextConfig;
