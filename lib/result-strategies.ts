import type { CardScore } from "./types";

// ---------------------------------------------------------------------------
// Result (presentation) strategy — orthogonal to ranking strategy.
// Controls how the already-scored/ordered card list is presented.
// ---------------------------------------------------------------------------

export type ResultStrategyName = "single-list" | "reward-type-split";

export type ResultSection = {
  title: string;
  cards: CardScore[];
};

export type ResultStrategy = {
  name: ResultStrategyName;
  /** Partition the already-ranked scored list into one or more titled sections. */
  group(
    scored: CardScore[],
    maxPerSection: number,
    options?: { isBlend?: boolean }
  ): ResultSection[];
};

export const DEFAULT_RESULT_STRATEGY: ResultStrategyName = "single-list";

export type SplitScope = "off" | "broad-only" | "any-query";
export const SPLIT_SCOPE: SplitScope = "any-query";



// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when cashback is a reward currency of this card (including mixed-currency).
 *
 * Contrast with `cardEarnsCashback()` in `recommend.ts`, which returns `true` for
 * mixed-currency cards (used for pool-restriction in "best cashback card" queries,
 * where any cashback earning qualifies).
 */
export function isPrimaryCashbackCard(score: CardScore): boolean {
  const rt = score.card.rewardType?.toLowerCase() ?? "";
  return /cashback/.test(rt);
}

// ---------------------------------------------------------------------------
// Strategy implementations
// ---------------------------------------------------------------------------

const singleList: ResultStrategy = {
  name: "single-list",
  group(scored, maxPerSection) {
    return [{ title: "", cards: scored.slice(0, maxPerSection) }];
  }
};

const rewardTypeSplit: ResultStrategy = {
  name: "reward-type-split",
  group(scored, maxPerSection, options) {
    // Dual-bucket cards feature in BOTH sections, valued per section:
    //  - cashback-primary dual (rewardBucketScore set, e.g. CheQ AU): default score in Cashback,
    //    reward-rate score in Rewards.
    //  - reward-primary dual (cashbackBucketScore set, e.g. au-ixigo): default score in Rewards,
    //    cashback-rate score in Cashback.
    const rewards = scored
      .filter((c) => !isPrimaryCashbackCard(c) || c.rewardBucketScore !== undefined)
      .map((c) => c.rewardBucketScore ?? c)
      // dual cards carry a per-section value, so re-sort by net value.
      .sort((a, b) => b.estimatedNetValue - a.estimatedNetValue);
    const cashback = scored
      .filter((c) => isPrimaryCashbackCard(c) || c.cashbackBucketScore !== undefined)
      .map((c) => c.cashbackBucketScore ?? c)
      .sort((a, b) => b.estimatedNetValue - a.estimatedNetValue);

    if (options?.isBlend) {
      rewards.sort((a, b) => {
        const scoreA = a.envelopeScoring?.normalizedFitScore;
        const scoreB = b.envelopeScoring?.normalizedFitScore;
        if (scoreA !== undefined && scoreB !== undefined) {
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
        }
        return b.estimatedNetValue - a.estimatedNetValue;
      });
      cashback.sort((a, b) => {
        const scoreA = a.envelopeScoring?.splitOrderScore;
        const scoreB = b.envelopeScoring?.splitOrderScore;
        if (scoreA !== undefined && scoreB !== undefined) {
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
        }
        return b.estimatedNetValue - a.estimatedNetValue;
      });
    }

    return [
      { title: "Rewards cards", cards: rewards.slice(0, maxPerSection) },
      { title: "Cashback cards", cards: cashback.slice(0, maxPerSection) }
    ];
  }
};

export const resultStrategies: Record<ResultStrategyName, ResultStrategy> = {
  "single-list": singleList,
  "reward-type-split": rewardTypeSplit
};
