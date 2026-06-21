import type { MetadataRoute } from "next";
import { cards, getPopularCards } from "@/lib/cards";
import { buildCanonicalUrl } from "@/lib/seo";

const STATIC_ROUTES = ["/", "/ask", "/recommend", "/finder", "/calculator", "/compare"];
const DAILY = "daily" as const;
const WEEKLY = "weekly" as const;

function buildCompareUrls() {
  const popular = getPopularCards(5);
  const urls: string[] = [];

  for (let leftIndex = 0; leftIndex < popular.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < popular.length; rightIndex += 1) {
      urls.push(buildCanonicalUrl(`/compare?a=${popular[leftIndex].id}&b=${popular[rightIndex].id}`));
    }
  }

  return urls;
}

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
    })),
    ...buildCompareUrls().map((url) => ({
      url,
      lastModified: now,
      changeFrequency: WEEKLY,
      priority: 0.6
    }))
  ];
}
