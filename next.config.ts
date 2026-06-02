import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // card-index.ts reads data/cards/**/*.json at runtime via fs, so the JSON must be traced
  // into serverless function bundles (API routes) rather than left behind during build.
  outputFileTracingIncludes: {
    "/**": ["./data/cards/**/*.json"]
  }
};

export default nextConfig;
