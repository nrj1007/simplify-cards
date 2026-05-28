"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCardContent = getCardContent;
exports.hasCardContent = hasCardContent;
const card_content_json_1 = __importDefault(require("@/data/card-content.json"));
const cardContent = card_content_json_1.default;
function sortUpdatesNewestFirst(updates) {
    return [...updates].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}
function getCardContent(cardId, source = cardContent) {
    var _a, _b;
    const entry = source[cardId];
    if (!entry)
        return null;
    return {
        updates: sortUpdatesNewestFirst((_a = entry.updates) !== null && _a !== void 0 ? _a : []).slice(0, 3),
        tips: [...((_b = entry.tips) !== null && _b !== void 0 ? _b : [])]
    };
}
function hasCardContent(cardId, source = cardContent) {
    const entry = getCardContent(cardId, source);
    return Boolean(entry && (entry.updates.length > 0 || entry.tips.length > 0));
}
