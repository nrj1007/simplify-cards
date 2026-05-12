import rawCardContent from "@/data/card-content.json";

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
