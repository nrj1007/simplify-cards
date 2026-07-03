import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "../app/sitemap";
import {
  buildSeoComparisonMetadata,
  comparisonLastModifiedDate,
  finalRecommendation,
  getSeoComparisonCards,
  getSeoComparison,
  INDEXABLE_SEO_COMPARISON_SLUGS,
  loungeComparisonSummary,
  redemptionSummary,
  rewardSummary,
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

  it("includes every indexable SEO comparison page in the sitemap", () => {
    const sitemapUrls = new Set(sitemap().map((entry) => entry.url));
    const missing = INDEXABLE_SEO_COMPARISON_SLUGS.filter((slug) => !sitemapUrls.has(buildCanonicalUrl(`/compare/${slug}`)));

    expect(missing).toEqual([]);
  });

  it("keeps reversed duplicate comparison pages out of sitemap and canonicalizes them", () => {
    const sitemapUrls = new Set(sitemap().map((entry) => entry.url));
    const reversed = getSeoComparison("hsbc-travelone-vs-axis-atlas");
    const preferred = getSeoComparison("axis-atlas-vs-hsbc-travelone");

    expect(reversed?.canonicalSlug).toBe(preferred?.slug);
    expect(sitemapUrls.has(buildCanonicalUrl("/compare/hsbc-travelone-vs-axis-atlas"))).toBe(false);
    expect(sitemapUrls.has(buildCanonicalUrl("/compare/axis-atlas-vs-hsbc-travelone"))).toBe(true);
    expect(buildSeoComparisonMetadata("hsbc-travelone-vs-axis-atlas").alternates?.canonical).toBe(
      buildCanonicalUrl("/compare/axis-atlas-vs-hsbc-travelone")
    );
  });

  it("uses the latest card verification date for comparison sitemap freshness", () => {
    const entries = new Map(sitemap().map((entry) => [entry.url, entry]));

    for (const comparison of SEO_COMPARISONS) {
      const cards = getSeoComparisonCards(comparison);
      expect(cards).toBeTruthy();
      if (!cards) continue;

      if (!INDEXABLE_SEO_COMPARISON_SLUGS.includes(comparison.slug)) continue;

      const entry = entries.get(buildCanonicalUrl(`/compare/${comparison.slug}`));
      expect(entry?.lastModified).toEqual(comparisonLastModifiedDate(cards.cardA, cards.cardB));
    }
  });

  it("makes cashback comparison recommendations tie-aware for lounge and forex", () => {
    const cards = getSeoComparisonCards(getSeoComparison("sbi-cashback-vs-hdfc-swiggy")!);
    expect(cards).toBeTruthy();
    if (!cards) return;

    const recommendation = finalRecommendation(cards.cardA, cards.cardB);
    expect(recommendation).toContain("Neither card has a lounge-access advantage");
    expect(recommendation).toContain("Both cards list the same 3.5% forex markup");
    expect(recommendation).not.toContain("if listed lounge access matters more");
    expect(recommendation).not.toContain("if forex markup is a key part");
  });

  it("does not choose HSBC TravelOne for forex when Axis Atlas has the same forex markup", () => {
    const cards = getSeoComparisonCards(getSeoComparison("hsbc-travelone-vs-axis-atlas")!);
    expect(cards).toBeTruthy();
    if (!cards) return;

    const recommendation = finalRecommendation(cards.cardA, cards.cardB);
    expect(recommendation).toContain("Both cards list the same 3.5% forex markup");
    expect(recommendation).not.toContain("HSBC TravelOne if forex");
  });

  it("includes reward caps and cashback statement-credit fallback from existing card data", () => {
    const cards = getSeoComparisonCards(getSeoComparison("sbi-cashback-vs-hdfc-swiggy")!);
    expect(cards).toBeTruthy();
    if (!cards) return;

    expect(rewardSummary(cards.cardA)).toContain("capped at Rs 2,000/month");
    expect(rewardSummary(cards.cardB)).toContain("capped at Rs 1,500/month");
    expect(redemptionSummary(cards.cardA)).toContain("auto-credited");
  });

  it("uses specific lounge copy for zero-lounge and tiered-lounge comparisons", () => {
    const cashbackPair = getSeoComparisonCards(getSeoComparison("sbi-cashback-vs-hdfc-swiggy")!);
    const travelPair = getSeoComparisonCards(getSeoComparison("hsbc-travelone-vs-axis-atlas")!);
    expect(cashbackPair).toBeTruthy();
    expect(travelPair).toBeTruthy();
    if (!cashbackPair || !travelPair) return;

    expect(loungeComparisonSummary(cashbackPair.cardA, cashbackPair.cardB)).toContain("do not offer complimentary lounge visits");
    expect(loungeComparisonSummary(travelPair.cardA, travelPair.cardB)).toContain("Atlas: Airport lounge access is tiered");
  });

  it("keeps the compare loading skeleton scoped to the interactive tool route group", () => {
    expect(existsSync(join(process.cwd(), "app", "compare", "loading.tsx"))).toBe(false);
    expect(existsSync(join(process.cwd(), "app", "compare", "(tool)", "loading.tsx"))).toBe(true);
  });
});
