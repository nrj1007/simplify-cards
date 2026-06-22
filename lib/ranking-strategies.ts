import type { CardScore } from "./types";

export type RankingStrategyName = "absolute-blend" | "max-yield";

export type RankingStrategy = {
  name: RankingStrategyName;
  spendLevels: number[];
  spendWeights: number[];
  perLevelScore(score: CardScore): number; // a level's CardScore -> ranking-key contribution
};

// --- max-yield tunable constants ---
// 5% net-value yield over annualSpend maps to full 10000 score.
const REFERENCE_YIELD = 0.05;
// Each boost contributes up to 500 (5% of 10000). Reference maxes calibrate the 0-1 clamp.
const LOUNGE_BOOST_REF = 30000;    // typical strong lounge boost (e.g. 15 visits × 2k)
const FOREX_BOOST_REF = 10000;     // typical forex boost
const POPULARITY_BOOST_REF = 5000; // popularityScore 100 × popularityRankingWeight 50
const FLEX_VALUE_REF = 5000;       // annual flexibility value reference
const MAX_BOOST_SCORE = 500;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function maxYieldPerLevelScore(score: CardScore): number {
  if (!score.annualSpend || score.annualSpend <= 0) return 0;

  // Net-value yield: estimatedNetValue already nets rewards − fee − forex + milestone + joining.
  const yieldRate = score.estimatedNetValue / score.annualSpend;
  const yieldScore = clamp(yieldRate / REFERENCE_YIELD, 0, 1) * 10000;

  // Additive boosts (each clamped to 0–500)
  const debug = score.debug;
  const loungeBoostScore = debug
    ? clamp(debug.loungeBoost / LOUNGE_BOOST_REF, 0, 1) * MAX_BOOST_SCORE
    : 0;
  const forexBoostScore = debug
    ? clamp(debug.forexBoost / FOREX_BOOST_REF, 0, 1) * MAX_BOOST_SCORE
    : 0;
  const popularityBoostScore = clamp(
    (score.card.popularityScore * 50) / POPULARITY_BOOST_REF,
    0,
    1
  ) * MAX_BOOST_SCORE;
  const flexScore = debug
    ? clamp(debug.flexibilityValue / FLEX_VALUE_REF, 0, 1) * MAX_BOOST_SCORE
    : 0;

  return yieldScore + loungeBoostScore + forexBoostScore + popularityBoostScore + flexScore;
}

export const rankingStrategies: Record<RankingStrategyName, RankingStrategy> = {
  "absolute-blend": {
    name: "absolute-blend",
    spendLevels: [300000, 1000000, 2000000, 3000000],
    spendWeights: [1, 1.25, 1.5, 1.75],
    perLevelScore: (score: CardScore) => score.fitScore
  },
  "max-yield": {
    name: "max-yield",
    // Equal weights + an extra low-spend level so fee-in-yield penalizes high-fee premiums at ₹1L.
    spendLevels: [100000, 300000, 1000000, 2000000, 3000000],
    spendWeights: [1, 1, 1, 1, 1],
    perLevelScore: maxYieldPerLevelScore
  }
};

export const DEFAULT_RANKING_STRATEGY: RankingStrategyName = "absolute-blend";
