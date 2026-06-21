import { describe, expect, it } from "vitest";
import sitemap from "../app/sitemap";
import {
  getSeoComparisonCards,
  SEO_COMPARISONS,
  SEO_COMPARISON_SLUGS
} from "../lib/seo-comparisons";
import { buildCanonicalUrl } from "../lib/seo";

describe("SEO comparison pages", () => {
  it("resolves every configured pair to existing cards", () => {
    const missing = SEO_COMPARISONS.filter((comparison) => !getSeoComparisonCards(comparison)).map((comparison) => comparison.slug);

    expect(missing).toEqual([]);
  });

  it("uses unique comparison slugs", () => {
    expect(new Set(SEO_COMPARISON_SLUGS).size).toBe(SEO_COMPARISON_SLUGS.length);
  });

  it("includes every SEO comparison page in the sitemap", () => {
    const sitemapUrls = new Set(sitemap().map((entry) => entry.url));
    const missing = SEO_COMPARISON_SLUGS.filter((slug) => !sitemapUrls.has(buildCanonicalUrl(`/compare/${slug}`)));

    expect(missing).toEqual([]);
  });
});
