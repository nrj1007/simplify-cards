import type { CardScore, CreditCard, RecommendationInput, SpendCategory } from "./types";
import { parseQueryIntent } from "./query-intent";
import { containsNormalizedPhrase, normalizeForMatch } from "./recommend-utils";
import { cardRewardTypeIncludesCashback } from "./reward-type";

export function normalizeIssuer(issuer: string) {
  return normalizeForMatch(issuer).replace(/\s+(bank|card|cards|partner banks)$/i, "").trim();
}

export function shouldIncludeSmartbuyLikeRewards(query?: string) {
  const normalizedQuery = normalizeForMatch(query);
  return ["smartbuy", "payzapp", "myntra", "flipkart", "cleartrip"].some((token) => normalizedQuery.includes(token));
}

export function hasExplicitAnnualFeeLanguage(query?: string) {
  const normalizedQuery = normalizeForMatch(query);
  return normalizedQuery.includes("annual fee") || normalizedQuery.includes("renewal fee");
}

export function shouldRestrictToIssuer(intent: ReturnType<typeof parseQueryIntent>, query?: string) {
  if (intent.issuers.length !== 1) return false;

  const normalizedQuery = normalizeForMatch(query);
  if (!normalizedQuery) return false;
  if (normalizedQuery.includes(" vs ") || normalizedQuery.includes(" compare ")) return false;

  return true;
}

export function isCardRecommendationQuery(query?: string) {
  const normalizedQuery = normalizeForMatch(query);
  if (!normalizedQuery) return false;

  const asksForRecommendation = /\b(best|top|recommend|recommended|suggest|which)\b/.test(normalizedQuery);
  const mentionsCard = /\bcards?\b/.test(normalizedQuery);

  return asksForRecommendation && mentionsCard;
}

export function shouldRestrictToMinimumRentReturn(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  if (!isCardRecommendationQuery(input.query)) return false;
  if (!intent.tags.includes("rent")) return false;

  const spend = input.spend ?? intent.inferredSpend;
  if (!spend) return true;

  const activeCategories = (Object.entries(spend) as Array<[SpendCategory, number]>)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([category]) => category);

  return activeCategories.length === 1 && activeCategories[0] === "rent";
}

export function clearsMinimumRentReturn(score: CardScore) {
  const annualRentSpend = (score.rewardBreakdown.find((item) => item.spendCategory === "rent")?.monthlySpend ?? 0) * 12;
  if (annualRentSpend <= 0) return false;

  const annualRentValue = score.estimatedAnnualRewards + score.estimatedMilestoneValue;
  return annualRentValue >= annualRentSpend * 0.02;
}

export function hasUpiCardSignal(card: CreditCard) {
  const rewardCategories = card.rewards.flatMap((reward) =>
    reward.category.split(",").map((category) => normalizeForMatch(category))
  );
  const directSignals = [
    card.name,
    card.id.replace(/-/g, " "),
    ...card.tags,
    ...card.bestFor,
    ...rewardCategories,
    ...(card.specialSpendRules?.map((rule) => rule.category) ?? [])
  ];

  return card.network.includes("RuPay") || directSignals.some((value) => containsNormalizedPhrase(normalizeForMatch(value), "upi"));
}

export function shouldRestrictToUpiCards(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  const hasUpiIntent = intent.tags.includes("upi") || intent.networks.includes("RuPay");
  if (!hasUpiIntent) return false;

  const normalizedQuery = normalizeForMatch(input.query);
  if (!normalizedQuery) return false;

  return (
    isCardRecommendationQuery(input.query) ||
    containsNormalizedPhrase(normalizedQuery, "upi card") ||
    containsNormalizedPhrase(normalizedQuery, "rupay card")
  );
}

export function explicitNetworkFilters(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  if (!isCardRecommendationQuery(input.query)) return [];

  const normalizedQuery = normalizeForMatch(input.query);
  return intent.networks.filter((network) => {
    const normalizedNetwork = normalizeForMatch(network);
    if (normalizedNetwork === "american express") return /\b(amex|american express)\b/.test(normalizedQuery);
    if (normalizedNetwork === "diners club") return containsNormalizedPhrase(normalizedQuery, "diners");
    return containsNormalizedPhrase(normalizedQuery, normalizedNetwork);
  });
}

