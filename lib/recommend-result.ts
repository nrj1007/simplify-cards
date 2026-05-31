import type { CardScore, RecommendResult, SpendCategory } from "./types";

// Canonical order of the spend categories the recommender accepts.
export const SPEND_CATEGORIES: SpendCategory[] = [
  "online",
  "base",
  "travel",
  "fuel",
  "dining",
  "grocery",
  "amazon",
  "upi",
  "utilities",
  "rent",
  "insurance",
  "education",
  "gold"
];

// Map a full CardScore down to the trimmed, display-only DTO that crosses the wire.
export function toRecommendResult(score: CardScore): RecommendResult {
  const { card } = score;
  return {
    id: card.id,
    name: card.name,
    issuer: card.issuer,
    applyUrl: card.applyUrl,
    tags: card.tags.slice(0, 4),
    estimatedAnnualRewards: Math.round(score.estimatedAnnualRewards),
    estimatedAnnualFee: Math.round(score.estimatedAnnualFee),
    estimatedNetValue: Math.round(score.estimatedNetValue),
    breakdown: score.rewardBreakdown
      .filter((row) => row.monthlySpend > 0)
      .map((row) => ({
        spendCategory: row.spendCategory,
        monthlySpend: row.monthlySpend,
        annualReward: Math.round(row.annualReward)
      }))
  };
}

// Rank scored cards by net value to the user and return the top 5 as trimmed DTOs.
export function rankResults(scored: CardScore[]): RecommendResult[] {
  return scored
    .slice()
    .sort((a, b) => b.estimatedNetValue - a.estimatedNetValue)
    .slice(0, 5)
    .map(toRecommendResult);
}
