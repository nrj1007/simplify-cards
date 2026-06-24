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
  group(scored: CardScore[], maxPerSection: number): ResultSection[];
};

export const DEFAULT_RESULT_STRATEGY: ResultStrategyName = "single-list";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when cashback is the **primary** reward currency of this card.
 *
 * Mixed-currency cards (`rewardType: "cashback and reward points"`) return `false` —
 * cashback is secondary there, so the split routes them to the Rewards bucket.
 *
 * Contrast with `cardEarnsCashback()` in `recommend.ts`, which returns `true` for
 * mixed-currency cards (used for pool-restriction in "best cashback card" queries,
 * where any cashback earning qualifies).
 */
export function isPrimaryCashbackCard(score: CardScore): boolean {
  const rt = score.card.rewardType?.toLowerCase() ?? "";
  // "cashback and reward points" → Rewards bucket (cashback is secondary)
  if (rt.includes("and") && rt.includes("cashback")) return false;
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
    const rewards: CardScore[] = [];
    const cashback: CardScore[] = [];

    for (const score of scored) {
      if (isPrimaryCashbackCard(score)) {
        cashback.push(score);
      } else {
        rewards.push(score);
      }
      // Stop once both buckets are full
      if (rewards.length >= maxPerSection && cashback.length >= maxPerSection) break;
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
