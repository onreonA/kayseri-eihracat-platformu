import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export", // Vercel için kaldırıldı
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Reduce build size by limiting static generation
    isrMemoryCacheSize: 0,
  },
  // Limit static generation for large dynamic routes
  trailingSlash: false,
};

export default nextConfig;
