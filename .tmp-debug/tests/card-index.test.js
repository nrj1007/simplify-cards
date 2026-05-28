"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cards_1 = require("../lib/cards");
(0, vitest_1.describe)("card indexes", () => {
    (0, vitest_1.it)("indexes every card under its issuer", () => {
        const issuerCards = (0, cards_1.getCardsByIssuer)("ICICI Bank");
        (0, vitest_1.expect)(issuerCards.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(issuerCards.every((card) => card.issuer === "ICICI Bank")).toBe(true);
        (0, vitest_1.expect)(issuerCards.find((card) => card.id === "icici-amazon-pay")).toBeTruthy();
    });
    (0, vitest_1.it)("indexes cards by tag, network, and reward category", () => {
        (0, vitest_1.expect)((0, cards_1.getCardsByTag)("cashback").length).toBeGreaterThan(0);
        (0, vitest_1.expect)((0, cards_1.getCardsByTag)("cashback").every((card) => card.tags.includes("cashback"))).toBe(true);
        (0, vitest_1.expect)((0, cards_1.getCardsByNetwork)("RuPay").length).toBeGreaterThan(0);
        (0, vitest_1.expect)((0, cards_1.getCardsByNetwork)("RuPay").every((card) => card.network.includes("RuPay"))).toBe(true);
        (0, vitest_1.expect)((0, cards_1.getCardsByRewardCategory)("fuel").length).toBeGreaterThan(0);
        (0, vitest_1.expect)((0, cards_1.getCardsByRewardCategory)("fuel").every((card) => card.rewards.some((reward) => reward.category === "fuel"))).toBe(true);
    });
    (0, vitest_1.it)("groups cards into stable popularity bands", () => {
        const topBand = (0, cards_1.getCardsByPopularityBand)("90-plus");
        const highBand = (0, cards_1.getCardsByPopularityBand)("80-89");
        const midBand = (0, cards_1.getCardsByPopularityBand)("70-79");
        const lowerBand = (0, cards_1.getCardsByPopularityBand)("below-70");
        (0, vitest_1.expect)(topBand.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(topBand.every((card) => card.popularityScore >= 90)).toBe(true);
        (0, vitest_1.expect)(highBand.every((card) => card.popularityScore >= 80 && card.popularityScore < 90)).toBe(true);
        (0, vitest_1.expect)(midBand.every((card) => card.popularityScore >= 70 && card.popularityScore < 80)).toBe(true);
        (0, vitest_1.expect)(lowerBand.every((card) => card.popularityScore < 70)).toBe(true);
    });
    (0, vitest_1.it)("keeps index buckets sorted and duplicate free", () => {
        for (const groupedCards of Object.values(cards_1.cardIndexes.byIssuer)) {
            const ids = groupedCards.map((card) => card.id);
            (0, vitest_1.expect)(new Set(ids).size).toBe(ids.length);
            for (let index = 1; index < groupedCards.length; index += 1) {
                (0, vitest_1.expect)(groupedCards[index - 1].popularityScore).toBeGreaterThanOrEqual(groupedCards[index].popularityScore);
            }
        }
    });
    (0, vitest_1.it)("returns the most popular cards first", () => {
        const popularCards = (0, cards_1.getPopularCards)(5);
        (0, vitest_1.expect)(popularCards).toHaveLength(5);
        (0, vitest_1.expect)(popularCards).toEqual(cards_1.cards.slice(0, 5));
        (0, vitest_1.expect)(popularCards[0].popularityScore).toBeGreaterThanOrEqual(popularCards[4].popularityScore);
    });
    (0, vitest_1.it)("exposes sorted network and reward-category vocabularies", () => {
        const networks = (0, cards_1.getNetworks)();
        const rewardCategories = (0, cards_1.getRewardCategories)();
        (0, vitest_1.expect)(networks.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(networks).toEqual([...networks].sort());
        (0, vitest_1.expect)(networks).toContain("Visa");
        (0, vitest_1.expect)(networks).toContain("RuPay");
        (0, vitest_1.expect)(rewardCategories.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(rewardCategories).toEqual([...rewardCategories].sort());
        (0, vitest_1.expect)(rewardCategories).toContain("fuel");
        (0, vitest_1.expect)(rewardCategories).toContain("online");
    });
    (0, vitest_1.it)("indexes derived use cases for cashback and travel", () => {
        const cashbackCards = (0, cards_1.getCardsByUseCase)("cashback");
        const travelCards = (0, cards_1.getCardsByUseCase)("travel");
        (0, vitest_1.expect)(cashbackCards.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(cashbackCards.some((card) => card.id === "sbi-cashback")).toBe(true);
        (0, vitest_1.expect)(travelCards.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(travelCards.some((card) => card.id === "axis-atlas")).toBe(true);
    });
    (0, vitest_1.it)("indexes derived redemption ecosystems", () => {
        const accorCards = (0, cards_1.getCardsByRedemptionBucket)("accor");
        const airIndiaCards = (0, cards_1.getCardsByRedemptionBucket)("air-india");
        const redemptionBuckets = (0, cards_1.getRedemptionBuckets)();
        (0, vitest_1.expect)(redemptionBuckets).toContain("accor");
        (0, vitest_1.expect)(redemptionBuckets).toContain("air-india");
        (0, vitest_1.expect)(accorCards.some((card) => card.id === "axis-reserve")).toBe(true);
        (0, vitest_1.expect)(airIndiaCards.some((card) => card.id === "hdfc-tata-neu-infinity")).toBe(true);
    });
    (0, vitest_1.it)("indexes derived card segments", () => {
        const segments = (0, cards_1.getCardSegments)();
        (0, vitest_1.expect)(segments).toContain("super-premium");
        (0, vitest_1.expect)(segments).toContain("premium");
        (0, vitest_1.expect)(segments).toContain("beginner");
        (0, vitest_1.expect)(segments).toContain("ltf");
        (0, vitest_1.expect)((0, cards_1.getCardsByCardSegment)("super-premium").some((card) => card.id === "axis-reserve")).toBe(true);
        (0, vitest_1.expect)((0, cards_1.getCardsByCardSegment)("premium").some((card) => card.id === "axis-atlas")).toBe(true);
        (0, vitest_1.expect)((0, cards_1.getCardsByCardSegment)("beginner").some((card) => card.id === "idfc-wow")).toBe(true);
        (0, vitest_1.expect)((0, cards_1.getCardsByCardSegment)("ltf").some((card) => card.id === "icici-amazon-pay")).toBe(true);
    });
    (0, vitest_1.it)("keeps derived index buckets sorted and duplicate free", () => {
        for (const groupedCards of Object.values(cards_1.cardIndexes.byCardSegment)) {
            const ids = groupedCards.map((card) => card.id);
            (0, vitest_1.expect)(new Set(ids).size).toBe(ids.length);
            for (let index = 1; index < groupedCards.length; index += 1) {
                (0, vitest_1.expect)(groupedCards[index - 1].popularityScore).toBeGreaterThanOrEqual(groupedCards[index].popularityScore);
            }
        }
    });
});