export function cardMatchesNetworkFilter(card: CreditCard, network: string) {
  const normalizedNetwork = normalizeForMatch(network);
  return card.network.some((cardNetwork) => {
    const normalizedCardNetwork = normalizeForMatch(cardNetwork);
    return normalizedCardNetwork === normalizedNetwork || containsNormalizedPhrase(normalizedCardNetwork, normalizedNetwork);
  });
}

export function hasFuelCardSignal(card: CreditCard) {
  const rewardCategories = card.rewards.flatMap((reward) =>
    reward.category.split(",").map((category) => normalizeForMatch(category))
  );
  const haystack = normalizeForMatch(
    [
      card.name,
      card.id.replace(/-/g, " "),
      ...card.bestFor,
      ...rewardCategories,
      ...(card.specialSpendRules?.map((rule) => rule.category) ?? [])
    ].join(" ")
  );

  const hasFuelIdentity = ["fuel", "petrol", "diesel", "hpcl", "bpcl", "indianoil", "indian oil", "iocl"].some((token) =>
    containsNormalizedPhrase(haystack, token)
  );
  const hasFuelTag = card.tags.some((tag) => {
    const normalizedTag = normalizeForMatch(tag);
    return normalizedTag === "fuel" || containsNormalizedPhrase(normalizedTag, "fuel card");
  });

  return hasFuelIdentity || hasFuelTag;
}

export function shouldRestrictToFuelCards(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  const hasFuelIntent = intent.tags.includes("fuel") || normalizeForMatch(input.query).includes("fuel");
  if (!hasFuelIntent) return false;

  const normalizedQuery = normalizeForMatch(input.query);
  return (
    isCardRecommendationQuery(input.query) ||
    containsNormalizedPhrase(normalizedQuery, "fuel card") ||
    containsNormalizedPhrase(normalizedQuery, "petrol card")
  );
}

// A card counts as a cashback card when its reward currency is cashback (matches the convention in
// card-detail.ts isCashbackCard). Cards that earn transferable points/miles are excluded even if
// they happen to mention "cashback" somewhere in their benefits text.
// Mixed-currency cards ("cashback and reward points") are included — they do earn cashback.
export function cardEarnsCashback(card: CreditCard) {
  return cardRewardTypeIncludesCashback(card);
}

// "Best cashback card" should rank actual cashback cards, not collapse to the generic premium-card
// envelope ranking (where points/miles super-premium cards win on raw value). Mirrors the fuel/UPI
// restriction: a cashback recommendation query restricts the pool to cashback cards.
export function shouldRestrictToCashbackCards(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  const normalizedQuery = normalizeForMatch(input.query);
  const hasCashbackIntent = intent.useCases.includes("cashback") || normalizedQuery.includes("cashback");
  if (!hasCashbackIntent) return false;

  return isCardRecommendationQuery(input.query) || containsNormalizedPhrase(normalizedQuery, "cashback card");
}

export function shouldRestrictToZeroForexCards(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  if (!intent.tags.includes("forex")) return false;

  const normalizedQuery = normalizeForMatch(input.query);
  return (
    containsNormalizedPhrase(normalizedQuery, "zero forex") ||
    containsNormalizedPhrase(normalizedQuery, "0 forex") ||
    containsNormalizedPhrase(normalizedQuery, "0 percent forex") ||
    containsNormalizedPhrase(normalizedQuery, "no forex markup")
  );
}

export const maxForexMarkupForForexQueries = 3;

export function shouldRestrictToLowForexCards(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  return intent.tags.includes("forex") && isCardRecommendationQuery(input.query);
}

// Category-focused recommendation queries ("best dining/grocery/online/entertainment card") are
// ranked so cards that actually accelerate that category lead — instead of collapsing to the generic
// premium-card ranking. Each config drives: a query trigger, the reward rows that count, positioning
// signals, and (when the category is a real SpendCategory) a focused spend profile so the value score
