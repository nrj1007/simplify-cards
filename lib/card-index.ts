import americanExpressCards from "@/data/cards/american-express.json";
import auSmallFinanceCards from "@/data/cards/au-small-finance.json";
import axisCards from "@/data/cards/axis.json";
import bankOfBarodaCards from "@/data/cards/bank-of-baroda.json";
import equitasSmallFinanceCards from "@/data/cards/equitas-small-finance.json";
import federalBankCards from "@/data/cards/federal-bank.json";
import hdfcCards from "@/data/cards/hdfc.json";
import hsbcCards from "@/data/cards/hsbc.json";
import iciciCards from "@/data/cards/icici.json";
import idfcCards from "@/data/cards/idfc.json";
import indusIndBankCards from "@/data/cards/indusind-bank.json";
import kotakMahindraCards from "@/data/cards/kotak-mahindra.json";
import oneCardPartnersCards from "@/data/cards/onecard-partners.json";
import rblBankCards from "@/data/cards/rbl-bank.json";
import sbiCards from "@/data/cards/sbi.json";
import standardCharteredCards from "@/data/cards/standard-chartered.json";
import yesBankCards from "@/data/cards/yes-bank.json";
import type { CreditCard } from "./types";

export type PopularityBand = "90-plus" | "80-89" | "70-79" | "below-70";

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

const mergedCards = ([
  ...americanExpressCards,
  ...iciciCards,
  ...sbiCards,
  ...axisCards,
  ...hdfcCards,
  ...federalBankCards,
  ...idfcCards,
  ...indusIndBankCards,
  ...hsbcCards,
  ...bankOfBarodaCards,
  ...auSmallFinanceCards,
  ...equitasSmallFinanceCards,
  ...kotakMahindraCards,
  ...oneCardPartnersCards,
  ...rblBankCards,
  ...standardCharteredCards,
  ...yesBankCards
] as CreditCard[]).sort(sortCards);

export const cards = Object.freeze(mergedCards);

const cardsByIdMap = new Map(cards.map((card) => [card.id, card]));
const cardsByIssuerMap = new Map<string, CreditCard[]>();
const cardsByTagMap = new Map<string, CreditCard[]>();
const cardsByNetworkMap = new Map<string, CreditCard[]>();
const cardsByRewardCategoryMap = new Map<string, CreditCard[]>();
const cardsByPopularityBandMap = new Map<PopularityBand, CreditCard[]>();

for (const card of cards) {
  groupCardsBy([card.issuer], card, cardsByIssuerMap);
  groupCardsBy(card.tags, card, cardsByTagMap);
  groupCardsBy(card.network, card, cardsByNetworkMap);
  groupCardsBy([...new Set(card.rewards.map((reward) => reward.category))], card, cardsByRewardCategoryMap);
  groupCardsBy([popularityBandForCard(card)], card, cardsByPopularityBandMap as Map<string, CreditCard[]>);
}

export const cardIndexes = Object.freeze({
  byIssuer: freezeGroupedCards(cardsByIssuerMap),
  byTag: freezeGroupedCards(cardsByTagMap),
  byNetwork: freezeGroupedCards(cardsByNetworkMap),
  byRewardCategory: freezeGroupedCards(cardsByRewardCategoryMap),
  byPopularityBand: freezeGroupedCards(cardsByPopularityBandMap as Map<string, CreditCard[]>)
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

export function getPopularCards(limit = 10) {
  return cards.slice(0, Math.max(0, limit));
}

export function getIssuers() {
  return Object.keys(cardIndexes.byIssuer);
}

export function getTags() {
  return Object.keys(cardIndexes.byTag);
}

export function getNetworks() {
  return Object.keys(cardIndexes.byNetwork);
}

export function getRewardCategories() {
  return Object.keys(cardIndexes.byRewardCategory);
}
