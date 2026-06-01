import { describe, expect, it } from "vitest";
import { scoreCards } from "../lib/recommend";
import { toRecommendResult } from "../lib/recommend-result";

describe("toRecommendResult", () => {
  it("surfaces fee-waiver and milestone context for cards with active unlocks", () => {
    const score = scoreCards({ query: "best hdfc reward card" }).find((item) => item.card.id === "hdfc-regalia-gold");
    expect(score).toBeDefined();

    const result = toRecommendResult(score!);

    expect(result.estimatedMilestoneValue).toBeGreaterThan(0);
    expect(result.feeWaiverHit).toBe(true);
    expect(result.nextMilestoneGap).toBeGreaterThan(0);
    expect(result.nextMilestoneLabel).toMatch(/Rs 5,000 worth flight vouchers on spends of Rs 7.5 lakh/i);
  });

  it("surfaces fee-waiver and milestone gaps when they are not hit yet", () => {
    const score = scoreCards({
      query: "travel card",
      spend: {
        online: 15000,
        base: 8000,
        travel: 5000,
        dining: 4000,
        grocery: 5000,
        fuel: 3000,
        amazon: 5000,
        upi: 5000,
        utilities: 3000,
        rent: 0,
        insurance: 0,
        education: 0,
        gold: 0
      }
    }).find((item) => item.card.id === "hsbc-travelone");
    expect(score).toBeDefined();

    const result = toRecommendResult(score!);

    expect(result.feeWaiverHit).toBe(false);
    expect(result.nextFeeWaiverGap).toBe(164000);
    expect(result.nextMilestoneGap).toBe(564000);
    expect(result.nextMilestoneThreshold).toBe(1200000);
  });
});
