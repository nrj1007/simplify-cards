import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  experimental: {
    // The SEO landing/comparison expansion increased the amount of static page data work during
    // production builds. Capping build parallelism keeps page-data collection from blowing up the
    // worker pool on CI or lower-memory machines.
    cpus: 2
  },
  // card-index.ts reads data/cards/**/*.json at runtime via fs, so the JSON must be traced
  // into serverless function bundles (API routes) rather than left behind during build.
  outputFileTracingIncludes: {
    "/**": ["./data/cards/**/*.json"]
  }
};

export default nextConfig;
