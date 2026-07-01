import { describe, expect, it } from "vitest";
import { resultStrategies, isPrimaryCashbackCard, DEFAULT_RESULT_STRATEGY } from "../lib/result-strategies";
import type { CardScore } from "../lib/types";

// ---------------------------------------------------------------------------
// Helpers to build minimal CardScore stubs
// ---------------------------------------------------------------------------

function makeScore(id: string, rewardType: string): CardScore {
  return {
    card: {
      id,
      name: id,
      rewardType,
      issuer: "Test",
      annualFee: 0,
      joiningFee: 0,
      popularityScore: 50,
      // Minimal required fields — not used by result strategies
      network: "visa",
      tags: [],
      rewards: [],
      useCases: [],
      bestFor: [],
      exclusions: [],
      milestoneBenefits: [],
      lounge: { domestic: 0, international: 0 },
      loungeDomestic: 0,
      loungeInternational: 0,
      forexMarkup: 3.5,
      sourceUrl: "",
      applyUrl: "",
      lastVerified: "2025-01-01",
      verificationStatus: "needs-review"
    } as unknown as CardScore["card"],
    annualSpend: 1_200_000,
    estimatedAnnualRewards: 10000,
    estimatedMilestoneValue: 0,
    estimatedAnnualFee: 0,
    estimatedNetValue: 10000,
    displayAnnualRewards: 10000,
    displayNetValue: 10000,
    displayBreakdown: [],
    fitScore: 100,
    matchedTags: [],
    reasons: [],
    scoreReasons: [],
    rewardBreakdown: []
  };
}

const CB1 = makeScore("cashback-1", "cashback");
const CB2 = makeScore("cashback-2", "cashback");
const CB3 = makeScore("cashback-3", "cashback");
const CB4 = makeScore("cashback-4", "cashback");
const CB5 = makeScore("cashback-5", "cashback");
const CB6 = makeScore("cashback-6", "cashback");   // 6th cashback — should be capped at 5
const RW1 = makeScore("rewards-1", "reward points");
const RW2 = makeScore("rewards-2", "reward points");
const RW3 = makeScore("rewards-3", "miles");
const RW4 = makeScore("rewards-4", "air miles");
const RW5 = makeScore("rewards-5", "reward points");
const RW6 = makeScore("rewards-6", "reward points"); // 6th rewards — should be capped at 5
const MX  = makeScore("mixed-1",   "cashback and reward points"); // mixed → Rewards bucket

// ---------------------------------------------------------------------------

describe("isPrimaryCashbackCard", () => {
  it("returns true for pure cashback", () => {
    expect(isPrimaryCashbackCard(CB1)).toBe(true);
  });

  it("returns false for reward points", () => {
    expect(isPrimaryCashbackCard(RW1)).toBe(false);
  });

  it("returns false for miles", () => {
    expect(isPrimaryCashbackCard(RW3)).toBe(false);
  });

  it("returns true for mixed-currency (cashback and reward points)", () => {
    expect(isPrimaryCashbackCard(MX)).toBe(true);
  });

  it("returns false for empty rewardType", () => {
    expect(isPrimaryCashbackCard(makeScore("x", ""))).toBe(false);
  });
});

describe("resultStrategies / single-list", () => {
  const strategy = resultStrategies["single-list"];

  it("is the default strategy", () => {
    expect(DEFAULT_RESULT_STRATEGY).toBe("single-list");
  });

  it("returns one untitled section with up to maxPerSection cards", () => {
    const scored = [RW1, CB1, RW2, CB2, RW3, CB3];
    const sections = strategy.group(scored, 5);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("");
    expect(sections[0].cards).toHaveLength(5);
    expect(sections[0].cards[0]).toBe(RW1); // preserves order
  });

  it("returns fewer than maxPerSection when input is short", () => {
    const sections = strategy.group([RW1, CB1], 5);
    expect(sections[0].cards).toHaveLength(2);
  });
});

