# Plan (LOCKED) — Surface reward-type-split on /ask + SEO, and add split goldens

> Follow-up to `result-strategy-plan.md`. The Rewards/Cashback split currently only appears behind the
> `/recommend` "Group by reward type" checkbox. Extend it to where broad "best credit cards" content
> actually lives — the `/ask` answer and the SEO landing pages — and lock it with golden snapshots.

## Context
The split's natural home is broad "best credit cards." `/recommend` is a spend tool (least broad);
`/ask` "best credit card" and the SEO "best credit cards" landing page are single-list today
(`ask-ai.ts` and `seo-landing.ts` have no result-strategy wiring). On `/recommend` the split is an
opt-in toggle; on `/ask` and SEO it should be the **default** presentation for broad queries (no
toggle UI), since the split *is* the better view there.

## 0. Internal toggle (single switch to revert)
The auto-split on `/ask` + SEO is governed by **one module constant**, so it can be flipped off
without touching call sites:
```ts
// lib/result-strategies.ts — strategy used for broad "best credit cards" content (/ask, SEO).
// Set to "single-list" to revert /ask + SEO to a flat list everywhere.
export const BROAD_CONTENT_RESULT_STRATEGY: ResultStrategyName = "reward-type-split";
```
`/ask` and SEO read this const for broad generic queries (below). `/recommend` keeps its own user
toggle and is unaffected by this flag. Flipping to `"single-list"` = full revert of the auto-split.

## 1. `/ask` — auto-split broad "best credit card" answers
- In the top-cards / best-fit path (`lib/ask-ai.ts`, the `answerFromCards`/scored-cards branch),
  detect a **broad generic** query (`isBroadGenericRankingQuery`) and set
  `input.resultStrategy = BROAD_CONTENT_RESULT_STRATEGY` (then `answerFromCards` already emits
  `sections`), or call `applyResultStrategy(scored, { ...input, resultStrategy:
  BROAD_CONTENT_RESULT_STRATEGY })`.
- Carry `sections` through `AskAiResult` and the `/api/ask` response.
- Render the two headed sections (Rewards cards / Cashback cards) in `app/ask/page.tsx`, falling back
  to the flat list otherwise.
- **Non-broad** /ask queries (specific card, category, issuer, comparison) stay single-list.

## 2. SEO — split broad "best credit cards" landing pages
- Add `groupByRewardType?: boolean` to the landing config type; set it on the **broad** "best credit
  cards"-type config(s) only (not category/issuer-specific pages like "best fuel cards").
- In `lib/seo-landing.ts` (currently `scoreCards(config.ranking).slice(0, 10)`), when
  `groupByRewardType` is set, run `applyResultStrategy(scoreCards(config.ranking), { resultStrategy:
  BROAD_CONTENT_RESULT_STRATEGY })` → two sections (top 5 each) instead of the flat top-10. (The
  config flag says *which pages are eligible*; the const says *whether the split is on* — so flipping
  the const reverts every eligible SEO page to flat too.)
- Render the two headed sections in the SEO landing template (also better structured SEO content).

## 3. Goldens for split queries
- Add a **split golden** (extend `tests/ranking-golden.test.ts`, or a new `result-split-golden`)
  that snapshots the section membership + order for representative broad queries on **real** cards:
  ```ts
  const sections = applyResultStrategy(
    scoreCards({ query: "best credit card", resultStrategy: "reward-type-split" }),
    { query: "best credit card", resultStrategy: "reward-type-split" }
  );
  // snapshot: { "Rewards cards": [ids…], "Cashback cards": [ids…] }
  ```
  Cover "best credit card" (and 1–2 broad variants, e.g. the SEO broad config). This locks split
  membership/order and catches scoring or partition regressions. Existing single-list goldens stay.

## Verification
1. `/ask` "best credit card" → two sections; a specific/category/issuer query → single-list.
2. SEO broad "best credit cards" page → two sections; a category SEO page → flat top-10 (unchanged).
3. `npx vitest run` — new split golden green; `single-list`/ranking goldens unchanged. `tsc`/`eslint`.
4. Commit on `claude/main`; push to `main`.

## Decisions (locked)
`/ask` + SEO **auto-apply** the split for broad "best credit cards" (no toggle there; `/recommend`
keeps its opt-in toggle) · governed by one internal const **`BROAD_CONTENT_RESULT_STRATEGY`**
(flip to `"single-list"` to fully revert) · SEO eligibility via a per-config `groupByRewardType` flag
(broad configs only) · **split golden** added on real cards for broad queries.

## Note on goldens vs the toggle
The split golden should snapshot at the **explicit** strategy (`resultStrategy: "reward-type-split"`),
not via `BROAD_CONTENT_RESULT_STRATEGY` — so the golden keeps asserting the split even if someone later
flips the const to `"single-list"`. (The const controls *production default*; the golden locks the
*split behavior itself*.)
