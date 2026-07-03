import { describe, expect, it } from "vitest";
import { scoreCards, applyResultStrategy } from "../lib/recommend";
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
  "usecase-cashback": { query: "best cashback card" },
  "usecase-upi": { query: "best upi card" },
  "merchant-amazon": { query: "best amazon card" },
  "merchant-flipkart": { query: "best flipkart card" },
  "merchant-swiggy": { query: "best swiggy card" },
  // Rent and utilities focuses, locked across multiple phrasings (these should rank consistently).
  "category-rent": { query: "best rent card" },
  "category-rent-payment": { query: "best card for rent payment" },
  "category-utilities": { query: "best utility card" },
  "category-utility-bills": { query: "best card for utility bills" },
  "category-bill-payments": { query: "best card for bill payments" },
  "category-education-payments": { query: "best card for education payments" },
  "issuer-hdfc": { query: "best hdfc card" },
  "issuer-sbi": { query: "best sbi card" },
  "issuer-axis": { query: "best axis card" },
  "issuer-icici": { query: "best icici card" },
  "issuer-amex": { query: "best amex card" },
  "segment-beginner": { query: "best beginner card" },
  "segment-mid-premium": { query: "best mid premium card" },
  "segment-premium": { query: "best premium card" },
  "segment-super-premium": { query: "best super premium card" },
  "network-rupay": { query: "best rupay card" },
  "network-visa": { query: "best visa card" },
  "network-mastercard": { query: "best mastercard credit card" },
  "forex": { query: "best forex card" },
  "forex-zero": { query: "best zero forex cards" },
  "lounge": { wantsLounge: true },
  "lounge-query": { query: "best lounge card" },
  "intl-lounge-query": { query: "best international lounge card" },
  "guest-lounge-query": { query: "best cards for guest lounge access" },
  "lifetime-free": { wantsLifetimeFree: true },
  "max-fee-zero": { maxAnnualFee: 0 },
  "max-fee-5000-query": { query: "best card under 5000" },
  // Combined-intent queries (interactions that single-intent scenarios don't cover).
  "combo-premium-travel": { query: "best premium travel card" },
  "combo-dining-under-5000": { query: "best dining card under 5000" },
  "spend-international": { query: "best card for international spends" },
  "spend-fuel-heavy": { spend: { fuel: 7000, base: 10000 } },
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
  }, 60000);

  it("is deterministic across repeated runs", () => {
    const once = scoreCards({ query: "best credit card" }).map((s) => s.card.id);
    const twice = scoreCards({ query: "best credit card" }).map((s) => s.card.id);
    expect(twice).toEqual(once);
  });
});

describe("result split golden (reward-type-split)", () => {
  it("snapshots the section membership and order for broad queries", () => {
    const splitScenarios: Record<string, RecommendationInput> = {
      "broad-best-card": { query: "best credit card", resultStrategy: "reward-type-split" },
      "seo-broad-best-cards": { query: "best credit cards india", resultStrategy: "reward-type-split" },
      // NEW - lock the data-driven gate on real cards:
      "category-online-split": { query: "best online shopping card", resultStrategy: "reward-type-split" },
      "premium-degrade-single": { query: "best premium card", resultStrategy: "reward-type-split" }
    };

    const golden: Record<string, Record<string, string[]>> = {};

    for (const [name, input] of Object.entries(splitScenarios)) {
      const resultSections = applyResultStrategy(scoreCards(input), input, 5);
      golden[name] = {};
      for (const section of resultSections) {
        golden[name][section.title] = section.cards.map((score) => score.card.id);
      }
    }

    expect(golden).toMatchSnapshot();
  });
});

describe("result split golden (all query modes)", () => {
  it("snapshots section membership for every representative query under reward-type-split", () => {
    const golden: Record<string, Record<string, string[]>> = {};
    for (const [name, input] of Object.entries(scenarios)) {
      const splitInput = { ...input, resultStrategy: "reward-type-split" as const };
      const resultSections = applyResultStrategy(scoreCards(splitInput), splitInput, 5);
      golden[name] = {};
      for (const section of resultSections) {
        golden[name][section.title] = section.cards.map((s) => s.card.id);
      }
    }
    expect(golden).toMatchSnapshot();
  }, 60000);
});

