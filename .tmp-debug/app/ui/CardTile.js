"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CardTile;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
function CardTile({ card, score }) {
    const resolvedCard = card !== null && card !== void 0 ? card : score === null || score === void 0 ? void 0 : score.card;
    if (!resolvedCard)
        return null;
    const loungeVisits = resolvedCard.loungeDomestic === "unlimited" || resolvedCard.loungeInternational === "unlimited"
        ? "Unlimited"
        : String(resolvedCard.loungeDomestic + resolvedCard.loungeInternational);
    return ((0, jsx_runtime_1.jsxs)("article", { className: "panel card", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "meta", children: (0, jsx_runtime_1.jsx)("span", { children: resolvedCard.issuer }) }), (0, jsx_runtime_1.jsx)("h3", { children: resolvedCard.name })] }), (0, jsx_runtime_1.jsx)("div", { className: "meta", children: resolvedCard.tags.slice(0, 4).map((tag) => ((0, jsx_runtime_1.jsx)("span", { className: "badge", children: tag }, tag))) }), (0, jsx_runtime_1.jsxs)("div", { className: "stats", children: [(0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsxs)("strong", { children: ["Rs ", resolvedCard.annualFee] }), (0, jsx_runtime_1.jsx)("span", { children: "Annual fee" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsx)("strong", { children: loungeVisits }), (0, jsx_runtime_1.jsx)("span", { children: "Lounge visits" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "actions", children: [(0, jsx_runtime_1.jsx)(link_1.default, { className: "button secondary", href: `/cards/${resolvedCard.id}`, children: "Details" }), (0, jsx_runtime_1.jsxs)("a", { className: "button", href: resolvedCard.applyUrl, rel: "nofollow sponsored", target: "_blank", children: ["Apply ", (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 15 })] })] })] }));
}
