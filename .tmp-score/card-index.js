"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardIndexes = exports.cards = void 0;
exports.getCardById = getCardById;
exports.getCardsByIssuer = getCardsByIssuer;
exports.getCardsByTag = getCardsByTag;
exports.getCardsByNetwork = getCardsByNetwork;
exports.getCardsByRewardCategory = getCardsByRewardCategory;
exports.getCardsByPopularityBand = getCardsByPopularityBand;
exports.getCardsByUseCase = getCardsByUseCase;
exports.getCardsByRedemptionBucket = getCardsByRedemptionBucket;
exports.getCardsByCardSegment = getCardsByCardSegment;
exports.getPopularCards = getPopularCards;
exports.getIssuers = getIssuers;
exports.getTags = getTags;
exports.getNetworks = getNetworks;
exports.getRewardCategories = getRewardCategories;
exports.getUseCases = getUseCases;
exports.getRedemptionBuckets = getRedemptionBuckets;
exports.getCardSegments = getCardSegments;
exports.stripScoringAnnotations = stripScoringAnnotations;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function sortCards(left, right) {
    return right.popularityScore - left.popularityScore || left.name.localeCompare(right.name);
}
function groupCardsBy(values, card, index) {
    for (const value of values) {
        const existing = index.get(value) ?? [];
        existing.push(card);
        index.set(value, existing);
    }
}
function freezeGroupedCards(index) {
    return Object.freeze(Object.fromEntries([...index.entries()]
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, groupedCards]) => [key, Object.freeze([...groupedCards].sort(sortCards))])));
}
function popularityBandForCard(card) {
    if (card.popularityScore >= 90)
        return "90-plus";
    if (card.popularityScore >= 80)
        return "80-89";
    if (card.popularityScore >= 70)
        return "70-79";
    return "below-70";
}
function searchableTextForCard(card) {
    return [
        card.name,
        card.rewardType,
        ...card.bestFor,
        ...card.tags,
        ...card.exclusions,
        ...(card.exclusionCodes ?? []),
        ...(card.specialSpendRules?.map((rule) => [rule.category, rule.treatment, rule.notes].filter(Boolean).join(" ")) ?? []),
        ...(card.milestoneBenefits ?? []),
        ...(card.additionalBenefits ?? []),
        ...(card.additionalDetails ?? []),
        ...(card.internalNotes ?? [])
    ]
        .join(" ")
        .toLowerCase();
}
function useCaseBucketsForCard(card, searchableText) {
    const buckets = new Set();
    if (card.rewardType.toLowerCase().includes("cashback") ||
        card.tags.includes("cashback") ||
        card.bestFor.includes("cashback") ||
        searchableText.includes("cashback")) {
        buckets.add("cashback");
    }
    if (card.tags.includes("travel") ||
        card.bestFor.includes("travel") ||
        card.rewards.some((reward) => reward.category.includes("travel")) ||
        searchableText.includes("travel") ||
        searchableText.includes("air miles") ||
        searchableText.includes("airport lounge")) {
        buckets.add("travel");
    }
    return [...buckets];
}
function redemptionBucketsForCard(searchableText) {
    const buckets = new Set();
    if (searchableText.includes("accor"))
        buckets.add("accor");
    if (searchableText.includes("air india"))
        buckets.add("air-india");
    return [...buckets];
}
function cardSegmentsForCard(card, searchableText) {
    const segments = new Set();
    if (card.annualFee === 0 || card.tags.includes("lifetime free") || searchableText.includes("lifetime free")) {
        segments.add("ltf");
    }
    if (card.tags.includes("beginner") ||
        card.bestFor.includes("beginner") ||
        card.tags.includes("entry level") ||
        searchableText.includes("entry level") ||
        searchableText.includes("fixed deposit backed") ||
        searchableText.includes("credit building")) {
        segments.add("beginner");
    }
    if (card.tags.includes("ultra premium") ||
        card.bestFor.includes("luxury") ||
        searchableText.includes("ultra premium") ||
        searchableText.includes("super premium") ||
        card.annualFee >= 10000) {
        segments.add("super-premium");
    }
    else if (card.tags.includes("premium") ||
        card.bestFor.includes("premium") ||
        searchableText.includes("premium") ||
        card.annualFee >= 2000) {
        segments.add("premium");
    }
    return [...segments];
}
// Cards live as one JSON file per card under data/cards/<issuer>/<card-id>.json.
// Read them all at module load (server-side only) so adding a card is just dropping a
// file — no import list to maintain. The final order is determined by sortCards, so the
// directory traversal order does not matter.
function loadAllCards() {
    const cardsDir = node_path_1.default.join(process.cwd(), "data", "cards");
    const loaded = [];
    for (const issuerEntry of node_fs_1.default.readdirSync(cardsDir, { withFileTypes: true })) {
        if (!issuerEntry.isDirectory())
            continue;
        const issuerDir = node_path_1.default.join(cardsDir, issuerEntry.name);
        for (const fileName of node_fs_1.default.readdirSync(issuerDir)) {
            if (!fileName.endsWith(".json"))
                continue;
            const raw = node_fs_1.default.readFileSync(node_path_1.default.join(issuerDir, fileName), "utf8");
            const card = JSON.parse(raw);
            if (card.redemption) {
                if (card.redemption.accorValue === undefined && Array.isArray(card.redemption.transferPartnerValuations)) {
                    const accorVal = card.redemption.transferPartnerValuations.find((p) => p.partner && p.partner.toLowerCase().includes("accor"));
                    if (accorVal) {
                        card.redemption.accorValue = accorVal.partnerPointValue * accorVal.transferRatio;
                    }
                }
            }
            loaded.push(card);
        }
    }
    return loaded;
}
const mergedCards = loadAllCards().sort(sortCards);
exports.cards = Object.freeze(mergedCards);
const cardsByIdMap = new Map(exports.cards.map((card) => [card.id, card]));
const cardsByIssuerMap = new Map();
const cardsByTagMap = new Map();
const cardsByNetworkMap = new Map();
const cardsByRewardCategoryMap = new Map();
const cardsByPopularityBandMap = new Map();
const cardsByUseCaseMap = new Map();
const cardsByRedemptionBucketMap = new Map();
const cardsByCardSegmentMap = new Map();
for (const card of exports.cards) {
    const searchableText = searchableTextForCard(card);
    groupCardsBy([card.issuer], card, cardsByIssuerMap);
    groupCardsBy(card.tags, card, cardsByTagMap);
    groupCardsBy(card.network, card, cardsByNetworkMap);
    groupCardsBy([...new Set(card.rewards.map((reward) => reward.category))], card, cardsByRewardCategoryMap);
    groupCardsBy([popularityBandForCard(card)], card, cardsByPopularityBandMap);
    groupCardsBy(useCaseBucketsForCard(card, searchableText), card, cardsByUseCaseMap);
    groupCardsBy(redemptionBucketsForCard(searchableText), card, cardsByRedemptionBucketMap);
    groupCardsBy(cardSegmentsForCard(card, searchableText), card, cardsByCardSegmentMap);
}
exports.cardIndexes = Object.freeze({
    byIssuer: freezeGroupedCards(cardsByIssuerMap),
    byTag: freezeGroupedCards(cardsByTagMap),
    byNetwork: freezeGroupedCards(cardsByNetworkMap),
    byRewardCategory: freezeGroupedCards(cardsByRewardCategoryMap),
    byPopularityBand: freezeGroupedCards(cardsByPopularityBandMap),
    byUseCase: freezeGroupedCards(cardsByUseCaseMap),
    byRedemptionBucket: freezeGroupedCards(cardsByRedemptionBucketMap),
    byCardSegment: freezeGroupedCards(cardsByCardSegmentMap)
});
function getCardById(id) {
    return cardsByIdMap.get(id);
}
function getCardsByIssuer(issuer) {
    return exports.cardIndexes.byIssuer[issuer] ?? [];
}
function getCardsByTag(tag) {
    return exports.cardIndexes.byTag[tag] ?? [];
}
function getCardsByNetwork(network) {
    return exports.cardIndexes.byNetwork[network] ?? [];
}
function getCardsByRewardCategory(category) {
    return exports.cardIndexes.byRewardCategory[category] ?? [];
}
function getCardsByPopularityBand(band) {
    return exports.cardIndexes.byPopularityBand[band] ?? [];
}
function getCardsByUseCase(bucket) {
    return exports.cardIndexes.byUseCase[bucket] ?? [];
}
function getCardsByRedemptionBucket(bucket) {
    return exports.cardIndexes.byRedemptionBucket[bucket] ?? [];
}
function getCardsByCardSegment(segment) {
    return exports.cardIndexes.byCardSegment[segment] ?? [];
}
function getPopularCards(limit = 10) {
    return exports.cards.slice(0, Math.max(0, limit));
}
function getIssuers() {
    return Object.keys(exports.cardIndexes.byIssuer);
}
function getTags() {
    return Object.keys(exports.cardIndexes.byTag);
}
function getNetworks() {
    return Object.keys(exports.cardIndexes.byNetwork);
}
function getRewardCategories() {
    return Object.keys(exports.cardIndexes.byRewardCategory);
}
function getUseCases() {
    return Object.keys(exports.cardIndexes.byUseCase);
}
function getRedemptionBuckets() {
    return Object.keys(exports.cardIndexes.byRedemptionBucket);
}
function getCardSegments() {
    return Object.keys(exports.cardIndexes.byCardSegment);
}
/**
 * Strips scoring-only value annotations from benefit strings before display.
 * Annotations like "(worth Rs 12,000)" are embedded for the scoring engine
 * and must not be shown to users.
 */
function stripScoringAnnotations(benefit) {
    return benefit.replace(/\s*\((?:vouchers?\s+)?worth Rs[^)]+\)/gi, "").trim();
}
