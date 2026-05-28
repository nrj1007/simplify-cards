"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const vitest_1 = require("vitest");
const ask_ai_1 = require("../lib/ask-ai");
const logPath = node_path_1.default.join(process.cwd(), "data", "question-logs", "unsupported-questions.json");
const originalApiKey = process.env.OPENAI_API_KEY;
const originalFetch = global.fetch;
function cleanupLogFile() {
    if (node_fs_1.default.existsSync(logPath))
        node_fs_1.default.rmSync(logPath);
}
(0, vitest_1.describe)("ask ai fallback policy", () => {
    (0, vitest_1.beforeEach)(() => {
        cleanupLogFile();
        delete process.env.OPENAI_API_KEY;
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        cleanupLogFile();
        if (originalApiKey)
            process.env.OPENAI_API_KEY = originalApiKey;
        else
            delete process.env.OPENAI_API_KEY;
        global.fetch = originalFetch;
    });
    (0, vitest_1.it)("flags latest-information questions as unsupported without web search", () => {
        (0, vitest_1.expect)((0, ask_ai_1.getUnsupportedQuestionReason)({ query: "latest devaluation on SBI Cashback" })).toMatch(/live\/latest/i);
    });
    (0, vitest_1.it)("logs unsupported latest-information questions", async () => {
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "latest update on HDFC Infinia" });
        (0, vitest_1.expect)(answer.cards).toHaveLength(0);
        (0, vitest_1.expect)(answer.needsDatabaseUpdate).toBe(true);
        (0, vitest_1.expect)(answer.summary).toMatch(/logged this question/i);
        (0, vitest_1.expect)(node_fs_1.default.existsSync(logPath)).toBe(true);
        const logEntries = JSON.parse(node_fs_1.default.readFileSync(logPath, "utf8"));
        (0, vitest_1.expect)(logEntries).toHaveLength(1);
        (0, vitest_1.expect)(logEntries[0].query).toBe("latest update on HDFC Infinia");
    });
    (0, vitest_1.it)("returns normal answers for supported evergreen questions", async () => {
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "best cashback card" });
        (0, vitest_1.expect)(answer.cards.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(answer.needsDatabaseUpdate).toBeUndefined();
        (0, vitest_1.expect)(answer.summary).toMatch(/Top 3 picks for this query/i);
    });
    (0, vitest_1.it)("produces a more natural fallback summary for direct card-name queries", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "Axis Atlas", maxAnnualFee: 5000 });
        (0, vitest_1.expect)(answer.summary).toMatch(/If you specifically mean Axis Bank Atlas Credit Card/i);
        (0, vitest_1.expect)(answer.highlights).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.stringMatching(/travel, hotels, and flights/i),
            vitest_1.expect.stringMatching(/8 domestic lounge visits and 4 international lounge visits/i),
            vitest_1.expect.stringMatching(/Closest alternative: HSBC TravelOne Credit Card/i)
        ]));
        (0, vitest_1.expect)((_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("axis-atlas");
    });
    (0, vitest_1.it)("returns Infinia when the exact HDFC card is present in the dataset", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "Infinia" });
        (0, vitest_1.expect)((_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("hdfc-infinia-metal");
        (0, vitest_1.expect)(answer.summary).toMatch(/Infinia Metal Edition/i);
    });
    (0, vitest_1.it)("treats spaced brand queries like 'travel one' as HSBC TravelOne instead of One Credit Card", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "travel one" });
        (0, vitest_1.expect)((_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("hsbc-travelone");
        (0, vitest_1.expect)(answer.summary).toMatch(/HSBC TravelOne Credit Card/i);
    });
    (0, vitest_1.it)("answers rewards-policy questions when current card rules support an inference", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "do i get rewards on gold purchase using infinia?" });
        (0, vitest_1.expect)((_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("hdfc-infinia-metal");
        (0, vitest_1.expect)(answer.needsDatabaseUpdate).toBeUndefined();
        (0, vitest_1.expect)(answer.summary).toMatch(/should earn rewards on gold/i);
        (0, vitest_1.expect)(answer.summary).toMatch(/gold/i);
        (0, vitest_1.expect)(answer.highlights).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.stringMatching(/not listed in exclusions/i),
            vitest_1.expect.stringMatching(/3\.33 reward points per Rs 100/i)
        ]));
    });
    (0, vitest_1.it)("answers exclusion questions from listed exclusions", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "is rent excluded on atlas?" });
        (0, vitest_1.expect)((_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("axis-atlas");
        (0, vitest_1.expect)(answer.summary).toMatch(/rent is part of the listed exclusions/i);
        (0, vitest_1.expect)(answer.highlights).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.stringMatching(/excluded category match found for rent/i),
            vitest_1.expect.stringMatching(/^Relevant exclusion: rent$/i)
        ]));
    });
    (0, vitest_1.it)("keeps issuer-led recommendation queries in the requested issuer family", async () => {
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "top icici card under 5000", maxAnnualFee: 5000 });
        (0, vitest_1.expect)(answer.cards.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(answer.cards.every((item) => item.card.issuer === "ICICI Bank")).toBe(true);
        (0, vitest_1.expect)(answer.needsDatabaseUpdate).toBeUndefined();
    });
    (0, vitest_1.it)("prefers the strongest issuer-matched travel card for issuer travel asks", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "best axis travel card" });
        (0, vitest_1.expect)((_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("axis-atlas");
        (0, vitest_1.expect)(answer.cards.every((item) => item.card.issuer === "Axis Bank")).toBe(true);
        (0, vitest_1.expect)(answer.summary).toMatch(/Top 3 picks for this query/i);
    });
    (0, vitest_1.it)("respects fee-cap questions even when the cap only appears in the query text", async () => {
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "top card under 5000" });
        (0, vitest_1.expect)(answer.cards.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(answer.cards.every((item) => item.card.annualFee <= 5000)).toBe(true);
        (0, vitest_1.expect)(answer.needsDatabaseUpdate).toBeUndefined();
    });
    (0, vitest_1.it)("mentions three results for broad top-card questions", async () => {
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "top card under 5000" });
        (0, vitest_1.expect)(answer.cards).toHaveLength(3);
        (0, vitest_1.expect)(answer.summary).toBe("Top 3 picks for this query.");
    });
    (0, vitest_1.it)("handles grocery-spend recommendation questions", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "top card for grocery spends" });
        (0, vitest_1.expect)(answer.cards.length).toBeGreaterThan(0);
        (0, vitest_1.expect)((_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.id).not.toBe("landmark-rewards-sbi-prime");
        (0, vitest_1.expect)(answer.needsDatabaseUpdate).toBeUndefined();
        (0, vitest_1.expect)(answer.summary.length).toBeGreaterThan(20);
    });
    (0, vitest_1.it)("handles travel-spend recommendation questions", async () => {
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "top card for travel spends" });
        (0, vitest_1.expect)(answer.cards.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(answer.needsDatabaseUpdate).toBeUndefined();
        (0, vitest_1.expect)(answer.summary.length).toBeGreaterThan(20);
    });
    (0, vitest_1.it)("handles life time free phrasing for ltf recommendations", async () => {
        var _a, _b;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "top life time free cards" });
        (0, vitest_1.expect)(answer.cards.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(answer.cards.every((item) => item.card.annualFee === 0)).toBe(true);
        (0, vitest_1.expect)(`${(_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.bestFor.join(" ")} ${(_b = answer.cards[0]) === null || _b === void 0 ? void 0 : _b.card.exclusions.join(" ")}`.toLowerCase()).not.toContain("invite only");
        (0, vitest_1.expect)(answer.needsDatabaseUpdate).toBeUndefined();
    });
    (0, vitest_1.it)("handles spend-mix recommendation questions", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({
            query: "my spends are 50% travel, 25% grocery, 25% utilities, suggest a card for me"
        });
        (0, vitest_1.expect)(answer.cards.length).toBeGreaterThan(0);
        (0, vitest_1.expect)((_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.id).not.toBe("amex-platinum-travel");
        (0, vitest_1.expect)(answer.needsDatabaseUpdate).toBeUndefined();
        (0, vitest_1.expect)(answer.summary.length).toBeGreaterThan(20);
    });
    (0, vitest_1.it)("adds scenario guidance for generic recommendation questions without spend context", async () => {
        var _a, _b;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "top card under 5000" });
        (0, vitest_1.expect)(answer.highlights).toEqual([]);
        (0, vitest_1.expect)((_a = answer.highlights) === null || _a === void 0 ? void 0 : _a.join(" ")).not.toMatch(/Apollo SBI Card SELECT/);
        (0, vitest_1.expect)((_b = answer.highlights) === null || _b === void 0 ? void 0 : _b.join(" ")).not.toMatch(/IndiGo IDFC FIRST/);
    });
    (0, vitest_1.it)("does not show redundant LTF spend ladders when the balanced winner does not change", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "top life time free cards" });
        (0, vitest_1.expect)((_a = answer.highlights) === null || _a === void 0 ? void 0 : _a.join(" ")).not.toMatch(/balanced mix/i);
    });
    (0, vitest_1.it)("uses super-premium scenario ladders for super-premium asks", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "best super premium card" });
        (0, vitest_1.expect)(answer.summary).toMatch(/Top 3 picks for this query/i);
        (0, vitest_1.expect)((_a = answer.highlights) === null || _a === void 0 ? void 0 : _a.join(" ")).not.toMatch(/Apollo SBI Card SELECT/);
    });
    (0, vitest_1.it)("answers negative rewards-policy questions from exclusions", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "do i get rewards on rent using atlas?" });
        (0, vitest_1.expect)((_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("axis-atlas");
        (0, vitest_1.expect)(answer.summary).toMatch(/does not appear to earn rewards on rent purchases/i);
        (0, vitest_1.expect)(answer.highlights).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.stringMatching(/excluded category match found for rent/i),
            vitest_1.expect.stringMatching(/^Relevant exclusion: rent$/i)
        ]));
    });
    (0, vitest_1.it)("answers lounge questions with the stored counts", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "how many international lounges does regalia gold have?" });
        (0, vitest_1.expect)((_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("hdfc-regalia-gold");
        (0, vitest_1.expect)(answer.summary).toMatch(/12 domestic and 6 international lounge accesses/i);
    });
    (0, vitest_1.it)("answers forex questions with the stored markup", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "what is the forex markup on atlas?" });
        (0, vitest_1.expect)((_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("axis-atlas");
        (0, vitest_1.expect)(answer.summary).toMatch(/forex markup of 3\.5%/i);
    });
    (0, vitest_1.it)("answers milestone questions for named cards", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "does infinia have milestone benefits?" });
        (0, vitest_1.expect)((_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("hdfc-infinia-metal");
        (0, vitest_1.expect)(answer.summary).toMatch(/does include milestone benefits/i);
        (0, vitest_1.expect)(answer.highlights).toEqual(vitest_1.expect.arrayContaining([vitest_1.expect.stringMatching(/renewal fee waived on annual spends of Rs 10 lakh or more/i)]));
    });
    (0, vitest_1.it)("handles alternate exclusion phrasing for named-card questions", async () => {
        var _a;
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "does atlas exclude rent?" });
        (0, vitest_1.expect)((_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("axis-atlas");
        (0, vitest_1.expect)(answer.summary).toMatch(/rent is part of the listed exclusions/i);
    });
    (0, vitest_1.it)("does not guess when a specific card lookup is missing from the dataset", async () => {
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "Centurion" });
        (0, vitest_1.expect)(answer.cards).toHaveLength(0);
        (0, vitest_1.expect)(answer.needsDatabaseUpdate).toBe(true);
        (0, vitest_1.expect)(answer.summary).toMatch(/could not find that exact card/i);
    });
    (0, vitest_1.it)("keeps broad top-card answers deterministic even when an OpenAI API key is configured", async () => {
        process.env.OPENAI_API_KEY = "test-key";
        global.fetch = vitest_1.vi.fn();
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "best cashback card" });
        (0, vitest_1.expect)(global.fetch).not.toHaveBeenCalled();
        (0, vitest_1.expect)(answer.summary).toMatch(/Top 3 picks for this query/i);
        (0, vitest_1.expect)(answer.cards).toHaveLength(3);
    });
    (0, vitest_1.it)("uses gpt-5-mini summary generation for non-ranking recommendation phrasing when an OpenAI API key is configured", async () => {
        process.env.OPENAI_API_KEY = "test-key";
        global.fetch = vitest_1.vi.fn(async () => ({
            ok: true,
            json: async () => ({
                output: [
                    {
                        content: [
                            {
                                text: JSON.stringify({
                                    summary: "SBI Cashback Credit Card looks strongest here based on the shortlisted card data."
                                })
                            }
                        ]
                    }
                ]
            })
        }));
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "cashback card for online spends" });
        (0, vitest_1.expect)(global.fetch).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(answer.summary).toMatch(/SBI Cashback Credit Card/);
        (0, vitest_1.expect)(answer.cards.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("uses AI as a fallback for fuzzy specific-card resolution when deterministic matching is weak", async () => {
        var _a;
        process.env.OPENAI_API_KEY = "test-key";
        global.fetch = vitest_1.vi
            .fn()
            .mockImplementationOnce(async () => ({
            ok: true,
            json: async () => ({
                output: [
                    {
                        content: [
                            {
                                text: JSON.stringify({
                                    cardId: "hsbc-travelone"
                                })
                            }
                        ]
                    }
                ]
            })
        }))
            .mockImplementationOnce(async () => ({
            ok: true,
            json: async () => ({
                output: [
                    {
                        content: [
                            {
                                text: JSON.stringify({
                                    summary: "HSBC TravelOne Credit Card looks like the right fit."
                                })
                            }
                        ]
                    }
                ]
            })
        }));
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "travel1" });
        (0, vitest_1.expect)(global.fetch).toHaveBeenCalledTimes(2);
        (0, vitest_1.expect)((_a = answer.cards[0]) === null || _a === void 0 ? void 0 : _a.card.id).toBe("hsbc-travelone");
    });
    (0, vitest_1.it)("logs empty-match questions for later enrichment", async () => {
        const answer = await (0, ask_ai_1.answerQuestion)({ query: "best cashback card", maxAnnualFee: -1 });
        (0, vitest_1.expect)(answer.needsDatabaseUpdate).toBe(true);
        (0, vitest_1.expect)(node_fs_1.default.existsSync(logPath)).toBe(true);
    });
});
