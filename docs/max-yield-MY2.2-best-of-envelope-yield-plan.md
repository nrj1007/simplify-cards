# Plan (LOCKED) — MY2.2: best-of-envelope yield

> Revises the `max-yield` **metric** from MY2 (which *averaged* per-level yield) to **best-of-envelope
> yield** — each card taken at its own peak-yield spend. Goal: surface efficient mid-tier all-rounders
> (e.g. SBI Cashback 5%@₹3L beats TravelOne 4%@₹30L). Depends on MY1; sits between MY2 and MY3.
> **No saturation factor, no yield clamp** (removed by decision — see watch-item).

## Context
MY2's average-of-per-level-yield still left super-premium leading broad. A card should be judged at its
**best-yield sweet spot** (cashback cards peak at low/mid spend, premiums at high spend), so **peak
yield** decides.

## Change — `lib/ranking-strategies.ts` (+ `lib/recommend.ts` blend branch)
- **Blend = MAX (best-of-envelope), not weighted average.** Add `blendMode: "weighted-average" | "max"`
  to `RankingStrategy` (`absolute-blend` = weighted-average; `max-yield` = max); branch the envelope
  `.map` blend on it. Representative = the peak-yield level (display the card at its sweet spot).
- **`max-yield` `perLevelScore`:**
  ```
  yieldScore    = ((estimatedNetValue / annualSpend) / REFERENCE_YIELD) * 10000   // NO clamp
  perLevelScore = yieldScore + Σ boostScores                                       // boosts: 5% each (unchanged)
  ```
  Envelope levels stay `[1L,3L,10L,20L,30L]`; the blend takes the **max** of `perLevelScore`. (No
  lower clamp needed — `max` naturally ignores the negative low-spend yields of high-fee cards.)
- **Consts:** `REFERENCE_YIELD = 0.05` — now a pure linear scale (5% yield → 10000, sets the yield-vs-
  boost balance); tunable. Boost refs/caps unchanged (each ≤ 500).
- **Display honesty:** keep `estimatedNetValue` = the card's **real** value at its representative
  level. Do **not** project peak yield to ₹30L (fictional for capped cards). ₹30L is only a conceptual
  common scale, never a shown figure.

## Worked example (pure yield)
| Card | peak yield @ level | yieldScore | + boosts | rank |
|---|---|---|---|---|
| SBI Cashback | 5% @ ₹3L | 10000 | … | **top** |
| TravelOne | 4% @ ₹30L | 8000 | … | below |
| tiny-cap 10% card | ~10% @ ₹1L | **20000** | … | **above SBI — see watch-item** |

→ SBI Cashback beats TravelOne (10000 > 8000), as intended.

## Watch-item (accepted): tiny-cap spikes
With saturation removed, a card with a high *rate* on a *tiny cap* gets a high peak yield (e.g. 10% →
20000) and **can top the list despite delivering little absolute value**. This is the trade-off for
dropping the value guard. **Action:** inspect the `max-yield` golden for such cards at the top; if they
appear and look wrong, revisit (e.g. drop the ₹1L level, or reinstate a value guard) — decide from the
golden, not in advance.

## Separate, still required before MY3
`max-yield` still caps `loungeBoost` at 5%, so it mis-ranks **lounge** queries (MY2 review). The
**lounge carve-out** (use `absolute-blend` for lounge queries) is orthogonal and must land before the
MY3 default-flip.

## Verification — "see the goldens"
1. `npx vitest run -u tests/ranking-golden.test.ts` (the `ranking golden (max-yield)` block). Inspect:
   `broad-generic` features mid-tier all-rounders (SBI-Cashback-type) at/near top, premiums not
   sweeping; **check the top for tiny-cap gimmicks** (watch-item). `absolute-blend` goldens unchanged.
2. `npx tsx` dump `"best credit card"` (max-yield): print per top card — peak level, peakYield,
   peakNetValue, boosts. Tune `REFERENCE_YIELD` if needed.
3. `npm test` green; `tsc`/`eslint` clean. Commit on `claude/main`.

## Decisions (locked)
metric = **best-of-envelope yield** (max across levels) · **no saturation factor** · **no yield clamp**
· displayed value **honest** (no ₹30L projection) · boosts unchanged (5%) · tiny-cap spike risk
**accepted, verify in golden** · lounge carve-out tracked separately (pre-MY3).
