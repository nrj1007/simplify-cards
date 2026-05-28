"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const scoringModulePath = "../skills/community-signals/scripts/technofino-scoring.mjs";
(0, vitest_1.describe)("Technofino signal scoring", () => {
    (0, vitest_1.it)("keeps high-signal credit-card terms-change items", async () => {
        const { scoreCommunityItem, summarizeSignals } = await Promise.resolve(`${scoringModulePath}`).then(s => __importStar(require(s)));
        const item = {
            title: "Indusind Legend Credit Card- Devaluation",
            forum: "Super Premium Credit Cards",
            text: "Indusind Legend Credit Card devaluation effective June 15 with revised charges and reward changes"
        };
        const score = scoreCommunityItem(item);
        const queue = summarizeSignals([
            {
                title: item.title,
                forum: item.forum,
                url: "https://technofino.in/community/threads/indusind-ledgend-credit-card-devaluation.45690/",
                latestTimestamp: 1778560000
            }
        ], []);
        (0, vitest_1.expect)(score.isRelevantCreditCardSignal).toBe(true);
        (0, vitest_1.expect)(score.score).toBeGreaterThanOrEqual(5);
        (0, vitest_1.expect)(queue[0].signalType).toBe("terms-change");
        (0, vitest_1.expect)(queue[0].candidateCardIds).toContain("indusind-legend");
    });
    (0, vitest_1.it)("filters bank-account and debit-card noise", async () => {
        const { scoreCommunityItem, summarizeSignals } = await Promise.resolve(`${scoringModulePath}`).then(s => __importStar(require(s)));
        const noisyItems = [
            {
                title: "Wiki",
                forum: "Bank Account",
                text: "Wiki Bank Account",
                url: "https://technofino.in/community/forums/kotak-bank-811-super-savings-account-benefits-important-update.4/",
                latestTimestamp: 1778560000
            },
            {
                title: "Free INR 50 APAY voucher with Visa DC",
                forum: "Debit Card Offers",
                text: "Free INR 50 APAY voucher with Visa debit card",
                url: "https://technofino.in/community/threads/free-inr-50-apay-voucher-with-visa-dc.48167/",
                latestTimestamp: 1778560000
            }
        ];
        (0, vitest_1.expect)(scoreCommunityItem(noisyItems[0]).isRelevantCreditCardSignal).toBe(false);
        (0, vitest_1.expect)(scoreCommunityItem(noisyItems[1]).isRelevantCreditCardSignal).toBe(false);
        (0, vitest_1.expect)(summarizeSignals(noisyItems, [])).toHaveLength(0);
    });
    (0, vitest_1.it)("filters one-off application support posts", async () => {
        const { scoreCommunityItem } = await Promise.resolve(`${scoringModulePath}`).then(s => __importStar(require(s)));
        const score = scoreCommunityItem({
            title: "Axis bank CC application not complete due to Office email wrong entered",
            forum: "Axis Bank Credit Card",
            text: "Axis bank CC application not complete due to Office email wrong entered"
        });
        (0, vitest_1.expect)(score.isRelevantCreditCardSignal).toBe(false);
    });
    (0, vitest_1.it)("keeps launch and offer discussions with card context", async () => {
        const { summarizeSignals } = await Promise.resolve(`${scoringModulePath}`).then(s => __importStar(require(s)));
        const queue = summarizeSignals([
            {
                title: "PhonePe SBI Card - CVP new SBI CC launching",
                forum: "Credit Card - General",
                text: "PhonePe SBI Card new SBI CC launching",
                url: "https://technofino.in/community/threads/phonepe-sbi-card-cvp-new-sbi-cc-launching.42666/",
                latestTimestamp: 1778560000
            }
        ], []);
        (0, vitest_1.expect)(queue).toHaveLength(1);
        (0, vitest_1.expect)(queue[0].signalType).toBe("launch-or-offer");
        (0, vitest_1.expect)(queue[0].relevanceScore).toBeGreaterThanOrEqual(5);
    });
    (0, vitest_1.it)("does not match generic one-word card aliases across issuers", async () => {
        const { matchCardsForSignal } = await Promise.resolve(`${scoringModulePath}`).then(s => __importStar(require(s)));
        const matches = matchCardsForSignal("Kotak Cashback Card LTF Trick Credit Card Offers");
        (0, vitest_1.expect)(matches.map((match) => match.cardId)).toContain("kotak-cashback-plus");
        (0, vitest_1.expect)(matches.map((match) => match.cardId)).not.toContain("axis-cashback");
    });
    (0, vitest_1.it)("does not match ambiguous one-word card aliases without issuer context", async () => {
        const { matchCardsForSignal, summarizeSignals } = await Promise.resolve(`${scoringModulePath}`).then(s => __importStar(require(s)));
        const matches = matchCardsForSignal("Help required on Celesta and another card");
        const queue = summarizeSignals([
            {
                title: "Amex India points to spouse Krisflyer Account",
                forum: "Singapore Airlines KrisFlyer",
                text: "Amex India points to spouse Krisflyer Account",
                url: "https://technofino.in/community/threads/amex-india-points-to-spouse-krisflyer-account.48182/",
                latestTimestamp: 1778560000
            }
        ], []);
        (0, vitest_1.expect)(matches.map((match) => match.cardId)).not.toContain("federal-celesta");
        (0, vitest_1.expect)(matches.map((match) => match.cardId)).not.toContain("indusind-celesta");
        (0, vitest_1.expect)(queue).toHaveLength(0);
    });
    (0, vitest_1.it)("checks whether fresh comments still match old thread topics", async () => {
        const { isCommentRelevantToThread } = await Promise.resolve(`${scoringModulePath}`).then(s => __importStar(require(s)));
        const relevant = isCommentRelevantToThread("Kotak Cashback Card LTF Trick", "Kotak Cashback can be made LTF if retention approves after renewal fee posts.");
        const unrelated = isCommentRelevantToThread("Kotak Cashback Card LTF Trick", "I am planning to apply for Amex points transfer to KrisFlyer.");
        (0, vitest_1.expect)(relevant.isRelevant).toBe(true);
        (0, vitest_1.expect)(unrelated.isRelevant).toBe(false);
    });
    (0, vitest_1.it)("adds discussion details to review queue entries", async () => {
        const { summarizeSignals } = await Promise.resolve(`${scoringModulePath}`).then(s => __importStar(require(s)));
        const queue = summarizeSignals([
            {
                title: "Indusind Legend Credit Card- Devaluation",
                forum: "Super Premium Credit Cards",
                url: "https://technofino.in/community/threads/indusind-ledgend-credit-card-devaluation.45690/",
                latestTimestamp: 1778560000
            }
        ], []);
        (0, vitest_1.expect)(queue[0].discussionDetails).toMatch(/possible terms/i);
        (0, vitest_1.expect)(queue[0].discussionDetails).toMatch(/matched cards/i);
    });
    (0, vitest_1.it)("prioritizes recently created threads over old threads with fresh comments", async () => {
        const { summarizeSignals } = await Promise.resolve(`${scoringModulePath}`).then(s => __importStar(require(s)));
        const queue = summarizeSignals([
            {
                title: "PhonePe SBI Card - CVP new SBI CC launching",
                forum: "Credit Card - General",
                text: "PhonePe SBI Card new SBI CC launching",
                url: "https://technofino.in/community/threads/phonepe-sbi-card-cvp-new-sbi-cc-launching.42666/",
                latestTimestamp: 1778560000,
                createdTimestamp: 1778560000,
                isRecentlyCreatedThread: true
            }
        ], [
            {
                threadTitle: "Kotak Cashback Card LTF Trick",
                postUrl: "https://technofino.in/community/threads/kotak-cashback-card-ltf-trick.45254/#post-1",
                timestamp: 1778570000,
                text: "Kotak Cashback can be made LTF if retention approves after renewal fee posts."
            }
        ]);
        (0, vitest_1.expect)(queue[0].title).toMatch(/PhonePe SBI/);
        (0, vitest_1.expect)(queue[0].sourceType).toBe("thread");
        (0, vitest_1.expect)(queue[0].isRecentlyCreatedThread).toBe(true);
    });
});
