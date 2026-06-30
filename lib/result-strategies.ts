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
    maxPerSection: number
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
  group(scored, maxPerSection) {
    // Dual-bucket cards feature in BOTH sections, valued per section:
    //  - cashback-primary dual (rewardBucketScore set, e.g. CheQ AU): default score in Cashback,
    //    reward-rate score in Rewards.
    //  - reward-primary dual (cashbackBucketScore set, e.g. au-ixigo): default score in Rewards,
    //    cashback-rate score in Cashback.
    const rewards = scored
      .filter((c) => !isPrimaryCashbackCard(c) || c.rewardBucketScore !== undefined)
      .map((c) => c.rewardBucketScore ?? c);
    const cashback = scored
      .filter((c) => isPrimaryCashbackCard(c) || c.cashbackBucketScore !== undefined)
      .map((c) => c.cashbackBucketScore ?? c);

    // Fill-up: total target = maxPerSection * 2 (i.e. 10 when maxPerSection = 5).
    // If one bucket has fewer cards than maxPerSection, lend the unused slots to the other.
    const totalTarget = maxPerSection * 2;
    const cashbackAlloc = Math.min(cashback.length, maxPerSection);
    const rewardsAlloc = Math.min(rewards.length, totalTarget - cashbackAlloc);
    // Re-check: rewards may also be short, so give leftover back to cashback.
    const finalCashbackAlloc = Math.min(cashback.length, totalTarget - rewardsAlloc);

    return [
      { title: "Cashback cards", cards: cashback.slice(0, finalCashbackAlloc) },
      { title: "Rewards cards", cards: rewards.slice(0, rewardsAlloc) }
    ];
  }
};

export const resultStrategies: Record<ResultStrategyName, ResultStrategy> = {
  "single-list": singleList,
  "reward-type-split": rewardTypeSplit
};
