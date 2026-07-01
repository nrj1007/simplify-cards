// ---------------------------------------------------------------------------
// Ranking / blend configuration — single source of truth.
//
// Every tunable knob the recommendation engine uses to rank and blend cards
// lives here: the spend levels each card is scored at, the per-level blend
// weights, the relevance/popularity priors, and the category-focus envelope.
// `recommend.ts` and `ranking-strategies.ts` import from here — change a number
// in this file and nowhere else.
// ---------------------------------------------------------------------------

// --- Broad reward-card envelope blend (the default ranking) ----------------
// Broad "best card" ranking blends each card's score across fixed
// light/mid/heavy annual-spend levels (instead of cherry-picking its
// single most-flattering tier, which let low-fee cards' yield blow up at trivial
// spend). The blend centers around a realistic default spender (~Rs 6.4L/year)
// while retaining a smaller premium tail for cards that need higher spend.
export const REWARD_BLEND_SPEND_LEVELS = [300000, 600000, 1000000, 2000000]; // 3L/6L/10L/20L (~Rs 25k/50k/83k/167k per month)
export const REWARD_BLEND_WEIGHTS = [1, 1.6, 1.2, 0.8];

// --- Cashback cards: re-based onto realistic low/mid spend -----------------
// Cashback cards earn on monthly caps, so the broad reward-card blend would
// judge them deep past their caps and systematically under-rank them. Every
// primary cashback card is evaluated on these realistic low/mid spend levels so
// the high reward-card levels apply to reward cards only. Reused for cashback
// recommendation display ordering (splitOrderScore).
export const CASHBACK_BLEND_SPEND_LEVELS = [100000, 200000, 300000, 500000];
export const CASHBACK_BLEND_WEIGHTS = [1.3, 1.2, 1.1, 1];

// --- UPI-restricted queries ------------------------------------------------
export const UPI_BLEND_SPEND_LEVELS = [100000, 200000, 300000];
export const UPI_BLEND_WEIGHTS = [2, 1.5, 1];

// --- Utility-category queries (equal weight) -------------------------------
export const UTILITY_BLEND_SPEND_LEVELS = [100000, 200000, 300000];
export const UTILITY_BLEND_WEIGHTS = [1, 1, 1];

// --- Spend-context weight overrides (queries with explicit spend / fee cap) -
// Low-fee / low-spend context leans the blend toward lower spend levels;
// mid-range context flattens it to equal weight. Both align index-for-index
// with REWARD_BLEND_SPEND_LEVELS (4 levels).
export const LOW_FEE_BLEND_WEIGHTS = [1.75, 1.5, 1.25, 1];
export const EQUAL_BLEND_WEIGHTS = [1, 1, 1, 1];

// --- Category-focus envelope ("best dining/grocery/... card") --------------
// The focused category is scored at 0.5×/1×/2× a representative per-category
// spend, with `CATEGORY_FOCUS_SPEND_SHARE` of each level placed on the focused
// category (the rest spread across the default mix).
export const CATEGORY_FOCUS_MULTIPLIERS = [0.5, 1.0, 2.0];
export const CATEGORY_FOCUS_BLEND_WEIGHTS = [1, 1.5, 1];
export const CATEGORY_FOCUS_SPEND_SHARE = 0.75;

// --- Segment-query local blend ("beginner/premium/super premium cards") ----
// Segment queries restrict the pool by segment, then blend around that segment's
// representative spend instead of using a single point estimate.
export const SEGMENT_BLEND_MULTIPLIERS = [0.75, 1, 1.5];
export const SEGMENT_BLEND_WEIGHTS = [1, 1.5, 1];

// --- Relevance weights -----------------------------------------------------
// How much query relevance (text/identity match) adds on top of the economic
// value score. Exact card lookups trust relevance fully; broad generic "best
// card" queries lean almost entirely on value.
export const RELEVANCE_WEIGHT_EXACT_MATCH = 1.0;
export const RELEVANCE_WEIGHT_BROAD_GENERIC = 0.3;
export const RELEVANCE_WEIGHT_DEFAULT = 0.5;

// --- Popularity prior ------------------------------------------------------
// Added to every card's score (popularityScore is ~50–100, so ~2,500–5,000).
// Cashback cards get a smaller prior so popularity doesn't crowd out yield.
export const POPULARITY_RANKING_WEIGHT = 50;
export const CASHBACK_POPULARITY_WEIGHT = 15;
export const POPULARITY_FULL_WEIGHT_ANNUAL_SPEND = 1000000;
export const POPULARITY_MIN_SCALE = 0.25;
