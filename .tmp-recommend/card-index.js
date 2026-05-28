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
const american_express_json_1 = __importDefault(require("@/data/cards/american-express.json"));
const au_small_finance_json_1 = __importDefault(require("@/data/cards/au-small-finance.json"));
const axis_json_1 = __importDefault(require("@/data/cards/axis.json"));
const bank_of_baroda_json_1 = __importDefault(require("@/data/cards/bank-of-baroda.json"));
const equitas_small_finance_json_1 = __importDefault(require("@/data/cards/equitas-small-finance.json"));
const federal_bank_json_1 = __importDefault(require("@/data/cards/federal-bank.json"));
const hdfc_json_1 = __importDefault(require("@/data/cards/hdfc.json"));
const hsbc_json_1 = __importDefault(require("@/data/cards/hsbc.json"));
const icici_json_1 = __importDefault(require("@/data/cards/icici.json"));
const idfc_json_1 = __importDefault(require("@/data/cards/idfc.json"));
const indusind_bank_json_1 = __importDefault(require("@/data/cards/indusind-bank.json"));
const kotak_mahindra_json_1 = __importDefault(require("@/data/cards/kotak-mahindra.json"));
const onecard_partners_json_1 = __importDefault(require("@/data/cards/onecard-partners.json"));
const rbl_bank_json_1 = __importDefault(require("@/data/cards/rbl-bank.json"));
const sbi_json_1 = __importDefault(require("@/data/cards/sbi.json"));
const standard_chartered_json_1 = __importDefault(require("@/data/cards/standard-chartered.json"));
const yes_bank_json_1 = __importDefault(require("@/data/cards/yes-bank.json"));
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
        ...(card.milestoneBenefits ?? []),
        ...(card.additionalBenefits ?? [])
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
const mergedCards = [
    ...american_express_json_1.default,
    ...icici_json_1.default,
    ...sbi_json_1.default,
    ...axis_json_1.default,
    ...hdfc_json_1.default,
    ...federal_bank_json_1.default,
    ...idfc_json_1.default,
    ...indusind_bank_json_1.default,
    ...hsbc_json_1.default,
    ...bank_of_baroda_json_1.default,
    ...au_small_finance_json_1.default,
    ...equitas_small_finance_json_1.default,
    ...kotak_mahindra_json_1.default,
    ...onecard_partners_json_1.default,
    ...rbl_bank_json_1.default,
    ...standard_chartered_json_1.default,
    ...yes_bank_json_1.default
].sort(sortCards);
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
