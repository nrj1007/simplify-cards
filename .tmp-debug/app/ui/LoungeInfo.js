"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoungeInfo;
const jsx_runtime_1 = require("react/jsx-runtime");
const lucide_react_1 = require("lucide-react");
function LoungeInfo({ items, label = "Lounge access conditions" }) {
    if (!items.length)
        return null;
    return ((0, jsx_runtime_1.jsxs)("details", { className: "info-popover", children: [(0, jsx_runtime_1.jsx)("summary", { "aria-label": label, className: "info-popover-trigger", title: label, children: (0, jsx_runtime_1.jsx)(lucide_react_1.CircleHelp, { size: 14 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "info-popover-panel", children: [(0, jsx_runtime_1.jsx)("strong", { children: label }), (0, jsx_runtime_1.jsx)("ul", { className: "info-popover-list", children: items.map((item) => ((0, jsx_runtime_1.jsx)("li", { children: item }, item))) })] })] }));
}
