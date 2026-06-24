# Plan (LOCKED) — Workstream B: category focus → realistic 75/25 profile + category envelope

> Workstream **B** of the current-strategy tuning (medium risk — wide golden movement). Siblings:
> `current-strategy-A-filters-plan.md`, `current-strategy-C-special-spend-surcharge-plan.md`.
> **Interacts with C:** "best rent card" net value should deduct the rent surcharge — if C lands,
> wire its `surchargePercent` into this rent focus (see C §9). A and B are otherwise independent.

## Context (corrected)
Today category focus scores at `categoryFocusSpendProfile` = the default profile with the focused
category raised to `categoryFocusMonthlySpend` (dining → ₹8k ≈ **14%** of a ₹57k profile) and ranks by
the **reward on the focused category only** (`valueScore = focusedCategoryReward`, **fee-independent**).
`spendCategoryBoost` (`categoryFitAdjustment`) is **0** here — it only fires for an explicit
single-category user spend. So "best dining card" today is an unrealistic 14%-dining profile ranked
fee-independently. Reframe it to **"best card for a {category}-heavy spender"** (realistic, fee-aware).

## Changes — `lib/recommend.ts`
- **Profile:** focused category = **75%** of total monthly spend; remaining **25%** split across the
  other categories by their default-profile proportions.
- **Category-realistic envelope** (NOT the broad ₹3L–30L levels): score the 75/25 profile with the
  focused category at `[0.5, 1, 2] × categoryFocusMonthlySpend[category]` (e.g. dining `[4k,8k,16k]/mo`,
  rent `[25k,50k,100k]/mo`), others scaled to hold 75/25. **Equal-weight** blend across the 3 levels
  (the levels are already the realistic range; no high-spend lean).
- **Rank by net value (fee-aware):** drop the `focusedSpendCategory` special-case in `valueScore`
  (`~L2426-2432`); use `estimatedNetValue` like broad. A specialist earns its accelerated rate on 75%
  of spend → wins on net value; an excluder earns ~0 on 75% → ranks low naturally.
- **Remove `spendCategoryBoost`** (`categoryFitAdjustment`, ±32k/35k/90k): the 75% weight + net value
  reproduce its effect via real economics; its only live case (single-category user spend) is also
  handled by net value. Delete the function + its use + `debug`/`ScoreDebug`/`reasons` entries.
- **Remove `categorySpecialistBoost`** (+strength×7000): no strong case — fee-aware net value on 75%
  surfaces specialists, and the flat boost fights fee-awareness (ignores fee/caps). **Keep** the
  category **filter** (`cardMatchesCategoryFocus`) as the relevance gate; matchByEarning categories
  (rent/utilities) are handled by net value (a card earning on rent gets value on 75% rent). Keep
  lounge/forex/popularity value boosts.

## Dependency on C (surcharge)
"Best rent card" = 75% rent. If Workstream C is in, deduct the rent surcharge from the rent earning
here so a rent specialist's net value is honest. If B lands before C, note it and wire the surcharge
into this path when C ships.

## Verification
1. `npx tsx` dump `"best dining card"`, `"best grocery card"`, `"best amazon card"`, `"best rent
   card"` — each card surfaces at a realistic category-spend level; specialists lead; high-fee
   specialists are tempered by fee but recover at the higher category-spend tier.
2. `npx vitest run` — **all `category-*` and `merchant-*` golden scenarios shift** (profile + metric
   change). Regenerate `tests/__snapshots__/ranking-golden.test.ts.snap`; sanity-check that the right
   specialist leads each category and that no excluder slips in. Move untracked WIP cards out of
   `data/cards/` before `-u`.
3. Add a unit test: a category specialist outranks a high-net-value generalist for its category, and
   an excluder ranks at the bottom.
4. `npx tsc --noEmit` + `eslint` clean. Commit on `claude/main` (separate from A/C); push to `main`.

## Decisions (locked)
fee-**aware** (75/25 net value) · **category-based** realistic envelope levels · 25% split
**realistically** (default-profile proportions) · **remove** `spendCategoryBoost` **and**
`categorySpecialistBoost` · keep the category filter + lounge/forex/popularity boosts.
