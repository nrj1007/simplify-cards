# Plan (LOCKED) — Workstream A: intent signals → filters; drop redundant boosts

> Workstream **A** of the current-strategy tuning (low risk). Siblings: `current-strategy-B-category-focus-plan.md`,
> `current-strategy-C-special-spend-surcharge-plan.md`. The normalized-yield model stays parked in
> `normalized-yield-ranking-strategy-plan.md`. **A is independent of B and C** — land it first.

## Context
Most "best X card" intents are already candidate filters; travel and redemption are still soft
boosts that get drowned by net-value spread, and three intent boosts are now redundant because their
intent is already filtered. Finish the conversion and remove the dead boosts. Tunes the **current**
absolute-₹ strategy.

## Current filter inventory (verified in code)
- **Already filtered (no work):** fuel, UPI, segment, forex, issuer, network, category,
  **cashback** (`hasCashbackCardSignal` = `/cashback/i.test(rewardType)`, strict ✓),
  **lounge** (`L2499-2508`: intl→`internationalLoungeScore>0`, general→`loungeScore>0`,
  guest→`loungeGuest*`/sharedPool).
- **Still boost-only (convert):** **travel**, **redemption**.

## Changes — `lib/recommend.ts`

### 1. Travel → filter — NEW
- **`qualifiesAsTravelCard(card)`** — qualifies on **any one** of:
  1. `redemption.airlinePartners?.length || redemption.hotelPartners?.length` (airline/hotel transfer),
  2. `loungeScore(card) > 0` (lounge access),
  3. `card.forexMarkup === 0` (zero forex).
  (138/209 cards qualify — inclusive by design.)
- `restrictToTravelCards = isCardRecommendationQuery(query) && intent.useCases.includes("travel")`;
  add to the `.filter()` chain.
- **Keep `useCaseBoost`** for in-set ordering (current `strength × 7000`). Because the travel filter
  is inclusive, this strength term floats genuine travel cards above merely-eligible ones — it stays.

### 2. Redemption → filter — NEW
- `restrictToRedemptionBuckets = isCardRecommendationQuery(query) && intent.redemptionBuckets.length`.
- Filter to cards matching **any** named bucket via `cardMatchesRedemptionBucket` (ANY semantics).
- Keep `redemptionPreferenceValueBoost` (value-based in-set ordering); **drop the flat +3500**.

### 3. Lounge — already a filter; keep the broad boost, tidy two things
- **Keep** `loungeBoost = travelLoungeValue × 0.5` for broad queries (a lounge card is genuinely
  worth more, so it lifts "best credit card"). Lounge is the one signal that is **both** a filter
  (lounge queries) and a value boost (broad) — unlike segment/network/issuer.
- **Union guest into the general lounge filter** (`L2499-2500`) to match the spec (lounge query =
  domestic ∪ international ∪ guest): `loungeScore(card) > 0 || hasGuestLoungeAccess(card)`.
- **Delete the now-dead lounge penalties** in `loungePreferenceBoost` — `−12000` (wantsLounge &&
  score≤0) and `−15000` (wantsInternationalLounge && intlScore≤0): the filters guarantee no such card
  reaches scoring. (Leave the travel-intent `−3000` branch.)

### 4. Remove redundant boosts
**(a) Intent already filtered** — constants within their filtered pool; remove from the score sums
(keep the underlying match only where a `reasons` string needs it):
- **`segmentBoost` (+3000)** — `restrictToSegments` filters by fee band.
- **`networkBoost` (+3000)** — `explicitNetworkFilters` filters (already ANY/`.some`).
- **`issuerBoost` (+20000)** — `restrictToIssuer` filters (single issuer, non-comparison).

**(b) Redundant with net value** — remove **`milestoneBoost`** (`milestoneSpecialistBoost`,
+6000/+2500): a narrow hand-coded patch (only "milestone"/"platinum travel" identity cards with a
₹6.5–7.5L high-value or Taj milestone) that double-counts value already in `estimatedNetValue` via
`estimatedMilestoneValue`. Same family as the already-deleted `comparisonMilestoneAndWaiverDelta`.

Touch points: `relevanceScore` (network, issuer), `sharedBoosts` (segment, milestone), the `debug`
object, the `ScoreDebug` type in `lib/types.ts`, and the `debug-ranking` route if it lists them.

### 5. Compound-intent semantics
- **AND across different filter types** ("best premium travel card" = premium **and** travel) — keep
  the existing `.filter()` chaining.
- **ANY (union) within a type**: travel/use-case and redemption filters use ANY; networks already
  ANY (`.some`); **segments: change `restrictToSegments` from `.every` to `.some`** so "premium
  super-premium" (disjoint bands) unions instead of returning empty. Single-segment queries unaffected.

### 6. Empty pool → return nothing
If filters (possibly + a fee cap) exclude every card, return an empty result — no fallback.

## Verification
1. `npx tsx` dump `"best travel card"`, a redemption query (e.g. "best miles card"), `"best lounge
   card"` — travel/redemption pools restricted; lounge unchanged; no obviously-great card wrongly
   excluded.
2. `npx vitest run`:
   - **Shift:** `usecase-travel` (pool shrinks). Redemption has no golden scenario.
   - **Unchanged:** `segment-*`, `issuer-*`, `network-*`, `lounge*` — removed boosts were constants
     within already-filtered pools; milestone value stays in net value.
   - Regenerate `tests/__snapshots__/ranking-golden.test.ts.snap`; confirm only `usecase-travel`
     moved. Move untracked WIP cards out of `data/cards/` before `-u`.
3. Add unit tests: "best travel card" → only `qualifiesAsTravelCard`; two-segment query unions; "best
   credit card" still gives a lounge card its broad lounge boost.
4. `npx tsc --noEmit` + `eslint` clean. Commit on `claude/main`; push to `main`.

## Decisions (locked)
cashback **strict** (already done) · travel transfer = **explicit airline/hotel arrays only** ·
segment **keep overrides** (`cardMatchesSegment` text + invite-only/relationship overrides) · **keep
`useCaseBoost`** · redemption→filter, **remove network/issuer/segment/milestone boosts** · **AND
across types, ANY within a type** · empty pool → **return nothing** · lounge = **filter + broad boost**.
