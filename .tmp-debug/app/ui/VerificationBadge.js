"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVerificationMeta = getVerificationMeta;
exports.default = VerificationBadge;
const jsx_runtime_1 = require("react/jsx-runtime");
const lucide_react_1 = require("lucide-react");
const verificationMap = {
    "official-direct": {
        label: "Official direct",
        tone: "good",
        description: "Data was checked against the issuer's direct product page or document.",
        Icon: lucide_react_1.CheckCircle2
    },
    "official-indexed": {
        label: "Official source",
        tone: "mixed",
        description: "Data was checked against official indexed issuer content where direct scraping was limited.",
        Icon: lucide_react_1.SearchCheck
    },
    "official-catalogue": {
        label: "Official catalogue",
        tone: "mixed",
        description: "Data was checked against an official issuer catalogue or listing page.",
        Icon: lucide_react_1.ClipboardCheck
    },
    "official-mixed": {
        label: "Official source",
        tone: "mixed",
        description: "Data was checked with official issuer sources plus supporting public references.",
        Icon: lucide_react_1.ClipboardCheck
    },
    "needs-review": {
        label: "Needs review",
        tone: "warn",
        description: "This entry needs fresh official verification before high-confidence use.",
        Icon: lucide_react_1.AlertTriangle
    }
};
function getVerificationMeta(status) {
    return verificationMap[status];
}
function VerificationBadge({ status, lastVerified, variant = "compact" }) {
    const meta = verificationMap[status];
    const Icon = meta.Icon;
    if (variant === "full") {
        return ((0, jsx_runtime_1.jsxs)("div", { className: `trust-panel trust-panel-${meta.tone}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "trust-heading", children: [(0, jsx_runtime_1.jsx)(Icon, { size: 17 }), (0, jsx_runtime_1.jsx)("strong", { children: meta.label })] }), (0, jsx_runtime_1.jsx)("p", { children: meta.description }), lastVerified ? (0, jsx_runtime_1.jsxs)("span", { children: ["Last verified: ", lastVerified] }) : null] }));
    }
    return ((0, jsx_runtime_1.jsxs)("span", { className: `trust-badge trust-badge-${meta.tone}`, title: meta.description, children: [(0, jsx_runtime_1.jsx)(Icon, { size: 14 }), meta.label] }));
}
