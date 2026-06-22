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

/** A solid mid-tier card's annual net value at its sweet-spot spend (e.g. SBI Cashback ₹15k @ ₹3L).
 *  Cards below this are penalised (tiny-cap gimmicks); above it saturates to 1 (no extra reward). */
const VALUE_SATURATION_REF = 12000;

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
 * MY2.2 metric: best-of-envelope yield with value-saturation guard.
 *
 *   yieldScore   = clamp(netValue / spend / REFERENCE_YIELD, 0, 1) × 10 000
 *   saturation   = clamp(netValue / VALUE_SATURATION_REF, 0, 1)   ← magnitude guard
 *   perLevelScore = yieldScore × saturation  +  Σ boostScores
 *
 * The saturation factor ensures a tiny-cap card (great yield, small value) doesn't
 * outscore a solid all-rounder.  It clamps at 1 so large-value premiums get no bonus.
 * The envelope blend takes the MAX across levels → each card is judged at its sweet spot.
 */
function maxYieldPerLevelScore(score: CardScore): number {
  if (!score.annualSpend || score.annualSpend <= 0) return 0;

  const netValue = score.estimatedNetValue;

  // Yield score (0 – 10 000)
  const yieldRate  = netValue / score.annualSpend;
  const yieldScore = clamp(yieldRate / REFERENCE_YIELD, 0, 1) * 10000;

  // Value-saturation guard (0 – 1): pulls down high-yield tiny-cap cards
  const saturation = clamp(netValue / VALUE_SATURATION_REF, 0, 1);

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

  return yieldScore * saturation + loungeBoostScore + forexBoostScore + popularityBoostScore + flexScore;
}

// ---------------------------------------------------------------------------

export const rankingStrategies: Record<RankingStrategyName, RankingStrategy> = {
  "absolute-blend": {
    name: "absolute-blend",
    blendMode: "weighted-average",
    spendLevels: [300000, 1000000, 2000000, 3000000],
    spendWeights: [1, 1.25, 1.5, 1.75],
    perLevelScore: (score: CardScore) => score.fitScore
  },
  "max-yield": {
    name: "max-yield",
    blendMode: "max",
    // Equal weights + a low ₹1L level so fee-in-yield penalises high-fee premiums at light spend.
    // The blend takes the MAX across levels, so weights are only used for the weighted-average
    // fallback path (unused for max-yield, but kept for interface completeness).
    spendLevels: [100000, 300000, 1000000, 2000000, 3000000],
    spendWeights: [1, 1, 1, 1, 1],
    perLevelScore: maxYieldPerLevelScore
  }
};

export const DEFAULT_RANKING_STRATEGY: RankingStrategyName = "absolute-blend";
