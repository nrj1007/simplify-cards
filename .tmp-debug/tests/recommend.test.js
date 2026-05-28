"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const recommend_1 = require("../lib/recommend");
(0, vitest_1.describe)("scoreCards", () => {
    (0, vitest_1.it)("respects annual fee constraints", () => {
        const scores = (0, recommend_1.scoreCards)({ maxAnnualFee: 0 });
        (0, vitest_1.expect)(scores.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(scores.every((score) => score.card.annualFee === 0)).toBe(true);
    });
    (0, vitest_1.it)("respects the lifetime-free filter", () => {
        const scores = (0, recommend_1.scoreCards)({ wantsLifetimeFree: true });
        (0, vitest_1.expect)(scores.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(scores.every((score) => score.card.annualFee === 0)).toBe(true);
    });
    (0, vitest_1.it)("respects the lounge filter", () => {
        const scores = (0, recommend_1.scoreCards)({ wantsLounge: true });
        (0, vitest_1.expect)(scores.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(scores.every((score) => score.card.loungeDomestic === "unlimited" ||
            score.card.loungeInternational === "unlimited" ||
            score.card.loungeDomestic + score.card.loungeInternational > 0)).toBe(true);
    });
    (0, vitest_1.it)("scores known cashback cards for online cashback intent", () => {
        const scores = (0, recommend_1.scoreCards)({
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
        (0, vitest_1.expect)(sbiCashback === null || sbiCashback === void 0 ? void 0 : sbiCashback.matchedTags).toContain("cashback");
        (0, vitest_1.expect)(sbiCashback === null || sbiCashback === void 0 ? void 0 : sbiCashback.estimatedAnnualRewards).toBeGreaterThan(0);
        (0, vitest_1.expect)(amazonPay === null || amazonPay === void 0 ? void 0 : amazonPay.matchedTags).toContain("online");
        (0, vitest_1.expect)(amazonPay === null || amazonPay === void 0 ? void 0 : amazonPay.estimatedAnnualRewards).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("surfaces fuel cards for fuel-heavy intent", () => {
        var _a;
        const topScores = (0, recommend_1.scoreCards)({
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
        }).slice(0, 10);
        const topIds = topScores.map((score) => score.card.id);
        (0, vitest_1.expect)((_a = topScores[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("idfc-first-power-plus");
        (0, vitest_1.expect)(topIds).toEqual(vitest_1.expect.arrayContaining(["axis-indianoil", "axis-indianoil-easy"]));
    });
    (0, vitest_1.it)("prioritizes direct card-name queries ahead of generic ranking", () => {
        var _a, _b;
        const scores = (0, recommend_1.scoreCards)({
            query: "Axis Atlas",
            maxAnnualFee: 5000
        });
        (0, vitest_1.expect)((_a = scores[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("axis-atlas");
        (0, vitest_1.expect)((_b = scores[0]) === null || _b === void 0 ? void 0 : _b.reasons).toContain("Strong card-name match for the query");
    });
    (0, vitest_1.it)("restricts issuer-led recommendation queries to the requested issuer", () => {
        const scores = (0, recommend_1.scoreCards)({
            query: "top icici card under 5000",
            maxAnnualFee: 5000
        });
        (0, vitest_1.expect)(scores.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(scores.every((score) => score.card.issuer === "ICICI Bank")).toBe(true);
    });
    (0, vitest_1.it)("surfaces Atlas for Axis travel intent", () => {
        var _a;
        const scores = (0, recommend_1.scoreCards)({
            query: "best axis travel card"
        });
        (0, vitest_1.expect)((_a = scores[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("axis-atlas");
        (0, vitest_1.expect)(scores.every((score) => score.card.issuer === "Axis Bank")).toBe(true);
    });
    (0, vitest_1.it)("boosts lounge-heavy cards when the query explicitly asks for lounge access", () => {
        var _a;
        const scores = (0, recommend_1.scoreCards)({
            query: "best hdfc lounge card under 5000"
        });
        (0, vitest_1.expect)((_a = scores[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("hdfc-regalia-gold");
    });
    (0, vitest_1.it)("boosts lower forex markup cards for explicit forex queries", () => {
        var _a;
        const scores = (0, recommend_1.scoreCards)({
            query: "best hdfc forex card under 5000"
        });
        (0, vitest_1.expect)((_a = scores[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("hdfc-regalia-gold");
    });
    (0, vitest_1.it)("applies parsed fee caps from natural-language queries", () => {
        const scores = (0, recommend_1.scoreCards)({
            query: "top card under 5000"
        });
        (0, vitest_1.expect)(scores.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(scores.every((score) => score.card.annualFee <= 5000)).toBe(true);
        (0, vitest_1.expect)(scores.some((score) => score.card.id === "indusind-pioneer-legacy")).toBe(false);
    });
    (0, vitest_1.it)("builds a grocery-heavy spend profile from grocery-spend queries", () => {
        var _a, _b, _c;
        const scores = (0, recommend_1.scoreCards)({
            query: "top card for grocery spends"
        });
        (0, vitest_1.expect)((_a = scores[0]) === null || _a === void 0 ? void 0 : _a.card.id).not.toBe("landmark-rewards-sbi-prime");
        (0, vitest_1.expect)((_b = scores[0]) === null || _b === void 0 ? void 0 : _b.rewardBreakdown.every((item) => item.spendCategory === "grocery")).toBe(true);
        (0, vitest_1.expect)((_c = scores[0]) === null || _c === void 0 ? void 0 : _c.annualSpend).toBe(53000 * 12);
    });
    (0, vitest_1.it)("builds a travel-heavy spend profile from travel-spend queries", () => {
        var _a, _b;
        const scores = (0, recommend_1.scoreCards)({
            query: "top card for travel spends"
        });
        (0, vitest_1.expect)((_a = scores[0]) === null || _a === void 0 ? void 0 : _a.rewardBreakdown.every((item) => item.spendCategory === "travel")).toBe(true);
        (0, vitest_1.expect)((_b = scores[0]) === null || _b === void 0 ? void 0 : _b.annualSpend).toBe(53000 * 12);
    });
    (0, vitest_1.it)("treats life time free phrasing the same as lifetime free", () => {
        const scores = (0, recommend_1.scoreCards)({
            query: "top life time free cards"
        });
        (0, vitest_1.expect)(scores.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(scores.every((score) => score.card.annualFee === 0)).toBe(true);
    });
    (0, vitest_1.it)("uses parsed spend mixes as the scoring profile", () => {
        var _a, _b, _c;
        const scores = (0, recommend_1.scoreCards)({
            query: "my spends are 50% travel, 25% grocery, 25% utilities, suggest a card for me"
        });
        const spendCategories = new Set((_a = scores[0]) === null || _a === void 0 ? void 0 : _a.rewardBreakdown.map((item) => item.spendCategory));
        (0, vitest_1.expect)((_b = scores[0]) === null || _b === void 0 ? void 0 : _b.card.id).not.toBe("amex-platinum-travel");
        (0, vitest_1.expect)([...spendCategories].every((category) => ["travel", "grocery", "utilities"].includes(category))).toBe(true);
        (0, vitest_1.expect)(spendCategories.has("travel")).toBe(true);
        (0, vitest_1.expect)((_c = scores[0]) === null || _c === void 0 ? void 0 : _c.annualSpend).toBe(53000 * 12);
    });
    (0, vitest_1.it)("uses explicit Accor redemption value when the query asks for Accor-oriented travel cards", () => {
        var _a;
        const scores = (0, recommend_1.scoreCards)({
            query: "best travel card for accor redemption"
        });
        const travelOneRank = scores.findIndex((score) => score.card.id === "hsbc-travelone");
        const travelOne = scores.find((score) => score.card.id === "hsbc-travelone");
        (0, vitest_1.expect)((_a = travelOne === null || travelOne === void 0 ? void 0 : travelOne.card.redemption) === null || _a === void 0 ? void 0 : _a.accorValue).toBe(2.2);
        (0, vitest_1.expect)(travelOneRank).toBeGreaterThanOrEqual(0);
    });
    (0, vitest_1.it)("applies fee waiver at high annual spend thresholds", () => {
        const scores = (0, recommend_1.scoreCards)({
            query: "best travel card",
            spend: {
                travel: 66667
            }
        });
        const travelOne = scores.find((score) => score.card.id === "hsbc-travelone");
        (0, vitest_1.expect)(travelOne === null || travelOne === void 0 ? void 0 : travelOne.annualSpend).toBeGreaterThanOrEqual(800000);
        (0, vitest_1.expect)(travelOne === null || travelOne === void 0 ? void 0 : travelOne.estimatedAnnualFee).toBe(0);
    });
    (0, vitest_1.it)("adds milestone value once the spend threshold is crossed", () => {
        const scores = (0, recommend_1.scoreCards)({
            query: "best axis travel card",
            spend: {
                travel: 125000
            }
        });
        const atlas = scores.find((score) => score.card.id === "axis-atlas");
        (0, vitest_1.expect)(atlas === null || atlas === void 0 ? void 0 : atlas.annualSpend).toBeGreaterThanOrEqual(1500000);
        (0, vitest_1.expect)(atlas === null || atlas === void 0 ? void 0 : atlas.estimatedMilestoneValue).toBeGreaterThan(0);
        (0, vitest_1.expect)(atlas === null || atlas === void 0 ? void 0 : atlas.reasons).toEqual(vitest_1.expect.arrayContaining([vitest_1.expect.stringMatching(/Milestone value adds about Rs/i)]));
    });
    (0, vitest_1.it)("does not double-count voucher milestone wording", () => {
        const scores = (0, recommend_1.scoreCards)({
            query: "top card under 5000"
        });
        const reliancePrime = scores.find((score) => score.card.id === "reliance-sbi-prime");
        (0, vitest_1.expect)(reliancePrime === null || reliancePrime === void 0 ? void 0 : reliancePrime.estimatedMilestoneValue).toBe(8750);
    });
    (0, vitest_1.it)("counts Regalia Gold voucher milestones from 'Rs X worth' wording", () => {
        const scores = (0, recommend_1.scoreCards)({
            query: "top card under 5000"
        });
        const regaliaGold = scores.find((score) => score.card.id === "hdfc-regalia-gold");
        (0, vitest_1.expect)(regaliaGold === null || regaliaGold === void 0 ? void 0 : regaliaGold.estimatedMilestoneValue).toBe(6500);
    });
    (0, vitest_1.it)("uses the best milestone and fee-waiver upside for broad ranking comparisons", () => {
        var _a, _b;
        const scores = (0, recommend_1.scoreCards)({
            query: "top card under 5000"
        });
        const travelOne = scores.find((score) => score.card.id === "hsbc-travelone");
        (0, vitest_1.expect)(travelOne === null || travelOne === void 0 ? void 0 : travelOne.reasons).toEqual(vitest_1.expect.arrayContaining([vitest_1.expect.stringMatching(/Higher milestone and fee-waiver upside can add about Rs 10,800/i)]));
        (0, vitest_1.expect)(((_a = travelOne === null || travelOne === void 0 ? void 0 : travelOne.fitScore) !== null && _a !== void 0 ? _a : 0) - ((_b = travelOne === null || travelOne === void 0 ? void 0 : travelOne.estimatedNetValue) !== null && _b !== void 0 ? _b : 0)).toBeGreaterThan(10000);
    });
    (0, vitest_1.it)("avoids invite-only luxury cards for generic ltf asks", () => {
        var _a, _b;
        const scores = (0, recommend_1.scoreCards)({
            query: "top life time free cards"
        });
        const topHaystack = `${(_a = scores[0]) === null || _a === void 0 ? void 0 : _a.card.bestFor.join(" ")} ${(_b = scores[0]) === null || _b === void 0 ? void 0 : _b.card.exclusions.join(" ")}`.toLowerCase();
        (0, vitest_1.expect)(topHaystack).not.toContain("invite only");
    });
    (0, vitest_1.it)("penalizes relationship-only cards for broad generic asks", () => {
        const scores = (0, recommend_1.scoreCards)({
            query: "top card under 5000"
        });
        const pioneer = scores.find((score) => score.card.id === "indusind-pioneer-legacy");
        (0, vitest_1.expect)(pioneer).toBeUndefined();
    });
    (0, vitest_1.it)("blends SmartBuy-like routing into generic online spend instead of treating it as all-or-nothing", () => {
        const genericScores = (0, recommend_1.scoreCards)({
            query: "top card under 5000"
        });
        const smartbuyScores = (0, recommend_1.scoreCards)({
            query: "best smartbuy card under 5000"
        });
        const genericDiners = genericScores.find((score) => score.card.id === "hdfc-diners-club-privilege");
        const genericRegalia = genericScores.find((score) => score.card.id === "hdfc-regalia-gold");
        const smartbuyDiners = smartbuyScores.find((score) => score.card.id === "hdfc-diners-club-privilege");
        const genericDinersOnlineRewards = genericDiners === null || genericDiners === void 0 ? void 0 : genericDiners.rewardBreakdown.filter((item) => item.spendCategory === "online").map((item) => item.rewardCategory);
        const genericRegaliaOnlineRewards = genericRegalia === null || genericRegalia === void 0 ? void 0 : genericRegalia.rewardBreakdown.filter((item) => item.spendCategory === "online").map((item) => item.rewardCategory);
        const smartbuyDinersOnlineRewards = smartbuyDiners === null || smartbuyDiners === void 0 ? void 0 : smartbuyDiners.rewardBreakdown.filter((item) => item.spendCategory === "online").map((item) => item.rewardCategory);
        (0, vitest_1.expect)(genericDinersOnlineRewards).toEqual(vitest_1.expect.arrayContaining(["smartbuy", "offline"]));
        (0, vitest_1.expect)(genericRegaliaOnlineRewards).toEqual(vitest_1.expect.arrayContaining(["select lifestyle brands", "offline"]));
        (0, vitest_1.expect)(smartbuyDinersOnlineRewards).toEqual(["smartbuy"]);
    });
    (0, vitest_1.it)("treats generic travel spend as fully travel-routed instead of a 50-50 SmartBuy blend", () => {
        const genericScores = (0, recommend_1.scoreCards)({
            query: "top card under 5000"
        });
        const travelOne = genericScores.find((score) => score.card.id === "hsbc-travelone");
        const travelOneTravelRewards = travelOne === null || travelOne === void 0 ? void 0 : travelOne.rewardBreakdown.filter((item) => item.spendCategory === "travel").map((item) => item.rewardCategory);
        (0, vitest_1.expect)(travelOneTravelRewards).toEqual(["travel"]);
    });
    (0, vitest_1.it)("treats generic grocery spend as fully SmartBuy-like when a card has that grocery path", () => {
        const genericScores = (0, recommend_1.scoreCards)({
            query: "top card under 5000"
        });
        const regalia = genericScores.find((score) => score.card.id === "hdfc-regalia-gold");
        const regaliaGroceryRewards = regalia === null || regalia === void 0 ? void 0 : regalia.rewardBreakdown.filter((item) => item.spendCategory === "grocery").map((item) => item.rewardCategory);
        (0, vitest_1.expect)(regaliaGroceryRewards).toEqual(["select lifestyle brands"]);
    });
    (0, vitest_1.it)("does not over-penalize premium travel cards on broad mixed-spend queries", () => {
        var _a, _b;
        const genericScores = (0, recommend_1.scoreCards)({
            query: "top card under 5000"
        });
        const travelOne = genericScores.find((score) => score.card.id === "hsbc-travelone");
        const netAdjustment = ((_a = travelOne === null || travelOne === void 0 ? void 0 : travelOne.fitScore) !== null && _a !== void 0 ? _a : 0) - ((_b = travelOne === null || travelOne === void 0 ? void 0 : travelOne.estimatedNetValue) !== null && _b !== void 0 ? _b : 0);
        (0, vitest_1.expect)(travelOne).toBeDefined();
        (0, vitest_1.expect)(netAdjustment).toBeGreaterThan(-10000);
    });
    (0, vitest_1.it)("does not count excluded categories into annual rewards before ranking adjustment", () => {
        const genericScores = (0, recommend_1.scoreCards)({
            query: "top card under 5000"
        });
        const travelOne = genericScores.find((score) => score.card.id === "hsbc-travelone");
        const countedCategories = new Set(travelOne === null || travelOne === void 0 ? void 0 : travelOne.rewardBreakdown.map((item) => item.spendCategory));
        (0, vitest_1.expect)(countedCategories.has("fuel")).toBe(false);
        (0, vitest_1.expect)(countedCategories.has("utilities")).toBe(false);
    });
    (0, vitest_1.it)("models post-cap fallback earn rate instead of hard-stopping TravelOne accelerated rewards", () => {
        const scores = (0, recommend_1.scoreCards)({
            query: "best travel card",
            spend: {
                travel: 2000000
            }
        });
        const travelOne = scores.find((score) => score.card.id === "hsbc-travelone");
        const travelBreakdown = travelOne === null || travelOne === void 0 ? void 0 : travelOne.rewardBreakdown.find((item) => item.spendCategory === "travel");
        (0, vitest_1.expect)(travelBreakdown).toBeDefined();
        (0, vitest_1.expect)(travelBreakdown === null || travelBreakdown === void 0 ? void 0 : travelBreakdown.monthlyReward).toBe(143000);
        (0, vitest_1.expect)(travelBreakdown === null || travelBreakdown === void 0 ? void 0 : travelBreakdown.annualReward).toBe(1716000);
    });
});
(0, vitest_1.describe)("answerFromCards", () => {
    (0, vitest_1.it)("returns a fallback summary when constraints remove all cards", () => {
        const answer = (0, recommend_1.answerFromCards)({ maxAnnualFee: -1 });
        (0, vitest_1.expect)(answer.cards).toHaveLength(0);
        (0, vitest_1.expect)(answer.summary).toMatch(/No card matched/);
    });
    (0, vitest_1.it)("returns top card answers when matches exist", () => {
        const answer = (0, recommend_1.answerFromCards)({ query: "cashback" });
        (0, vitest_1.expect)(answer.cards.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(answer.summary).toContain(answer.cards[0].card.name);
    });
});
