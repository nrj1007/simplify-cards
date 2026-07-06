import { describe, expect, it } from "vitest";
import {
  cardIndexes,
  cards,
  getCardsByCardSegment,
  getCardsByIssuer,
  getCardsByNetwork,
  getCardsByPopularityBand,
  getCardsByRedemptionBucket,
  getCardsByRewardCategory,
  getCardsByTag,
  getCardsByUseCase,
  getCardSegments,
  getNetworks,
  getPopularCards,
  getRedemptionBuckets,
  getRewardCategories,
  stripScoringAnnotations
} from "../lib/cards";

describe("card indexes", () => {
  it("indexes every card under its issuer", () => {
    const issuerCards = getCardsByIssuer("ICICI Bank");

    expect(issuerCards.length).toBeGreaterThan(0);
    expect(issuerCards.every((card) => card.issuer === "ICICI Bank")).toBe(true);
    expect(issuerCards.find((card) => card.id === "icici-amazon-pay")).toBeTruthy();
  });

  it("indexes cards by tag, network, and reward category", () => {
    expect(getCardsByTag("cashback").length).toBeGreaterThan(0);
    expect(getCardsByTag("cashback").every((card) => card.tags.includes("cashback"))).toBe(true);

    expect(getCardsByNetwork("RuPay").length).toBeGreaterThan(0);
    expect(getCardsByNetwork("RuPay").every((card) => card.network.includes("RuPay"))).toBe(true);

    expect(getCardsByRewardCategory("fuel").length).toBeGreaterThan(0);
    expect(getCardsByRewardCategory("fuel").every((card) => card.rewards.some((reward) => reward.category === "fuel"))).toBe(
      true
    );
  });

  it("groups cards into stable popularity bands", () => {
    const topBand = getCardsByPopularityBand("90-plus");
    const highBand = getCardsByPopularityBand("80-89");
    const midBand = getCardsByPopularityBand("70-79");
    const lowerBand = getCardsByPopularityBand("below-70");

    expect(topBand.length).toBeGreaterThan(0);
    expect(topBand.every((card) => card.popularityScore >= 90)).toBe(true);
    expect(highBand.every((card) => card.popularityScore >= 80 && card.popularityScore < 90)).toBe(true);
    expect(midBand.every((card) => card.popularityScore >= 70 && card.popularityScore < 80)).toBe(true);
    expect(lowerBand.every((card) => card.popularityScore < 70)).toBe(true);
  });

  it("keeps index buckets sorted and duplicate free", () => {
    for (const groupedCards of Object.values(cardIndexes.byIssuer)) {
      const ids = groupedCards.map((card) => card.id);
      expect(new Set(ids).size).toBe(ids.length);

      for (let index = 1; index < groupedCards.length; index += 1) {
        expect(groupedCards[index - 1].popularityScore).toBeGreaterThanOrEqual(groupedCards[index].popularityScore);
      }
    }
  });

  it("returns the most popular cards first", () => {
    const popularCards = getPopularCards(5);

    expect(popularCards).toHaveLength(5);
    expect(popularCards).toEqual(cards.slice(0, 5));
    expect(popularCards[0].popularityScore).toBeGreaterThanOrEqual(popularCards[4].popularityScore);
  });

  it("exposes sorted network and reward-category vocabularies", () => {
    const networks = getNetworks();
    const rewardCategories = getRewardCategories();

    expect(networks.length).toBeGreaterThan(0);
    expect(networks).toEqual([...networks].sort());
    expect(networks).toContain("Visa");
    expect(networks).toContain("RuPay");

    expect(rewardCategories.length).toBeGreaterThan(0);
    expect(rewardCategories).toEqual([...rewardCategories].sort());
    expect(rewardCategories).toContain("fuel");
    expect(rewardCategories).toContain("online");
  });

  it("indexes derived use cases for cashback and travel", () => {
    const cashbackCards = getCardsByUseCase("cashback");
    const travelCards = getCardsByUseCase("travel");

    expect(cashbackCards.length).toBeGreaterThan(0);
    expect(cashbackCards.some((card) => card.id === "sbi-cashback")).toBe(true);

    expect(travelCards.length).toBeGreaterThan(0);
    expect(travelCards.some((card) => card.id === "axis-atlas")).toBe(true);
  });

  it("indexes derived redemption ecosystems", () => {
    const accorCards = getCardsByRedemptionBucket("accor");
    const airIndiaCards = getCardsByRedemptionBucket("air-india");
    const redemptionBuckets = getRedemptionBuckets();

    expect(redemptionBuckets).toContain("accor");
    expect(redemptionBuckets).toContain("air-india");
    expect(accorCards.some((card) => card.id === "axis-reserve")).toBe(true);
    expect(airIndiaCards.some((card) => card.id === "hdfc-tata-neu-infinity")).toBe(true);
  });

  it("indexes derived card segments", () => {
    const segments = getCardSegments();

    expect(segments).toContain("super-premium");
    expect(segments).toContain("premium");
    expect(segments).toContain("beginner");
    expect(segments).toContain("ltf");

    expect(getCardsByCardSegment("super-premium").some((card) => card.id === "axis-reserve")).toBe(true);
    expect(getCardsByCardSegment("premium").some((card) => card.id === "axis-atlas")).toBe(true);
    expect(getCardsByCardSegment("beginner").some((card) => card.id === "idfc-wow")).toBe(true);
    expect(getCardsByCardSegment("ltf").some((card) => card.id === "icici-amazon-pay")).toBe(true);
  });

  it("keeps derived index buckets sorted and duplicate free", () => {
    for (const groupedCards of Object.values(cardIndexes.byCardSegment)) {
      const ids = groupedCards.map((card) => card.id);
      expect(new Set(ids).size).toBe(ids.length);

      for (let index = 1; index < groupedCards.length; index += 1) {
        expect(groupedCards[index - 1].popularityScore).toBeGreaterThanOrEqual(groupedCards[index].popularityScore);
      }
    }
  });

  describe("stripScoringAnnotations", () => {
    it("strips worth annotations and trims leading/trailing spaces", () => {
      expect(stripScoringAnnotations("Complimentary hotel stay (worth ₹12,000)")).toBe("Complimentary hotel stay");
      expect(stripScoringAnnotations("Airport transfer (worth ₹1,500) per year")).toBe("Airport transfer per year");
      expect(stripScoringAnnotations("2 complimentary golf games (worth ₹3,500 per game)")).toBe("2 complimentary golf games");
      expect(stripScoringAnnotations("BookMyShow discount (voucher worth ₹500)")).toBe("BookMyShow discount");
      expect(stripScoringAnnotations("Complimentary vouchers (vouchers worth ₹10,000)")).toBe("Complimentary vouchers");
      expect(stripScoringAnnotations("Normal benefit text with no annotations")).toBe("Normal benefit text with no annotations");
    });
  });
});
