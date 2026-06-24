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
 * A card is treated as a "cashback card" when its rewardType contains "cashback"
 * (case-insensitive).  Mixed-currency cards ("cashback and reward points") go to
 * the Rewards bucket because cashback is secondary there.
 */
export function hasCashbackCardSignal(score: CardScore): boolean {
  const rt = score.card.rewardType?.toLowerCase() ?? "";
  // "cashback and reward points" → Rewards bucket (mixed-currency decision)
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
      if (hasCashbackCardSignal(score)) {
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
