"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const card_content_1 = require("../lib/card-content");
(0, vitest_1.describe)("card content helpers", () => {
    (0, vitest_1.it)("returns null when no card content exists", () => {
        (0, vitest_1.expect)((0, card_content_1.getCardContent)("missing-card", {})).toBeNull();
        (0, vitest_1.expect)((0, card_content_1.hasCardContent)("missing-card", {})).toBe(false);
    });
    (0, vitest_1.it)("sorts updates newest first and limits them to three", () => {
        const content = {
            "sbi-cashback": {
                updates: [
                    {
                        title: "Old",
                        summary: "Old note",
                        sourceType: "manual",
                        sourceLabel: "Manual",
                        publishedAt: "2026-05-01"
                    },
                    {
                        title: "Newest",
                        summary: "Newest note",
                        sourceType: "technofino",
                        sourceLabel: "TechnoFino",
                        publishedAt: "2026-05-04"
                    },
                    {
                        title: "Middle",
                        summary: "Middle note",
                        sourceType: "manual",
                        sourceLabel: "Manual",
                        publishedAt: "2026-05-03"
                    },
                    {
                        title: "Older",
                        summary: "Older note",
                        sourceType: "manual",
                        sourceLabel: "Manual",
                        publishedAt: "2026-05-02"
                    }
                ],
                tips: [
                    {
                        text: "Use it mainly for online cashback.",
                        sourceType: "manual",
                        sourceLabel: "Manual"
                    }
                ]
            }
        };
        const entry = (0, card_content_1.getCardContent)("sbi-cashback", content);
        (0, vitest_1.expect)(entry).not.toBeNull();
        (0, vitest_1.expect)(entry === null || entry === void 0 ? void 0 : entry.updates).toHaveLength(3);
        (0, vitest_1.expect)(entry === null || entry === void 0 ? void 0 : entry.updates[0].title).toBe("Newest");
        (0, vitest_1.expect)(entry === null || entry === void 0 ? void 0 : entry.updates[1].title).toBe("Middle");
        (0, vitest_1.expect)(entry === null || entry === void 0 ? void 0 : entry.updates[2].title).toBe("Older");
        (0, vitest_1.expect)(entry === null || entry === void 0 ? void 0 : entry.tips).toHaveLength(1);
        (0, vitest_1.expect)((0, card_content_1.hasCardContent)("sbi-cashback", content)).toBe(true);
    });
});
