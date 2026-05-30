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

export function getLoungeConditions(card: CreditCard, type?: "domestic" | "international") {
  const items = [...(card.additionalBenefits ?? []), ...(card.additionalDetails ?? []), ...(card.milestoneBenefits ?? [])]
    .filter(matchesLoungeText)
    .map((text) => ({ text, weight: conditionWeight(text) }))
    .sort((a, b) => b.weight - a.weight || a.text.localeCompare(b.text));

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const item of items) {
    if (seen.has(item.text)) continue;
    seen.add(item.text);

    if (type === "domestic") {
      const lower = item.text.toLowerCase();
      if ((lower.includes("international") || lower.includes("priority pass") || lower.includes("loungekey") || lower.includes("dragonpass") || lower.includes("outside india")) &&
          !(lower.includes("domestic") || lower.includes("in india") || lower.includes("within india"))) {
        continue;
      }
    } else if (type === "international") {
      const lower = item.text.toLowerCase();
      if ((lower.includes("domestic") || lower.includes("in india") || lower.includes("within india")) &&
          !(lower.includes("international") || lower.includes("priority pass") || lower.includes("loungekey") || lower.includes("dragonpass") || lower.includes("outside india"))) {
        continue;
      }
    }

    deduped.push(item.text);
  }

  return deduped;
}
