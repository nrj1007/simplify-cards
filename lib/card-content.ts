import rawCardContent from "@/data/card-content.json";
import { cards } from "./cards";

export type CardContentSourceType = "technofino" | "manual";

export type CardUpdate = {
  title: string;
  summary: string;
  sourceType: CardContentSourceType;
  sourceLabel: string;
  sourceUrl?: string;
  publishedAt: string;
};

export type CardTip = {
  text: string;
  sourceType: CardContentSourceType;
  sourceLabel: string;
  sourceUrl?: string;
};

export type CardContentEntry = {
  updates?: CardUpdate[];
  tips?: CardTip[];
};

export type CardContentMap = Record<string, CardContentEntry>;

const cardContent = rawCardContent as CardContentMap;

function sortUpdatesNewestFirst(updates: CardUpdate[]) {
  return [...updates].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

export function getCardContent(cardId: string, source: CardContentMap = cardContent) {
  const entry = source[cardId];
  if (!entry) return null;

  return {
    updates: sortUpdatesNewestFirst(entry.updates ?? []).slice(0, 3),
    tips: [...(entry.tips ?? [])]
  };
}

export function hasCardContent(cardId: string, source: CardContentMap = cardContent) {
  const entry = getCardContent(cardId, source);
  return Boolean(entry && (entry.updates.length > 0 || entry.tips.length > 0));
}

export type CardUpdateWithMeta = CardUpdate & {
  cardId: string;
  cardName: string;
  cardIssuer: string;
};

// Aggregates every card's updates into one chronological (newest-first) feed.
// Used by the /latest page. Iterates the card index for name/issuer; safe from
// circular imports because card-index.ts does not import this module.
export function getAllUpdates(limit = 50, source: CardContentMap = cardContent): CardUpdateWithMeta[] {
  const result: CardUpdateWithMeta[] = [];

  for (const card of cards) {
    const entry = source[card.id];
    if (!entry?.updates) continue;
    for (const update of entry.updates) {
      result.push({ ...update, cardId: card.id, cardName: card.name, cardIssuer: card.issuer });
    }
  }

  return result.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt)).slice(0, limit);
}
