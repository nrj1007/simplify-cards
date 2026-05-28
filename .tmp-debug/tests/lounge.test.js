"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const lounge_1 = require("@/lib/lounge");
const cards_1 = require("@/lib/cards");
(0, vitest_1.describe)("getLoungeConditions", () => {
    (0, vitest_1.it)("surfaces spend-gated lounge rules for cards that have them", () => {
        const card = (0, cards_1.getCardById)("hdfc-diners-club-privilege");
        (0, vitest_1.expect)(card).toBeTruthy();
        const conditions = (0, lounge_1.getLoungeConditions)(card);
        (0, vitest_1.expect)(conditions.some((item) => item.includes("preceding calendar quarter"))).toBe(true);
        (0, vitest_1.expect)(conditions.some((item) => item.toLowerCase().includes("international"))).toBe(true);
    });
    (0, vitest_1.it)("returns an empty list when no lounge conditions are listed", () => {
        const card = (0, cards_1.getCardById)("sbi-cashback");
        (0, vitest_1.expect)(card).toBeTruthy();
        (0, vitest_1.expect)((0, lounge_1.getLoungeConditions)(card)).toEqual([]);
    });
});