describe("resultStrategies / reward-type-split", () => {
  const strategy = resultStrategies["reward-type-split"];

  it("returns two sections titled Cashback cards and Rewards cards", () => {
    const scored = [RW1, CB1, RW2, CB2];
    const sections = strategy.group(scored, 5);
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("Cashback cards");
    expect(sections[1].title).toBe("Rewards cards");
  });

  it("preserves ranked order within each section", () => {
    const scored = [RW1, CB1, RW2, CB2, RW3, CB3];
    const sections = strategy.group(scored, 5);
    expect(sections[0].cards.map((s) => s.card.id)).toEqual(["cashback-1", "cashback-2", "cashback-3"]);
    expect(sections[1].cards.map((s) => s.card.id)).toEqual(["rewards-1", "rewards-2", "rewards-3"]);
  });

  it("caps each section at maxPerSection (5)", () => {
    const scored = [RW1, RW2, RW3, RW4, RW5, RW6, CB1, CB2, CB3, CB4, CB5, CB6];
    const sections = strategy.group(scored, 5);
    expect(sections[0].cards).toHaveLength(5);
    expect(sections[1].cards).toHaveLength(5);
  });

  it("places mixed-currency cards (cashback and reward points) into Cashback bucket", () => {
    const scored = [RW1, MX, CB1];
    const sections = strategy.group(scored, 5);
    const cashbackIds = sections[0].cards.map((s) => s.card.id);
    const rewardIds = sections[1].cards.map((s) => s.card.id);
    expect(cashbackIds).toContain("mixed-1");
    expect(rewardIds).not.toContain("mixed-1");
  });

  it("returns empty Cashback section if no cashback cards exist", () => {
    const scored = [RW1, RW2, RW3];
    const sections = strategy.group(scored, 5);
    expect(sections[0].cards).toHaveLength(0);
    expect(sections[1].cards).toHaveLength(3);
  });

  it("returns empty Rewards section if all cards are cashback", () => {
    const scored = [CB1, CB2, CB3];
    const sections = strategy.group(scored, 5);
    expect(sections[0].cards).toHaveLength(3);
    expect(sections[1].cards).toHaveLength(0);
  });
});

