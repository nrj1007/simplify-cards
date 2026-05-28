import type { CreditCard } from "./types";

const loungeKeywords = ["lounge", "priority pass", "dragonpass", "dreamfolks"];
const conditionKeywords = ["subject to", "spend", "quarter", "month", "preceding", "programme terms", "fum", "unlock"];

function matchesLoungeText(value: string) {
  const normalized = value.toLowerCase();
  return loungeKeywords.some((keyword) => normalized.includes(keyword));
}

function conditionWeight(value: string) {
  const normalized = value.toLowerCase();
  return conditionKeywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0);
}

export function getLoungeConditions(card: CreditCard) {
  const items = [...(card.additionalBenefits ?? []), ...(card.additionalDetails ?? []), ...(card.milestoneBenefits ?? [])]
    .filter(matchesLoungeText)
    .map((text) => ({ text, weight: conditionWeight(text) }))
    .sort((a, b) => b.weight - a.weight || a.text.localeCompare(b.text));

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const item of items) {
    if (seen.has(item.text)) continue;
    seen.add(item.text);
    deduped.push(item.text);
  }

  return deduped;
}
