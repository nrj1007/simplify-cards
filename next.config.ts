import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  experimental: {
    // The SEO landing/comparison expansion increased the amount of static page data work during
    // production builds. Capping build parallelism keeps page-data collection from blowing up the
    // worker pool on CI or lower-memory machines.
    cpus: 2
  },
  // Dynamic routes that read card-index.ts need card JSON files in their serverless bundles.
  // Keep this scoped so unrelated functions do not trace the whole project.
  outputFileTracingIncludes: {
    "/api/ask": ["./data/cards/**/*.json", "./data/card-content.json"],
    "/api/cards": ["./data/cards/**/*.json"],
    "/api/debug-ranking": ["./data/cards/**/*.json"],
    "/api/recommend": ["./data/cards/**/*.json"],
    "/api/track-click": ["./data/cards/**/*.json"],
    "/ask": ["./data/cards/**/*.json", "./data/card-content.json"],
    "/calculator": ["./data/cards/**/*.json"],
    "/compare": ["./data/cards/**/*.json"],
    "/finder": ["./data/cards/**/*.json"]
  },
  async redirects() {
    return [
      {
        source: "/whatsapp",
        destination: "https://chat.whatsapp.com/HRIXZtKlzH5B0EAvOag27L",
        permanent: false,
      },
      {
        source: "/apply/wealth",
        destination: "https://linksredirect.com/?cid=297687&source=linkkit&url=https%3A%2F%2Fwww.idfcfirst.bank.in%2Fcredit-card%2Fntb-diy%2Fapply",
        permanent: false,
      },
      {
        source: "/apply/select",
        destination: "https://linksredirect.com/?cid=297687&source=linkkit&url=https%3A%2F%2Fwww.idfcfirst.bank.in%2Fcredit-card%2Fntb-diy%2Fapply",
        permanent: false,
      },
      {
        source: "/apply/wow",
        destination: "https://linksredirect.com/?cid=297687&source=linkkit&url=https%3A%2F%2Fwww.idfcfirst.bank.in%2Fcredit-card%2Fntb-diy%2Fapply",
        permanent: false,
      },
    ];
  }
};

export default nextConfig;
