# Plan (LOCKED) — Workstream C: special-spend flexibility (spend-based) + surcharge model

> Workstream **C** of the current-strategy tuning (new data field + calculator UI). Siblings:
> `current-strategy-A-filters-plan.md`, `current-strategy-B-category-focus-plan.md`.
> **Interacts with B:** the surcharge model (§2) also feeds B's "best rent card" net value — wire it
> there too. A is independent.

## Context
`specialSpendBoost` (`specialSpendFlexibilityBoost`) is a broad-query-only flat boost
(+2200 rewarded / +1500 capped / +700 high-cap) for cards that reward usually-excluded categories
(rent/insurance/education/gold) — a proxy for "flexibility" the default profile (those categories = 0)
can't see. Replace the magic numbers with **real reward economics**, and model the **rent surcharge**
that the engine currently ignores (it lives only in free-text `notes`, e.g. "incur a 1% processing fee").

## 1. Special-spend flexibility → spend-based (replaces `specialSpendBoost`) — `lib/recommend.ts`
Broad generic queries only (same gate as today). For a hypothetical flexibility allocation as a share
of the level's total monthly spend — **rent 10%, insurance 5%, education 5%, gold 5%**:
- Per category: `reward` = card's real earning on that allocation (rate, caps, `treatment`;
  excluded → 0) via `rewardAllocationsForSpend`; `flexValue = max(reward − surcharge, 0)` (floored —
  flexibility is an option, never a penalty); `flexibilityValue = Σ flexValue`.
- Add `flexibilityValue` in place of `specialSpendBoost`; **delete** `specialSpendFlexibilityBoost`
  and its `sharedBoosts`/`debug`/`ScoreDebug`/`reasons` entries.

## 2. Surcharge model (cross-cutting: ranking deducts, calculator shows separately)
- **Data:** add optional `surchargePercent` to `specialSpendRule` (`lib/types.ts`). Module default
  **rent 1%**, `0` for others; per-rule **override** (e.g. surcharge-waiver cards → `0`), populated
  from existing `notes`. Run `npm run validate:cards` after adding the field.
- **Ranking (`lib/recommend.ts`):** deduct surcharge as a real cost wherever a surcharged category's
  reward is computed → flows into the §1 flexibility value **and** Workstream B's rent category-focus
  net value. (Net economics — same spirit as the liquidity haircut.)
- **Calculator display (`lib/reward-calculator.ts` + the calculator UI):** compute surcharge but
  surface it as a **separate line item** — do **not** subtract it from the displayed rewards figure.
  Mirrors the display-vs-ranking split used for liquidity (display = gross, ranking = net).

Touch points: `lib/types.ts` (field), `lib/reward-calculator.ts` (compute + expose surcharge
separately), the calculator UI component (render the line), `lib/recommend.ts` (deduct in the ranking
value), card JSON `specialSpendRules` (surcharge overrides where notes specify).

## Verification
1. `npx tsx` dump `"best credit card"` — confirm a card that genuinely adds net rent value (reward >
   surcharge) gets a flexibility lift, an excluded-rent card gets 0, and a 1%-reward/1%-surcharge card
   nets 0.
2. Calculator: a rent-heavy spend shows a **separate surcharge line**; the rewards figure is
   unchanged (gross). Net is the user's to read (or shown as its own "net of surcharge" total).
3. `npx vitest run` — broad goldens shift slightly (cards adding real rent value rise; flat-boost
   beneficiaries without net value lose the nudge); `calculator-golden` updates for the surcharge
   line. Regenerate snapshots; review.
4. `npm run validate:cards`, `npx tsc --noEmit`, `eslint` clean. Commit on `claude/main` (separate
   from A/B); push to `main`.

## Tuning update (C2 — share reduction)
The original shares (rent 10% / others 5% = 25% total) weight these out-of-profile categories
*heavier* than the in-profile fuel/utilities (~5.7% each), so a niche-flexibility perk could
out-rank real fuel earning in broad rankings. **Reduce the `share` constants in
`computeFlexibilityValue`** so flexibility stays a right-sized tiebreaker (≤ fuel/utilities):
- rent `0.10 → 0.05`
- insurance `0.05 → 0.02`
- education `0.05 → 0.02`
- gold `0.05 → 0.02`

Effect: smaller flexibility value across broad queries; rent ≈ fuel's weight, others below it. Only
the broad (`broadGenericRanking && categoryFocus === null && !restrictToFuelCards`) path is affected.
Verify: broad goldens (`broad-generic`, etc.) shift slightly; category/focus/fuel goldens unchanged
(flex doesn't fire there); regenerate snapshots; `tsc`/`eslint` clean; commit.

## Decisions (locked)
approach **B** (separate flexibility value, not reshaping the broad profile) · shares **rent 10% /
insurance·education·gold 5% each** · `flexValue` **floored at 0** · surcharge **modeled generally**
(default rent 1%, per-rule override) · ranking **deducts** surcharge · calculator **shows it
separately** (never netted into rewards).
