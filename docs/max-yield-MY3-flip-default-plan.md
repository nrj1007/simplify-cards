# Plan (LOCKED) — MY3: flip default to max-yield

> Max-yield workstream MY3. The deliberate switch. Depends on MY1 + MY2 landed and MY2 tuned.

## Context
MY1 + MY2 ship with `DEFAULT_RANKING_STRATEGY = "absolute-blend"`, so nothing moves. MY3 makes
`max-yield` the live broad ranking — a single, reviewable diff that *is* the ranking change.

## Change
- Set `DEFAULT_RANKING_STRATEGY = "max-yield"` (`lib/ranking-strategies.ts`).
- Regenerate the broad ranking goldens (`broad-generic`, and any scenario routed through the broad
  envelope — LTF, lounge, targeted broad). Category/fuel/segment/forex/UPI focuses are unaffected
  (they don't use the broad strategy path... confirm UPI/utility still use their own envelope config).
- Review the diff: confirm non-super-premium all-rounders now feature in `"best credit card"`, no
  absurd low-fee/trivial-spend spikes, and the spread looks sensible. Re-tune `REFERENCE_YIELD` / boost
  refs if needed (back in MY2).

## Verification
1. `npx vitest run -u tests/ranking-golden.test.ts` — the **default** golden's broad scenarios should
   now change to **match the `max-yield` golden already locked in MY2** (a convergence, not a
   surprise); focused scenarios unchanged. After the flip the two goldens are identical for broad
   scenarios — keep both, or collapse the now-redundant `max-yield` block. Move untracked WIP cards
   out of `data/cards/` first.
2. `npx tsx` dumps for `"best credit card"`, `"best lifetime free cards"`, `"best lounge card"` — sane
   orderings.
3. `npm test` green; `tsc`/`eslint` clean. Commit on `claude/main`; push to `main`.
4. **Easy rollback:** flip the const back to `absolute-blend` if the live ranking needs revisiting.
