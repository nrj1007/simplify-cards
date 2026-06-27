import type { CardScore } from "./types";

export type RankingStrategyName = "absolute-blend" | "max-yield";

export type RankingStrategy = {
  name: RankingStrategyName;
  /** How per-level scores are combined into the ranking key.
   *  "weighted-average" = weighted sum / total weight (absolute-blend behaviour)
   *  "max" = best single level (max-yield: each card judged at its peak-yield sweet spot)
   */
  blendMode: "weighted-average" | "max";
  spendLevels: number[];
  spendWeights: number[];
  perLevelScore(score: CardScore): number; // a level's CardScore -> ranking-key contribution
};

// ---------------------------------------------------------------------------
// max-yield tunable constants
// ---------------------------------------------------------------------------

/** 5 % net-value yield over annualSpend → full 10 000 score. */
const REFERENCE_YIELD = 0.05;

// Boost references — each boost capped at MAX_BOOST_SCORE (5 % of 10 000).
const LOUNGE_BOOST_REF    = 30000; // ~15 visits × ₹2k
const FOREX_BOOST_REF     = 10000;
const POPULARITY_BOOST_REF = 5000; // popularityScore 100 × weight 50
const FLEX_VALUE_REF       = 5000;
const MAX_BOOST_SCORE      = 500;

// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * MY2.2 metric: pure best-of-envelope yield.
 *
 *   yieldScore    = (netValue / annualSpend) / REFERENCE_YIELD × 10 000  (no upper clamp)
 *   perLevelScore = yieldScore  +  Σ boostScores
 *
 * No saturation guard — yield itself is the signal.  blendMode "max" takes the peak level
 * across the envelope, so negative low-spend scores (high-fee card at ₹1L) are naturally
 * ignored in favour of the level where the card actually earns.
 */
function maxYieldPerLevelScore(score: CardScore): number {
  if (!score.annualSpend || score.annualSpend <= 0) return 0;

  const netValue = score.estimatedNetValue;

  // Pure yield score (unclamped above; blendMode "max" ignores negative levels naturally)
  const yieldRate  = netValue / score.annualSpend;
  const yieldScore = (yieldRate / REFERENCE_YIELD) * 10000;

  // Additive boosts (each 0 – 500)
  const debug = score.debug;
  const loungeBoostScore = debug
    ? clamp(debug.loungeBoost / LOUNGE_BOOST_REF, 0, 1) * MAX_BOOST_SCORE
    : 0;
  const forexBoostScore = debug
    ? clamp(debug.forexBoost / FOREX_BOOST_REF, 0, 1) * MAX_BOOST_SCORE
    : 0;
  const popularityBoostScore =
    clamp((score.card.popularityScore * 50) / POPULARITY_BOOST_REF, 0, 1) * MAX_BOOST_SCORE;
  const flexScore = debug
    ? clamp(debug.flexibilityValue / FLEX_VALUE_REF, 0, 1) * MAX_BOOST_SCORE
    : 0;

  return yieldScore + loungeBoostScore + forexBoostScore + popularityBoostScore + flexScore;
}

// ---------------------------------------------------------------------------

export const rankingStrategies: Record<RankingStrategyName, RankingStrategy> = {
  "absolute-blend": {
    name: "absolute-blend",
    blendMode: "weighted-average",
    spendLevels: [120000, 300000, 600000],
    spendWeights: [1, 1.25, 1.5],
    perLevelScore: (score: CardScore) => score.fitScore
  },
  "max-yield": {
    name: "max-yield",
    blendMode: "max",
    spendLevels: [120000, 300000, 600000],
    spendWeights: [1, 1, 1],
    perLevelScore: maxYieldPerLevelScore
  }
};

export const DEFAULT_RANKING_STRATEGY: RankingStrategyName = "absolute-blend";
