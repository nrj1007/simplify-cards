import fs from "node:fs";
import path from "node:path";
import type { CreditCard } from "./types";

export type PopularityBand = "90-plus" | "80-89" | "70-79" | "below-70";
export type UseCaseBucket = "cashback" | "travel";
export type RedemptionBucket = "accor" | "air-india";
export type CardSegment = "super-premium" | "premium" | "mid-premium" | "beginner" | "ltf";

function sortCards(left: CreditCard, right: CreditCard) {
  return right.popularityScore - left.popularityScore || left.name.localeCompare(right.name);
}

function groupCardsBy(values: string[], card: CreditCard, index: Map<string, CreditCard[]>) {
  for (const value of values) {
    const existing = index.get(value) ?? [];
    existing.push(card);
    index.set(value, existing);
  }
}

function freezeGroupedCards(index: Map<string, CreditCard[]>) {
  return Object.freeze(
    Object.fromEntries(
      [...index.entries()]
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, groupedCards]) => [key, Object.freeze([...groupedCards].sort(sortCards))])
    )
  ) as Readonly<Record<string, readonly CreditCard[]>>;
}

function popularityBandForCard(card: CreditCard): PopularityBand {
  if (card.popularityScore >= 90) return "90-plus";
  if (card.popularityScore >= 80) return "80-89";
  if (card.popularityScore >= 70) return "70-79";
  return "below-70";
}

