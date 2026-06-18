import { describe, expect, it } from "vitest";
import { scoreCards } from "../lib/recommend";
import type { RecommendationInput } from "../lib/types";

// Golden snapshot of the *ordering* scoreCards produces for representative queries, so any change to
// ranking logic (boost weights, value/relevance mix, tie-breaks) surfaces as a reviewable per-query
// diff. We lock the ordered top-N card ids — the user-visible result — not the internal scores.
// Intentional ranking changes: review the diff, then `npx vitest run -u`.

const TOP_N = 12;

const scenarios: Record<string, RecommendationInput> = {
  "broad-generic": { query: "best credit card" },
  "exact-card-atlas": { query: "axis atlas" },
  "usecase-dining": { query: "best dining card" },
  "usecase-grocery": { query: "best grocery card" },
  "usecase-online": { query: "best online shopping card" },
  "usecase-entertainment": { query: "best card for movies" },
  "usecase-fuel": { query: "best card for fuel" },
  "usecase-travel": { query: "best travel card" },
  "issuer-hdfc": { query: "best hdfc card" },
  "segment-beginner": { query: "best beginner card" },
  "segment-mid-premium": { query: "best mid premium card" },
  "segment-premium": { query: "best premium card" },
  "segment-super-premium": { query: "best super premium card" },
  "network-rupay": { query: "best rupay card" },
  "forex": { query: "best forex card" },
  "lounge": { wantsLounge: true },
  "lounge-query": { query: "best lounge card" },
  "intl-lounge-query": { query: "best international lounge card" },
  "lifetime-free": { wantsLifetimeFree: true },
  "max-fee-zero": { maxAnnualFee: 0 },
  "spend-fuel-heavy": { spend: { fuel: 15000, base: 30000 } },
  "spend-travel-heavy": { spend: { travel: 40000, hotels: 20000, airlines: 20000, base: 20000 } },
  "spend-high-base": { spend: { base: 200000, dining: 50000, travel: 50000 } },
  // Spend levels: the same balanced mix at light / mid / heavy monthly totals (~20k / 75k / 250k),
  // so the ranking's sensitivity to spend amount is locked.
  "spend-level-light": {
    spend: { online: 6000, dining: 2000, grocery: 3000, travel: 2000, fuel: 1000, utilities: 1000, base: 5000 }
  },
  "spend-level-mid": {
    spend: { online: 22000, dining: 7000, grocery: 11000, travel: 8000, fuel: 4000, utilities: 4000, base: 19000 }
  },
  "spend-level-heavy": {
    spend: { online: 75000, dining: 25000, grocery: 35000, travel: 25000, fuel: 10000, utilities: 10000, base: 70000 }
  }
};

describe("ranking golden (representative queries)", () => {
  it("produces stable top-N ordering per scenario", () => {
    const golden: Record<string, string[]> = {};
    for (const [name, input] of Object.entries(scenarios)) {
      golden[name] = scoreCards(input)
        .slice(0, TOP_N)
        .map((score) => score.card.id);
    }
    expect(golden).toMatchSnapshot();
  });

  it("is deterministic across repeated runs", () => {
    const once = scoreCards({ query: "best credit card" }).map((s) => s.card.id);
    const twice = scoreCards({ query: "best credit card" }).map((s) => s.card.id);
    expect(twice).toEqual(once);
  });
});
