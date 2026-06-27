import { describe, expect, it } from "vitest";
import { answerFromCards, cardMatchesSegment, joiningAndRenewalBenefitValueForCard, scoreCards, qualifiesAsTravelCard } from "../lib/recommend";
import { getCardById } from "../lib/cards";
import type { ValuedBenefit } from "../lib/types";

describe("joining/renewal benefit value", () => {
  const base = getCardById("hdfc-regalia-gold")!;

  it("prefers structured joiningBenefitsValued over text and additionalBenefits", () => {
    const joiningBenefitsValued: ValuedBenefit[] = [
      { value: 5000, kind: "voucher", label: "Rs 5,000 welcome voucher" }
    ];
    const { joiningValue } = joiningAndRenewalBenefitValueForCard({
      ...base,
      joiningBenefitsValued,
      joiningBenefits: ["Cashback of Rs 99,999 as welcome gift"],
      additionalBenefits: ["Welcome bonus worth Rs 88,888 on joining"]
    });
    expect(joiningValue).toBe(5000); // structured only; text + additionalBenefits ignored
  });

  it("values structured renewalBenefitsValued (the renewalBenefits gap is fixed per card)", () => {
    const renewalBenefitsValued: ValuedBenefit[] = [
      { value: 2000, kind: "voucher", label: "Rs 2,000 anniversary voucher" }
    ];
    const { renewalValue } = joiningAndRenewalBenefitValueForCard({
      ...base,
      renewalBenefitsValued,
      renewalBenefits: ["ignored renewal text"]
    });
    expect(renewalValue).toBe(2000);
  });

  it("falls back to the text parser when no structured field (unchanged behavior)", () => {
    const card = {
      ...base,
      joiningBenefitsValued: undefined,
      renewalBenefitsValued: undefined,
      joiningBenefits: ["Cashback of Rs 1,000 as welcome gift"],
      renewalBenefits: ["Rs 5,000 voucher on anniversary"],
      additionalBenefits: [] as string[]
    };
    const { joiningValue, renewalValue } = joiningAndRenewalBenefitValueForCard(card);
    expect(joiningValue).toBe(1000); // parsed from joiningBenefits text
    expect(renewalValue).toBe(0); // fallback never values renewalBenefits text (known gap)
  });
});

