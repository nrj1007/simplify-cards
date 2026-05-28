"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FinderPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const cards_1 = require("@/lib/cards");
const CardTile_1 = __importDefault(require("../ui/CardTile"));
async function FinderPage({ searchParams }) {
    var _a, _b, _c;
    const params = await searchParams;
    const feeLimit = params.fee ? Number(params.fee) : undefined;
    const filteredCards = cards_1.cards.filter((card) => {
        const issuerOk = params.issuer ? card.issuer === params.issuer : true;
        const tagOk = params.tag ? card.tags.includes(params.tag) : true;
        const feeOk = feeLimit === undefined || Number.isNaN(feeLimit) ? true : card.annualFee <= feeLimit;
        return issuerOk && tagOk && feeOk;
    });
    return ((0, jsx_runtime_1.jsxs)("section", { className: "section", children: [(0, jsx_runtime_1.jsxs)("div", { className: "page-title", children: [(0, jsx_runtime_1.jsx)("h1", { children: "Credit Card Finder" }), (0, jsx_runtime_1.jsx)("p", { children: "Filter the in-memory card dataset by issuer, annual fee, and use case." })] }), (0, jsx_runtime_1.jsxs)("form", { className: "panel card", style: { margin: "18px 0" }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "filters", children: [(0, jsx_runtime_1.jsxs)("div", { className: "field", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "issuer", children: "Issuer" }), (0, jsx_runtime_1.jsxs)("select", { id: "issuer", name: "issuer", defaultValue: (_a = params.issuer) !== null && _a !== void 0 ? _a : "", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All issuers" }), (0, cards_1.getIssuers)().map((issuer) => ((0, jsx_runtime_1.jsx)("option", { value: issuer, children: issuer }, issuer)))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "field", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "tag", children: "Use case" }), (0, jsx_runtime_1.jsxs)("select", { id: "tag", name: "tag", defaultValue: (_b = params.tag) !== null && _b !== void 0 ? _b : "", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All use cases" }), (0, cards_1.getTags)().map((tag) => ((0, jsx_runtime_1.jsx)("option", { value: tag, children: tag }, tag)))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "field", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "fee", children: "Max annual fee" }), (0, jsx_runtime_1.jsxs)("select", { id: "fee", name: "fee", defaultValue: (_c = params.fee) !== null && _c !== void 0 ? _c : "", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Any fee" }), (0, jsx_runtime_1.jsx)("option", { value: "0", children: "Rs 0" }), (0, jsx_runtime_1.jsx)("option", { value: "1000", children: "Rs 1,000" }), (0, jsx_runtime_1.jsx)("option", { value: "5000", children: "Rs 5,000" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "button", children: "Apply filters" }), (0, jsx_runtime_1.jsx)("a", { className: "button secondary", href: "/finder", children: "Reset" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "ad-slot", style: { marginBottom: 16 }, children: "Ad slot: finder page mid banner" }), (0, jsx_runtime_1.jsx)("div", { className: "grid cards", children: filteredCards.map((card) => ((0, jsx_runtime_1.jsx)(CardTile_1.default, { card: card }, card.id))) })] }));
}
