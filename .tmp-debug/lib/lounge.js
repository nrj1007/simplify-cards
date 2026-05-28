"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoungeConditions = getLoungeConditions;
const loungeKeywords = ["lounge", "priority pass", "dragonpass", "dreamfolks"];
const conditionKeywords = ["subject to", "spend", "quarter", "month", "preceding", "programme terms", "fum", "unlock"];
function matchesLoungeText(value) {
    const normalized = value.toLowerCase();
    return loungeKeywords.some((keyword) => normalized.includes(keyword));
}
function conditionWeight(value) {
    const normalized = value.toLowerCase();
    return conditionKeywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0);
}
function getLoungeConditions(card) {
    var _a, _b, _c;
    const items = [...((_a = card.additionalBenefits) !== null && _a !== void 0 ? _a : []), ...((_b = card.additionalDetails) !== null && _b !== void 0 ? _b : []), ...((_c = card.milestoneBenefits) !== null && _c !== void 0 ? _c : [])]
        .filter(matchesLoungeText)
        .map((text) => ({ text, weight: conditionWeight(text) }))
        .sort((a, b) => b.weight - a.weight || a.text.localeCompare(b.text));
    const seen = new Set();
    const deduped = [];
    for (const item of items) {
        if (seen.has(item.text))
            continue;
        seen.add(item.text);
        deduped.push(item.text);
    }
    return deduped;
}
