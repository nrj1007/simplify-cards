# Plan (PARKED) — MY-Diversity: fee-tier diversity in broad results

> **Parked** per decision. Presentation-layer follow-up to the max-yield strategy; orthogonal to
> scoring. Pick up after MY3 if the live broad list still feels too top-heavy.

## Context
Even under `max-yield`, the #1 broad result may be a premium card. This layer guarantees the displayed
"best credit cards" list **features a spread across fee tiers** so good non-super-premium all-rounders
always appear.

## Idea (to be designed when un-parked)
Shape the displayed broad result (in `answerFromCards` / `rankResults`, not the score) to include a
representative spread — e.g. best overall + best mid-premium + best entry/LTF all-rounder, or cap how
many super-premium cards appear in the top-N. Keep the underlying ranking from MY2/MY3; this only
curates what's surfaced.

## Open questions (for when un-parked)
- Tier definition (reuse the segment fee bands: beginner ≤1k / mid-premium 1k–5k / premium 5k–10k /
  super-premium 10k+).
- "Best of each tier" vs "cap super-premium count" vs an explicit slot layout.
- Whether it applies to `/recommend`, `/ask`, or both.