describe("applyResultStrategy gating (via scoreCards integration)", () => {
  // These tests verify the gate logic via the exported applyResultStrategy helper.
  // Import dynamically to avoid pulling in the full card index at describe time.
  it("allows splitting for a category-focused query if requested and both buckets have >= 1 card", async () => {
    const { applyResultStrategy } = await import("../lib/recommend");
    const { scoreCards } = await import("../lib/recommend");

    // Category-focused query — not a broad generic ranking
    const input = {
      query: "best dining card",
      resultStrategy: "reward-type-split" as const
    };
    const scored = scoreCards(input);
    const sections = applyResultStrategy(scored, input);
    // Should split because there are both cashback and rewards cards in the results and MIN_CARDS_PER_SPLIT_SECTION = 1
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("Cashback cards");
    expect(sections[1].title).toBe("Rewards cards");
  });

  it("applies reward-type-split for a broad query", async () => {
    const { applyResultStrategy } = await import("../lib/recommend");
    const { scoreCards } = await import("../lib/recommend");

    const input = {
      query: "best credit card",
      resultStrategy: "reward-type-split" as const
    };
    const scored = scoreCards(input);
    const sections = applyResultStrategy(scored, input);
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("Cashback cards");
    expect(sections[1].title).toBe("Rewards cards");
    // Each section must have cards
    expect(sections[0].cards.length).toBeGreaterThan(0);
    expect(sections[1].cards.length).toBeGreaterThan(0);
  });

  it("single-list default returns one untitled section for a broad query", async () => {
    const { applyResultStrategy } = await import("../lib/recommend");
    const { scoreCards } = await import("../lib/recommend");

    const scored = scoreCards({ query: "best credit card" });
    const sections = applyResultStrategy(scored, { query: "best credit card" });
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("");
  });

  it("explicit reward-type-split fires even when spend is present (UI toggle path)", async () => {
    const { applyResultStrategy, scoreCards } = await import("../lib/recommend");

    // Simulate the /recommend slider scenario: spend is always present
    const spend = { online: 20000, dining: 5000, grocery: 10000, base: 15000 };
    const input = {
      spend,
      resultStrategy: "reward-type-split" as const
    };
    const scored = scoreCards(input);
    const sections = applyResultStrategy(scored, input);
    // Must produce two headed sections despite spend being present
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("Cashback cards");
    expect(sections[1].title).toBe("Rewards cards");
  });

  it("keeps forex split sections strictly primary-bucket so AU ixigo is not duplicated", async () => {
    const { applyResultStrategy, scoreCards } = await import("../lib/recommend");

    const scored = scoreCards({
      query: "best forex card",
      resultStrategy: "reward-type-split"
    });
    const sections = applyResultStrategy(scored, {
      query: "best forex card",
      resultStrategy: "reward-type-split"
    });

    const cashbackIds = sections.find((section) => section.title === "Cashback cards")?.cards.map((score) => score.card.id) ?? [];
    const rewardIds = sections.find((section) => section.title === "Rewards cards")?.cards.map((score) => score.card.id) ?? [];

    expect(cashbackIds).not.toContain("au-ixigo");
    expect(rewardIds).toContain("au-ixigo");
  });

  it("single-list order matches rankResults (display-order sort, not fitScore)", async () => {
    const { applyResultStrategy, scoreCards } = await import("../lib/recommend");
    const { rankResults } = await import("../lib/recommend-result");

    // Use a spend profile so the result is deterministic and not a broad query.
    const spend = { online: 20000, dining: 5000, grocery: 10000, base: 15000 };
    const input = { spend, resultStrategy: "single-list" as const };
    const scored = scoreCards(input);

    const sections = applyResultStrategy(scored, input);
    const sectionIds = sections[0].cards.map((s) => s.card.id);
    const rankResultsIds = rankResults(scored).map((r) => r.id);

    // Top-5 from applyResultStrategy must match rankResults top-5 exactly
    expect(sectionIds.slice(0, 5)).toEqual(rankResultsIds);
  });

  it("computes splitOrderScore for explicit-spend single-list results", async () => {
    const { scoreCards } = await import("../lib/recommend");

    const spend = { online: 20000, dining: 5000, grocery: 10000, base: 15000 };
    const scored = scoreCards({ spend, resultStrategy: "single-list" });

    expect(scored.length).toBeGreaterThan(0);
    expect(scored.every((score) => typeof score.envelopeScoring?.splitOrderScore === "number")).toBe(true);
  });

  it("rankResults prefers splitOrderScore over raw net value when present", async () => {
    const { rankResults } = await import("../lib/recommend-result");
    const highNetLowSplit = {
      ...CB1,
      estimatedNetValue: 50000,
      displayNetValue: 50000,
      envelopeScoring: {
        bestMonthlySpend: 25000,
        bestSpendLabel: "Rs 25k/month",
        normalizedFitScore: 100,
        splitOrderScore: 10
      }
    };
    const lowNetHighSplit = {
      ...CB2,
      estimatedNetValue: 1000,
      displayNetValue: 1000,
      envelopeScoring: {
        bestMonthlySpend: 25000,
        bestSpendLabel: "Rs 25k/month",
        normalizedFitScore: 100,
        splitOrderScore: 1000
      }
    };

    expect(rankResults([highNetLowSplit, lowNetHighSplit]).map((result) => result.id).slice(0, 2)).toEqual([
      "cashback-2",
      "cashback-1"
    ]);
  });

  it("adds splitOrderScore to dual-bucket secondary scores", async () => {
    const { scoreCards } = await import("../lib/recommend");

    const scored = scoreCards({ query: "best credit card", resultStrategy: "reward-type-split" });
    const dualScores = scored.flatMap((score) => [score.rewardBucketScore, score.cashbackBucketScore].filter(Boolean));

    expect(dualScores.length).toBeGreaterThan(0);
    expect(dualScores.every((score) => typeof score?.envelopeScoring?.splitOrderScore === "number")).toBe(true);
  });

  it("retains split when there are 0 cashback cards and lets rewards fill the slack", async () => {
    const { applyResultStrategy } = await import("../lib/recommend");
    
    // Stub scores: 3 rewards, 0 cashback
    const scored = [RW1, RW2, RW3]; 
    const sections = applyResultStrategy(scored, {
      query: "best credit card",
      resultStrategy: "reward-type-split"
    });
    
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("Cashback cards");
    expect(sections[0].cards).toHaveLength(0);
    expect(sections[1].title).toBe("Rewards cards");
    expect(sections[1].cards).toHaveLength(3);
  });

  it("retains split when there are 0 rewards cards and lets cashback fill the slack", async () => {
    const { applyResultStrategy } = await import("../lib/recommend");
    
    // Stub scores: 0 rewards, 3 cashback
    const scored = [CB1, CB2, CB3]; 
    const sections = applyResultStrategy(scored, {
      query: "best credit card",
      resultStrategy: "reward-type-split"
    });
    
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("Cashback cards");
    expect(sections[0].cards).toHaveLength(3);
    expect(sections[1].title).toBe("Rewards cards");
    expect(sections[1].cards).toHaveLength(0);
  });

  it("retains split if both sections have at least 1 card", async () => {
    const { applyResultStrategy } = await import("../lib/recommend");
    
    // Stub scores: 3 rewards, 1 cashback
    const scored = [RW1, RW2, RW3, CB1]; 
    const sections = applyResultStrategy(scored, {
      query: "best credit card",
      resultStrategy: "reward-type-split"
    });
    
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("Cashback cards");
    expect(sections[0].cards).toHaveLength(1);
    expect(sections[1].title).toBe("Rewards cards");
    expect(sections[1].cards).toHaveLength(3);
  });

  it("fills rewards up to 10 total slots when cashback has no cards", async () => {
    const { applyResultStrategy } = await import("../lib/recommend");

    const scored = [RW1, RW2, RW3, RW4, RW5, RW6, makeScore("rewards-7", "reward points")];
    const sections = applyResultStrategy(scored, {
      query: "best cards for dining",
      resultStrategy: "reward-type-split"
    });

    expect(sections).toHaveLength(2);
    expect(sections[0].cards).toHaveLength(0);
    expect(sections[1].cards.map((score) => score.card.id)).toEqual([
      "rewards-1",
      "rewards-2",
      "rewards-3",
      "rewards-4",
      "rewards-5",
      "rewards-6",
      "rewards-7"
    ]);
  });
});

