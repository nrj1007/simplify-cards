# Plan (LOCKED) — Result Split Data-Driven Gate

Add a data-driven validation check (gate) to the `reward-type-split` presentation strategy. Instead of forcing a split purely based on static query patterns or toggle parameters in the strategy logic, the engine will inspect the actual scored results and only apply the split if both the Rewards and Cashback buckets meet a minimum representation threshold. If the results are too homogeneous (e.g., lack any cashback or rewards cards), the layout gracefully falls back to a flat `single-list`.

## Context
When a user requests a split (via the `/recommend` "Group by reward type" toggle, `/ask` auto-wiring, or indexable broad SEO landing pages), the engine partitions results into "Rewards cards" and "Cashback cards" (up to 5 each). 

However, if the database filters or constraints result in a highly skewed set of cards (e.g., rewards cards exist but 0 cashback cards), one of the sections in the UI will be empty. Empty split sections lead to a poor user experience. A data-driven gate ensures a split is only presented when there is at least some representation on both sides to justify a comparison.

## Design — Gating Rules
1. Define a constant for the minimum representation threshold:
   ```ts
   const MIN_CARDS_PER_SPLIT_SECTION = 1;
   ```
2. In `applyResultStrategy` (in [lib/recommend.ts](file:///C:/Users/manpr/Documents/Codex/2026-05-08/i-want-to-build-an-ai/lib/recommend.ts)):
   - Before applying the `"reward-type-split"` strategy, count how many of the scored/ranked cards fall into the Rewards bucket vs the Cashback bucket.
   - A split is only allowed if:
     - `rewardsCount >= MIN_CARDS_PER_SPLIT_SECTION` AND
     - `cashbackCount >= MIN_CARDS_PER_SPLIT_SECTION`
   - If this data-driven condition is not met, the strategy degrades to `"single-list"` (reverting to a flat top-N presentation).
   - Static query checks (such as category/issuer restrictions) are fully removed here, letting this data-driven bucket gate subsume them.

3. Introduction of `SPLIT_SCOPE` enum toggle in `lib/result-strategies.ts`:
   - `export type SplitScope = "off" | "broad-only" | "any-query";`
   - `export const SPLIT_SCOPE: SplitScope = "any-query";`

4. Routing in Q&A `/ask` (`lib/ask-ai.ts`):
   - Requests split based on `SPLIT_SCOPE`:
     - If `SPLIT_SCOPE === "any-query"`, trigger when `isTopBestCardsQuery(input.query)` is true.
     - If `SPLIT_SCOPE === "broad-only"`, trigger when `isBroadGenericRankingQuery` is true.
     - Otherwise, do not request the split.

## Implementation Steps
1. **Planning**: Save this plan under `docs/result-split-data-driven-gate-plan.md`.
2. **Code Edit**: Modify `applyResultStrategy` in [lib/recommend.ts](file:///C:/Users/manpr/Documents/Codex/2026-05-08/i-want-to-build-an-ai/lib/recommend.ts):
   - Add the `MIN_CARDS_PER_SPLIT_SECTION = 1` constant.
   - Scan the `byNetValue` array to compute `rewardsCount` and `cashbackCount` using `isPrimaryCashbackCard`.
   - Update `useSplit` to check `hasSufficientDataForSplit`.
3. **Unit Tests**:
   - Add unit test cases in [tests/result-strategies.test.ts](file:///C:/Users/manpr/Documents/Codex/2026-05-08/i-want-to-build-an-ai/tests/result-strategies.test.ts) to verify:
     - Split is applied when both buckets have $\ge 1$ card.
     - Split falls back to `single-list` (one untitled section) when either bucket has $0$ cards.
     - Split is requested dynamically in `/ask` under different `SPLIT_SCOPE` configurations.
4. **Verification**: Run `npm test` and verify that all tests, including the new unit tests and golden snapshots, pass cleanly.

## Decisions (locked)
Data-driven gate on `reward-type-split` · `MIN_CARDS_PER_SPLIT_SECTION = 1` threshold · degrades to `single-list` on violation · governed by `SPLIT_SCOPE` ("off" | "broad-only" | "any-query") enum toggle · implemented in `applyResultStrategy` and `ask-ai.ts` · unit tested in `result-strategies.test.ts`.
