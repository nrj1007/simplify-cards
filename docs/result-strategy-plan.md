# Plan (LOCKED) — Result (presentation) strategy: single-list ↔ reward-type sections

> Supersedes the parked `max-yield-MY-diversity-plan.md` (fee-tier diversity). A **second strategy
> axis** — *how the scored list is presented* — orthogonal to the ranking strategy (*how cards are
> scored*). For broad "best credit card" queries it can split results into **Rewards cards** and
> **Cashback cards** (top 5 each), so mid-tier cashback all-rounders are always featured.

## Context
On broad queries, super-premium points cards lead on merit (higher blended yield), so mid-tier
cashback all-rounders never surface — and a yield metric alone can't change that (max-yield review).
Cashback cards *are* the mid-tier all-rounders; giving them their own section guarantees they feature,
and "cashback vs rewards" is a natural user fork. This is a **presentation** change, independent of the
scoring metric (works with `absolute-blend` or `max-yield`).

## Two orthogonal strategy axes
- **Ranking strategy** (`lib/ranking-strategies.ts`, existing) — scoring/order: `absolute-blend | max-yield`.
- **Result strategy** (new) — presentation/grouping: `single-list | reward-type-split`.

## Design — `lib/result-strategies.ts` (new)
```ts
export type ResultStrategyName = "single-list" | "reward-type-split";
export type ResultSection = { title: string; cards: CardScore[] };
export type ResultStrategy = {
  name: ResultStrategyName;
  group(scored: CardScore[]): ResultSection[];   // scored = already ranked/ordered
};
export const DEFAULT_RESULT_STRATEGY: ResultStrategyName = "single-list";
```
- **`single-list`** — one section, top-N, no title (today's behavior).
- **`reward-type-split`** — partition the ranked list by `hasCashbackCardSignal` (`/cashback/i.test(rewardType)`):
  - "Rewards cards" = non-cashback, **top 5** (in ranked order).
  - "Cashback cards" = cashback, **top 5**.
- **Switch:** `DEFAULT_RESULT_STRATEGY` const + `input.resultStrategy?: ResultStrategyName` override
  (on `RecommendationInput`).
- **Mixed-currency cards** (`rewardType: "cashback and reward points"`) → **Rewards** bucket
  (cashback is secondary). [decision]
- **Scope:** only **broad** "best credit card"–style queries split; focused/issuer/lounge/segment
  queries force `single-list` (a split is meaningless for "best HDFC card"). Gate on
  `isBroadGenericRankingQuery` (and `categoryFocus === null`, no segment/issuer/etc.).

## Wiring
- The result builder (`lib/recommend-result.ts` `rankResults` / `lib/ask-ai.ts` `answerFromCards`)
  calls the active result strategy on the scored cards → sections.
- **DTO:** extend the `/api/recommend` response to a grouped shape — e.g. `{ sections: [{ title,
  results }] }`, or keep `results` for `single-list` and add `sections?` for the split. The
  `/recommend` UI (`app/ui/RecommendCalculator.tsx` / `app/recommend/page.tsx`) renders two headed
  groups when `sections` is present, falling back to the flat list otherwise.

## Why it's the right lever
Directly guarantees non-super-premium (cashback) cards feature, independent of scoring. **Reduces the
need for the max-yield flip (MY3)** for the "feature mid-tier" goal — ship the split on the current
`absolute-blend` and decide on `max-yield` separately (it still helps within-section ordering).

## Verification
1. `npx tsx` / API: `scoreCards/answerFromCards({ query: "best credit card", resultStrategy:
   "reward-type-split" })` → two sections, 5 each; Cashback section features mid-tier cashback cards,
   Rewards section the premium points cards. `single-list` default → unchanged.
2. Tests: a result-strategy unit test (partition correctness, ≤5 per section, mixed-currency → Rewards,
   non-broad query → single-list). `ranking-golden` unaffected (scoring unchanged).
3. UI renders two groups for the split; flat list otherwise. `tsc`/`eslint` clean. Commit on
   `claude/main`; push to `main`.

## Decisions (locked)
new **result-strategy** axis (flippable, orthogonal to ranking) · `single-list` default ·
`reward-type-split` = Rewards top 5 + Cashback top 5 by `hasCashbackCardSignal` · mixed-currency →
Rewards · broad queries only · presentation-layer (DTO + UI), scoring unchanged.
