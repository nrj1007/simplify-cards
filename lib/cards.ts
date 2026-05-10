import auSmallFinanceCards from "@/data/cards/au-small-finance.json";
import axisCards from "@/data/cards/axis.json";
import bankOfBarodaCards from "@/data/cards/bank-of-baroda.json";
import hdfcCards from "@/data/cards/hdfc.json";
import hsbcCards from "@/data/cards/hsbc.json";
import iciciCards from "@/data/cards/icici.json";
import idfcCards from "@/data/cards/idfc.json";
import sbiCards from "@/data/cards/sbi.json";
import type { CreditCard } from "./types";

export const cards = [
  ...iciciCards,
  ...sbiCards,
  ...axisCards,
  ...hdfcCards,
  ...idfcCards,
  ...hsbcCards,
  ...bankOfBarodaCards,
  ...auSmallFinanceCards
].sort((a, b) => b.popularityScore - a.popularityScore || a.name.localeCompare(b.name)) as CreditCard[];

export function getCardById(id: string) {
  return cards.find((card) => card.id === id);
}

export function getIssuers() {
  return Array.from(new Set(cards.map((card) => card.issuer))).sort();
}

export function getTags() {
  return Array.from(new Set(cards.flatMap((card) => card.tags))).sort();
}
