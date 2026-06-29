# Plan 2 — Split recommend.ts

## Context

`lib/recommend.ts` is 3,032 lines with 16 public exports. It contains at least five distinct
concerns that have been added incrementally:

- **Filter predicates** — `shouldRestrictToFuelCards`, `shouldRestrictToUpiCards`,
  `shouldRestrictToIssuer`, `shouldRestrictToLowForexCards`, `shouldRestrictToZeroForexCards`, etc.
- **Category-focus engine** — `categoryFocusConfigs` (the 600-line array), `detectCategoryFocus`,
  `cardMatchesCategoryFocus`, the spend-profile shapers (`categoryFocus75_25SpendProfile`, etc.)
- **Reward / score math** — `rewardUnitValue`, `effectivePointValue`, `findDirectRewardForSpend`,
  `netCategoryReward`, `computeQueryKeywordBoost`, etc.
- **Milestone extraction** — `MilestoneRule`, `milestoneRulesForCard`, `structuredMilestoneRules`,
  `textMilestoneRules`, `extractMilestoneThreshold`, `joiningAndRenewalBenefitValueForCard`
- **Orchestration** — `scoreCards`, `answerFromCards`, `applyResultStrategy`

At this size, a single-line change to scoring requires loading the whole file into context; a
change to category configs risks breaking milestone logic; tests cover the public surface but
intermediate functions can't be tested in isolation. Splitting is the prerequisite for further
scoring improvements.

**Constraint:** the public import surface must not change. Every module that currently does
`import { milestoneRulesForCard, scoreCards } from "@/lib/recommend"` must keep working without
edits. Use re-exports in `recommend.ts` to maintain compatibility.

## New file map

```
lib/recommend-filters.ts       — query/card filter predicates
lib/recommend-category-focus.ts — category focus configs + detection
lib/recommend-milestones.ts    — MilestoneRule type + extraction helpers
lib/recommend-scoring.ts       — per-card reward math, point values, boosts
lib/recommend.ts               — orchestration (scoreCards, answerFromCards,
                                  applyResultStrategy) + re-exports for compat
```

## Files to change / add

### 1. `lib/recommend-filters.ts` (new)

Move the following functions (roughly lines 390–570 today):

- `normalizeIssuer`
- `shouldIncludeSmartbuyLikeRewards`
- `hasExplicitAnnualFeeLanguage`
- `shouldRestrictToIssuer`
- `isCardRecommendationQuery`
- `shouldRestrictToMinimumRentReturn`
- `clearsMinimumRentReturn`
- `hasUpiCardSignal`
- `shouldRestrictToUpiCards`
- `explicitNetworkFilters`
- `cardMatchesNetworkFilter`
- `hasFuelCardSignal`
- `shouldRestrictToFuelCards`
- `cardEarnsCashback`
- `shouldRestrictToCashbackCards`
- `shouldRestrictToZeroForexCards`
- `shouldRestrictToLowForexCards`

Imports needed: `RecommendationInput`, `CreditCard`, `SpendCategory` from `./types`;
`parseQueryIntent` return type from `./query-intent`; `SpendProfile` from `./types`.

### 2. `lib/recommend-category-focus.ts` (new)

Move (roughly lines 593–869):

- `CategoryFocusConfig` type
- `categoryFocusConfigs` array (the bulk of this block)
- `categoryFocusKeys` export
- `detectCategoryFocus`
- `cardHasCategoryFocusTag`
- `cardPositioningMatchesFocus`
- `cardEarnsOnSpendCategory`
- `cardMatchesCategoryFocus`
- `focusedSpendProfile`
- `categoryFocus75_25SpendProfile`
- `weightedFocusSpendProfile`
- `categoryFocusMonthlySpend`
- `onlineProxyFocusKeys`

Imports needed: `CreditCard`, `SpendCategory`, `SpendProfile`, `RecommendationInput` from
`./types`; `parseQueryIntent` return type; `findDirectRewardForSpend` from
`./recommend-scoring` (or keep a thin interface to avoid a cycle — see note below).

