# Plan (LOCKED) — MY2: max-yield strategy

> Max-yield workstream MY2. Adds the new strategy **behind the flag** (default stays
> `absolute-blend`), so still **zero golden churn** until MY3 flips it. Depends on MY1.

## Context
Broad "best credit card" is swept by super-premium cards because `absolute-blend` ranks by absolute ₹
net value over a high-spend-leaning envelope. `max-yield` ranks by **net-value yield** so fee-tiers
compete on return — surfacing non-super-premium **all-rounders**.

## Change — `lib/ranking-strategies.ts`
Add the `max-yield` strategy:
- **Envelope: equal weight + a low level** — `spendLevels [1L, 3L, 10L, 20L, 30L]`,
  `spendWeights [1,1,1,1,1]`.
- **`perLevelScore` = normalized 0–10000:**
  - **Net-value yield (fee included):** `yield = score.estimatedNetValue / score.annualSpend`
    (`estimatedNetValue` already nets rewards − fee − forex + milestone + joining). Score =
    `clamp(yield / REFERENCE_YIELD, 0, 1) × 10000`. Negative yield (high-fee card losing money at ₹1L)
    floors at 0.
  - **Boosts at 5% each (max 500):** lounge, forex, popularity, flexibility (read from `score.debug`)
    — each `clamp(raw / ref, 0, 1) × 500`. Net yield dominates (10000 vs ≤ ~2000 total).
  - `perLevelScore = yieldScore + Σ boostScores`.
- Blend = equal-weight average (via `spendWeights`); representative = display level (realistic ~₹10L
  or max-score level).
- **Tunable consts:** `REFERENCE_YIELD` (e.g. `0.05` = 5% net yield → full 10000), per-boost reference
  maxes, the `0.05` boost weight.

Note: `score.debug` already carries `loungeBoost`/`forexBoost`/`flexibilityValue` and
`card.popularityScore` — no new plumbing into `scoreCardForSpend`.

## Why it features all-rounders
Yield is over the **full broad multi-category profile** → consistent multi-category earners score
high; the **₹1L level + fee-in-yield** penalize high-fee premiums at low spend; **equal weight** stops
the ₹30L tier deciding everything. A ₹500-fee 2% all-rounder competes head-to-head with a premium.

## Applies to category focus too (no `fitScore` fallback)
`max-yield` is the ranking metric **everywhere the envelope runs — broad AND category/fuel focus**.
MY1 already wires this correctly: the category-focus envelope block builds its **own** realistic levels
(`[0.5,1,2] × categoryFocusMonthlySpend`) and only borrows `strategy.perLevelScore` for the metric, so
under `max-yield` category focus becomes **yield at its own category-realistic spends** (it does NOT
inherit the `[1L…30L]` broad levels). Do **not** special-case focus back to `fitScore`.
- **Metric for focus** = `netValue(75/25 profile) / spend` — a deliberate change from B's *absolute*
  net value. Effect: surfaces efficient category specialists over high-fee premiums (a ₹500-fee dining
  card beats a ₹10k premium whose absolute dining value was padded by the 25% others + welcome
  benefits); at the `0.5×` level a premium's fee tanks its yield, helping mid-tier cards; and the
  popularity leak shrinks (popularity is now a ≤500 boost, not the absolute `×50`).
- Net: the two strategies stay symmetric — `absolute-blend` = absolute net value everywhere,
  `max-yield` = yield everywhere (each at its own realistic levels).
- **Golden impact:** under `max-yield`, **category/merchant scenarios also differ** from
  `absolute-blend` (not just broad). The MY2 `max-yield` golden (below) captures this for review before
  the MY3 flip.

## Verification
1. `npx tsx`: `scoreCards({ query: "best credit card", rankingStrategy: "max-yield" })` vs
   `"absolute-blend"` — mid-tier all-rounders surface, premiums don't sweep; print the 0–10000
   per-factor breakdown (yield + each boost); tune `REFERENCE_YIELD`.
2. `npx vitest run` — default unchanged → **existing goldens green**. Add a unit test: a mid-tier
   all-rounder ranks among the top for `"best credit card"` under `max-yield`.
3. **Add a second golden for `max-yield`.** In `tests/ranking-golden.test.ts`, run each scenario a
   second time with `rankingStrategy: "max-yield"` and snapshot it (e.g. a parallel
   `ranking golden (max-yield)` block, or a `{ scenario: { "absolute-blend", "max-yield" } }` map).
   This locks/reviews `max-yield` ordering **without** flipping the live default. Focused scenarios
   will match the default golden (strategy only drives the broad envelope); broad scenarios differ —
   that diff is the thing to review.
4. `tsc`/`eslint` clean; commit on `claude/main`.
