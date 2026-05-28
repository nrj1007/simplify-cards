"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStaticParams = generateStaticParams;
exports.generateMetadata = generateMetadata;
exports.default = CardPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const cards_1 = require("@/lib/cards");
const card_content_1 = require("@/lib/card-content");
const lounge_1 = require("@/lib/lounge");
const LoungeInfo_1 = __importDefault(require("@/app/ui/LoungeInfo"));
function generateStaticParams() {
    return cards_1.cards.map((card) => ({ id: card.id }));
}
async function generateMetadata({ params }) {
    const { id } = await params;
    const card = (0, cards_1.getCardById)(id);
    return {
        title: card ? `${card.name} Review | Card AI India` : "Card Review"
    };
}
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
function formatRewardRate(card, reward) {
    if (reward.displayRate)
        return reward.displayRate;
    const rewardTypeLower = card.rewardType.toLowerCase();
    if (rewardTypeLower.includes("mile") || rewardTypeLower.includes("point")) {
        return `${reward.rate} ${card.rewardType} / Rs 100`;
    }
    return `${reward.rate}%`;
}
function redemptionRows(redemption) {
    if (!redemption)
        return [];
    return [
        ["Statement balance", redemption.statementBalanceValue],
        ["SmartBuy flight/hotel", redemption.smartBuyFlightHotelValue],
        ["Minimum points for statement credit", redemption.minimumPointsForStatementCredit],
        ["Monthly redemption cap", redemption.cashbackRedemptionCapMonthly],
        ["Points validity", redemption.pointsExpiryYears],
        ["Redemption fee", redemption.redemptionFee]
    ].filter((row) => typeof row[1] === "number");
}
function valueLabel(label, value) {
    if (label === "Points validity")
        return `${value} year${value === 1 ? "" : "s"}`;
    if (label === "Redemption fee")
        return formatCurrency(value);
    if (label.includes("Minimum") || label.includes("cap"))
        return value.toLocaleString("en-IN");
    if (label === "Accor")
        return `upto Rs ${value} per point *considering using accor redemption`;
    if (label === "Air miles" || label === "Statement balance" || label === "SmartBuy flight/hotel") {
        return `upto Rs ${value} per point`;
    }
    return `Rs ${value}`;
}
function formatTatDays(value) {
    if (typeof value !== "number")
        return "-";
    return `${value} day${value === 1 ? "" : "s"}`;
}
function DetailList({ items, className }) {
    if (!items || items.length === 0)
        return (0, jsx_runtime_1.jsx)("p", { className: "muted", children: "Not listed." });
    return ((0, jsx_runtime_1.jsx)("ul", { className: className ? `detail-list ${className}` : "detail-list", children: items.map((item) => ((0, jsx_runtime_1.jsx)("li", { children: item }, item))) }));
}
function formatUpdateDate(value) {
    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium"
    }).format(new Date(value));
}
function updateSummaryPoints(summary) {
    return summary
        .split(/(?<=\.)\s+/)
        .map((item) => item.trim())
        .filter(Boolean);
}
async function CardPage({ params }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    const { id } = await params;
    const card = (0, cards_1.getCardById)(id);
    if (!card)
        (0, navigation_1.notFound)();
    const cardContent = (0, card_content_1.getCardContent)(card.id);
    const redemptions = redemptionRows(card.redemption);
    const hasMilestoneBenefits = Boolean((_a = card.milestoneBenefits) === null || _a === void 0 ? void 0 : _a.length);
    const hasJoiningBenefits = Boolean((_b = card.joiningBenefits) === null || _b === void 0 ? void 0 : _b.length);
    const hasAdditionalBenefits = Boolean((_c = card.additionalBenefits) === null || _c === void 0 ? void 0 : _c.length);
    const hasExclusions = Boolean((_d = card.exclusions) === null || _d === void 0 ? void 0 : _d.length);
    const hasEligibility = Boolean(((_f = (_e = card.eligibility) === null || _e === void 0 ? void 0 : _e.salaried) === null || _f === void 0 ? void 0 : _f.length) || ((_h = (_g = card.eligibility) === null || _g === void 0 ? void 0 : _g.selfEmployed) === null || _h === void 0 ? void 0 : _h.length));
    const loungeConditions = (0, lounge_1.getLoungeConditions)(card);
    return ((0, jsx_runtime_1.jsxs)("section", { className: "section", children: [(0, jsx_runtime_1.jsxs)("div", { className: "page-title", children: [(0, jsx_runtime_1.jsx)("p", { children: card.issuer }), (0, jsx_runtime_1.jsx)("h1", { children: card.name }), (0, jsx_runtime_1.jsx)("div", { className: "page-title-meta", children: (0, jsx_runtime_1.jsxs)("span", { children: ["Last verified: ", card.lastVerified] }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "detail-layout", children: [(0, jsx_runtime_1.jsxs)("article", { className: "panel card detail-main", children: [(0, jsx_runtime_1.jsxs)("div", { className: "stats", children: [(0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsx)("strong", { children: formatCurrency(card.joiningFee) }), (0, jsx_runtime_1.jsx)("span", { children: "Joining fee" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsx)("strong", { children: formatCurrency(card.annualFee) }), (0, jsx_runtime_1.jsx)("span", { children: "Annual fee" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsx)("strong", { children: card.loungeDomestic === "unlimited" ? "Unlimited" : card.loungeDomestic }), (0, jsx_runtime_1.jsxs)("span", { className: "stat-label", children: ["Domestic lounge", (0, jsx_runtime_1.jsx)(LoungeInfo_1.default, { items: loungeConditions, label: "Domestic lounge conditions" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsx)("strong", { children: card.loungeInternational === "unlimited" ? "Unlimited" : card.loungeInternational }), (0, jsx_runtime_1.jsxs)("span", { className: "stat-label", children: ["International lounge", (0, jsx_runtime_1.jsx)(LoungeInfo_1.default, { items: loungeConditions, label: "International lounge conditions" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsxs)("strong", { children: [card.forexMarkup, "%"] }), (0, jsx_runtime_1.jsx)("span", { children: "Forex markup" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsx)("strong", { children: formatCurrency(card.feeWaiverSpend) }), (0, jsx_runtime_1.jsx)("span", { children: "Fee waiver spend" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsx)("strong", { children: card.network.join(", ") }), (0, jsx_runtime_1.jsx)("span", { children: "Network" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "meta", children: card.tags.map((tag) => ((0, jsx_runtime_1.jsx)("span", { className: "badge", children: tag }, tag))) }), (0, jsx_runtime_1.jsxs)("section", { className: "detail-section", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Rewards" }), (0, jsx_runtime_1.jsx)("div", { className: "table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "compare-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Category" }), (0, jsx_runtime_1.jsx)("th", { children: "Rate" }), (0, jsx_runtime_1.jsx)("th", { className: "cap-column", children: "Daily cap" }), (0, jsx_runtime_1.jsx)("th", { className: "cap-column", children: "Monthly cap" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: card.rewards.map((reward) => {
                                                        var _a;
                                                        return ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: (_a = reward.displayCategory) !== null && _a !== void 0 ? _a : reward.category }), (0, jsx_runtime_1.jsx)("td", { children: formatRewardRate(card, reward) }), (0, jsx_runtime_1.jsx)("td", { className: "cap-column", children: formatRewardCap(reward.capDaily, card.rewardType) }), (0, jsx_runtime_1.jsx)("td", { className: "cap-column", children: formatRewardCap(reward.capMonthly, card.rewardType) })] }, reward.category));
                                                    }) })] }) })] }), redemptions.length > 0 ? ((0, jsx_runtime_1.jsxs)("section", { className: "detail-section", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Redemption" }), (0, jsx_runtime_1.jsx)("div", { className: "info-grid", children: redemptions.map(([label, value]) => ((0, jsx_runtime_1.jsxs)("div", { className: "info-row", children: [(0, jsx_runtime_1.jsx)("span", { children: label }), (0, jsx_runtime_1.jsx)("strong", { children: valueLabel(label, value) })] }, label))) }), ((_k = (_j = card.redemption) === null || _j === void 0 ? void 0 : _j.airlinePartners) === null || _k === void 0 ? void 0 : _k.length) ? ((0, jsx_runtime_1.jsx)("div", { className: "table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "compare-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Airline" }), (0, jsx_runtime_1.jsx)("th", { children: "Programme" }), (0, jsx_runtime_1.jsx)("th", { children: "Ratio" }), (0, jsx_runtime_1.jsx)("th", { children: "TAT" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: card.redemption.airlinePartners.map((partner) => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: partner.airline }), (0, jsx_runtime_1.jsx)("td", { children: partner.programme }), (0, jsx_runtime_1.jsx)("td", { children: partner.ratio }), (0, jsx_runtime_1.jsx)("td", { children: formatTatDays(partner.tatDays) })] }, `${partner.airline}-${partner.programme}`))) })] }) })) : null, ((_m = (_l = card.redemption) === null || _l === void 0 ? void 0 : _l.hotelPartners) === null || _m === void 0 ? void 0 : _m.length) ? ((0, jsx_runtime_1.jsx)("div", { className: "table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "compare-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Hotel group" }), (0, jsx_runtime_1.jsx)("th", { children: "Programme" }), (0, jsx_runtime_1.jsx)("th", { children: "Ratio" }), (0, jsx_runtime_1.jsx)("th", { children: "TAT" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: card.redemption.hotelPartners.map((partner) => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: partner.hotelGroup }), (0, jsx_runtime_1.jsx)("td", { children: partner.programme }), (0, jsx_runtime_1.jsx)("td", { children: partner.ratio }), (0, jsx_runtime_1.jsx)("td", { children: formatTatDays(partner.tatDays) })] }, `${partner.hotelGroup}-${partner.programme}`))) })] }) })) : null] })) : null, hasJoiningBenefits ? ((0, jsx_runtime_1.jsxs)("section", { className: "detail-section", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Joining Benefits" }), (0, jsx_runtime_1.jsx)(DetailList, { items: card.joiningBenefits })] })) : null, hasMilestoneBenefits ? ((0, jsx_runtime_1.jsxs)("section", { className: "detail-section", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Milestone Benefits" }), (0, jsx_runtime_1.jsx)(DetailList, { items: card.milestoneBenefits })] })) : null, hasAdditionalBenefits ? ((0, jsx_runtime_1.jsxs)("section", { className: "detail-section", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Additional Benefits" }), (0, jsx_runtime_1.jsx)(DetailList, { items: card.additionalBenefits })] })) : null, hasExclusions ? ((0, jsx_runtime_1.jsxs)("section", { className: "detail-section", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Exclusions" }), (0, jsx_runtime_1.jsx)(DetailList, { className: "detail-list-columns", items: card.exclusions })] })) : null, (cardContent === null || cardContent === void 0 ? void 0 : cardContent.tips.length) ? ((0, jsx_runtime_1.jsxs)("section", { className: "detail-section", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Tips" }), (0, jsx_runtime_1.jsx)("div", { className: "content-list", children: cardContent.tips.map((tip, index) => ((0, jsx_runtime_1.jsxs)("article", { className: "content-item", children: [(0, jsx_runtime_1.jsx)("p", { className: "muted", children: tip.text }), tip.sourceUrl ? ((0, jsx_runtime_1.jsxs)("a", { className: "button secondary", href: tip.sourceUrl, rel: "nofollow", target: "_blank", children: ["Open source ", (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 15 })] })) : null] }, `${tip.sourceLabel}-${index}`))) })] })) : null, (cardContent === null || cardContent === void 0 ? void 0 : cardContent.updates.length) ? ((0, jsx_runtime_1.jsxs)("section", { className: "detail-section", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Latest Updates" }), (0, jsx_runtime_1.jsx)("div", { className: "content-list content-list-updates", children: cardContent.updates.map((update) => ((0, jsx_runtime_1.jsxs)("article", { className: "content-item content-item-update", children: [(0, jsx_runtime_1.jsx)("div", { className: "content-update-bullet", "aria-hidden": "true" }), (0, jsx_runtime_1.jsxs)("div", { className: "content-update-body", children: [(0, jsx_runtime_1.jsxs)("div", { className: "content-item-head", children: [(0, jsx_runtime_1.jsx)("strong", { children: update.title }), (0, jsx_runtime_1.jsx)("span", { className: "badge", children: formatUpdateDate(update.publishedAt) })] }), (0, jsx_runtime_1.jsx)("ul", { className: "detail-list content-update-points", children: updateSummaryPoints(update.summary).map((point) => ((0, jsx_runtime_1.jsx)("li", { children: point }, point))) })] }), update.sourceUrl ? ((0, jsx_runtime_1.jsxs)("a", { className: "button secondary", href: update.sourceUrl, rel: "nofollow", target: "_blank", children: ["Open update ", (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 15 })] })) : null] }, `${update.publishedAt}-${update.title}`))) })] })) : null, card.interestRateMonthly ? ((0, jsx_runtime_1.jsxs)("section", { className: "detail-section", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Interest" }), (0, jsx_runtime_1.jsxs)("p", { className: "muted", children: [card.interestRateMonthly, "% monthly interest rate listed in source data."] })] })) : null, hasEligibility ? ((0, jsx_runtime_1.jsxs)("section", { className: "detail-section", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Eligibility" }), (0, jsx_runtime_1.jsxs)("div", { className: "split-grid", children: [((_p = (_o = card.eligibility) === null || _o === void 0 ? void 0 : _o.salaried) === null || _p === void 0 ? void 0 : _p.length) ? ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: "Salaried" }), (0, jsx_runtime_1.jsx)(DetailList, { items: (_q = card.eligibility) === null || _q === void 0 ? void 0 : _q.salaried })] })) : null, ((_s = (_r = card.eligibility) === null || _r === void 0 ? void 0 : _r.selfEmployed) === null || _s === void 0 ? void 0 : _s.length) ? ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: "Self-employed" }), (0, jsx_runtime_1.jsx)(DetailList, { items: (_t = card.eligibility) === null || _t === void 0 ? void 0 : _t.selfEmployed })] })) : null] })] })) : null, (0, jsx_runtime_1.jsx)("div", { className: "actions", children: (0, jsx_runtime_1.jsxs)("a", { className: "button", href: card.applyUrl, rel: "nofollow sponsored", target: "_blank", children: ["Apply ", (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 15 })] }) })] }), (0, jsx_runtime_1.jsxs)("aside", { className: "detail-aside", children: [(0, jsx_runtime_1.jsx)("div", { className: "ad-slot", children: "Ad slot: card detail page" }), (0, jsx_runtime_1.jsxs)("div", { className: "panel card", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Card facts" }), (0, jsx_runtime_1.jsxs)("div", { className: "info-grid", children: [(0, jsx_runtime_1.jsxs)("div", { className: "info-row", children: [(0, jsx_runtime_1.jsx)("span", { children: "Issuer" }), (0, jsx_runtime_1.jsx)("strong", { children: card.issuer })] }), (0, jsx_runtime_1.jsxs)("div", { className: "info-row", children: [(0, jsx_runtime_1.jsx)("span", { children: "Reward type" }), (0, jsx_runtime_1.jsx)("strong", { children: card.rewardType })] }), (0, jsx_runtime_1.jsxs)("div", { className: "info-row", children: [(0, jsx_runtime_1.jsx)("span", { children: "Last verified" }), (0, jsx_runtime_1.jsx)("strong", { children: card.lastVerified })] })] })] })] })] })] }));
}