describe("SPLIT_SCOPE active routing", () => {
  it("routes any ranking query to split when SPLIT_SCOPE is any-query", async () => {
    const { answerQuestion } = await import("../lib/ask-ai");
    const result = await answerQuestion({ query: "best dining cards" });
    // Since SPLIT_SCOPE is "any-query", this ranking query requests the split,
    // and since both rewards and cashback dining cards exist, it successfully splits.
    expect(result.sections).toBeDefined();
    expect(result.sections).toHaveLength(2);
    expect(result.sections![0].title).toBe("Cashback cards");
    expect(result.sections![1].title).toBe("Rewards cards");
  });
});

describe("SEO landing page section splitting", () => {
  it("splits rankings for Rupay, Premium, Online Shopping, and Beginner landing pages", async () => {
    const { selectSectionsForLanding, getSeoLanding } = await import("../lib/seo-landing");
    
    const rupay = getSeoLanding("best-rupay-credit-cards-india")!;
    const premium = getSeoLanding("best-premium-credit-cards-india")!;
    const online = getSeoLanding("best-credit-cards-for-online-shopping")!;
    const beginner = getSeoLanding("best-credit-cards-for-beginners-india")!;

    const rupaySections = selectSectionsForLanding(rupay);
    expect(rupaySections).toHaveLength(2);
    expect(rupaySections![0].title).toBe("Cashback cards");
    expect(rupaySections![1].title).toBe("Rewards cards");
    expect(rupaySections![0].cards.length).toBeGreaterThan(0);
    expect(rupaySections![1].cards.length).toBeGreaterThan(0);

    // Premium landing page has few or no cashback cards in top results, so it keeps the split.
    const premiumSections = selectSectionsForLanding(premium);
    expect(premiumSections).toHaveLength(2);
    expect(premiumSections![0].title).toBe("Cashback cards");
    expect(premiumSections![0].cards.length).toBeGreaterThanOrEqual(0);
    expect(premiumSections![1].title).toBe("Rewards cards");
    expect(premiumSections![1].cards.length).toBeGreaterThan(0);

    const onlineSections = selectSectionsForLanding(online);
    expect(onlineSections).toHaveLength(2);
    expect(onlineSections![0].title).toBe("Cashback cards");
    expect(onlineSections![1].title).toBe("Rewards cards");
    expect(onlineSections![0].cards.length).toBeGreaterThan(0);
    expect(onlineSections![1].cards.length).toBeGreaterThan(0);

    const beginnerSections = selectSectionsForLanding(beginner);
    expect(beginnerSections).toHaveLength(2);
    expect(beginnerSections![0].title).toBe("Cashback cards");
    expect(beginnerSections![1].title).toBe("Rewards cards");
    expect(beginnerSections![0].cards.length).toBeGreaterThan(0);
    expect(beginnerSections![1].cards.length).toBeGreaterThan(0);
  });
});
