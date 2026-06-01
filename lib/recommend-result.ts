import { stripScoringAnnotations } from "./card-index";
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

function extractMilestoneThreshold(benefit: string) {
  const normalized = benefit.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
  const thresholdMatch =
    normalized.match(/annual spend(?:s|ing)?(?: of| above| greater than)? rs (\d+(?:\.\d+)?) lakh/) ??
    normalized.match(/spends of rs (\d+(?:\.\d+)?) lakh/) ??
    normalized.match(/spending rs (\d+(?:\.\d+)?) lakh/) ??
    normalized.match(/rs (\d+(?:\.\d+)?) lakh or more/);

  if (!thresholdMatch) return null;
  return Math.round(Number(thresholdMatch[1]) * 100000);
}

function nextMilestone(cardScore: CardScore) {
  const annualSpend = cardScore.annualSpend;
  const nextBenefit = (cardScore.card.milestoneBenefits ?? [])
    .map((benefit) => ({ benefit, threshold: extractMilestoneThreshold(benefit) }))
    .filter((item): item is { benefit: string; threshold: number } => item.threshold !== null && item.threshold > annualSpend)
    .sort((a, b) => a.threshold - b.threshold)[0];

  if (!nextBenefit) {
    return {
      threshold: null,
      gap: null,
      label: null
    };
  }

  return {
    threshold: nextBenefit.threshold,
    gap: Math.max(nextBenefit.threshold - annualSpend, 0),
    label: stripScoringAnnotations(nextBenefit.benefit)
  };
}

// Map a full CardScore down to the trimmed, display-only DTO that crosses the wire.
export function toRecommendResult(score: CardScore): RecommendResult {
  const { card } = score;
  const feeWaiverHit = Boolean(card.feeWaiverSpend && score.estimatedAnnualFee === 0 && card.annualFee > 0);
  const nextFeeWaiverGap =
    card.feeWaiverSpend && score.annualSpend < card.feeWaiverSpend
      ? Math.max(card.feeWaiverSpend - score.annualSpend, 0)
      : null;
  const milestone = nextMilestone(score);

  return {
    id: card.id,
    name: card.name,
    issuer: card.issuer,
    applyUrl: card.applyUrl,
    tags: card.tags.slice(0, 4),
    estimatedAnnualRewards: Math.round(score.estimatedAnnualRewards),
    estimatedMilestoneValue: Math.round(score.estimatedMilestoneValue),
    estimatedAnnualFee: Math.round(score.estimatedAnnualFee),
    estimatedNetValue: Math.round(score.estimatedNetValue),
    annualFee: Math.round(card.annualFee),
    annualSpend: Math.round(score.annualSpend),
    feeWaiverSpend: card.feeWaiverSpend,
    feeWaiverHit,
    nextFeeWaiverGap: nextFeeWaiverGap === null ? null : Math.round(nextFeeWaiverGap),
    nextMilestoneThreshold: milestone.threshold === null ? null : Math.round(milestone.threshold),
    nextMilestoneGap: milestone.gap === null ? null : Math.round(milestone.gap),
    nextMilestoneLabel: milestone.label,
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
