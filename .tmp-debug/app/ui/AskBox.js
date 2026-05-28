"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AskBox;
const jsx_runtime_1 = require("react/jsx-runtime");
function AskBox({ defaultQuery = "Best card for online shopping and lounge access under Rs 5000 fee", defaultMaxAnnualFee, showHelperText = true }) {
    return ((0, jsx_runtime_1.jsxs)("form", { action: "/ask", className: "panel ask-panel", method: "GET", children: [(0, jsx_runtime_1.jsxs)("div", { className: "field", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "query", children: "Ask about Indian credit cards" }), (0, jsx_runtime_1.jsx)("textarea", { defaultValue: defaultQuery, id: "query", name: "query" })] }), defaultMaxAnnualFee !== undefined ? (0, jsx_runtime_1.jsx)("input", { name: "maxAnnualFee", type: "hidden", value: defaultMaxAnnualFee }) : null, (0, jsx_runtime_1.jsx)("button", { className: "button", type: "submit", children: "Ask" }), showHelperText ? ((0, jsx_runtime_1.jsx)("p", { className: "muted", style: { margin: 0 }, children: "We answer from the verified card dataset and log anything that needs a future database update." })) : null] }));
}
