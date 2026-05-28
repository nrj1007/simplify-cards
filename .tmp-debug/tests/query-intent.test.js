"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const query_intent_1 = require("../lib/query-intent");
(0, vitest_1.describe)("query intent parser", () => {
    (0, vitest_1.it)("parses cashback, lounge, and fee-cap intent", () => {
        const intent = (0, query_intent_1.parseQueryIntent)({
            query: "best cashback card with lounge access under Rs 5000"
        });
        (0, vitest_1.expect)(intent.useCases).toContain("cashback");
        (0, vitest_1.expect)(intent.tags).toContain("lounge");
        (0, vitest_1.expect)(intent.maxAnnualFee).toBe(5000);
        (0, vitest_1.expect)(intent.wantsLounge).toBe(true);
    });
    (0, vitest_1.it)("parses issuer, network, and ltf signals", () => {
        const intent = (0, query_intent_1.parseQueryIntent)({
            query: "best hdfc rupay ltf card for upi"
        });
        (0, vitest_1.expect)(intent.issuers).toContain("HDFC Bank");
        (0, vitest_1.expect)(intent.networks).toContain("RuPay");
        (0, vitest_1.expect)(intent.segments).toContain("ltf");
        (0, vitest_1.expect)(intent.tags).toContain("upi");
    });
    (0, vitest_1.it)("parses redemption ecosystems and travel intent", () => {
        const intent = (0, query_intent_1.parseQueryIntent)({
            query: "best travel card for accor and air india redemption"
        });
        (0, vitest_1.expect)(intent.useCases).toContain("travel");
        (0, vitest_1.expect)(intent.redemptionBuckets).toContain("accor");
        (0, vitest_1.expect)(intent.redemptionBuckets).toContain("air-india");
    });
    (0, vitest_1.it)("parses beginner and secured-card intent", () => {
        const intent = (0, query_intent_1.parseQueryIntent)({
            query: "beginner secured credit builder card"
        });
        (0, vitest_1.expect)(intent.segments).toContain("beginner");
        (0, vitest_1.expect)(intent.tags).toContain("secured");
    });
    (0, vitest_1.it)("parses latest-info questions for no-web-search policy", () => {
        const intent = (0, query_intent_1.parseQueryIntent)({
            query: "latest devaluation on sbi cashback card"
        });
        (0, vitest_1.expect)(intent.needsLatestInfo).toBe(true);
        (0, vitest_1.expect)(intent.issuers).toContain("SBI Card");
    });
    (0, vitest_1.it)("parses issuer-led recommendation questions with fee caps", () => {
        const intent = (0, query_intent_1.parseQueryIntent)({
            query: "top icici card under 5000"
        });
        (0, vitest_1.expect)(intent.issuers).toContain("ICICI Bank");
        (0, vitest_1.expect)(intent.maxAnnualFee).toBe(5000);
        (0, vitest_1.expect)(intent.useCases).toHaveLength(0);
    });
    (0, vitest_1.it)("parses issuer-led travel recommendation questions", () => {
        const intent = (0, query_intent_1.parseQueryIntent)({
            query: "best axis travel card"
        });
        (0, vitest_1.expect)(intent.issuers).toContain("Axis Bank");
        (0, vitest_1.expect)(intent.useCases).toContain("travel");
    });
    (0, vitest_1.it)("parses life time free phrasing and focused spend intent", () => {
        var _a, _b;
        const intent = (0, query_intent_1.parseQueryIntent)({
            query: "top life time free cards for grocery spends"
        });
        (0, vitest_1.expect)(intent.segments).toContain("ltf");
        (0, vitest_1.expect)((_a = intent.inferredSpend) === null || _a === void 0 ? void 0 : _a.grocery).toBe(53000);
        (0, vitest_1.expect)(Object.entries((_b = intent.inferredSpend) !== null && _b !== void 0 ? _b : {}).every(([category, amount]) => category === "grocery" || amount === 0)).toBe(true);
    });
    (0, vitest_1.it)("parses spend-mix percentages into a spend profile", () => {
        const intent = (0, query_intent_1.parseQueryIntent)({
            query: "my spends are 50% travel, 25% grocery, 25% utilities, suggest a card for me"
        });
        (0, vitest_1.expect)(intent.inferredSpend).toMatchObject({
            travel: 26500,
            grocery: 13250,
            utilities: 13250
        });
    });
});
