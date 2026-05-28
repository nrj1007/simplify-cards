"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPendingTechnofinoFiles = readPendingTechnofinoFiles;
exports.buildCommunitySignalDraft = buildCommunitySignalDraft;
exports.buildCommunitySignalDrafts = buildCommunitySignalDrafts;
exports.buildCardContentAdditions = buildCardContentAdditions;
exports.mergeCardContent = mergeCardContent;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const cards_1 = require("./cards");
const pendingSignalsDir = node_path_1.default.join(process.cwd(), "data", "community-signals", "pending");
function normalize(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function compactWhitespace(value) {
    return value.replace(/\s+/g, " ").trim();
}
function summarizeText(value, maxLength = 220) {
    const text = compactWhitespace(value);
    if (text.length <= maxLength)
        return text;
    return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}
function dateOnly(value) {
    return value.slice(0, 10);
}
function defaultContentType(signalType) {
    return signalType === "discussion" || signalType === "merchant-reward-behavior" ? "tip" : "update";
}
function cardAliases(card) {
    const fullName = normalize(card.name);
    const noCreditCard = normalize(card.name.replace(/\bcredit card\b/gi, ""));
    const noIssuer = normalize(card.name.replace(new RegExp(card.issuer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "").replace(/\bcredit card\b/gi, ""));
    return [fullName, noCreditCard, noIssuer, normalize(card.id.replace(/-/g, " "))]
        .filter((alias) => alias.length >= 4)
        .filter((alias, index, all) => all.indexOf(alias) === index);
}
function scoreCardMatch(text, card) {
    let score = 0;
    const haystack = normalize(text);
    const issuer = normalize(card.issuer);
    for (const alias of cardAliases(card)) {
        if (haystack.includes(alias))
            score = Math.max(score, alias === normalize(card.name) ? 14 : 10);
    }
    if (issuer && haystack.includes(issuer))
        score += 2;
    const keywords = normalize(card.name)
        .split(" ")
        .filter((token) => token.length >= 4)
        .filter((token) => !["credit", "card", "bank"].includes(token));
    const keywordMatches = keywords.filter((token) => haystack.includes(token)).length;
    if (keywordMatches >= 2)
        score += keywordMatches;
    return score;
}
function findMatchedCards(signal) {
    const text = `${signal.title} ${signal.candidateText}`;
    return cards_1.cards
        .map((card) => ({
        cardId: card.id,
        cardName: card.name,
        issuer: card.issuer,
        score: scoreCardMatch(text, card)
    }))
        .filter((match) => match.score >= 6)
        .sort((left, right) => right.score - left.score || left.cardName.localeCompare(right.cardName))
        .slice(0, 3);
}
function approvedCardNames(cardIds) {
    return cardIds.map((cardId) => { var _a, _b; return (_b = (_a = (0, cards_1.getCardById)(cardId)) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : cardId; });
}
async function readPendingTechnofinoFiles(dir = pendingSignalsDir) {
    try {
        const names = (await promises_1.default.readdir(dir))
            .filter((name) => name.endsWith(".json"))
            .sort((left, right) => right.localeCompare(left));
        const files = await Promise.all(names.map(async (fileName) => {
            var _a;
            const fullPath = node_path_1.default.join(dir, fileName);
            const content = await promises_1.default.readFile(fullPath, "utf8");
            const parsed = JSON.parse(content);
            return {
                fileName,
                generatedAt: parsed.generatedAt,
                source: parsed.source,
                reviewQueue: (_a = parsed.reviewQueue) !== null && _a !== void 0 ? _a : []
            };
        }));
        return files.sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));
    }
    catch (error) {
        if (error.code === "ENOENT")
            return [];
        throw error;
    }
}
function buildCommunitySignalDraft(file, signal) {
    var _a, _b, _c, _d, _e;
    const suggestedContentType = (_a = signal.contentType) !== null && _a !== void 0 ? _a : defaultContentType(signal.signalType);
    const explicitCardIds = (_b = signal.cardIds) !== null && _b !== void 0 ? _b : [];
    const missingFields = [];
    if (signal.approvedForCardContent && explicitCardIds.length === 0) {
        missingFields.push("cardIds");
    }
    if (signal.approvedForCardContent && suggestedContentType === "update" && !signal.publishedAt && !file.generatedAt) {
        missingFields.push("publishedAt");
    }
    return {
        fileName: file.fileName,
        generatedAt: file.generatedAt,
        signal,
        suggestedContentType,
        matchedCards: findMatchedCards(signal),
        approvedCardNames: approvedCardNames(explicitCardIds),
        readyToIngest: Boolean(signal.approvedForCardContent) && missingFields.length === 0,
        missingFields,
        suggestedPublishedAt: (_c = signal.publishedAt) !== null && _c !== void 0 ? _c : dateOnly(file.generatedAt),
        suggestedSummary: (_d = signal.summary) !== null && _d !== void 0 ? _d : summarizeText(signal.candidateText || signal.title),
        suggestedTipText: (_e = signal.tipText) !== null && _e !== void 0 ? _e : summarizeText(signal.candidateText || signal.title)
    };
}
function buildCommunitySignalDrafts(files) {
    return files.flatMap((file) => file.reviewQueue.map((signal) => buildCommunitySignalDraft(file, signal)));
}
function buildUpdateEntry(draft) {
    return {
        title: draft.signal.title,
        summary: draft.suggestedSummary,
        sourceType: "technofino",
        sourceLabel: "TechnoFino",
        sourceUrl: draft.signal.url,
        publishedAt: draft.suggestedPublishedAt
    };
}
function buildTipEntry(draft) {
    return {
        text: draft.suggestedTipText,
        sourceType: "technofino",
        sourceLabel: "TechnoFino",
        sourceUrl: draft.signal.url
    };
}
function buildCardContentAdditions(drafts) {
    var _a, _b, _c, _d;
    var _e, _f;
    const additions = {};
    for (const draft of drafts) {
        if (!draft.readyToIngest)
            continue;
        for (const cardId of (_a = draft.signal.cardIds) !== null && _a !== void 0 ? _a : []) {
            (_b = additions[cardId]) !== null && _b !== void 0 ? _b : (additions[cardId] = {});
            if (draft.suggestedContentType === "update") {
                (_c = (_e = additions[cardId]).updates) !== null && _c !== void 0 ? _c : (_e.updates = []);
                additions[cardId].updates.push(buildUpdateEntry(draft));
            }
            else {
                (_d = (_f = additions[cardId]).tips) !== null && _d !== void 0 ? _d : (_f.tips = []);
                additions[cardId].tips.push(buildTipEntry(draft));
            }
        }
    }
    return additions;
}
function dedupeUpdates(updates) {
    const seen = new Set();
    return updates.filter((update) => {
        var _a;
        const key = `${update.title}|${update.publishedAt}|${(_a = update.sourceUrl) !== null && _a !== void 0 ? _a : ""}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function dedupeTips(tips) {
    const seen = new Set();
    return tips.filter((tip) => {
        var _a;
        const key = `${tip.text}|${(_a = tip.sourceUrl) !== null && _a !== void 0 ? _a : ""}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function mergeCardContent(base, additions) {
    var _a, _b, _c, _d, _e;
    const merged = Object.assign({}, base);
    for (const [cardId, addition] of Object.entries(additions)) {
        const current = (_a = merged[cardId]) !== null && _a !== void 0 ? _a : {};
        const entry = {};
        if (current.updates || addition.updates) {
            entry.updates = dedupeUpdates([...((_b = current.updates) !== null && _b !== void 0 ? _b : []), ...((_c = addition.updates) !== null && _c !== void 0 ? _c : [])]);
        }
        if (current.tips || addition.tips) {
            entry.tips = dedupeTips([...((_d = current.tips) !== null && _d !== void 0 ? _d : []), ...((_e = addition.tips) !== null && _e !== void 0 ? _e : [])]);
        }
        merged[cardId] = entry;
    }
    return merged;
}