function searchableTextForCard(card: CreditCard) {
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

function useCaseBucketsForCard(card: CreditCard, searchableText: string): UseCaseBucket[] {
  const buckets = new Set<UseCaseBucket>();

  if (
    card.rewardType.toLowerCase().includes("cashback") ||
    card.tags.includes("cashback") ||
    card.bestFor.includes("cashback") ||
    searchableText.includes("cashback")
  ) {
    buckets.add("cashback");
  }

  if (
    card.tags.includes("travel") ||
    card.bestFor.includes("travel") ||
    card.rewards.some((reward) => reward.category.includes("travel")) ||
    searchableText.includes("travel") ||
    searchableText.includes("air miles") ||
    searchableText.includes("airport lounge")
  ) {
    buckets.add("travel");
  }

  return [...buckets];
}

function redemptionBucketsForCard(searchableText: string): RedemptionBucket[] {
  const buckets = new Set<RedemptionBucket>();

  if (searchableText.includes("accor")) buckets.add("accor");
  if (searchableText.includes("air india")) buckets.add("air-india");

  return [...buckets];
}

function cardSegmentsForCard(card: CreditCard, searchableText: string): CardSegment[] {
  const segments = new Set<CardSegment>();

  if (card.annualFee === 0 || card.tags.includes("lifetime free") || searchableText.includes("lifetime free")) {
    segments.add("ltf");
  }

  if (
    card.tags.includes("beginner") ||
    card.bestFor.includes("beginner") ||
    card.tags.includes("entry level") ||
    searchableText.includes("entry level") ||
    searchableText.includes("fixed deposit backed") ||
    searchableText.includes("credit building")
  ) {
    segments.add("beginner");
  }

  if (
    card.tags.includes("ultra premium") ||
    card.bestFor.includes("luxury") ||
    searchableText.includes("ultra premium") ||
    searchableText.includes("super premium") ||
    card.annualFee >= 10000
  ) {
    segments.add("super-premium");
  } else if (
    card.tags.includes("premium") ||
    card.bestFor.includes("premium") ||
    searchableText.includes("premium") ||
    card.annualFee >= 2000
  ) {
    segments.add("premium");
  }

  return [...segments];
}

// Cards live as one JSON file per card under data/cards/<issuer>/<card-id>.json.
// Read them all at module load (server-side only) so adding a card is just dropping a
// file — no import list to maintain. The final order is determined by sortCards, so the
// directory traversal order does not matter.
function loadAllCards(): CreditCard[] {
  const cardsDir = path.join(process.cwd(), "data", "cards");
  const loaded: CreditCard[] = [];

  for (const issuerEntry of fs.readdirSync(cardsDir, { withFileTypes: true })) {
    if (!issuerEntry.isDirectory()) continue;
    const issuerDir = path.join(cardsDir, issuerEntry.name);

    for (const fileName of fs.readdirSync(issuerDir)) {
      if (!fileName.endsWith(".json")) continue;
      const raw = fs.readFileSync(path.join(issuerDir, fileName), "utf8");
      const card = JSON.parse(raw) as CreditCard;
      if (card.redemption) {
        if (card.redemption.accorValue === undefined && Array.isArray(card.redemption.transferPartnerValuations)) {
          const accorVal = card.redemption.transferPartnerValuations.find(
            (p) => p.partner && p.partner.toLowerCase().includes("accor")
          );
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

export const cards = Object.freeze(mergedCards);

const cardsByIdMap = new Map(cards.map((card) => [card.id, card]));
const cardsByIssuerMap = new Map<string, CreditCard[]>();
const cardsByTagMap = new Map<string, CreditCard[]>();
const cardsByNetworkMap = new Map<string, CreditCard[]>();
const cardsByRewardCategoryMap = new Map<string, CreditCard[]>();
const cardsByPopularityBandMap = new Map<PopularityBand, CreditCard[]>();
const cardsByUseCaseMap = new Map<UseCaseBucket, CreditCard[]>();
const cardsByRedemptionBucketMap = new Map<RedemptionBucket, CreditCard[]>();
const cardsByCardSegmentMap = new Map<CardSegment, CreditCard[]>();

for (const card of cards) {
  const searchableText = searchableTextForCard(card);

  groupCardsBy([card.issuer], card, cardsByIssuerMap);
  groupCardsBy(card.tags, card, cardsByTagMap);
  groupCardsBy(card.network, card, cardsByNetworkMap);
  groupCardsBy([...new Set(card.rewards.map((reward) => reward.category))], card, cardsByRewardCategoryMap);
  groupCardsBy([popularityBandForCard(card)], card, cardsByPopularityBandMap as Map<string, CreditCard[]>);
  groupCardsBy(useCaseBucketsForCard(card, searchableText), card, cardsByUseCaseMap as Map<string, CreditCard[]>);
  groupCardsBy(redemptionBucketsForCard(searchableText), card, cardsByRedemptionBucketMap as Map<string, CreditCard[]>);
  groupCardsBy(cardSegmentsForCard(card, searchableText), card, cardsByCardSegmentMap as Map<string, CreditCard[]>);
}

export const cardIndexes = Object.freeze({
  byIssuer: freezeGroupedCards(cardsByIssuerMap),
  byTag: freezeGroupedCards(cardsByTagMap),
  byNetwork: freezeGroupedCards(cardsByNetworkMap),
  byRewardCategory: freezeGroupedCards(cardsByRewardCategoryMap),
  byPopularityBand: freezeGroupedCards(cardsByPopularityBandMap as Map<string, CreditCard[]>),
  byUseCase: freezeGroupedCards(cardsByUseCaseMap as Map<string, CreditCard[]>),
  byRedemptionBucket: freezeGroupedCards(cardsByRedemptionBucketMap as Map<string, CreditCard[]>),
  byCardSegment: freezeGroupedCards(cardsByCardSegmentMap as Map<string, CreditCard[]>)
});

export function getCardById(id: string) {
  return cardsByIdMap.get(id);
}

export function getCardsByIssuer(issuer: string) {
  return cardIndexes.byIssuer[issuer] ?? [];
}

export function getCardsByTag(tag: string) {
  return cardIndexes.byTag[tag] ?? [];
}

export function getCardsByNetwork(network: string) {
  return cardIndexes.byNetwork[network] ?? [];
}

export function getCardsByRewardCategory(category: string) {
  return cardIndexes.byRewardCategory[category] ?? [];
}

export function getCardsByPopularityBand(band: PopularityBand) {
  return cardIndexes.byPopularityBand[band] ?? [];
}

export function getCardsByUseCase(bucket: UseCaseBucket) {
  return cardIndexes.byUseCase[bucket] ?? [];
}

export function getCardsByRedemptionBucket(bucket: RedemptionBucket) {
  return cardIndexes.byRedemptionBucket[bucket] ?? [];
}

export function getCardsByCardSegment(segment: CardSegment) {
  return cardIndexes.byCardSegment[segment] ?? [];
}

export function getPopularCards(limit = 10) {
  return cards.slice(0, Math.max(0, limit));
}

export function getIssuers() {
  return Object.keys(cardIndexes.byIssuer);
}

export function getTags() {
  return Object.keys(cardIndexes.byTag).sort();
}

export function getNetworks() {
  return Object.keys(cardIndexes.byNetwork);
}

export function getRewardCategories() {
  return Object.keys(cardIndexes.byRewardCategory);
}

export function getUseCases() {
  return Object.keys(cardIndexes.byUseCase);
}

export function getRedemptionBuckets() {
  return Object.keys(cardIndexes.byRedemptionBucket);
}

export function getCardSegments() {
  return Object.keys(cardIndexes.byCardSegment);
}

/**
 * Strips scoring-only value annotations from benefit strings before display.
 * Annotations like "(worth Rs 12,000)" are embedded for the scoring engine
 * and must not be shown to users.
 */
export function stripScoringAnnotations(benefit: string): string {
  return benefit.replace(/\s*\((?:vouchers?\s+)?worth Rs[^)]+\)/gi, "").trim();
}
