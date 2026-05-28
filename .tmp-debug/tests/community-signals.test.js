"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const community_signals_1 = require("../lib/community-signals");
(0, vitest_1.describe)("community signal ingestion helpers", () => {
    (0, vitest_1.it)("suggests card matches from Technofino text", () => {
        const file = {
            fileName: "2026-05-12-technofino.json",
            generatedAt: "2026-05-12T10:00:00.000Z",
            source: "technofino",
            reviewQueue: [
                {
                    title: "HDFC Regalia Gold lounge access updated",
                    url: "https://technofino.in/example",
                    signalType: "terms-change",
                    candidateText: "Users are discussing a new HDFC Regalia Gold lounge access condition.",
                    requiresOfficialVerification: true,
                    approvedForCardDb: false
                }
            ]
        };
        const draft = (0, community_signals_1.buildCommunitySignalDraft)(file, file.reviewQueue[0]);
        (0, vitest_1.expect)(draft.matchedCards.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(draft.matchedCards[0].cardId).toContain("regalia");
        (0, vitest_1.expect)(draft.suggestedContentType).toBe("update");
    });
    (0, vitest_1.it)("builds card-content additions only for approved entries", () => {
        var _a;
        const file = {
            fileName: "2026-05-12-technofino.json",
            generatedAt: "2026-05-12T10:00:00.000Z",
            source: "technofino",
            reviewQueue: [
                {
                    title: "HDFC Regalia Gold devaluation",
                    url: "https://technofino.in/regalia",
                    signalType: "terms-change",
                    candidateText: "Reward redemption ratios changed.",
                    requiresOfficialVerification: true,
                    approvedForCardDb: false,
                    approvedForCardContent: true,
                    cardIds: ["hdfc-regalia-gold"],
                    publishedAt: "2026-05-12"
                },
                {
                    title: "SBI Cashback tip",
                    url: "https://technofino.in/sbi",
                    signalType: "merchant-reward-behavior",
                    candidateText: "Some users report better consistency on direct merchant checkout than wallet reloads.",
                    requiresOfficialVerification: true,
                    approvedForCardDb: false,
                    approvedForCardContent: true,
                    cardIds: ["sbi-cashback"]
                }
            ]
        };
        const drafts = file.reviewQueue.map((signal) => (0, community_signals_1.buildCommunitySignalDraft)(file, signal));
        const additions = (0, community_signals_1.buildCardContentAdditions)(drafts);
        (0, vitest_1.expect)(additions["hdfc-regalia-gold"].updates).toHaveLength(1);
        (0, vitest_1.expect)((_a = additions["hdfc-regalia-gold"].updates) === null || _a === void 0 ? void 0 : _a[0].publishedAt).toBe("2026-05-12");
        (0, vitest_1.expect)(additions["sbi-cashback"].tips).toHaveLength(1);
    });
    (0, vitest_1.it)("dedupes merged card-content entries", () => {
        const merged = (0, community_signals_1.mergeCardContent)({
            "sbi-cashback": {
                tips: [
                    {
                        text: "Use direct online checkout where possible.",
                        sourceType: "technofino",
                        sourceLabel: "TechnoFino",
                        sourceUrl: "https://technofino.in/sbi"
                    }
                ]
            }
        }, {
            "sbi-cashback": {
                tips: [
                    {
                        text: "Use direct online checkout where possible.",
                        sourceType: "technofino",
                        sourceLabel: "TechnoFino",
                        sourceUrl: "https://technofino.in/sbi"
                    }
                ]
            }
        });
        (0, vitest_1.expect)(merged["sbi-cashback"].tips).toHaveLength(1);
    });
});
