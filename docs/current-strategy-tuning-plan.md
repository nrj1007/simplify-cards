# Current-strategy tuning — index

The current-strategy tuning is split into three independent workstreams, one plan file each
(increasing risk / blast radius). Land them as separate commits.

| Workstream | Plan file | Scope | Golden blast radius |
|---|---|---|---|
| **A — Filters & boost cleanup** | [`current-strategy-A-filters-plan.md`](current-strategy-A-filters-plan.md) | travel + redemption → filters; remove segment/network/issuer/milestone boosts; segments `.every`→`.some`; lounge tidy-up | ~`usecase-travel` only |
| **B — Category focus redesign** | [`current-strategy-B-category-focus-plan.md`](current-strategy-B-category-focus-plan.md) | 75/25 realistic profile + category envelope; fee-aware net value; remove `spendCategoryBoost` + `categorySpecialistBoost` | all `category-*` + `merchant-*` |
| **C — Special-spend flexibility + surcharge** | [`current-strategy-C-special-spend-surcharge-plan.md`](current-strategy-C-special-spend-surcharge-plan.md) | spend-based flexibility value (replaces `specialSpendBoost`); new `surchargePercent` field — ranking deducts, calculator shows separately | broad + `category-rent`; new field + calculator UI |
| **B2 — Net-reward category filter** | [`current-strategy-B2-net-reward-filter-plan.md`](current-strategy-B2-net-reward-filter-plan.md) | B follow-up: filter category-focus pool to cards with net category reward (gross − surcharge) > 0, so base-earning all-rounders drop off "best rent card" | `category-rent` (+ surcharged categories) |

**Status:** A ✅ landed · C ✅ landed · B ✅ landed · **B2** spec'd (this), pending implementation.

**Dependencies:** A is independent. **B and C both touch rent** — C's `surchargePercent` should feed
B's "best rent card" net value; if B lands first, wire surcharge in when C ships. Suggested order:
**A → C → B** (so surcharge exists before the rent category-focus relies on it), or A → B → C with the
rent-surcharge wiring deferred to C.

**Related (parked):** [`normalized-yield-ranking-strategy-plan.md`](normalized-yield-ranking-strategy-plan.md)
— the 0–10000 normalized scoring model + strategy-switching framework.

**Not yet audited:** `popularity` (`popularityScore × 50`) is the only remaining sharedBoost not
reviewed.
