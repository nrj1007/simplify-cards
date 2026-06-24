import { describe, expect, it } from "vitest";
import { resultStrategies, hasCashbackCardSignal, DEFAULT_RESULT_STRATEGY } from "../lib/result-strategies";
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
      exclusions: [],
      milestoneBenefits: [],
      lounge: { domestic: 0, international: 0 },
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

describe("hasCashbackCardSignal", () => {
  it("returns true for pure cashback", () => {
    expect(hasCashbackCardSignal(CB1)).toBe(true);
  });

  it("returns false for reward points", () => {
    expect(hasCashbackCardSignal(RW1)).toBe(false);
  });

  it("returns false for miles", () => {
    expect(hasCashbackCardSignal(RW3)).toBe(false);
  });

  it("returns false for mixed-currency (cashback and reward points → Rewards bucket)", () => {
    expect(hasCashbackCardSignal(MX)).toBe(false);
  });

  it("returns false for empty rewardType", () => {
    expect(hasCashbackCardSignal(makeScore("x", ""))).toBe(false);
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

  it("returns two sections titled Rewards cards and Cashback cards", () => {
    const scored = [RW1, CB1, RW2, CB2];
    const sections = strategy.group(scored, 5);
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("Rewards cards");
    expect(sections[1].title).toBe("Cashback cards");
  });

  it("preserves ranked order within each section", () => {
    const scored = [RW1, CB1, RW2, CB2, RW3, CB3];
    const sections = strategy.group(scored, 5);
    expect(sections[0].cards.map((s) => s.card.id)).toEqual(["rewards-1", "rewards-2", "rewards-3"]);
    expect(sections[1].cards.map((s) => s.card.id)).toEqual(["cashback-1", "cashback-2", "cashback-3"]);
  });

  it("caps each section at maxPerSection (5)", () => {
    const scored = [RW1, RW2, RW3, RW4, RW5, RW6, CB1, CB2, CB3, CB4, CB5, CB6];
    const sections = strategy.group(scored, 5);
    expect(sections[0].cards).toHaveLength(5);
    expect(sections[1].cards).toHaveLength(5);
  });

  it("places mixed-currency cards (cashback and reward points) into Rewards bucket", () => {
    const scored = [RW1, MX, CB1];
    const sections = strategy.group(scored, 5);
    const rewardIds = sections[0].cards.map((s) => s.card.id);
    const cashbackIds = sections[1].cards.map((s) => s.card.id);
    expect(rewardIds).toContain("mixed-1");
    expect(cashbackIds).not.toContain("mixed-1");
  });

  it("returns empty Cashback section if no cashback cards exist", () => {
    const scored = [RW1, RW2, RW3];
    const sections = strategy.group(scored, 5);
    expect(sections[0].cards).toHaveLength(3);
    expect(sections[1].cards).toHaveLength(0);
  });

  it("returns empty Rewards section if all cards are cashback", () => {
    const scored = [CB1, CB2, CB3];
    const sections = strategy.group(scored, 5);
    expect(sections[0].cards).toHaveLength(0);
    expect(sections[1].cards).toHaveLength(3);
  });
});

describe("applyResultStrategy gating (via scoreCards integration)", () => {
  // These tests verify the gate logic via the exported applyResultStrategy helper.
  // Import dynamically to avoid pulling in the full card index at describe time.
  it("forces single-list for a non-broad query regardless of requested strategy", async () => {
    const { applyResultStrategy } = await import("../lib/recommend");
    const { scoreCards } = await import("../lib/recommend");

    // Category-focused query — not a broad generic ranking
    const scored = scoreCards({ query: "best dining card" });
    const sections = applyResultStrategy(scored, {
      query: "best dining card",
      resultStrategy: "reward-type-split"
    });
    // Must degrade to single-list: one section, no title
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("");
  });

  it("applies reward-type-split for a broad query", async () => {
    const { applyResultStrategy } = await import("../lib/recommend");
    const { scoreCards } = await import("../lib/recommend");

    const scored = scoreCards({ query: "best credit card" });
    const sections = applyResultStrategy(scored, {
      query: "best credit card",
      resultStrategy: "reward-type-split"
    });
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("Rewards cards");
    expect(sections[1].title).toBe("Cashback cards");
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
});
