"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const recommend_1 = require("@/lib/recommend");
const CardTile_1 = __importDefault(require("./ui/CardTile"));
const AskBox_1 = __importDefault(require("./ui/AskBox"));
function Home() {
    const topCards = (0, recommend_1.scoreCards)({ query: "best cashback online lounge", maxAnnualFee: 5000 }).slice(0, 3);
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("section", { className: "hero", children: [(0, jsx_runtime_1.jsxs)("div", { className: "hero-copy", children: [(0, jsx_runtime_1.jsx)("h1", { children: "Find the right Indian credit card without decoding every fee table." }), (0, jsx_runtime_1.jsx)("p", { children: "Ask in plain English, compare cards by actual use case, and keep recommendations grounded in verified card data. Built lean with in-memory data for the MVP." }), (0, jsx_runtime_1.jsxs)("div", { className: "chips", style: { marginTop: 20 }, children: [(0, jsx_runtime_1.jsxs)("span", { className: "chip", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { size: 15 }), " Cashback"] }), (0, jsx_runtime_1.jsxs)("span", { className: "chip", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Sparkles, { size: 15 }), " Lounge"] }), (0, jsx_runtime_1.jsxs)("span", { className: "chip", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.BadgeIndianRupee, { size: 15 }), " Lifetime free"] })] })] }), (0, jsx_runtime_1.jsx)(AskBox_1.default, {})] }), (0, jsx_runtime_1.jsx)("section", { className: "section", children: (0, jsx_runtime_1.jsx)("div", { className: "ad-slot", children: "Ad slot: top informational banner" }) }), (0, jsx_runtime_1.jsxs)("section", { className: "section", children: [(0, jsx_runtime_1.jsxs)("div", { className: "section-head", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: "Recommended Starting Points" }), (0, jsx_runtime_1.jsx)("p", { children: "Sample rankings from the deterministic card engine." })] }), (0, jsx_runtime_1.jsxs)(link_1.default, { className: "button secondary", href: "/finder", children: ["Open finder ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 16 })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "grid cards", children: topCards.map((score) => ((0, jsx_runtime_1.jsx)(CardTile_1.default, { score: score }, score.card.id))) })] })] }));
}
