import type { MetadataRoute } from "next";
import { cards } from "@/lib/cards";
import { comparisonLastModifiedDate, getSeoComparison, getSeoComparisonCards, SEO_COMPARISON_SLUGS } from "@/lib/seo-comparisons";
import { SEO_LANDING_SLUGS } from "@/lib/seo-landing";
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
    ...SEO_LANDING_SLUGS.map((slug) => ({
      url: buildCanonicalUrl(`/${slug}`),
      lastModified: now,
      changeFrequency: WEEKLY,
      priority: 0.8
    })),
    ...SEO_COMPARISON_SLUGS.map((slug) => {
      const comparison = getSeoComparison(slug);
      const pair = comparison ? getSeoComparisonCards(comparison) : null;

      return {
        url: buildCanonicalUrl(`/compare/${slug}`),
        lastModified: pair ? comparisonLastModifiedDate(pair.cardA, pair.cardB) : now,
        changeFrequency: WEEKLY,
        priority: 0.75
      };
    }),
    ...cards.map((card) => ({
      url: buildCanonicalUrl(`/cards/${card.id}`),
      lastModified: card.lastVerified ? new Date(card.lastVerified) : now,
      changeFrequency: WEEKLY,
      priority: 0.7
    }))
  ];
}
