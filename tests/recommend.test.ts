import { describe, expect, it } from "vitest";
import { answerFromCards, scoreCards } from "../lib/recommend";

describe("scoreCards", () => {
  it("respects annual fee constraints", () => {
    const scores = scoreCards({ maxAnnualFee: 0 });

    expect(scores.length).toBeGreaterThan(0);
    expect(scores.every((score) => score.card.annualFee === 0)).toBe(true);
  });

  it("respects the lifetime-free filter", () => {
    const scores = scoreCards({ wantsLifetimeFree: true });

    expect(scores.length).toBeGreaterThan(0);
    expect(scores.every((score) => score.card.annualFee === 0)).toBe(true);
  });

  it("respects the lounge filter", () => {
    const scores = scoreCards({ wantsLounge: true });

    expect(scores.length).toBeGreaterThan(0);
    expect(
      scores.every(
        (score) =>
          score.card.loungeDomestic === "unlimited" ||
          score.card.loungeInternational === "unlimited" ||
          score.card.loungeDomestic + score.card.loungeInternational > 0
      )
    ).toBe(true);
  });

  it("scores known cashback cards for online cashback intent", () => {
    const scores = scoreCards({
      query: "best online cashback card",
      spend: {
        online: 25000,
        offline: 0,
        travel: 0,
        dining: 0,
        grocery: 0,
        fuel: 0,
        amazon: 10000,
        upi: 0,
        utilities: 0
      }
    });
    const sbiCashback = scores.find((score) => score.card.id === "sbi-cashback");
    const amazonPay = scores.find((score) => score.card.id === "icici-amazon-pay");

    expect(sbiCashback?.matchedTags).toContain("cashback");
    expect(sbiCashback?.estimatedAnnualRewards).toBeGreaterThan(0);
    expect(amazonPay?.matchedTags).toContain("online");
    expect(amazonPay?.estimatedAnnualRewards).toBeGreaterThan(0);
  });

  it("surfaces fuel cards for fuel-heavy intent", () => {
    const topIds = scoreCards({
      query: "best fuel hpcl indianoil card",
      spend: {
        online: 0,
        offline: 0,
        travel: 0,
        dining: 0,
        grocery: 0,
        fuel: 12000,
        amazon: 0,
        upi: 0,
        utilities: 0
      }
    })
      .slice(0, 12)
      .map((score) => score.card.id);

    expect(topIds).toEqual(expect.arrayContaining(["idfc-first-power-plus", "bpcl-sbi-octane", "bobcard-hpcl-energie"]));
  });
});

describe("answerFromCards", () => {
  it("returns a fallback summary when constraints remove all cards", () => {
    const answer = answerFromCards({ maxAnnualFee: -1 });

    expect(answer.cards).toHaveLength(0);
    expect(answer.summary).toMatch(/No card matched/);
  });

  it("returns top card answers when matches exist", () => {
    const answer = answerFromCards({ query: "cashback" });

    expect(answer.cards.length).toBeGreaterThan(0);
    expect(answer.summary).toContain(answer.cards[0].card.name);
  });
});