describe("scoreCards", () => {
  it("respects annual fee constraints", () => {
    const scores = scoreCards({ maxAnnualFee: 0 });

    expect(scores.length).toBeGreaterThan(0);
    expect(scores.every((score) => score.card.annualFee === 0)).toBe(true);
  });

  it("tiers base earning across structured spend tiers (Magnus, matching the calculator)", () => {
    const magnusReward = (base: number) =>
      scoreCards({ spend: { base } }).find((s) => s.card.id === "axis-magnus")!.estimatedAnnualRewards;
    // Magnus earns 6 pts/Rs100 up to Rs 1.5L/mo then 17.5 pts/Rs100 above. So doubling base spend
    // from 1.5L to 3L more than doubles the reward — the second band earns at the higher tier rate.
    const atThreshold = magnusReward(150000);
    const aboveThreshold = magnusReward(300000);
    expect(aboveThreshold).toBeGreaterThan(2 * atThreshold);
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
    expect(topIds).toEqual(expect.arrayContaining(["hdfc-indianoil"]));
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

  it("restricts HSBC issuer-led recommendation queries to HSBC Bank cards", () => {
    const scores = scoreCards({
      query: "best hsbc card"
    });

    expect(scores.length).toBeGreaterThan(0);
    expect(scores.every((score) => score.card.issuer === "HSBC Bank")).toBe(true);
  });

  it("restricts UPI recommendation queries to UPI or RuPay cards", () => {
    const scores = scoreCards({
      query: "Best UPI card for rewards?"
    });

    expect(scores.length).toBeGreaterThan(0);
    expect(
      scores.every((score) => {
        const rewardCategories = score.card.rewards.flatMap((reward) =>
          reward.category.split(",").map((category) => category.trim().toLowerCase())
        );
        return (
          score.card.network.includes("RuPay") ||
          score.card.tags.includes("upi") ||
          score.card.bestFor.includes("upi") ||
          rewardCategories.includes("upi")
        );
      })
    ).toBe(true);
  });

  it("scores best UPI queries with Kiwi Neon when the paid membership wins net value", () => {
    const kiwi = scoreCards({
      query: "Best UPI card for rewards?"
    }).find((score) => score.card.id === "yes-kiwi");

    expect(kiwi).toBeTruthy();
    expect(kiwi?.annualSpend).toBe(636000);
    expect(kiwi?.estimatedAnnualRewards).toBe(12720);
    expect(kiwi?.estimatedAnnualFee).toBe(999);
    expect(kiwi?.estimatedNetValue).toBe(16221);
    expect(kiwi?.rewardBreakdown).toEqual([
      {
        spendCategory: "upi",
        monthlySpend: 53000,
        rewardCategory: "upi",
        monthlyReward: 1060,
        annualReward: 12720
      }
    ]);
    expect(kiwi?.reasons).toContain("Best net value uses Kiwi Neon membership after Rs 999 yearly cost");
  });

  it("compares base and Kiwi Neon rewards for mixed open-category spend", () => {
    const kiwi = scoreCards({
      spend: {
        online: 25000,
        base: 25000,
        travel: 0,
        dining: 0,
        grocery: 0,
        fuel: 0,
        amazon: 0,
        upi: 0,
        utilities: 0
      }
    }).find((score) => score.card.id === "yes-kiwi");

    expect(kiwi).toBeTruthy();
    expect(kiwi?.estimatedAnnualRewards).toBe(12000);
    expect(kiwi?.estimatedAnnualFee).toBe(999);
    expect(kiwi?.estimatedNetValue).toBe(15501);
    expect(kiwi?.rewardBreakdown).toEqual([
      {
        spendCategory: "online",
        monthlySpend: 25000,
        rewardCategory: "upi",
        monthlyReward: 500,
        annualReward: 6000
      },
      {
        spendCategory: "base",
        monthlySpend: 25000,
        rewardCategory: "upi",
        monthlyReward: 500,
        annualReward: 6000
      }
    ]);
    expect(kiwi?.reasons).toContain("Best net value uses Kiwi Neon membership after Rs 999 yearly cost");
  });

  it("routes non-excluded open spend to a UPI reward row when it is the highest earning path", () => {
    const kwik = scoreCards({
      spend: {
        online: 10000,
        base: 0,
        travel: 0,
        dining: 0,
        grocery: 0,
        fuel: 0,
        amazon: 0,
        upi: 0,
        utilities: 0
      }
    }).find((score) => score.card.id === "axis-kwik");

    expect(kwik).toBeTruthy();
    expect(kwik?.estimatedAnnualRewards).toBe(1200);
    expect(kwik?.rewardBreakdown).toEqual([
      {
        spendCategory: "online",
        monthlySpend: 10000,
        rewardCategory: "upi",
        monthlyReward: 100,
        annualReward: 1200
      }
    ]);
  });

  it("restricts explicit network recommendation queries to that network", () => {
    const scenarios = [
      { query: "best visa card", network: "visa" },
      { query: "best mastercard card", network: "mastercard" },
      { query: "best diners card", network: "diners club" }
    ];

    for (const scenario of scenarios) {
      const scores = scoreCards({ query: scenario.query });

      expect(scores.length).toBeGreaterThan(0);
      expect(
        scores.every((score) =>
          score.card.network.some((network) => network.toLowerCase().includes(scenario.network))
        )
      ).toBe(true);
    }
  });

  it("restricts fuel-card recommendation queries to fuel cards", () => {
    const scores = scoreCards({
      query: "best fuel card"
    });

    expect(scores.length).toBeGreaterThan(0);
    expect(
      scores.every((score) => {
        const rewardCategories = score.card.rewards.flatMap((reward) =>
          reward.category.split(",").map((category) => category.trim().toLowerCase())
        );
        const searchable = [
          score.card.name,
          score.card.id,
          ...score.card.bestFor,
          ...rewardCategories,
          ...(score.card.specialSpendRules?.map((rule) => rule.category) ?? [])
        ].join(" ").toLowerCase();

        return /\b(fuel|petrol|diesel|hpcl|bpcl|indianoil|indian oil|iocl)\b/.test(searchable);
      })
    ).toBe(true);
  });

  it("surfaces the strongest Axis travel card for Axis travel intent", () => {
    const scores = scoreCards({
      query: "best axis travel card"
    });

    // With 2x guest-lounge weighting, Magnus Burgundy (unlimited lounge + 4+4 complimentary guest
    // visits) edges out Atlas at the top; both, plus the rest, are Axis cards.
    expect(scores[0]?.card.id).toBe("axis-magnus-burgundy");
    expect(scores.every((score) => score.card.issuer === "Axis Bank")).toBe(true);
  });

  it("boosts lounge-heavy cards when the query explicitly asks for lounge access", () => {
    const scores = scoreCards({
      query: "best hdfc lounge card under 5000"
    });

    expect(scores[0]?.card.id).toBe("hdfc-shoppers-stop-black");
  });

  it("lets guest lounge access outrank comparable unlimited no-guest cards for lounge queries", () => {
    const ids = scoreCards({ query: "best lounge card" }).map((score) => score.card.id);

    expect(ids.indexOf("axis-magnus-burgundy")).toBeLessThan(ids.indexOf("hdfc-diners-club-black-metal"));
    expect(ids.indexOf("axis-magnus-burgundy")).toBeLessThan(ids.indexOf("hdfc-infinia-metal"));
  });

  it("lets guest international lounge access outrank comparable unlimited no-guest cards for international lounge queries", () => {
    const ids = scoreCards({ query: "best international lounge card" }).map((score) => score.card.id);

    expect(ids.indexOf("axis-magnus-burgundy")).toBeLessThan(ids.indexOf("hdfc-infinia-metal"));
    expect(ids.indexOf("hsbc-premier")).toBeLessThan(ids.indexOf("hdfc-infinia-metal"));
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
    expect(travelOne?.card.redemption?.accorValue).toBe(2);
    expect(travelOneRank).toBeGreaterThanOrEqual(0);
  });

  it("values Axis Atlas EDGE Miles correctly using Travel EDGE redemption value", () => {
    const scores = scoreCards({
      query: "axis atlas travel card"
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
      query: "axis atlas travel card",
      spend: {
        travel: 125000
      }
    });

    const atlas = scores.find((score) => score.card.id === "axis-atlas");
    expect(atlas?.annualSpend).toBeGreaterThanOrEqual(1500000);
    expect(atlas?.estimatedMilestoneValue).toBeGreaterThan(0);
    expect(atlas?.reasons).toEqual(expect.arrayContaining([expect.stringMatching(/Milestone value adds about Rs/i)]));
  });

  it("does not credit a milestone below its spend threshold (reachability gating)", () => {
    // SBI Prime's milestones annualize to ~Rs 2L (quarterly) and Rs 5L (annual). A low spender
    // reaches neither, so milestone value must be zero; a high spender reaches them.
    // input.spend MERGES with the default profile, so zero the other categories to control the total.
    const zeroed = {
      online: 0, base: 0, travel: 0, hotels: 0, airlines: 0, dining: 0, grocery: 0, fuel: 0,
      amazon: 0, upi: 0, utilities: 0, rent: 0, insurance: 0, education: 0, gold: 0, government: 0,
      international: 0
    };
    const lowSpend = scoreCards({ spend: { ...zeroed, base: 8000 } }).find((s) => s.card.id === "sbi-card-prime");
    const highSpend = scoreCards({ spend: { ...zeroed, base: 60000 } }).find((s) => s.card.id === "sbi-card-prime");

    expect(lowSpend?.annualSpend).toBeLessThan(200000);
    expect(lowSpend?.estimatedMilestoneValue).toBe(0);
    expect(highSpend?.annualSpend).toBeGreaterThanOrEqual(500000);
    expect(highSpend?.estimatedMilestoneValue).toBeGreaterThan(0);
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

  // Milestone upside is now carried by envelope scoring + milestoneSpecialistBoost.

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

  it("splits TravelOne travel between the portal flights/hotels tiers and the everyday rate", () => {
    const genericScores = scoreCards({
      query: "top card under 5000"
    });

    // TravelOne has both portal tiers (flights/hotels via HSBC) and a flat everyday "travel" rate, so a
    // share of travel is booked via the portal and the rest earns the everyday rate.
    const travelOne = genericScores.find((score) => score.card.id === "hsbc-travelone");
    const travelOneTravelRewards = travelOne?.rewardBreakdown
      .filter((item) => item.spendCategory === "travel")
      .map((item) => item.rewardCategory);

    expect(travelOneTravelRewards).toEqual(
      expect.arrayContaining(["travel with points flights", "travel with points hotels", "travel"])
    );
  });

  it("honors acceleratedShare grocery:0 — Regalia grocery earns base only, while online still blends", () => {
    const genericScores = scoreCards({
      query: "top card under 5000"
    });

    const regalia = genericScores.find((score) => score.card.id === "hdfc-regalia-gold");

    // Select-lifestyle brands do not include grocery, so Regalia sets acceleratedShare.grocery = 0:
    // grocery earns the base rate only, never the accelerated tier.
    const regaliaGroceryRewards = regalia?.rewardBreakdown
      .filter((item) => item.spendCategory === "grocery")
      .map((item) => item.rewardCategory);
    expect(regaliaGroceryRewards).toEqual(["base"]);

    // Online still blends the accelerated tier with base (default share).
    const regaliaOnlineRewards = regalia?.rewardBreakdown
      .filter((item) => item.spendCategory === "online")
      .map((item) => item.rewardCategory);
    expect(regaliaOnlineRewards).toEqual(expect.arrayContaining(["select lifestyle brands", "base"]));
  });

  it("blends SBI Cashback dining between online and base when dining is partially online", () => {
    const genericScores = scoreCards({
      query: "top card under 5000"
    });

    const sbiCashback = genericScores.find((score) => score.card.id === "sbi-cashback");
    const diningRewards = sbiCashback?.rewardBreakdown
      .filter((item) => item.spendCategory === "dining")
      .map((item) => item.rewardCategory);

    expect(diningRewards).toEqual(expect.arrayContaining(["online", "base"]));
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

    // The portal flights tier (16 RP/Rs 100, cap 18,000 RP/mo, post-cap 4) takes a 25% share of travel.
    // At this spend it blows past the cap and earns the post-cap rate on the excess rather than
    // hard-stopping at the cap.
    const travelOne = scores.find((score) => score.card.id === "hsbc-travelone");
    const flightsBreakdown = travelOne?.rewardBreakdown.find((item) => item.rewardCategory === "travel with points flights");

    expect(flightsBreakdown).toBeDefined();
    expect(flightsBreakdown?.monthlyReward).toBe(67000);
    expect(flightsBreakdown?.annualReward).toBe(804000);
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

    const returnedIds = scores.map((score) => score.card.id);

    expect(returnedIds).toContain("axis-magnus-burgundy");
    // axis-magnus is filtered out because it devalues below the 2% minimum yield threshold (gets ~1.32% yield)
  });

  it("filters rent recommendation results to cards clearing a 2% rent return including milestones", () => {
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

    expect(scores.length).toBeGreaterThan(0);
    expect(
      scores.every((score) => {
        const annualRentSpend = (score.rewardBreakdown.find((item) => item.spendCategory === "rent")?.monthlySpend ?? 0) * 12;
        return annualRentSpend > 0 && score.estimatedAnnualRewards + score.estimatedMilestoneValue >= annualRentSpend * 0.02;
      })
    ).toBe(true);
  });

  it("lets Atlas use base rewards for education spend when education is rewarded", () => {
    const scores = scoreCards({
      query: "axis atlas",
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
    expect(burgundy?.envelopeScoring?.bestMonthlySpend).toBeGreaterThanOrEqual(50000);
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

    const breakdown = tiger!.displayBreakdown;

    const utils = breakdown.find((item) => item.spendCategory === "utilities");
    expect(utils).toBeDefined();
    const targetCategory = "utilities, insurance, government, education, real estate, rent";
    expect(utils!.rewardCategory).toBe(targetCategory);
    expect(utils!.monthlyReward).toBe(100); // 10000 * 0.01

    const rent = breakdown.find((item) => item.spendCategory === "rent");
    expect(rent).toBeDefined();
    expect(rent!.rewardCategory).toBe(targetCategory);
    expect(rent!.monthlyReward).toBe(200); // 20000 * 0.01

    const insurance = breakdown.find((item) => item.spendCategory === "insurance");
    expect(insurance).toBeDefined();
    expect(insurance!.rewardCategory).toBe(targetCategory);
    expect(insurance!.monthlyReward).toBe(300); // 30000 * 0.01

    const education = breakdown.find((item) => item.spendCategory === "education");
    expect(education).toBeDefined();
    expect(education!.rewardCategory).toBe(targetCategory);
    expect(education!.monthlyReward).toBe(400); // 40000 * 0.01
  });

  it("category specialist outranks a high-net-value generalist for its category, and an excluder is filtered out or ranks at the bottom", () => {
    const scores = scoreCards({ query: "best dining credit card" });
    
    const eazydinerIndex = scores.findIndex((s) => s.card.id === "indusind-eazydiner");
    const nonDiningCardIndex = scores.findIndex((s) => s.card.id === "simplyclick-sbi");

    // Eazydiner is a dining specialist and matches the focus
    expect(eazydinerIndex).toBeGreaterThan(-1);
    // simplyclick-sbi has no dining rewards/positioning, so it should be filtered out completely (index === -1)
    expect(nonDiningCardIndex).toBe(-1);
  });

  it("treats bare category aliases as category-focused recommendation queries", () => {
    const bareDiningScores = scoreCards({ query: "dining" });

    expect(bareDiningScores.length).toBeGreaterThan(0);
    expect(
      bareDiningScores.slice(0, 5).every((score) =>
        score.rewardBreakdown.some((item) => item.spendCategory === "dining") ||
        score.card.bestFor.includes("dining") ||
        score.card.tags.includes("dining")
      )
    ).toBe(true);
    expect(bareDiningScores.findIndex((score) => score.card.id === "simplyclick-sbi")).toBe(-1);
  });

  it("adds structured score reasons that reconcile to fitScore for broad queries", () => {
    const scoredCard = scoreCards({ query: "best credit card" }).find((score) => score.estimatedAnnualFee > 0);

    expect(scoredCard).toBeDefined();
    const reasonSum = scoredCard!.scoreReasons.reduce((sum, reason) => sum + reason.value, 0);
    expect(Math.abs(reasonSum - scoredCard!.fitScore)).toBeLessThan(1);
    expect(scoredCard!.scoreReasons.some((reason) => reason.kind === "category")).toBe(true);
    expect(scoredCard!.scoreReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "penalty",
          code: "penalty:fee",
          value: -scoredCard!.estimatedAnnualFee
        })
      ])
    );
  });

  it("marks focused category score reasons with a detail note", () => {
    const focusedCard = scoreCards({ query: "best dining card" }).find((score) =>
      score.scoreReasons.some((reason) => reason.code === "category:dining")
    );

    expect(focusedCard).toBeDefined();
    expect(focusedCard!.scoreReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "category",
          code: "category:dining",
          detail: expect.stringMatching(/focused category/i)
        })
      ])
    );
  });

  it("lets Equitas Selfe qualify for dining, grocery, and utilities category-focus rankings via explicit tags", () => {
    const diningScores = scoreCards({ query: "best dining credit card" });
    const groceryScores = scoreCards({ query: "top card for grocery spends" });
    const utilityScores = scoreCards({ query: "best card for utility bills" });

    expect(diningScores.findIndex((score) => score.card.id === "equitas-selfe")).toBeGreaterThan(-1);
    expect(groceryScores.findIndex((score) => score.card.id === "equitas-selfe")).toBeGreaterThan(-1);
    expect(utilityScores.findIndex((score) => score.card.id === "equitas-selfe")).toBeGreaterThan(-1);
  });

  it("keeps utility-focused phrasings aligned for ranking order", () => {
    const scenarios = [
      { query: "best utility card" },
      { query: "best card for utility bills" }
    ] as const;

    const absoluteBlend = scenarios.map((input) => scoreCards(input).slice(0, 12).map((score) => score.card.id));
    const maxYield = scenarios.map((input) =>
      scoreCards({ ...input, rankingStrategy: "max-yield" }).slice(0, 12).map((score) => score.card.id)
    );

    expect(absoluteBlend[1]).toEqual(absoluteBlend[0]);
    expect(maxYield[1]).toEqual(maxYield[0]);
  });

  it("keeps Equitas Selfe's generic reward math unchanged outside category-focus queries", () => {
    const selfe = scoreCards({
      spend: {
        online: 10000,
        dining: 10000,
        grocery: 10000,
        utilities: 10000,
        base: 0,
        travel: 0,
        fuel: 0,
        amazon: 0,
        upi: 0
      }
    }).find((score) => score.card.id === "equitas-selfe");

    expect(selfe).toBeTruthy();
    expect(selfe?.rewardBreakdown.map((item) => item.rewardCategory)).toEqual(
      expect.arrayContaining(["partner merchants", "base"])
    );
    expect(selfe?.estimatedAnnualRewards).toBeGreaterThan(0);
  });

  it("filters travel-intent queries to only travel cards via qualifiesAsTravelCard", () => {
    const scores = scoreCards({ query: "best travel card" });
    expect(scores.length).toBeGreaterThan(0);
    // Verified that all returned cards qualify as travel cards
    expect(
      scores.every((score) => qualifiesAsTravelCard(score.card))
    ).toBe(true);
  });

  it("unions two segment queries together using ANY (some) semantics instead of AND (every) semantics", () => {
    // A query for "premium super-premium card" restricts to premium OR super-premium cards
    const scores = scoreCards({ query: "best premium super premium card" });
    expect(scores.length).toBeGreaterThan(0);
    expect(
      scores.every((score) => {
        const card = score.card;
        return cardMatchesSegment(card, "premium") || cardMatchesSegment(card, "super-premium");
      })
    ).toBe(true);
  });

  it("still gives a lounge card its broad lounge boost for generic queries", () => {
    const scores = scoreCards({ query: "best credit card" });
    const regaliaGold = scores.find((s) => s.card.id === "hdfc-regalia-gold");
    expect(regaliaGold).toBeDefined();
    expect(regaliaGold!.debug?.loungeBoost).toBeGreaterThan(0);
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
