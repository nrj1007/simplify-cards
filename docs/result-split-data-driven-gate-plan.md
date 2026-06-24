# Plan (LOCKED) — Result Split Data-Driven Gate

Add a data-driven validation check (gate) to the `reward-type-split` presentation strategy. Instead of forcing a split purely based on static query patterns or toggle parameters, the engine will inspect the actual scored results and only apply the split if both the Rewards and Cashback buckets meet a minimum representation threshold. If the results are too homogeneous (e.g., lack sufficient cashback or rewards cards), the layout gracefully falls back to a flat `single-list`.

## Context
When a user requests a split (via the `/recommend` "Group by reward type" toggle, `/ask` auto-wiring, or indexable broad SEO landing pages), the engine partitions results into "Rewards cards" and "Cashback cards" (up to 5 each). 

However, if the database filters or constraints result in a highly skewed set of cards (e.g., 8 rewards cards and 0 or 1 cashback cards), one of the sections in the UI will either be empty or contain a lone card. Empty or near-empty split sections lead to a poor user experience. A data-driven gate ensures a split is only presented when there is enough representation on both sides to justify a comparison.

## Design — Gating Rules
1. Define a constant for the minimum representation threshold:
   ```ts
   const MIN_CARDS_PER_SPLIT_SECTION = 2;
   ```
2. In `applyResultStrategy` (in [lib/recommend.ts](file:///C:/Users/manpr/Documents/Codex/2026-05-08/i-want-to-build-an-ai/lib/recommend.ts)):
   - Before applying the `"reward-type-split"` strategy, count how many of the scored/ranked cards fall into the Rewards bucket vs the Cashback bucket.
   - A split is only allowed if:
     - `rewardsCount >= MIN_CARDS_PER_SPLIT_SECTION` AND
     - `cashbackCount >= MIN_CARDS_PER_SPLIT_SECTION`
   - If this data-driven condition is not met, the strategy degrades to `"single-list"` (reverting to a flat top-N presentation).

## Implementation Steps
1. **Planning**: Save this plan under `docs/result-split-data-driven-gate-plan.md`.
2. **Code Edit**: Modify `applyResultStrategy` in [lib/recommend.ts](file:///C:/Users/manpr/Documents/Codex/2026-05-08/i-want-to-build-an-ai/lib/recommend.ts#L2603-L2629):
   - Add the `MIN_CARDS_PER_SPLIT_SECTION = 2` constant.
   - Scan the `byNetValue` array to compute `rewardsCount` and `cashbackCount` using `isPrimaryCashbackCard`.
   - Update `useSplit` to check `hasSufficientDataForSplit`.
3. **Unit Tests**:
   - Add unit test cases in [tests/result-strategies.test.ts](file:///C:/Users/manpr/Documents/Codex/2026-05-08/i-want-to-build-an-ai/tests/result-strategies.test.ts) to verify:
     - Split is applied when both buckets have $\ge 2$ cards.
     - Split falls back to `single-list` (one untitled section) when the cashback bucket has $< 2$ cards.
     - Split falls back to `single-list` when the rewards bucket has $< 2$ cards.
4. **Verification**: Run `npm test` and verify that all tests, including the new unit tests and golden snapshots, pass cleanly.

## Decisions (locked)
Data-driven gate on `reward-type-split` · `MIN_CARDS_PER_SPLIT_SECTION = 2` threshold · degrades to `single-list` on violation · implemented in `applyResultStrategy` · unit tested in `result-strategies.test.ts`.
