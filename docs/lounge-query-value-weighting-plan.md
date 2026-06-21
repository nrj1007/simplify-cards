# Plan: Weight lounge value higher for lounge queries (keep envelope scoring)

> Status: **implemented.** `lib/recommend.ts` now weights `travelLoungeValue` by
> `LOUNGE_QUERY_VALUE_WEIGHT` for lounge queries, and `tests/recommend.test.ts` includes a
> regression check that guest-lounge cards outrank comparable unlimited no-guest cards.

## Context
Commit `5828ffa` made lounge queries (`wantsLounge` = the query contains "lounge",
`query-intent.ts` L319) use the **envelope blend**, so "best lounge card" now ranks lounge cards by
their **overall** spend-blended value. The audit shows the problem: among the unlimited-lounge
premium cards the lounge boost's big term — `score×1500 + generalIntlScore×2500 + 8000` (~88k) in
`loungePreferenceBoost` (`lib/recommend.ts` ~L2003-2007) — is **identical** (all have score 40), so
it doesn't separate them. The only differentiator is `travelLoungeValue × 0.5` (which carries the
**guest** credit and spend-condition/access nuances), at only a few thousand — dwarfed by the
envelope net-value spread (tens of thousands). Result: a **no-guest** card (`hdfc-diners-club-black`,
fee 10k) outranks a **4+4-guest** card (`axis-magnus-burgundy`) for "best lounge card".

Goal: keep envelope scoring, but weight the lounge **value** higher for lounge queries so the
lounge-specific signal (guest access, real visit value, spend-conditions) leads, not the card's
overall rewards.

## Change — `loungePreferenceBoost` (`lib/recommend.ts` ~L2040)
Today: `boost += isCategoryFocused ? 0 : Math.round(travelLoungeValue * 0.5);`

Amplify the `travelLoungeValue` weight for lounge queries (it's the term that carries guest +
common-pool + real per-visit value + spend-condition haircuts — i.e. what actually distinguishes
two unlimited-lounge cards):
```ts
const loungeValueWeight = isCategoryFocused ? 0 : (wantsLounge ? LOUNGE_QUERY_VALUE_WEIGHT : 0.5);
boost += Math.round(travelLoungeValue * loungeValueWeight);
```
- `LOUNGE_QUERY_VALUE_WEIGHT` is a new module const — start ~**3** and tune (see verification) so the
  guest/access differential clears the envelope net-value spread.
- Leave the flat `score×1500…` bonus (it correctly separates cards by raw visit count for
  non-unlimited cards), the `wantsInternationalLounge` path (already lounge-dominant:
  `intlScore×4000 + score×300`), the travel-intent branch, and envelope scoring (`5828ffa`) **as-is**.

## Verification
1. Re-run the lounge audit (scratch `scoreCards({query})` for "best lounge card",
   "best international lounge card"): confirm guest cards (`hsbc-premier` 8 intl, `axis-magnus-burgundy`
   /`axis-magnus` 4+4, `kotak-solitaire` 2+2, `yes-marquee` 4+4) lead, and that the unlimited-lounge
   **no-guest** cards (`hdfc-diners-club-black`, `hdfc-infinia`, `icici-emeralde-private`,
   `icici-times-black`) drop **below** comparable guest cards. Tune `LOUNGE_QUERY_VALUE_WEIGHT` until
   the ordering is lounge-led (not net-value-led).
2. `npm test`; review + regen the ranking-golden "lounge"/"lounge-query"/"intl-lounge-query"
   scenarios (`npx vitest run -u tests/ranking-golden.test.ts`). Confirm broad/category/fuel goldens
   are unchanged (the weight only fires for `wantsLounge`).
3. `npx tsx scripts/explain-card-score.ts <card> "best lounge card"` to confirm the larger
   `loungeBoost` magnitude on guest cards vs no-guest cards.
