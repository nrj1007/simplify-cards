import type { MetadataRoute } from "next";
import { cards } from "@/lib/cards";
import { buildCanonicalUrl } from "@/lib/seo";

const STATIC_ROUTES = ["/", "/ask", "/recommend", "/finder", "/calculator", "/compare"];
const DAILY = "daily" as const;
const WEEKLY = "weekly" as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: buildCanonicalUrl(route),
      lastModified: now,
      changeFrequency: route === "/" ? DAILY : WEEKLY,
      priority: route === "/" ? 1 : route === "/ask" || route === "/recommend" ? 0.9 : 0.8
    })),
    ...cards.map((card) => ({
      url: buildCanonicalUrl(`/cards/${card.id}`),
      lastModified: card.lastVerified ? new Date(card.lastVerified) : now,
      changeFrequency: WEEKLY,
      priority: 0.7
    }))
  ];
}
