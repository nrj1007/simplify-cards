# Max-yield ranking strategy — index

Goal: feature non-super-premium **all-rounders** in broad "best credit card" results by ranking on
**net-value yield** (fee-included), with boosts as minor nudges, behind a flippable strategy pattern.
Split into workstreams (refactor → feature → flip), one plan file each.

| Workstream | Plan file | Scope | Golden churn |
|---|---|---|---|
| **MY1 — Strategy-pattern scaffold** | [`max-yield-MY1-strategy-pattern-plan.md`](max-yield-MY1-strategy-pattern-plan.md) | extract `RankingStrategy`, move current logic into `absolute-blend`, add `ACTIVE_RANKING_STRATEGY` + `input.rankingStrategy` switch | **none** (pure refactor) |
| **MY2 — `max-yield` strategy** | [`max-yield-MY2-strategy-plan.md`](max-yield-MY2-strategy-plan.md) | net-value yield → 0–10000 + boosts at 5% each; equal-weight envelope over `[1L,3L,10L,20L,30L]`; behind the flag | **none** (opt-in via flag) |
| **MY2.2 — best-of-envelope yield** | [`max-yield-MY2.2-best-of-envelope-yield-plan.md`](max-yield-MY2.2-best-of-envelope-yield-plan.md) | revise metric: **max** (not average) of per-level yield + value-saturation guard vs tiny-cap spikes; honest display (no ₹30L projection) | `max-yield` golden only (default still absolute-blend) |
| **MY3 — Flip default** | [`max-yield-MY3-flip-default-plan.md`](max-yield-MY3-flip-default-plan.md) | set `DEFAULT_RANKING_STRATEGY = "max-yield"`, regen broad goldens | broad scenarios (the intentional change) |
| **~~MY-Diversity~~** → Result strategy | [`result-strategy-plan.md`](result-strategy-plan.md) | **superseded by a flippable result-strategy axis:** broad → `reward-type-split` (Rewards top 5 + Cashback top 5). Guarantees mid-tier cashback cards feature; reduces need for the MY3 flip | presentation-layer (DTO + UI) |

**Order:** MY1 → MY2 → MY3 (sequential; MY1/MY2 are zero-churn, MY3 is the deliberate flip).
Diversity is parked.

## Decisions (locked)
yield **includes fee** · boosts kept but **5% each** (max 500) · envelope **equal weight + add ₹1L** ·
**strategy pattern** to flip current ↔ new · diversity **parked** · `max-yield` applies **everywhere
the envelope runs — broad AND category/fuel focus** (yield at each path's own realistic levels; no
`fitScore` fallback for focus).

**Note:** `popularity` folds into MY2 as one of the 5% boosts — its long-pending audit is absorbed here.
