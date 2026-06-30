import type { CardScore } from "./types";

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
    spendLevels: [300000, 1000000, 2000000, 3000000],
    spendWeights: [1, 1.25, 1.5, 1.75],
    perLevelScore: (score: CardScore) => score.fitScore
  }
};

export const DEFAULT_RANKING_STRATEGY: RankingStrategyName = "absolute-blend";
