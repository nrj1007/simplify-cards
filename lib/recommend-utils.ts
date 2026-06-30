import type { CreditCard, SpendCategory } from "./types";

export const spendAliases: Record<SpendCategory, string[]> = {
  online: ["online"],
  base: ["offline", "retail", "base"],
  travel: [
    "travel",
    "travel credits",
    "irctc",
    "cleartrip"
  ],
  hotels: [
    "hotel",
    "hotels",
    "marriott"
  ],
  airlines: [
    "airlines",
    "airline",
    "flight",
    "flights"
  ],
  fuel: ["fuel"],
  dining: ["dining", "swiggy zomato", "dining movies grocery", "grocery dining movies", "pharmacy dining movies"],
  grocery: ["grocery", "groceries", "bigbasket", "dining movies grocery", "grocery dining movies"],
  amazon: ["amazon"],
  upi: ["upi"],
  utilities: ["utilities", "phonepe", "utility bills"],
  rent: ["rent", "rental", "rent payments", "rental payments"],
  insurance: ["insurance", "insurance premium", "insurance premiums"],
  education: ["education", "education payments", "school fees", "school fee", "tuition"],
  gold: ["gold", "jewellery", "jewelry"],
  government: ["government", "tax", "taxes", "government payments", "tax payments"],
  international: ["international"]
};

export const specialOnlineSpendAliases = [
  "smartbuy",
  "selected packs",
  "select merchants",
  "select lifestyle brands",
  "payzapp",
  "flipkart",
  "myntra",
  "partner merchants",
  "departmental stores"
];

export const specialTravelSpendAliases = ["smartbuy flights", "smartbuy hotels", "smartbuy train"];
// Categories whose accelerated (smartbuy/partner) earn is blended 50/50 with the base rate, since a
// real cardholder routes only part of this spend through the accelerated merchant/portal set.
// "dining" is included because Swiggy/Zomato and similar platforms mean a significant share of
// restaurant spend happens online — a card's online row is the natural accelerator for that share.
export const blendedSmartbuySpendCategories: SpendCategory[] = ["online", "grocery", "dining"];
// Default fraction of a blended category's spend that earns the accelerated (vs base) rate. Cards can
// override per category via `acceleratedShare` when their accelerator is narrower or broader.
const defaultAcceleratedShare = 0.5;

export function acceleratedShareForCategory(card: CreditCard, category: SpendCategory) {
  const override = card.acceleratedShare?.[category];
  return typeof override === "number" && override >= 0 && override <= 1 ? override : defaultAcceleratedShare;
}

export function normalizeText(value = "") {
  return value.toLowerCase().trim();
}

export function normalizeForMatch(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeUtilityLikeQuery(value = "") {
  return normalizeForMatch(value)
    .replace(/\butility bills?\b/g, "utilities")
    .replace(/\bbill payments?\b/g, "utilities");
}

export function normalizeCompact(value = "") {
  return normalizeForMatch(value).replace(/\s+/g, "");
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function containsNormalizedPhrase(haystack: string, phrase: string) {
  const normalizedPhrase = normalizeForMatch(phrase);
  if (!normalizedPhrase) return false;

  const pattern = new RegExp(`(^|\\s)${escapeRegex(normalizedPhrase).replace(/ /g, "\\s+")}(?=\\s|$)`);
  return pattern.test(haystack);
}
