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
        base: 0,
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
    const topScores = scoreCards({
      query: "best fuel hpcl indianoil card",
      spend: {
        online: 0,
        base: 0,
        travel: 0,
        dining: 0,
        grocery: 0,
        fuel: 12000,
        amazon: 0,
        upi: 0,
        utilities: 0
      }
    }).slice(0, 10);
    const topIds = topScores.map((score) => score.card.id);
    expect(["idfc-first-power-plus", "icici-hpcl-super-saver", "icici-hpcl-coral"]).toContain(topScores[0]?.card.id);
    expect(topIds).toEqual(expect.arrayContaining(["axis-indianoil", "axis-indianoil-easy"]));
  });

  it("prioritizes direct card-name queries ahead of generic ranking", () => {
    const scores = scoreCards({
      query: "Axis Atlas",
      maxAnnualFee: 5000
    });

    expect(scores[0]?.card.id).toBe("axis-atlas");
    expect(scores[0]?.reasons).toContain("Strong card-name match for the query");
  });

  it("restricts issuer-led recommendation queries to the requested issuer", () => {
    const scores = scoreCards({
      query: "top icici card under 5000",
      maxAnnualFee: 5000
    });

    expect(scores.length).toBeGreaterThan(0);
    expect(scores.every((score) => score.card.issuer === "ICICI Bank")).toBe(true);
  });

  it("surfaces Atlas for Axis travel intent", () => {
    const scores = scoreCards({
      query: "best axis travel card"
    });

    expect(scores[0]?.card.id).toBe("axis-atlas");
    expect(scores.every((score) => score.card.issuer === "Axis Bank")).toBe(true);
  });

  it("boosts lounge-heavy cards when the query explicitly asks for lounge access", () => {
    const scores = scoreCards({
      query: "best hdfc lounge card under 5000"
    });

    expect(scores[0]?.card.id).toBe("hdfc-regalia-gold");
  });

  it("boosts lower forex markup cards for explicit forex queries", () => {
    const scores = scoreCards({
      query: "best hdfc forex card under 5000"
    });

    expect(scores[0]?.card.id).toBe("hdfc-regalia-gold");
  });

  it("applies parsed fee caps from natural-language queries", () => {
    const scores = scoreCards({
      query: "top card under 5000"
    });

    expect(scores.length).toBeGreaterThan(0);
    expect(scores.every((score) => score.card.annualFee <= 5000)).toBe(true);
    expect(scores.some((score) => score.card.id === "indusind-pioneer-legacy")).toBe(false);
  });

  it("builds a grocery-heavy spend profile from grocery-spend queries", () => {
    const scores = scoreCards({
      query: "top card for grocery spends"
    });

    expect(scores[0]?.card.id).not.toBe("landmark-rewards-sbi-prime");
    expect(scores[0]?.rewardBreakdown.every((item) => item.spendCategory === "grocery")).toBe(true);
    expect(scores[0]?.annualSpend).toBe(53000 * 12);
  });

  it("builds a travel-heavy spend profile from travel-spend queries", () => {
    const scores = scoreCards({
      query: "top card for travel spends"
    });

    expect(scores[0]?.rewardBreakdown.every((item) => item.spendCategory === "travel")).toBe(true);
    expect(scores[0]?.annualSpend).toBe(53000 * 12);
  });

  it("treats life time free phrasing the same as lifetime free", () => {
    const scores = scoreCards({
      query: "top life time free cards"
    });

    expect(scores.length).toBeGreaterThan(0);
    expect(scores.every((score) => score.card.annualFee === 0)).toBe(true);
  });

  it("uses parsed spend mixes as the scoring profile", () => {
    const scores = scoreCards({
      query: "my spends are 50% travel, 25% grocery, 25% utilities, suggest a card for me"
    });

    const spendCategories = new Set(scores[0]?.rewardBreakdown.map((item) => item.spendCategory));
    expect(scores[0]?.card.id).not.toBe("amex-platinum-travel");
    expect([...spendCategories].every((category) => ["travel", "grocery", "utilities"].includes(category))).toBe(true);
    expect(spendCategories.has("travel")).toBe(true);
    expect(scores[0]?.annualSpend).toBe(53000 * 12);
  });

  it("uses explicit Accor redemption value when the query asks for Accor-oriented travel cards", () => {
    const scores = scoreCards({
      query: "best travel card for accor redemption"
    });

    const travelOneRank = scores.findIndex((score) => score.card.id === "hsbc-travelone");
    const travelOne = scores.find((score) => score.card.id === "hsbc-travelone");
    expect(travelOne?.card.redemption?.accorValue).toBe(2.2);
    expect(travelOneRank).toBeGreaterThanOrEqual(0);
  });

  it("values Axis Atlas EDGE Miles correctly using Travel EDGE redemption value", () => {
    const scores = scoreCards({
      query: "best axis travel card"
    });

    const atlas = scores.find((score) => score.card.id === "axis-atlas");
    expect(atlas?.card.redemption?.travelEdgeValue).toBe(1);
  });

  it("applies fee waiver at high annual spend thresholds", () => {
    const scores = scoreCards({
      query: "best travel card",
      spend: {
        travel: 66667
      }
    });

    const travelOne = scores.find((score) => score.card.id === "hsbc-travelone");
    expect(travelOne?.annualSpend).toBeGreaterThanOrEqual(800000);
    expect(travelOne?.estimatedAnnualFee).toBe(0);
  });

  it("adds milestone value once the spend threshold is crossed", () => {
    const scores = scoreCards({
      query: "best axis travel card",
      spend: {
        travel: 125000
      }
    });

    const atlas = scores.find((score) => score.card.id === "axis-atlas");
    expect(atlas?.annualSpend).toBeGreaterThanOrEqual(1500000);
    expect(atlas?.estimatedMilestoneValue).toBeGreaterThan(0);
    expect(atlas?.reasons).toEqual(expect.arrayContaining([expect.stringMatching(/Milestone value adds about Rs/i)]));
  });

  it("does not double-count voucher milestone wording", () => {
    const scores = scoreCards({
      query: "top card under 5000"
    });

    const reliancePrime = scores.find((score) => score.card.id === "reliance-sbi-prime");
    expect(reliancePrime?.estimatedMilestoneValue).toBe(4375);
  });

  it("counts Regalia Gold voucher milestones from 'Rs X worth' wording", () => {
    const scores = scoreCards({
      query: "top card under 5000"
    });

    const regaliaGold = scores.find((score) => score.card.id === "hdfc-regalia-gold");
    expect(regaliaGold?.estimatedMilestoneValue).toBe(5500);
  });

  it("uses the best milestone and fee-waiver upside for broad ranking comparisons", () => {
    const scores = scoreCards({
      query: "top card under 5000"
    });

    const travelOne = scores.find((score) => score.card.id === "hsbc-travelone");
    expect(travelOne?.reasons).toEqual(
      expect.arrayContaining([expect.stringMatching(/Higher milestone and fee-waiver upside can add about Rs 6,000/i)])
    );
    expect((travelOne?.fitScore ?? 0) - (travelOne?.estimatedNetValue ?? 0)).toBeGreaterThan(8000);
  });

  it("avoids invite-only luxury cards for generic ltf asks", () => {
    const scores = scoreCards({
      query: "top life time free cards"
    });

    const topHaystack = `${scores[0]?.card.bestFor.join(" ")} ${scores[0]?.card.exclusions.join(" ")}`.toLowerCase();
    expect(topHaystack).not.toContain("invite only");
  });

  it("penalizes relationship-only cards for broad generic asks", () => {
    const scores = scoreCards({
      query: "top card under 5000"
    });

    const pioneer = scores.find((score) => score.card.id === "indusind-pioneer-legacy");
    expect(pioneer).toBeUndefined();
  });

  it("blends SmartBuy-like routing into generic online spend instead of treating it as all-or-nothing", () => {
    const genericScores = scoreCards({
      query: "top card under 5000"
    });
    const smartbuyScores = scoreCards({
      query: "best smartbuy card under 5000"
    });

    const genericDiners = genericScores.find((score) => score.card.id === "hdfc-diners-club-privilege");
    const genericRegalia = genericScores.find((score) => score.card.id === "hdfc-regalia-gold");
    const smartbuyDiners = smartbuyScores.find((score) => score.card.id === "hdfc-diners-club-privilege");
    const genericDinersOnlineRewards = genericDiners?.rewardBreakdown
      .filter((item) => item.spendCategory === "online")
      .map((item) => item.rewardCategory);
    const genericRegaliaOnlineRewards = genericRegalia?.rewardBreakdown
      .filter((item) => item.spendCategory === "online")
      .map((item) => item.rewardCategory);
    const smartbuyDinersOnlineRewards = smartbuyDiners?.rewardBreakdown
      .filter((item) => item.spendCategory === "online")
      .map((item) => item.rewardCategory);

    expect(genericDinersOnlineRewards).toEqual(expect.arrayContaining(["smartbuy", "base"]));
    expect(genericRegaliaOnlineRewards).toEqual(expect.arrayContaining(["select lifestyle brands", "base"]));
    expect(smartbuyDinersOnlineRewards).toEqual(["smartbuy"]);
  });

  it("treats generic travel spend as fully travel-routed instead of a 50-50 SmartBuy blend", () => {
    const genericScores = scoreCards({
      query: "top card under 5000"
    });

    const travelOne = genericScores.find((score) => score.card.id === "hsbc-travelone");
    const travelOneTravelRewards = travelOne?.rewardBreakdown
      .filter((item) => item.spendCategory === "travel")
      .map((item) => item.rewardCategory);

    expect(travelOneTravelRewards).toEqual(["travel"]);
  });

  it("treats generic grocery spend as fully SmartBuy-like when a card has that grocery path", () => {
    const genericScores = scoreCards({
      query: "top card under 5000"
    });

    const regalia = genericScores.find((score) => score.card.id === "hdfc-regalia-gold");
    const regaliaGroceryRewards = regalia?.rewardBreakdown
      .filter((item) => item.spendCategory === "grocery")
      .map((item) => item.rewardCategory);

    expect(regaliaGroceryRewards).toEqual(["select lifestyle brands"]);
  });

  it("does not over-penalize premium travel cards on broad mixed-spend queries", () => {
    const genericScores = scoreCards({
      query: "top card under 5000"
    });

    const travelOne = genericScores.find((score) => score.card.id === "hsbc-travelone");
    const netAdjustment = (travelOne?.fitScore ?? 0) - (travelOne?.estimatedNetValue ?? 0);

    expect(travelOne).toBeDefined();
    expect(netAdjustment).toBeGreaterThan(-10000);
  });

  it("does not count excluded categories into annual rewards before ranking adjustment", () => {
    const genericScores = scoreCards({
      query: "top card under 5000"
    });

    const travelOne = genericScores.find((score) => score.card.id === "hsbc-travelone");
    const countedCategories = new Set(travelOne?.rewardBreakdown.map((item) => item.spendCategory));

    expect(countedCategories.has("fuel")).toBe(false);
    expect(countedCategories.has("utilities")).toBe(false);
  });

  it("models post-cap fallback earn rate instead of hard-stopping TravelOne accelerated rewards", () => {
    const scores = scoreCards({
      query: "best travel card",
      spend: {
        travel: 2000000
      }
    });

    const travelOne = scores.find((score) => score.card.id === "hsbc-travelone");
    const travelBreakdown = travelOne?.rewardBreakdown.find((item) => item.spendCategory === "travel");

    expect(travelBreakdown).toBeDefined();
    expect(travelBreakdown?.monthlyReward).toBe(143000);
    expect(travelBreakdown?.annualReward).toBe(1716000);
  });

  it("does not treat capped insurance wording as fully excluded when a card explicitly allows insurance rewards", () => {
    const scores = scoreCards({
      query: "best card for insurance spends",
      spend: {
        online: 0,
        base: 0,
        travel: 0,
        dining: 0,
        grocery: 0,
        fuel: 0,
        amazon: 0,
        upi: 0,
        utilities: 0,
        rent: 0,
        insurance: 53000,
        education: 0,
        gold: 0
      }
    });

    const infinia = scores.find((score) => score.card.id === "hdfc-infinia-metal");
    expect(infinia?.rewardBreakdown.some((item) => item.spendCategory === "insurance")).toBe(true);
  });

  it("lets capped rent rules override a generic rent exclusion", () => {
    const scores = scoreCards({
      query: "best card for rent spends",
      spend: {
        online: 0,
        base: 0,
        travel: 0,
        dining: 0,
        grocery: 0,
        fuel: 0,
        amazon: 0,
        upi: 0,
        utilities: 0,
        rent: 53000,
        insurance: 0,
        education: 0,
        gold: 0
      }
    });

    const hsbcPremier = scores.find((score) => score.card.id === "hsbc-premier");
    const magnusBurgundy = scores.find((score) => score.card.id === "axis-magnus-burgundy");

    expect(hsbcPremier?.rewardBreakdown.some((item) => item.spendCategory === "rent")).toBe(true);
    expect(magnusBurgundy?.rewardBreakdown.some((item) => item.spendCategory === "rent")).toBe(true);
  });

  it("lets Atlas use base rewards for education spend when education is rewarded", () => {
    const scores = scoreCards({
      query: "best axis card for education payments",
      spend: {
        online: 0,
        base: 0,
        travel: 0,
        dining: 0,
        grocery: 0,
        fuel: 0,
        amazon: 0,
        upi: 0,
        utilities: 0,
        rent: 0,
        insurance: 0,
        education: 53000,
        gold: 0
      }
    });

    const atlas = scores.find((score) => score.card.id === "axis-atlas");
    const educationBreakdown = atlas?.rewardBreakdown.find((item) => item.spendCategory === "education");

    expect(educationBreakdown?.rewardCategory).toBe("base");
  });

  it("counts joining and renewal-style hotel benefits for Marriott Bonvoy HDFC", () => {
    const scores = scoreCards({
      query: "top card under 5000"
    });

    const marriott = scores.find((score) => score.card.id === "hdfc-marriott-bonvoy");

    expect(marriott).toBeDefined();
    expect(marriott?.estimatedNetValue).toBeGreaterThan(5305);
    expect(marriott?.reasons).toEqual(
      expect.arrayContaining([expect.stringMatching(/Joining and renewal benefits add about Rs/i)])
    );
  });

  it("adds broad-ranking credit for cards that reward usually excluded categories", () => {
    const broadScores = scoreCards({
      query: "top cards"
    });

    const hsbcPremier = broadScores.find((score) => score.card.id === "hsbc-premier");

    expect(hsbcPremier).toBeDefined();
    expect(hsbcPremier?.reasons).toEqual(
      expect.arrayContaining([expect.stringMatching(/Rewards on usually excluded categories improve broader card utility/i)])
    );
  });

  it("uses envelope scoring for broad rankings without spend or fee caps", () => {
    const scores = scoreCards({
      query: "top 10 credit cards"
    });

    // All top cards should have envelope scoring data
    const topCards = scores.slice(0, 5);
    for (const card of topCards) {
      expect(card.envelopeScoring).toBeDefined();
      expect(card.envelopeScoring?.bestMonthlySpend).toBeGreaterThan(0);
      expect(card.reasons).toEqual(expect.arrayContaining([expect.stringMatching(/Best at Rs .*\/month/i)]));
    }

    // Burgundy should rank in the top results with a high-spend tier and a warning
    const burgundy = scores.find((s) => s.card.id === "axis-magnus-burgundy");
    expect(burgundy).toBeDefined();
    expect(burgundy?.envelopeScoring?.bestMonthlySpend).toBeGreaterThanOrEqual(150000);
    expect(burgundy?.reasons).toEqual(expect.arrayContaining([expect.stringMatching(/Needs high spend of .* to shine/i)]));
  });

  it("stores normalizedFitScore inside envelopeScoring and not at top level", () => {
    const scores = scoreCards({ query: "top 10 credit cards" });
    const envelopeScores = scores.filter((s) => s.envelopeScoring);

    expect(envelopeScores.length).toBeGreaterThan(0);

    for (const score of envelopeScores) {
      // normalizedFitScore must be inside envelopeScoring
      expect(score.envelopeScoring?.normalizedFitScore).toBeDefined();
      expect(typeof score.envelopeScoring?.normalizedFitScore).toBe("number");

      // normalizedFitScore must NOT be on the top-level CardScore object
      expect((score as Record<string, unknown>)["normalizedFitScore"]).toBeUndefined();
    }
  });

  it("uses yield-normalised score to select the best tier per card in envelope mode", () => {
    const scores = scoreCards({ query: "top 10 credit cards" });
    const envelopeScores = scores.filter((s) => s.envelopeScoring);

    for (const score of envelopeScores) {
      // normalizedFitScore is a finite number (can be negative if fee > rewards for a card)
      expect(typeof score.envelopeScoring!.normalizedFitScore).toBe("number");
      expect(Number.isFinite(score.envelopeScoring!.normalizedFitScore)).toBe(true);

      // For cards scored at very high spend, the high-spend warning must appear
      if (score.envelopeScoring!.bestMonthlySpend >= 150000) {
        expect(score.reasons).toEqual(
          expect.arrayContaining([expect.stringMatching(/Needs high spend of .* to shine/i)])
        );
      }
    }
  });

  it("does not use envelope scoring when a fee cap is present", () => {
    const scores = scoreCards({
      query: "top cards under 5000"
    });

    expect(scores.some((score) => score.envelopeScoring)).toBe(false);
    expect(scores.some((score) => score.card.id === "axis-magnus-burgundy")).toBe(false);
  });

  it("rewards IndusInd Tiger utility, insurance, education, and rent spends at base rate (1 point per Rs 100)", () => {
    const scores = scoreCards({
      query: "IndusInd Tiger",
      spend: {
        utilities: 10000,
        rent: 20000,
        insurance: 30000,
        education: 40000
      }
    });

    const tiger = scores.find((score) => score.card.id === "indusind-tiger");
    expect(tiger).toBeDefined();

    const breakdown = tiger!.rewardBreakdown;

    const utils = breakdown.find((item) => item.spendCategory === "utilities");
    expect(utils).toBeDefined();
    const targetCategory = "utilities, insurance, government, education, real estate, rent";
    expect(utils!.rewardCategory).toBe(targetCategory);
    expect(utils!.monthlyReward).toBe(40); // 10000 * 0.004

    const rent = breakdown.find((item) => item.spendCategory === "rent");
    expect(rent).toBeDefined();
    expect(rent!.rewardCategory).toBe(targetCategory);
    expect(rent!.monthlyReward).toBe(80); // 20000 * 0.004

    const insurance = breakdown.find((item) => item.spendCategory === "insurance");
    expect(insurance).toBeDefined();
    expect(insurance!.rewardCategory).toBe(targetCategory);
    expect(insurance!.monthlyReward).toBe(120); // 30000 * 0.004

    const education = breakdown.find((item) => item.spendCategory === "education");
    expect(education).toBeDefined();
    expect(education!.rewardCategory).toBe(targetCategory);
    expect(education!.monthlyReward).toBe(160); // 40000 * 0.004
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
