"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
require("./globals.css");
exports.metadata = {
    title: "Card AI India",
    description: "A lean Indian credit-card finder and AI assistant MVP."
};
function RootLayout({ children }) {
    return ((0, jsx_runtime_1.jsx)("html", { lang: "en", children: (0, jsx_runtime_1.jsx)("body", { children: (0, jsx_runtime_1.jsxs)("div", { className: "shell", children: [(0, jsx_runtime_1.jsxs)("header", { className: "topbar", children: [(0, jsx_runtime_1.jsxs)(link_1.default, { className: "brand", href: "/", children: [(0, jsx_runtime_1.jsx)("span", { className: "brand-mark", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)(lucide_react_1.CreditCard, { size: 20 }) }), (0, jsx_runtime_1.jsx)("span", { children: "Card AI India" })] }), (0, jsx_runtime_1.jsxs)("nav", { className: "nav", "aria-label": "Primary navigation", children: [(0, jsx_runtime_1.jsx)(link_1.default, { href: "/finder", children: "Finder" }), (0, jsx_runtime_1.jsx)(link_1.default, { href: "/compare", children: "Compare" }), (0, jsx_runtime_1.jsx)("a", { href: "/review/questions", children: "Review" }), (0, jsx_runtime_1.jsx)("a", { href: "/review/inbox", children: "Inbox" }), (0, jsx_runtime_1.jsx)("a", { href: "/review/community", children: "Signals" }), (0, jsx_runtime_1.jsx)(link_1.default, { href: "/cards/sbi-cashback", children: "Sample Card" })] })] }), (0, jsx_runtime_1.jsx)("main", { className: "main", children: children })] }) }) }));
}
