# Plan (LOCKED) — Workstream B2: net-reward category filter (B follow-up)

> Follow-up to B (`current-strategy-B-category-focus-plan.md`). Fixes "best rent card" still surfacing
> premium all-rounders. Depends on C's surcharge model being in place (it is).

## Context
After B, `category-rent` (and `category-utilities`) still rank premium all-rounders (`hsbc-premier`,
`amex-*`) at the top. Root cause: `rent` is a **`matchByEarning`** category — its filter
(`cardMatchesCategoryFocus`) keeps any card that rewards it "at all", **including base rate** — and
premium cards earn **base** on rent (rent isn't in their exclusions), so they pass. They're not
"0-reward"; they're base-earners. With C's **1% rent surcharge**, those base earners actually net
**≤ 0** on rent. So drop any card whose **net** reward on the focused category is ≤ 0.

Decision (chosen): **net-of-surcharge > 0 only** (fixes rent; utilities — which has no surcharge —
stays as-is, base-earners kept).

## Change — `lib/recommend.ts`
New helper:
```ts
function netCategoryReward(
  card: CreditCard,
  category: SpendCategory,
  monthlyCategorySpend: number,
  includeSmartbuyLikeRewards: boolean
): number {
  const surcharge = (monthlyCategorySpend * getSurchargePercent(card, category)) / 100;
  if (isSpendCategoryExcluded(card, category)) return -surcharge; // 0 reward − surcharge
  const allocations = rewardAllocationsForSpend(card, category, monthlyCategorySpend, includeSmartbuyLikeRewards, monthlyCategorySpend);
  const gross = estimateMonthlyRewardForAllocations(card, allocations, monthlyCategorySpend);
  return gross - surcharge;
}
```
In the `.filter()` chain, when a `focusedCategory` exists (category focus; fuel via the unified
`focusedCategory`), keep only:
```ts
.filter((card) =>
  focusedCategory
    ? netCategoryReward(card, focusedCategory, categoryFocusMonthlySpend[focusedCategory] ?? 8000, includeSmartbuyLikeRewards) > 0
    : true
)
```
Apply **after** the existing `cardMatchesCategoryFocus` filter (which stays as the relevance gate);
this adds a profitability gate. Evaluate at the base focus spend (`categoryFocusMonthlySpend`, i.e.
the envelope's mult-1.0 level).

## Effect
- **`category-rent`** (1% surcharge): base-earners with rent reward ≤ 1% → net ≤ 0 → **filtered**
  (hsbc-premier, amex, etc.). Cards rewarding rent above the surcharge survive → real rent rewarders
  lead.
- **`category-utilities`** (no surcharge): `net = gross`, base-earners kept → unchanged (per the
  decision; #2 would have required above-base here).
- **Reward-bearing categories** (dining/amazon/swiggy, no surcharge): specialists unaffected (they
  net positive and already lead).
- Excluded-category cards (gross 0) → net ≤ 0 → filtered everywhere (already mostly were).

## Edge / watch-items
- **Caps:** at the base focus spend a heavily-capped rent reward could net ≤ 0 (surcharge on full
  spend vs reward only up to a small cap) and get filtered. Acceptable — a tiny cap is weak for a
  rent-heavy spender — but sanity-check that legitimate capped rent rewarders survive; if they don't,
  evaluate at the smallest envelope level (0.5×) instead.
- **Empty pool:** if a surcharged category has no card netting positive, "best rent card" returns
  nothing (per the empty→nothing policy). Confirm rent still has qualifying cards.

## Verification
1. `npx tsx` dump `"best rent card"` — only net-positive rent rewarders appear; premium all-rounders
   gone; pool non-empty. `"best dining card"`/`"best amazon card"` unchanged.
2. `npx vitest run` — `category-rent` (and any surcharged-category) golden shifts; reward-bearing and
   `category-utilities` scenarios unchanged. Regenerate snapshots; review.
3. `npx tsc --noEmit` + `eslint` clean. Commit on `claude/main`; push to `main`.
