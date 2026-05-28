"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReviewQuestionsPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const question_logs_1 = require("@/lib/question-logs");
function formatLoggedAt(value) {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
}
function summarizeConstraints(entry) {
    const parts = [];
    if (entry.input.maxAnnualFee !== undefined)
        parts.push(`Fee <= Rs ${entry.input.maxAnnualFee.toLocaleString("en-IN")}`);
    if (entry.input.wantsLounge)
        parts.push("Needs lounge");
    if (entry.input.wantsLifetimeFree)
        parts.push("Needs LTF");
    return parts.length > 0 ? parts.join(" • ") : "No extra constraints";
}
async function ReviewQuestionsPage() {
    const entries = await (0, question_logs_1.readUnsupportedQuestionLog)();
    return ((0, jsx_runtime_1.jsxs)("section", { className: "section", children: [(0, jsx_runtime_1.jsxs)("div", { className: "page-title", children: [(0, jsx_runtime_1.jsx)("h1", { children: "Unsupported Questions" }), (0, jsx_runtime_1.jsx)("p", { children: "Review questions that Ask AI logged instead of answering from live web search." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "panel review-summary", style: { margin: "18px 0" }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsx)("strong", { children: entries.length }), (0, jsx_runtime_1.jsx)("span", { children: "Total logged questions" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat", children: [(0, jsx_runtime_1.jsx)("strong", { children: entries[0] ? formatLoggedAt(entries[0].loggedAt) : "None yet" }), (0, jsx_runtime_1.jsx)("span", { children: "Latest logged item" })] })] }), entries.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "notice", children: "No unsupported questions have been logged yet." })) : ((0, jsx_runtime_1.jsx)("div", { className: "review-list", children: entries.map((entry, index) => ((0, jsx_runtime_1.jsxs)("article", { className: "panel review-item", children: [(0, jsx_runtime_1.jsxs)("div", { className: "review-item-head", children: [(0, jsx_runtime_1.jsx)("strong", { children: entry.query || "Untitled question" }), (0, jsx_runtime_1.jsx)("span", { className: "badge", children: formatLoggedAt(entry.loggedAt) })] }), (0, jsx_runtime_1.jsx)("p", { className: "muted", children: entry.reason }), (0, jsx_runtime_1.jsx)("div", { className: "meta", children: (0, jsx_runtime_1.jsxs)("span", { children: ["Constraints: ", summarizeConstraints(entry)] }) }), (0, jsx_runtime_1.jsx)("div", { className: "review-actions", children: (0, jsx_runtime_1.jsx)("span", { className: "badge", children: "Next step: update card dataset manually" }) })] }, `${entry.loggedAt}-${index}`))) }))] }));
}
