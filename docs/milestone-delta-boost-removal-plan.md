# Plan: Remove the milestone delta boost (`comparisonMilestoneAndWaiverDelta`)

> Resolves the `c9d301b` TODO ("evaluate milestone delta boost need").

## Context
`comparisonMilestoneAndWaiverDelta` (`lib/recommend.ts` L2273-2276) gives a card partial credit
(×`broadComparisonUpsideWeight` = 0.4, L86) for the gap between its **best-case** milestone +
fee-waiver value across all thresholds (`comparisonMilestoneAndWaiverValue(card)`, L1223) and the
milestone + waiver value realized at the single scoring-spend snapshot. It only fires for
`broadNoSpendRankingQuery && !useEnvelopeScoring && !forexFocus && !categoryFocus && !restrictToFuelCards`.

**Why remove it — it's a redundant, cruder stand-in for envelope scoring:**
- Broad "best card" queries now use the **envelope blend** (scores each card at 3L/10L/20L/30L,
  `blendAnnualSpendLevels` L103), which captures milestone + fee-waiver upside **directly** at
  reachable spend. The delta is gated `!useEnvelopeScoring` precisely to avoid double-counting —
  i.e. on every query the envelope handles, the delta is already off.
- Its surviving live surface is a narrow, inconsistent corner: fee-capped/broad phrasings the
  envelope gate misses — `isTargetedEnvelopeQuery` (L2128) matches the exact string
  `"best card(s) under 5000"` (→ envelope, delta off), but **not** `"top card under 5000"` (regex
  wants "best") nor `"best card under 2000"` (the threshold is hardcoded to `5000`). So
  near-identical queries get two different milestone mechanisms.
- It's crude where it does fire: it credits 0.4 × the gap to the **max over all thresholds**,
  including very-high (₹10–15L) milestones a fee-capped/budget user is unlikely to reach. The
  single snapshot is the default profile (~₹6.4L/yr, L8-26), so high thresholds inflate the gap.
- A more targeted broad-query milestone signal already exists and stays:
  `milestoneSpecialistBoost` (L1237), which lifts cards *identified* as milestone cards.

**Blast radius is minimal:** none of the 40+ `ranking-golden` scenarios exercise the delta path
(`"best card under 5000"` → envelope; `"best dining card under 5000"` → category focus; both
suppress it). The **only** test that exercises it is `tests/recommend.test.ts:473` (`"top card
under 5000"`).

## Changes — all in `lib/recommend.ts` unless noted
1. **Delete the boost computation** (L2269-2276): remove `currentMilestoneAndWaiverValue`,
   `maxComparisonMilestoneAndWaiverValue`, and `comparisonMilestoneAndWaiverDelta`.
2. **Delete the reason string** (L2333-2334, the `"Higher milestone and fee-waiver upside…"`
   entry).
3. **Remove it from `sharedBoosts`** (L2364) and from the `debug` object (L2428).
4. **Delete the now-unused helpers/consts:** `comparisonMilestoneAndWaiverValue` (L1223-1235) and
   `broadComparisonUpsideWeight` (L86) — confirm no other references (grep showed none outside the
   delta).
5. **`lib/types.ts` L269** — remove `comparisonMilestoneAndWaiverDelta: number;` from the
   `ScoreDebug` interface.
6. **`tests/recommend.test.ts` L473-485** — delete the
   `"uses the best milestone and fee-waiver upside for broad ranking comparisons"` test (its
   behavior is intentionally gone). Leave a one-line comment noting milestone upside is now carried
   by envelope scoring + `milestoneSpecialistBoost`.

## Note (intentionally out of scope)
The `"top card under 5000"` vs `"best card under 5000"` split, and the fee-cap-aware envelope
weight branches at L2485-2500 (currently unreachable because `shouldUseEnvelopeScoring` requires
`effectiveMaxAnnualFee === undefined`), are a separate, larger "route all fee-capped broad queries
through the envelope" change. Not done here — removing the delta is the focused cleanup; mention as
a follow-up only.

## Verification
1. `npm test` — expect **only** `recommend.test.ts` to need the edit above; `ranking-golden`
   snapshots should be **unchanged** (confirms the delta wasn't influencing any golden ordering).
   If any golden moves, stop and investigate (would mean a scenario silently relied on it).
2. `npx tsx scripts/explain-card-score.ts hsbc-travelone "top card under 5000"` — confirm
   `fitScore ≈ estimatedNetValue + (popularity/tag/other boosts)` with **no** ~₹6,000
   milestone-upside term, and no `comparisonMilestoneAndWaiverDelta` in `debug`.
3. `npm run lint` + `tsc` (via build or editor) — confirm no dangling references to the removed
   symbols.
4. Commit + push to `main`.
