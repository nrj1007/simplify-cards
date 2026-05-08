import cardsData from "@/data/cards.json";
import type { CreditCard } from "./types";

export const cards = cardsData as CreditCard[];

export function getCardById(id: string) {
  return cards.find((card) => card.id === id);
}

export function getIssuers() {
  return Array.from(new Set(cards.map((card) => card.issuer))).sort();
}

export function getTags() {
  return Array.from(new Set(cards.flatMap((card) => card.tags))).sort();
}
