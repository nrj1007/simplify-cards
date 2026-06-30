import type { CardScore } from "./types";
import { REWARD_BLEND_SPEND_LEVELS, REWARD_BLEND_WEIGHTS } from "./ranking-config";

export type RankingStrategyName = "absolute-blend";

export type RankingStrategy = {
  name: RankingStrategyName;
  spendLevels: number[];
  spendWeights: number[];
  perLevelScore(score: CardScore): number; // a level's CardScore -> ranking-key contribution
};

// ---------------------------------------------------------------------------

export const rankingStrategies: Record<RankingStrategyName, RankingStrategy> = {
  "absolute-blend": {
    name: "absolute-blend",
    spendLevels: REWARD_BLEND_SPEND_LEVELS,
    spendWeights: REWARD_BLEND_WEIGHTS,
    perLevelScore: (score: CardScore) => score.fitScore
  }
};

export const DEFAULT_RANKING_STRATEGY: RankingStrategyName = "absolute-blend";
