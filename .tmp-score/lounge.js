"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoungeConditions = getLoungeConditions;
exports.getMeaningfulLoungeConditions = getMeaningfulLoungeConditions;
exports.getTotalLoungeAccess = getTotalLoungeAccess;
const loungeKeywords = ["lounge", "priority pass", "dragonpass", "dreamfolks"];
const conditionKeywords = ["subject to", "spend", "quarter", "month", "preceding", "programme terms", "fum", "unlock"];
const dedupeStopwords = new Set([
    "a",
    "an",
    "and",
    "choose",
    "complimentary",
    "either",
    "for",
    "in",
    "instead",
    "of",
    "on",
    "or",
    "the",
    "to"
]);
function matchesLoungeText(value) {
    const normalized = value.toLowerCase();
    return loungeKeywords.some((keyword) => normalized.includes(keyword));
}
function conditionWeight(value) {
    const normalized = value.toLowerCase();
    return conditionKeywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0);
}
function dedupeKey(value) {
    return value
        .toLowerCase()
        .replace(/rs\b/g, "rupees")
        .replace(/access\b/g, "")
        .match(/[a-z0-9]+/g)
        ?.filter((token) => !dedupeStopwords.has(token))
        .sort()
        .join(" ") ?? value.toLowerCase();
}
function getLoungeConditions(card, type) {
    const items = [
        ...(card.additionalBenefits ?? []),
        ...(card.additionalDetails ?? []),
        ...(card.milestoneBenefits ?? []),
        ...(card.internalNotes ?? [])
    ]
        .filter(matchesLoungeText)
        .map((text, index) => ({ text, index, weight: conditionWeight(text) }))
        .sort((a, b) => b.weight - a.weight || a.index - b.index);
    const seen = new Set();
    const deduped = [];
    for (const item of items) {
        const key = dedupeKey(item.text);
        if (seen.has(key))
            continue;
        seen.add(key);
        const lower = item.text.toLowerCase();
        if (lower.startsWith("audited against") ||
            lower.includes("verified by user") ||
            lower.includes("source-review")) {
            continue;
        }
        if (lower.includes("integrated into") &&
            items.some((candidate) => candidate.text !== item.text && candidate.text.toLowerCase().includes("lounge voucher"))) {
            continue;
        }
        if (type === "domestic") {
            if ((lower.includes("international") || lower.includes("priority pass") || lower.includes("loungekey") || lower.includes("dragonpass") || lower.includes("outside india")) &&
                !(lower.includes("domestic") || lower.includes("in india") || lower.includes("within india"))) {
                continue;
            }
        }
        else if (type === "international") {
            if ((lower.includes("domestic") || lower.includes("in india") || lower.includes("within india")) &&
                !(lower.includes("international") || lower.includes("priority pass") || lower.includes("loungekey") || lower.includes("dragonpass") || lower.includes("outside india"))) {
                continue;
            }
        }
        deduped.push(item.text);
    }
    return deduped;
}
function getMeaningfulLoungeConditions(card, type) {
    return getLoungeConditions(card, type).filter((text) => {
        const lower = text.toLowerCase();
        if (type === "domestic") {
            if (lower.includes("priority pass") || lower.includes("complimentary international lounge") || lower.includes("outside india")) {
                return false;
            }
        }
        return true;
    });
}
function getTotalLoungeAccess(card) {
    if (card.combinedLoungeAccess !== undefined)
        return card.combinedLoungeAccess;
    if (card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited")
        return "unlimited";
    return card.loungeDomestic + card.loungeInternational;
}
