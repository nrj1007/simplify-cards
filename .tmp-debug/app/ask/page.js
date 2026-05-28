"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AskPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const AskBox_1 = __importDefault(require("../ui/AskBox"));
const LoungeInfo_1 = __importDefault(require("../ui/LoungeInfo"));
const AskFeedback_1 = __importDefault(require("../ui/AskFeedback"));
const ask_ai_1 = require("@/lib/ask-ai");
const cards_1 = require("@/lib/cards");
const lounge_1 = require("@/lib/lounge");
function parseInput(params) {
    var _a;
    const query = (_a = params.query) === null || _a === void 0 ? void 0 : _a.trim();
    if (!query)
        return null;
    const parsedMaxFee = params.maxAnnualFee ? Number(params.maxAnnualFee) : undefined;
    return {
        query,
        maxAnnualFee: parsedMaxFee !== undefined && !Number.isNaN(parsedMaxFee) ? parsedMaxFee : undefined
    };
}
function formatCurrency(value) {
    if (value === null || value === undefined)
        return "Not listed";
    return `Rs ${value.toLocaleString("en-IN")}`;
}
function formatRewardRate(reward, rewardType) {
    if (reward.displayRate)
        return reward.displayRate;
    const rewardTypeLower = rewardType.toLowerCase();
    if (rewardTypeLower.includes("mile") || rewardTypeLower.includes("point")) {
        return `${reward.rate} ${rewardType} / Rs 100`;
    }
    return `${reward.rate}%`;
}
function formatRewardCap(value, rewardType) {
    if (!value)
        return "-";
    return `${value.toLocaleString("en-IN")} ${rewardType}`;
}
function formatLoungeValue(value) {
    return value === "unlimited" ? "Unlimited" : value.toLocaleString("en-IN");
}
function formatFeeWaiverSpend(value) {
    if (!value)
        return "-";
    if (value >= 100000) {
        const lakhs = value / 100000;
        const formattedLakhs = Number.isInteger(lakhs) ? `${lakhs}` : lakhs.toFixed(1);
        return `Rs ${formattedLakhs} lakhs`;
    }
    return `Rs ${value.toLocaleString("en-IN")}`;
}
function bestRedemptionValue(card) {
    var _a, _b, _c, _d;
    const values = [
        (_a = card.redemption) === null || _a === void 0 ? void 0 : _a.statementBalanceValue,
        (_b = card.redemption) === null || _b === void 0 ? void 0 : _b.smartBuyFlightHotelValue,
        (_c = card.redemption) === null || _c === void 0 ? void 0 : _c.airMilesValue,
        (_d = card.redemption) === null || _d === void 0 ? void 0 : _d.accorValue
    ].filter((value) => typeof value === "number" && value > 0);
    if (values.length === 0)
        return 1;
    return Math.max(...values);
}
function usesAccorRedemptionValue(card) {
    var _a;
    return typeof ((_a = card.redemption) === null || _a === void 0 ? void 0 : _a.accorValue) === "number" && card.redemption.accorValue === bestRedemptionValue(card);
}
function accorRedemptionNote(card) {
    return usesAccorRedemptionValue(card) ? "*considering using accor redemption" : "";
}
function rewardRateToPercent(card, rate) {
    const rewardType = card.rewardType.toLowerCase();
    const isPointsLike = rewardType.includes("point") ||
        rewardType.includes("mile") ||
        rewardType.includes("coin") ||
        rewardType.includes("credit");
    const effectivePercent = isPointsLike ? rate * bestRedemptionValue(card) : rate;
    return Number.isInteger(effectivePercent) ? `${effectivePercent}%` : `${effectivePercent.toFixed(1)}%`;
}
function buildRewardRateSummary(card) {
    var _a;
    const sortedRewards = card.rewards.slice().sort((a, b) => a.rate - b.rate);
    if (sortedRewards.length === 0)
        return ["-"];
    const baseReward = (_a = sortedRewards.find((reward) => { var _a; return reward.category === "offline" || ((_a = reward.displayCategory) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "others"; })) !== null && _a !== void 0 ? _a : sortedRewards[0];
    const acceleratedReward = [...sortedRewards].reverse().find((reward) => reward.rate > baseReward.rate);
    const baseText = `${rewardRateToPercent(card, baseReward.rate)} - Base reward rate`;
    const acceleratedText = acceleratedReward
        ? `upto ${rewardRateToPercent(card, acceleratedReward.rate)} - accelerated reward rate`
        : "";
    const accorNote = accorRedemptionNote(card);
    return [baseText, acceleratedText, accorNote].filter(Boolean);
}
function isTopCardsQuery(query) {
    if (!query)
        return false;
    return /\b(top|best|recommend|recommended|suggest)\b/i.test(query) && /\bcards?\b/i.test(query);
}
async function AskPage({ searchParams }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const params = await searchParams;
    const input = parseInput(params);
    const result = input ? await (0, ask_ai_1.answerQuestion)(input) : null;
    const savedFeedback = params.feedbackSaved === "up" || params.feedbackSaved === "down" ? params.feedbackSaved : null;
    const feedbackError = params.feedbackError === "1";
    const topCardsQuery = isTopCardsQuery(input === null || input === void 0 ? void 0 : input.query);
    const topCard = result === null || result === void 0 ? void 0 : result.cards[0];
    const rankedResultCards = topCardsQuery ? (_a = result === null || result === void 0 ? void 0 : result.cards.slice(0, 3)) !== null && _a !== void 0 ? _a : [] : [];
    const linkedAlternativeCards = topCard
        ? ((_b = topCard.card.alternativeCardIds) !== null && _b !== void 0 ? _b : []).flatMap((cardId) => {
            const card = (0, cards_1.getCardById)(cardId);
            return card && card.id !== topCard.card.id ? [card] : [];
        })
        : [];
    const alternativeCards = topCardsQuery ? (_c = result === null || result === void 0 ? void 0 : result.cards.slice(3)) !== null && _c !== void 0 ? _c : [] : (_d = result === null || result === void 0 ? void 0 : result.cards.slice(1)) !== null && _d !== void 0 ? _d : [];
    const answerHighlights = ((_e = result === null || result === void 0 ? void 0 : result.highlights) !== null && _e !== void 0 ? _e : []).filter((highlight) => {
        if (/^Closest alternative/i.test(highlight) || /^Closest alternatives/i.test(highlight))
            return false;
        if (topCardsQuery && /^#\d+:/i.test(highlight))
            return false;
        return true;
    });
    const loungeConditions = topCard ? (0, lounge_1.getLoungeConditions)(topCard.card) : [];
    const returnTo = input
        ? `/ask?query=${encodeURIComponent((_f = input.query) !== null && _f !== void 0 ? _f : "")}${input.maxAnnualFee !== undefined ? `&maxAnnualFee=${input.maxAnnualFee}` : ""}`
        : "/ask";
    return ((0, jsx_runtime_1.jsxs)("section", { className: "section", children: [(0, jsx_runtime_1.jsxs)("div", { className: "page-title", children: [(0, jsx_runtime_1.jsx)("h1", { children: "Ask Card AI" }), (0, jsx_runtime_1.jsx)("p", { children: "Server-rendered answers, so this keeps working even when the browser is having a strange day." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "detail-layout ask-layout", style: { marginTop: 18 }, children: [(0, jsx_runtime_1.jsx)("div", { className: "detail-main", children: result ? ((0, jsx_runtime_1.jsxs)("div", { className: "results", id: "answer", children: [(0, jsx_runtime_1.jsxs)("div", { className: "panel card answer-card", children: [(0, jsx_runtime_1.jsxs)("div", { className: "meta answer-meta", children: [(0, jsx_runtime_1.jsx)("span", { children: "Answer" }), (input === null || input === void 0 ? void 0 : input.query) ? (0, jsx_runtime_1.jsxs)("span", { className: "badge", children: ["Query: ", input.query] }) : null] }), (0, jsx_runtime_1.jsx)("p", { className: "answer-summary", children: result.summary }), answerHighlights.length > 0 ? ((0, jsx_runtime_1.jsx)("ul", { className: "detail-list answer-highlights", children: answerHighlights.map((highlight) => ((0, jsx_runtime_1.jsx)("li", { children: highlight }, highlight))) })) : null, linkedAlternativeCards.length > 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "answer-linked-alternatives", children: [(0, jsx_runtime_1.jsx)("strong", { children: linkedAlternativeCards.length === 1 ? "Closest alternative:" : "Closest alternatives:" }), " ", linkedAlternativeCards.map((card, index) => ((0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)(link_1.default, { className: "answer-inline-link", href: `/cards/${card.id}`, children: card.name }), index < linkedAlternativeCards.length - 2
                                                            ? ", "
                                                            : index === linkedAlternativeCards.length - 2
                                                                ? " and "
                                                                : ""] }, card.id)))] })) : null, rankedResultCards.length > 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "answer-ranked-list", "aria-label": "Top picks", children: rankedResultCards.map((item, index) => ((0, jsx_runtime_1.jsxs)("article", { className: "answer-ranked-item", children: [(0, jsx_runtime_1.jsxs)("div", { className: "answer-ranked-copy", children: [(0, jsx_runtime_1.jsxs)("div", { className: "answer-ranked-meta", children: [(0, jsx_runtime_1.jsxs)("span", { className: "badge", children: ["#", index + 1] }), (0, jsx_runtime_1.jsx)("span", { children: item.card.issuer })] }), (0, jsx_runtime_1.jsx)("h2", { className: "answer-ranked-title", children: item.card.name })] }), (0, jsx_runtime_1.jsxs)("div", { className: "actions answer-ranked-actions", children: [(0, jsx_runtime_1.jsx)(link_1.default, { className: "button secondary", href: `/cards/${item.card.id}`, children: "Details" }), (0, jsx_runtime_1.jsx)("a", { className: "button", href: item.card.applyUrl, rel: "nofollow sponsored", target: "_blank", children: "Apply" })] })] }, item.card.id))) })) : null, topCardsQuery && rankedResultCards.length > 0 ? ((0, jsx_runtime_1.jsxs)("section", { className: "detail-section", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Quick comparison" }), (0, jsx_runtime_1.jsx)("div", { className: "table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "compare-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Feature" }), rankedResultCards.map((item) => ((0, jsx_runtime_1.jsx)("th", { children: item.card.name }, `compare-head-${item.card.id}`)))] }) }), (0, jsx_runtime_1.jsxs)("tbody", { children: [(0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Best for" }), rankedResultCards.map((item) => ((0, jsx_runtime_1.jsx)("td", { children: item.card.bestFor.slice(0, 3).join(", ") || "-" }, `best-for-${item.card.id}`)))] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Reward rates" }), rankedResultCards.map((item) => ((0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("div", { className: "compare-rate-summary", children: buildRewardRateSummary(item.card).map((line) => ((0, jsx_runtime_1.jsx)("div", { children: line }, `${item.card.id}-${line}`))) }) }, `reward-rates-${item.card.id}`)))] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Annual fee" }), rankedResultCards.map((item) => ((0, jsx_runtime_1.jsx)("td", { children: formatCurrency(item.card.annualFee) }, `annual-fee-${item.card.id}`)))] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Fee waiver spend" }), rankedResultCards.map((item) => ((0, jsx_runtime_1.jsx)("td", { children: formatFeeWaiverSpend(item.card.feeWaiverSpend) }, `fee-waiver-${item.card.id}`)))] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Domestic lounge" }), rankedResultCards.map((item) => ((0, jsx_runtime_1.jsx)("td", { children: formatLoungeValue(item.card.loungeDomestic) }, `lounge-domestic-${item.card.id}`)))] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "International lounge" }), rankedResultCards.map((item) => ((0, jsx_runtime_1.jsx)("td", { children: formatLoungeValue(item.card.loungeInternational) }, `lounge-international-${item.card.id}`)))] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Forex markup" }), rankedResultCards.map((item) => ((0, jsx_runtime_1.jsxs)("td", { children: [item.card.forexMarkup, "%"] }, `forex-${item.card.id}`)))] })] })] }) })] })) : null, !topCardsQuery && topCard ? ((0, jsx_runtime_1.jsxs)("div", { className: "stats answer-stats", children: [(0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsxs)("strong", { children: ["Rs ", topCard.estimatedAnnualFee.toLocaleString("en-IN")] }), (0, jsx_runtime_1.jsx)("span", { children: "Effective annual fee" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsx)("strong", { children: topCard.card.loungeDomestic === "unlimited" ? "Unlimited" : topCard.card.loungeDomestic }), (0, jsx_runtime_1.jsxs)("span", { className: "stat-label", children: ["Domestic lounge", (0, jsx_runtime_1.jsx)(LoungeInfo_1.default, { items: loungeConditions, label: "Domestic lounge conditions" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsx)("strong", { children: topCard.card.loungeInternational === "unlimited" ? "Unlimited" : topCard.card.loungeInternational }), (0, jsx_runtime_1.jsxs)("span", { className: "stat-label", children: ["International lounge", (0, jsx_runtime_1.jsx)(LoungeInfo_1.default, { items: loungeConditions, label: "International lounge conditions" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsxs)("strong", { children: [topCard.card.forexMarkup, "%"] }), (0, jsx_runtime_1.jsx)("span", { children: "Forex markup" })] })] })) : null, !topCardsQuery && (topCard === null || topCard === void 0 ? void 0 : topCard.card.rewards.length) ? ((0, jsx_runtime_1.jsxs)("section", { className: "detail-section", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Rewards" }), (0, jsx_runtime_1.jsx)("div", { className: "table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "compare-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Category" }), (0, jsx_runtime_1.jsx)("th", { children: "Rate" }), (0, jsx_runtime_1.jsx)("th", { className: "cap-column", children: "Daily cap" }), (0, jsx_runtime_1.jsx)("th", { className: "cap-column", children: "Monthly cap" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: topCard.card.rewards.map((reward) => {
                                                                    var _a;
                                                                    return ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: (_a = reward.displayCategory) !== null && _a !== void 0 ? _a : reward.category }), (0, jsx_runtime_1.jsx)("td", { children: formatRewardRate(reward, topCard.card.rewardType) }), (0, jsx_runtime_1.jsx)("td", { className: "cap-column", children: formatRewardCap(reward.capDaily, topCard.card.rewardType) }), (0, jsx_runtime_1.jsx)("td", { className: "cap-column", children: formatRewardCap(reward.capMonthly, topCard.card.rewardType) })] }, `${topCard.card.id}-${reward.category}`));
                                                                }) })] }) })] })) : null, !topCardsQuery && ((_g = topCard === null || topCard === void 0 ? void 0 : topCard.card.milestoneBenefits) === null || _g === void 0 ? void 0 : _g.length) ? ((0, jsx_runtime_1.jsxs)("section", { className: "detail-section", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Milestone benefits" }), (0, jsx_runtime_1.jsx)("ul", { className: "detail-list", children: topCard.card.milestoneBenefits.map((benefit) => ((0, jsx_runtime_1.jsx)("li", { children: benefit }, benefit))) })] })) : null, !topCardsQuery && topCard ? ((0, jsx_runtime_1.jsxs)("div", { className: "actions answer-actions", children: [(0, jsx_runtime_1.jsx)(link_1.default, { className: "button secondary", href: `/cards/${topCard.card.id}`, children: "More details" }), (0, jsx_runtime_1.jsx)("a", { className: "button", href: topCard.card.applyUrl, rel: "nofollow sponsored", target: "_blank", children: "Apply" })] })) : null, (input === null || input === void 0 ? void 0 : input.query) ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(AskFeedback_1.default, { cardIds: result.cards.map((item) => item.card.id), input: input, query: input.query, returnTo: returnTo, savedFeedback: savedFeedback, summary: result.summary }), feedbackError ? ((0, jsx_runtime_1.jsx)("p", { className: "notice", style: { margin: 0 }, children: "Feedback could not be saved on the server." })) : null] })) : null] }), !topCard ? ((0, jsx_runtime_1.jsx)("div", { className: "panel card", children: (0, jsx_runtime_1.jsx)("p", { className: "muted", style: { margin: 0 }, children: "No matching cards were found in the current database for this question." }) })) : null, alternativeCards.length ? ((0, jsx_runtime_1.jsxs)("section", { className: "result-group", children: [(0, jsx_runtime_1.jsx)("div", { className: "section-head ask-section-head", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: "Alternatives" }), (0, jsx_runtime_1.jsx)("p", { children: "Nearby options worth comparing." })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "grid cards", children: alternativeCards.map((item) => ((0, jsx_runtime_1.jsxs)("article", { className: "panel card result-card result-card-compact", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "meta", children: [(0, jsx_runtime_1.jsx)("span", { children: item.card.issuer }), (0, jsx_runtime_1.jsxs)("span", { children: ["Fit score ", Math.round(item.fitScore).toLocaleString("en-IN")] })] }), (0, jsx_runtime_1.jsx)("h3", { style: { marginTop: 6 }, children: item.card.name })] }), (0, jsx_runtime_1.jsxs)("div", { className: "meta", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Rs ", item.estimatedAnnualRewards.toLocaleString("en-IN"), " rewards", " ", accorRedemptionNote(item.card)] }), (0, jsx_runtime_1.jsxs)("span", { children: ["Rs ", item.estimatedAnnualFee.toLocaleString("en-IN"), " fee"] })] }), (0, jsx_runtime_1.jsx)("ul", { className: "detail-list", children: item.reasons.slice(0, 3).map((reason) => ((0, jsx_runtime_1.jsx)("li", { children: reason }, reason))) }), (0, jsx_runtime_1.jsxs)("div", { className: "actions", children: [(0, jsx_runtime_1.jsx)(link_1.default, { className: "button secondary", href: `/cards/${item.card.id}`, children: "View details" }), (0, jsx_runtime_1.jsx)("a", { className: "button", href: item.card.applyUrl, rel: "nofollow sponsored", target: "_blank", children: "Apply" })] })] }, item.card.id))) })] })) : null] })) : ((0, jsx_runtime_1.jsx)("div", { className: "panel card", style: { marginTop: 18 }, children: (0, jsx_runtime_1.jsx)("p", { className: "muted", style: { margin: 0 }, children: "Ask a question and we will return a grounded answer from our verified card data." }) })) }), (0, jsx_runtime_1.jsx)("aside", { className: "detail-aside ask-aside", children: (0, jsx_runtime_1.jsx)(AskBox_1.default, { defaultMaxAnnualFee: input === null || input === void 0 ? void 0 : input.maxAnnualFee, defaultQuery: (_j = (_h = input === null || input === void 0 ? void 0 : input.query) !== null && _h !== void 0 ? _h : params.query) !== null && _j !== void 0 ? _j : "", showHelperText: false }) })] })] }));
}