### 3. `lib/recommend-milestones.ts` (new)

Move (roughly lines 1062–1355):

- `extractMilestoneThreshold`
- `estimateBenefitLineValue`
- `estimateMilestoneLineValue`
- `milestoneValueForCard`
- `MilestoneRule` type
- `milestoneRulesForCard`
- `structuredMilestoneRules`
- `textMilestoneRules`
- `joiningAndRenewalBenefitValueForCard`

Imports needed: `CreditCard`, `Milestone` from `./types`; `estimatePointUnitValue` from
`./recommend-scoring`.

### 4. `lib/recommend-scoring.ts` (new)

Move the reward math functions (roughly lines 1039–2250):

- `monthlySpendTotal`, `annualSpendTotal`
- `parseRupeeAmount`
- `estimatePointUnitValue`, `baseRewardUnitValue`, `estimateFallbackPointUnitValue`
- `rewardLiquidityMultiplier`, `rewardUnitValue`, `effectivePointValue`
- `aliasesForSpendCategory`, `specialAliasesForSpendCategory`
- `findDirectRewardForSpend`, `netCategoryReward`
- `requiresRelationshipAccess`, `shouldHideCardFromGenericRanking`
- `cardUseCaseStrength`, `cardMatchesSegment`, `cardMatchesRedemptionBucket`
- `qualifiesAsTravelCard`, `getAirMilesValue`
- `redemptionPreferenceValueBoost`, `rewardLiquidityMultiplier`
- `bestRewardEconomicsForCard`
- `scaleSpendProfileToMonthly`, helper label formatters
- `computeQueryKeywordBoost`, `computeCardNameBoost`, `computeRelevanceScore`
- `blendAnnualSpendLevelWeights`, `blendAnnualSpendLevels`
- `scoreOneCard`

This is the largest chunk. Keep the internal helpers non-exported (they're not in the public
surface) — only export what `recommend.ts` calls directly.

### 5. `lib/recommend.ts` (shrink + re-export)

After moving the above, `recommend.ts` keeps only:

- `defaultSpendProfile` (stays here — it's a config constant)
- `isBroadNoSpendQuery`, `isBroadGenericRankingQuery`, `shouldUseEnvelopeScoring`
- `requestedTopCardCount`
- `scoreCards` — the main orchestration function
- `answerFromCards`
- `applyResultStrategy`

Add re-exports to maintain the public surface:

```ts
export { categoryFocusKeys } from "./recommend-category-focus";
export type { MilestoneRule } from "./recommend-milestones";
export {
  milestoneRulesForCard,
  extractMilestoneThreshold,
  estimateBenefitLineValue,
  estimateMilestoneLineValue,
  joiningAndRenewalBenefitValueForCard
} from "./recommend-milestones";
export {
  cardMatchesSegment,
  qualifiesAsTravelCard,
  getAirMilesValue
} from "./recommend-scoring";
```

### 6. `tests/` — no changes required

Tests import from `@/lib/recommend` and that surface is preserved. Add targeted unit tests for
the new modules (e.g. `recommend-filters.test.ts`) as a follow-up, not part of this plan.

## Cycle-avoidance note

`recommend-category-focus.ts` calls `findDirectRewardForSpend` (in `recommend-scoring.ts`), and
`recommend-scoring.ts` may call `cardMatchesCategoryFocus`. If a cycle forms, break it by
passing the needed function as a parameter rather than importing it. The simplest safe topology:

```
types.ts (no deps)
  ↑
recommend-filters.ts
recommend-milestones.ts
recommend-scoring.ts
  ↑
recommend-category-focus.ts  (imports findDirectRewardForSpend from scoring)
  ↑
recommend.ts  (imports all four + result-strategies + query-intent)
```

## Execution order

1. Create the four new files, moving functions one group at a time.
2. After each move, run `npm run lint && npx tsc --noEmit && npm test`.
3. Update `recommend.ts` to import from the new files + add re-exports.
4. Final check: `npm run build` must pass with no new TS errors.
