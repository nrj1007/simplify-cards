# Plan (LOCKED) — MY1: ranking strategy pattern scaffold

> Max-yield workstream MY1. **Pure refactor, zero behavior change** — safe first PR. Siblings:
> `max-yield-MY2-strategy-plan.md`, `max-yield-MY3-flip-default-plan.md`,
> `max-yield-MY-diversity-plan.md` (parked).

## Context
The envelope blend is inlined in `scoreCards`'s `.map` block. To later flip between the current model
and max-yield, extract a **strategy abstraction** and move today's logic into it verbatim — no
ranking change.

## Change
- **`lib/ranking-strategies.ts` (new):**
  ```ts
  export type RankingStrategyName = "absolute-blend" | "max-yield";
  export type RankingStrategy = {
    name: RankingStrategyName;
    spendLevels: number[];
    spendWeights: number[];
    perLevelScore(score: CardScore): number; // a level's CardScore -> ranking-key contribution
  };
  export const rankingStrategies: Record<RankingStrategyName, RankingStrategy>;
  export const DEFAULT_RANKING_STRATEGY: RankingStrategyName = "absolute-blend";
  ```
- **`absolute-blend` = today's behavior verbatim:** `spendLevels [3L,10L,20L,30L]`,
  `spendWeights [1,1.25,1.5,1.75]`, `perLevelScore = (s) => s.fitScore`.
- **Wiring (`lib/recommend.ts` + `lib/types.ts`):** add `input.rankingStrategy?` override; resolve
  `strategy = rankingStrategies[input.rankingStrategy ?? DEFAULT_RANKING_STRATEGY]`; in the envelope
  `.map`, use `strategy.spendLevels`/`spendWeights` and blend `strategy.perLevelScore` (representative
  = max-`perLevelScore` level). Keep the UPI/utility level overrides inline as-is (out of scope).

## Constraint
Default `absolute-blend` reproduces current numbers **exactly**.

## Verification
- `npx vitest run` → **every golden unchanged** (the pass bar). `tsc`/`eslint` clean.
- Commit on `claude/main`; push to `main`.
