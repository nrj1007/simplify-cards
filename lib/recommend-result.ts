import { stripScoringAnnotations } from "./card-index";
import { getCardUsp } from "./card-usp";
import { compareResultDisplayOrder } from "./result-strategies";
import type { CardScore, RecommendResult, SpendCategory } from "./types";

// Canonical order of the spend categories the recommender accepts.
export const SPEND_CATEGORIES: SpendCategory[] = [
  "online",
  "base",
  "travel",
  "hotels",
  "airlines",
  "fuel",
  "dining",
  "grocery",
  "amazon",
  "upi",
  "utilities",
  "rent",
  "insurance",
  "education",
  "gold",
  "government",
  "international"
];

function extractMilestoneThreshold(benefit: string) {
  const normalized = benefit.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
  const thresholdMatch =
    normalized.match(/annual spend(?:s|ing)?(?: of| above| greater than)? rs (\d+(?:\.\d+)?) lakh(?:s)?/) ??
    normalized.match(/spends of rs (\d+(?:\.\d+)?) lakh(?:s)?/) ??
    normalized.match(/spending rs (\d+(?:\.\d+)?) lakh(?:s)?/) ??
    normalized.match(/rs (\d+(?:\.\d+)?) lakh(?:s)? or more/) ??
    normalized.match(/rs (\d+(?:\.\d+)?) lakh(?:s)?\s+(?:annual\s+)?spend/);

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

function netValueContextLabel(score: CardScore) {
  if (score.displayValueContext === "rewards") return "as rewards";
  if (score.displayValueContext === "cashback") return "as cashback";
  return undefined;
}

function aggregateBreakdown(score: CardScore): RecommendResult["breakdown"] {
  const byCategory = new Map<SpendCategory, { spendCategory: SpendCategory; monthlySpend: number; annualReward: number }>();

  for (const row of score.displayBreakdown) {
    if (row.monthlySpend <= 0) continue;
    const existing = byCategory.get(row.spendCategory);
    if (existing) {
      existing.monthlySpend += row.monthlySpend;
      existing.annualReward += row.annualReward;
    } else {
      byCategory.set(row.spendCategory, {
        spendCategory: row.spendCategory,
        monthlySpend: row.monthlySpend,
        annualReward: row.annualReward
      });
    }
  }

  return Array.from(byCategory.values()).map((row) => ({
    spendCategory: row.spendCategory,
    monthlySpend: Math.round(row.monthlySpend),
    annualReward: Math.round(row.annualReward)
  }));
}

// Map a full CardScore down to the trimmed, display-only DTO that crosses the wire.
export function toRecommendResult(score: CardScore): RecommendResult {
  const { card } = score;
  const contextLabel = netValueContextLabel(score);
  const feeWaiverHit = Boolean(card.feeWaiverSpend && score.displayAnnualFee === 0 && card.annualFee > 0);
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
    affiliateUrl: card.affiliateUrl,
    tags: card.tags.slice(0, 4),
    rewardType: card.rewardType,
    usp: getCardUsp(card),
    // Display the full face reward value (no liquidity haircut) — ranking/ordering uses the
    // discounted estimated* fields, but users see real redemption value.
    estimatedAnnualRewards: Math.round(score.displayAnnualRewards),
    estimatedMilestoneValue: Math.round(score.estimatedMilestoneValue),
    estimatedAnnualFee: Math.round(score.displayAnnualFee),
    estimatedJoiningAndRenewalValue: Math.round(score.estimatedJoiningAndRenewalValue),
    estimatedForexCost: Math.round(score.estimatedForexCost),
    estimatedNetValue: Math.round(score.displayNetValue),
    ...(contextLabel ? { netValueContextLabel: contextLabel } : {}),
    annualFee: Math.round(card.annualFee),
    annualSpend: Math.round(score.annualSpend),
    feeWaiverSpend: card.feeWaiverSpend,
    feeWaiverHit,
    nextFeeWaiverGap: nextFeeWaiverGap === null ? null : Math.round(nextFeeWaiverGap),
    nextMilestoneThreshold: milestone.threshold === null ? null : Math.round(milestone.threshold),
    nextMilestoneGap: milestone.gap === null ? null : Math.round(milestone.gap),
    nextMilestoneLabel: milestone.label,
    scoreReasons: score.scoreReasons,
    breakdown: aggregateBreakdown(score)
  };
}

// Rank scored cards by the canonical recommendation display order and return the top 5.
export function rankResults(scored: CardScore[]): RecommendResult[] {
  return scored
    .slice()
    .sort(compareResultDisplayOrder)
    .slice(0, 5)
    .map(toRecommendResult);
}
