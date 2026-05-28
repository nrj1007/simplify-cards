"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ComparePage;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const cards_1 = require("@/lib/cards");
const lounge_1 = require("@/lib/lounge");
const LoungeInfo_1 = __importDefault(require("@/app/ui/LoungeInfo"));
function formatCurrency(value) {
    if (value === null || value === undefined)
        return "Not listed";
    return `Rs ${value.toLocaleString("en-IN")}`;
}
function formatRewardCap(value, rewardType) {
    if (!value)
        return "-";
    return `${value.toLocaleString("en-IN")} ${rewardType}`;
}
function loungeValue(value) {
    return value === "unlimited" ? "Unlimited" : `${value}`;
}
function rewardRateLabel(card, reward) {
    if (reward.displayRate)
        return reward.displayRate;
    const rewardType = card.rewardType.toLowerCase();
    if (rewardType.includes("point") || rewardType.includes("mile")) {
        return `${reward.rate} ${card.rewardType} / Rs 100`;
    }
    return `${reward.rate}%`;
}
function rewardSummary(card) {
    return card.rewards
        .slice(0, 3)
        .map((reward) => { var _a; return `${(_a = reward.displayCategory) !== null && _a !== void 0 ? _a : reward.category}: ${rewardRateLabel(card, reward)}`; })
        .join("; ");
}
function smartbuyCapSummary(card) {
    const smartbuyRewards = card.rewards.filter((reward) => reward.category.includes("smartbuy"));
    if (smartbuyRewards.length === 0)
        return "Not listed";
    const caps = smartbuyRewards.map((reward) => {
        const parts = [];
        if (reward.capDaily)
            parts.push(`daily ${formatRewardCap(reward.capDaily, card.rewardType)}`);
        if (reward.capMonthly)
            parts.push(`monthly ${formatRewardCap(reward.capMonthly, card.rewardType)}`);
        return `${reward.category}: ${parts.length ? parts.join(", ") : "no cap listed"}`;
    });
    return caps.join("; ");
}
function redemptionSummary(card) {
    if (!card.redemption)
        return "Not listed";
    const parts = [];
    if (typeof card.redemption.smartBuyFlightHotelValue === "number") {
        parts.push(`SmartBuy travel: upto Rs ${card.redemption.smartBuyFlightHotelValue} per point`);
    }
    if (typeof card.redemption.airMilesValue === "number") {
        parts.push(`Air miles: upto Rs ${card.redemption.airMilesValue} per point`);
    }
    if (typeof card.redemption.accorValue === "number") {
        parts.push(`Accor: upto Rs ${card.redemption.accorValue} per point *considering using accor redemption`);
    }
    if (typeof card.redemption.statementBalanceValue === "number") {
        parts.push(`Statement credit: upto Rs ${card.redemption.statementBalanceValue} per point`);
    }
    return parts.length ? parts.join("; ") : "Not listed";
}
function listPreview(items, count = 4) {
    if (!items || items.length === 0)
        return "Not listed";
    return items.slice(0, count).join(", ");
}
function milestoneSummary(card) {
    return listPreview(card.milestoneBenefits, 4);
}
function CompareOverviewCard({ card }) {
    const loungeConditions = (0, lounge_1.getLoungeConditions)(card);
    return ((0, jsx_runtime_1.jsxs)("article", { className: "panel card compare-card", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "meta", children: (0, jsx_runtime_1.jsx)("span", { children: card.issuer }) }), (0, jsx_runtime_1.jsx)("h2", { children: card.name })] }), (0, jsx_runtime_1.jsx)("div", { className: "meta", children: card.tags.slice(0, 5).map((tag) => ((0, jsx_runtime_1.jsx)("span", { className: "badge", children: tag }, `${card.id}-${tag}`))) }), (0, jsx_runtime_1.jsxs)("div", { className: "stats compare-card-stats", children: [(0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsx)("strong", { children: formatCurrency(card.annualFee) }), (0, jsx_runtime_1.jsx)("span", { children: "Annual fee" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsx)("strong", { children: formatCurrency(card.feeWaiverSpend) }), (0, jsx_runtime_1.jsx)("span", { children: "Fee waiver spend" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsx)("strong", { children: loungeValue(card.loungeDomestic) }), (0, jsx_runtime_1.jsxs)("span", { className: "stat-label", children: ["Domestic lounge", (0, jsx_runtime_1.jsx)(LoungeInfo_1.default, { items: loungeConditions, label: "Domestic lounge conditions" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsxs)("strong", { children: [card.forexMarkup, "%"] }), (0, jsx_runtime_1.jsx)("span", { children: "Forex markup" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "compare-card-section", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Best for" }), (0, jsx_runtime_1.jsx)("p", { className: "muted", children: card.bestFor.join(", ") })] }), (0, jsx_runtime_1.jsxs)("div", { className: "compare-card-section", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Top rewards" }), (0, jsx_runtime_1.jsx)("p", { className: "muted", children: rewardSummary(card) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "actions", children: [(0, jsx_runtime_1.jsx)(link_1.default, { className: "button secondary", href: `/cards/${card.id}`, children: "View details" }), (0, jsx_runtime_1.jsxs)("a", { className: "button", href: card.applyUrl, rel: "nofollow sponsored", target: "_blank", children: ["Apply ", (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 15 })] })] })] }));
}
async function ComparePage({ searchParams }) {
    var _a, _b;
    const params = await searchParams;
    const first = (_a = cards_1.cards.find((card) => { var _a; return card.id === ((_a = params.a) !== null && _a !== void 0 ? _a : "sbi-cashback"); })) !== null && _a !== void 0 ? _a : cards_1.cards[0];
    const second = (_b = cards_1.cards.find((card) => { var _a; return card.id === ((_a = params.b) !== null && _a !== void 0 ? _a : "hdfc-millennia"); })) !== null && _b !== void 0 ? _b : cards_1.cards[1];
    return ((0, jsx_runtime_1.jsxs)("section", { className: "section", children: [(0, jsx_runtime_1.jsxs)("div", { className: "page-title", children: [(0, jsx_runtime_1.jsx)("h1", { children: "Compare Cards" }), (0, jsx_runtime_1.jsx)("p", { children: "Compare fees, rewards, lounge access, milestone benefits, and exclusions side by side." })] }), (0, jsx_runtime_1.jsxs)("form", { className: "panel card compare-form", style: { margin: "18px 0" }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "filters", children: [(0, jsx_runtime_1.jsxs)("div", { className: "field", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "a", children: "First card" }), (0, jsx_runtime_1.jsx)("select", { id: "a", name: "a", defaultValue: first.id, children: cards_1.cards.map((card) => ((0, jsx_runtime_1.jsx)("option", { value: card.id, children: card.name }, card.id))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "field", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "b", children: "Second card" }), (0, jsx_runtime_1.jsx)("select", { id: "b", name: "b", defaultValue: second.id, children: cards_1.cards.map((card) => ((0, jsx_runtime_1.jsx)("option", { value: card.id, children: card.name }, card.id))) })] })] }), (0, jsx_runtime_1.jsx)("button", { className: "button compare-submit", children: "Compare" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid compare-overview", children: [(0, jsx_runtime_1.jsx)(CompareOverviewCard, { card: first }), (0, jsx_runtime_1.jsx)(CompareOverviewCard, { card: second })] }), (0, jsx_runtime_1.jsx)("div", { className: "panel compare-table-shell", children: (0, jsx_runtime_1.jsx)("div", { className: "table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "compare-table compare-table-rich", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Feature" }), (0, jsx_runtime_1.jsx)("th", { children: first.name }), (0, jsx_runtime_1.jsx)("th", { children: second.name })] }) }), (0, jsx_runtime_1.jsxs)("tbody", { children: [(0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Issuer" }), (0, jsx_runtime_1.jsx)("td", { children: first.issuer }), (0, jsx_runtime_1.jsx)("td", { children: second.issuer })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Network" }), (0, jsx_runtime_1.jsx)("td", { children: first.network.join(", ") }), (0, jsx_runtime_1.jsx)("td", { children: second.network.join(", ") })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Joining fee" }), (0, jsx_runtime_1.jsx)("td", { children: formatCurrency(first.joiningFee) }), (0, jsx_runtime_1.jsx)("td", { children: formatCurrency(second.joiningFee) })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Annual fee" }), (0, jsx_runtime_1.jsx)("td", { children: formatCurrency(first.annualFee) }), (0, jsx_runtime_1.jsx)("td", { children: formatCurrency(second.annualFee) })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Fee waiver spend" }), (0, jsx_runtime_1.jsx)("td", { children: formatCurrency(first.feeWaiverSpend) }), (0, jsx_runtime_1.jsx)("td", { children: formatCurrency(second.feeWaiverSpend) })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Reward type" }), (0, jsx_runtime_1.jsx)("td", { children: first.rewardType }), (0, jsx_runtime_1.jsx)("td", { children: second.rewardType })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Best for" }), (0, jsx_runtime_1.jsx)("td", { children: first.bestFor.join(", ") }), (0, jsx_runtime_1.jsx)("td", { children: second.bestFor.join(", ") })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Top reward categories" }), (0, jsx_runtime_1.jsx)("td", { children: rewardSummary(first) }), (0, jsx_runtime_1.jsx)("td", { children: rewardSummary(second) })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "SmartBuy / accelerated caps" }), (0, jsx_runtime_1.jsx)("td", { children: smartbuyCapSummary(first) }), (0, jsx_runtime_1.jsx)("td", { children: smartbuyCapSummary(second) })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Domestic lounge" }), (0, jsx_runtime_1.jsx)("td", { children: loungeValue(first.loungeDomestic) }), (0, jsx_runtime_1.jsx)("td", { children: loungeValue(second.loungeDomestic) })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "International lounge" }), (0, jsx_runtime_1.jsx)("td", { children: loungeValue(first.loungeInternational) }), (0, jsx_runtime_1.jsx)("td", { children: loungeValue(second.loungeInternational) })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Forex markup" }), (0, jsx_runtime_1.jsxs)("td", { children: [first.forexMarkup, "%"] }), (0, jsx_runtime_1.jsxs)("td", { children: [second.forexMarkup, "%"] })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Milestone benefits" }), (0, jsx_runtime_1.jsx)("td", { children: milestoneSummary(first) }), (0, jsx_runtime_1.jsx)("td", { children: milestoneSummary(second) })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Redemption" }), (0, jsx_runtime_1.jsx)("td", { children: redemptionSummary(first) }), (0, jsx_runtime_1.jsx)("td", { children: redemptionSummary(second) })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Key exclusions" }), (0, jsx_runtime_1.jsx)("td", { children: listPreview(first.exclusions, 6) }), (0, jsx_runtime_1.jsx)("td", { children: listPreview(second.exclusions, 6) })] })] })] }) }) })] }));
}
