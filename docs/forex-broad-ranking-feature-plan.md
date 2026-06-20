# Plan: Factor forex markup into broad rankings (heuristic boost, approach B)

## Context
Today `forexPreferenceBoost` (`lib/recommend.ts` ~L2030) returns **0** unless the query has
`forex` or `travel` intent, and `defaultSpendProfile.international = 0`, so forex markup is
**invisible on broad "best card" queries** — a 0%-markup card (11 cards have `forexMarkup: 0`)
scores identically to a 3.5% card. Fix: make the forex preference an **always-on signal at low
weight**, mirroring commit `acd51d1`'s lounge-at-50% pattern (full weight on intent, reduced
weight otherwise, suppressed for category/fuel focus).

## Change 1 — `forexPreferenceBoost` (lib/recommend.ts ~L2030)
Add an `isCategoryFocused` param and a third (broad) weight tier instead of the `return 0`:
- **Suppress** when `isCategoryFocused` (forex is irrelevant when picking a dining/fuel specialist).
- Compute `betterThanBaseline = 3.5 - (card.forexMarkup ?? 3.5)`.
- Weight tiers (positive / negative per markup-point):
  - explicit forex query (`intent.tags.includes("forex")`): **30000 / 18000** (unchanged)
  - travel intent (`intent.useCases.includes("travel")`): **3500 / 2000** (unchanged)
  - **broad (neither): 1500 / 1000** ← new always-on low weight
- Return `round(betterThanBaseline * weight)`.

So a 0% card gets ~+5,250 broad, a 5% card ~−1,500; a 3.5% card stays 0. The 1500/1000 broad
weights are the key tunable — start here, dial down if zero-forex cards over-promote.

## Change 2 — caller (lib/recommend.ts ~L2271)
Pass the category-focus flag (same expression the lounge call uses):
```ts
const forexBoost = forexFocus
  ? 0
  : forexPreferenceBoost(card, intent, categoryFocus !== undefined || restrictToFuelCards);
```
`forexFocus` stays suppressed because that path already costs the markup inside net value via
`estimatedForexCost`.

## Notes
- `forexBoost` is part of `sharedBoosts`, so it flows into both the envelope (broad) and
  non-envelope scoring paths automatically — no other wiring.
- Category-focus / fuel rankings are unaffected (suppressed). The explicit zero-forex query mode
  (the `restrictToZeroForexCards` filter) is unaffected.
- Optional: surface the markup in the card's `reasons` (e.g. "Zero forex markup").

## Verification
1. `npm test` — the `ranking-golden` broad scenarios shift (zero-forex/low-markup cards rise,
   high-markup fall); confirm the movement is sensible and that **category/fuel/UPI/segment**
   goldens are unchanged. The "zero forex ranking golden" (`1a6942a`) should be unaffected.
2. `npx tsx scripts/explain-card-score.ts <zero-forex-card> "best credit card"` — confirm the new
   `forexBoost` magnitude (~+5,250) and that a 3.5% card shows `forexBoost: 0`.
3. `npx vitest run -u tests/ranking-golden.test.ts` after reviewing the diff.
4. Commit + push to `main`.
