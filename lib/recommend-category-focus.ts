import type { CreditCard, RecommendationInput, SpendCategory, SpendProfile } from "./types";
import { parseQueryIntent } from "./query-intent";
import { findDirectRewardForSpend, netCategoryReward } from "./recommend-scoring";
import { containsNormalizedPhrase, normalizeForMatch, spendAliases } from "./recommend-utils";
import { isCardRecommendationQuery } from "./recommend-filters";

export type CategoryFocusConfig = {
  key: string;
  spendCategory?: SpendCategory;
  rewardPattern: RegExp;
  queryPattern: RegExp;
  positioning: string[];
  // When true, a card also qualifies (and is treated as a specialist) on positioning alone — needed
  // for brand/merchant focuses (Amazon, Flipkart, Swiggy) where the flagship co-brand cards carry the
  // merchant in their name/bestFor rather than in a reward-row category.
  matchPositioning?: boolean;
  // When true, a card qualifies if it simply EARNS on the category (not excluded), rather than needing
  // an accelerated row above base. Needed for rent/utilities, where most cards exclude the category and
  // the best card is the one that rewards it at all (e.g. HSBC Premier rewards rent at its base rate).
  matchByEarning?: boolean;
};

export const categoryFocusConfigs: CategoryFocusConfig[] = [
  {
    key: "dining",
    spendCategory: "dining",
    rewardPattern: /\bdining\b|restaurant/i,
    queryPattern: /\bdining\b|\brestaurant/i,
    positioning: ["dining", "restaurant", "food", "eazydiner", "swiggy", "zomato"]
  },
  {
    key: "grocery",
    spendCategory: "grocery",
    rewardPattern: /\bgrocer/i,
    queryPattern: /\bgrocer/i,
    positioning: ["grocery", "groceries", "supermarket", "bigbasket", "dmart", "blinkit", "instamart", "jiomart"]
  },
  {
    key: "online",
    spendCategory: "online",
    rewardPattern: /\bonline\b/i,
    queryPattern: /\bonline\b|e-commerce|ecommerce/i,
    positioning: ["online", "online shopping", "e-commerce", "ecommerce", "shopping"]
  },
  {
    key: "entertainment",
    rewardPattern: /entertainment|movie/i,
    queryPattern: /\bentertainment\b|\bmovies?\b/i,
    positioning: ["entertainment", "movies", "movie", "bookmyshow", "pvr", "inox"]
  },
  {
    key: "amazon",
    spendCategory: "amazon",
    rewardPattern: /amazon/i,
    queryPattern: /\bamazon\b/i,
    positioning: ["amazon", "amazon pay"],
    matchPositioning: true
  },
  {
    key: "flipkart",
    rewardPattern: /flipkart/i,
    queryPattern: /\bflipkart\b/i,
    positioning: ["flipkart", "myntra"],
    matchPositioning: true
  },
  {
    key: "swiggy",
    rewardPattern: /swiggy/i,
    queryPattern: /\bswiggy\b/i,
    positioning: ["swiggy", "food delivery"],
    matchPositioning: true
  },
  {
    key: "utilities",
    spendCategory: "utilities",
    rewardPattern: /utilit|\bbill/i,
    queryPattern: /\butilit|\bbill/i,
    positioning: ["utility", "utilities", "bill payment", "bills"],
    matchByEarning: true
  },
  {
    key: "rent",
    spendCategory: "rent",
    rewardPattern: /\brent\b/i,
    queryPattern: /\brent\b/i,
    positioning: ["rent", "rent payment"],
    matchByEarning: true
  },
  {
    key: "education",
    spendCategory: "education",
    rewardPattern: /education/i,
    queryPattern: /education/i,
    positioning: ["education", "education payment", "school fee", "tuition"],
    matchByEarning: true
  },
  {
    key: "insurance",
    spendCategory: "insurance",
    rewardPattern: /insurance/i,
    queryPattern: /insurance/i,
    positioning: ["insurance", "insurance premium"],
    matchByEarning: true
  },
  {
    key: "government",
    spendCategory: "government",
    rewardPattern: /government/i,
    queryPattern: /government/i,
    positioning: ["government", "tax", "taxes"],
    matchByEarning: true
  }
];

// Valid keys for a card's categoryFocusTags override (kept in sync with categoryFocusConfigs).
export const categoryFocusKeys = categoryFocusConfigs.map((config) => config.key);

// Which category focus (if any) a query asks for. Mirrors the fuel trigger: needs a recommendation
// query (or an explicit "<category> card" phrase), and is suppressed when the caller passed an
// explicit/inferred spend profile (then we score on that instead).
export function detectCategoryFocus(
  input: RecommendationInput,
  intent: ReturnType<typeof parseQueryIntent>
): CategoryFocusConfig | null {
  if (input.spend) return null;
  const hasInferredSpend = Boolean(
    intent.inferredSpend && Object.values(intent.inferredSpend).some((amount) => amount && amount > 0)
  );
  const normalizedQuery = normalizeForMatch(input.query);
  for (const config of categoryFocusConfigs) {
    if (!config.queryPattern.test(normalizedQuery)) continue;
    const bareAliasCandidates = [
      config.key,
      ...(config.spendCategory ? spendAliases[config.spendCategory] : []),
      ...config.positioning
    ];
    const matchesBareCategoryAlias =
      bareAliasCandidates.some((alias) => normalizeForMatch(alias) === normalizedQuery);
    if (
      !(
        isCardRecommendationQuery(input.query) ||
        containsNormalizedPhrase(normalizedQuery, `${config.key} card`) ||
        matchesBareCategoryAlias
      )
    ) continue;
    // When the query already infers a spend profile, only earn-based focuses (rent/utilities) take it
    // over — so every phrasing of "rent"/"utility bills" ranks consistently. Other focuses defer to the
    // inferred spend (preserving e.g. "card for grocery spends" as a 100%-grocery profile).
    // However, if the query explicitly asks for a category card (e.g. "dining card", "dining credit card"),
    // or is a generic card recommendation query (e.g. "best card for dining"), we keep the category filter active.
    const isExplicitCardQuery = bareAliasCandidates.some((alias) =>
      containsNormalizedPhrase(normalizedQuery, `${alias} card`) ||
      containsNormalizedPhrase(normalizedQuery, `${alias} cards`) ||
      containsNormalizedPhrase(normalizedQuery, `${alias} credit card`) ||
      containsNormalizedPhrase(normalizedQuery, `${alias} credit cards`)
    );
    const isRecommendation =
      isCardRecommendationQuery(input.query) &&
      !normalizedQuery.includes("spend") &&
      !normalizedQuery.includes("spent");
    if (hasInferredSpend && !config.matchByEarning && !matchesBareCategoryAlias && !isExplicitCardQuery && !isRecommendation) return null;
    return config;
  }
  return null;
}

// The card's general/base earn rate. Many cards don't name the row "base" (e.g. ICICI Emeralde's
// catch-all is "retail"), so match common base aliases and fall back to the lowest reward rate. Used
// to decide whether a category row is genuinely ACCELERATED (above base) versus the same rate merely
// carrying a category cap — a capped-at-base row (e.g. Emeralde grocery) is a restriction, not an
// accelerator, and must not qualify a card as a category specialist.
const baseRowAliasSet = new Set(["base", "offline", "retail", "others", "other", "all other spends"]);
export function cardBaseRate(card: CreditCard): number {
  const baseRow = card.rewards.find((reward) =>
    reward.category
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .some((part) => baseRowAliasSet.has(part))
  );
  if (baseRow) return baseRow.rate;
  return card.rewards.length ? Math.min(...card.rewards.map((reward) => reward.rate)) : 0;
}

// Explicit additive override: the card is hand-tagged for this category (used when its category
// value lives outside the reward rows, e.g. movie BOGO benefits for "entertainment").
export function cardHasCategoryFocusTag(card: CreditCard, config: CategoryFocusConfig) {
  return (card.categoryFocusTags ?? []).includes(config.key);
}

// A card matches a category focus if it ACCELERATES that category (a matching reward row whose rate
// exceeds the card's base rate) OR is explicitly tagged for it. A row at the base rate with a
// category cap does not qualify on its own.
export function cardPositioningMatchesFocus(card: CreditCard, config: CategoryFocusConfig) {
  const haystack = normalizeForMatch([card.name, ...card.bestFor, ...card.tags].join(" "));
  return config.positioning.some((token) => containsNormalizedPhrase(haystack, token));
}

// Whether the card earns any reward on a spend category (i.e. the category is not excluded). Used by
// matchByEarning focuses (rent/utilities) where rewarding the category at all is the relevant signal.
export function cardEarnsOnSpendCategory(card: CreditCard, category: SpendCategory) {
  return netCategoryReward(card, category, 10000, true) > 0;
}

// Category keys where a broad online accelerator is a valid proxy for category specialisation.
// grocery (BigBasket/Blinkit), entertainment (OTT/streaming), and amazon are predominantly online channels
// so a card with a broad `online` reward row reasonably qualifies. Dining is intentionally
// excluded: too many generic online-shopping cards (e.g. SBI SimplyClick) have a broad online
// row but zero dining positioning — they already benefit from the 50 % dining-spend-blend in
// the scoring engine without needing to appear in dining-filtered result sets.
// Narrow co-brand rows (partner merchants, airtel) won't trigger this because they don't
// match the `online` spend-category lookup.
export const onlineProxyFocusKeys = new Set(["grocery", "entertainment", "amazon"]);

export function cardMatchesCategoryFocus(card: CreditCard, config: CategoryFocusConfig) {
  if (cardHasCategoryFocusTag(card, config)) return true;
  // Earn-based focuses (rent/utilities): qualify if the card rewards the category at all.
  if (config.matchByEarning && config.spendCategory) return cardEarnsOnSpendCategory(card, config.spendCategory);
  const baseRate = cardBaseRate(card);
  if (card.rewards.some((reward) => config.rewardPattern.test(reward.category) && reward.rate > baseRate)) return true;
  // Brand/merchant focuses also qualify on positioning (the flagship co-brand carries the merchant in
  // its name/bestFor, not always in a reward-row category — e.g. HDFC Swiggy rewards under "dining").
  if (config.matchPositioning && cardPositioningMatchesFocus(card, config)) return true;
  // For categories with significant online spend (dining, grocery, entertainment), a card with a
  // broad online accelerator qualifies — the scoring engine will blend the appropriate share of
  // that category's spend through the online row (50% for dining/grocery, full profile for entertainment).
  if (onlineProxyFocusKeys.has(config.key)) {
    const onlineReward = findDirectRewardForSpend(card, "online", false);
    if (onlineReward && onlineReward.rate > baseRate) return true;
  }
  return false;
}



export function focusedSpendProfile(category: SpendCategory, baseSpend: SpendProfile) {
  const monthlyTotal = Object.values(baseSpend).reduce((total, amount = 0) => total + amount, 0);
  return Object.fromEntries(
    Object.keys(baseSpend).map((key) => [key, key === category ? monthlyTotal : 0])
  ) as SpendProfile;
}

// Realistic monthly spend on a focused category, used when scoring a "best <category>/fuel card"
// query. Putting 100% of the default total on one category (~Rs 53k) made caps misfire — dedicated
// fuel cards hit their monthly caps while uncapped premium cards ran free. Since the category ranking
// uses only the focused category's reward, the rest of the profile is the default mix and doesn't
// affect order; only this amount (which drives caps) matters.
export const categoryFocusMonthlySpend: Partial<Record<SpendCategory, number>> = {
  fuel: 7000,
  dining: 5000,
  grocery: 10000,
  online: 15000,
  amazon: 8000,
  utilities: 5000,
  rent: 50000,
  education: 15000,
  insurance: 5000,
  government: 5000
};
export function categoryFocus75_25SpendProfile(category: SpendCategory, focusSpendAmount: number, baseSpend: SpendProfile): SpendProfile {
  const entries = Object.entries(baseSpend) as Array<[SpendCategory, number]>;
  const othersSum = entries.reduce((sum, [key, amount]) => (key === category ? sum : sum + (amount ?? 0)), 0);
  const remaining = focusSpendAmount / 3;

  return Object.fromEntries(
    entries.map(([key, amount]) => [
      key,
      key === category
        ? Math.round(focusSpendAmount)
        : othersSum > 0
          ? Math.round(remaining * ((amount ?? 0) / othersSum))
          : 0
    ])
  ) as SpendProfile;
}

// Spend profile for a category-focused recommendation that does NOT assume the card is used for
// nothing else: `share` of total monthly spend goes to the focused category, the rest keeps the
// default mix (re-normalised across the other categories). Reflects a realistic "I'd put most of my
// dining on this card and use other cards elsewhere" pattern instead of an unrealistic 100% focus.
export function weightedFocusSpendProfile(category: SpendCategory, share: number, baseSpend: SpendProfile): SpendProfile {
  const monthlyTotal = Object.values(baseSpend).reduce((total, amount = 0) => total + amount, 0);
  const focusAmount = monthlyTotal * share;
  const remaining = monthlyTotal - focusAmount;
  const entries = Object.entries(baseSpend) as Array<[SpendCategory, number]>;
  const othersSum = entries.reduce((sum, [key, amount]) => (key === category ? sum : sum + (amount ?? 0)), 0);
  return Object.fromEntries(
    entries.map(([key, amount]) => [
      key,
      key === category
        ? Math.round(focusAmount)
        : othersSum > 0
          ? Math.round(remaining * ((amount ?? 0) / othersSum))
          : 0
    ])
  ) as SpendProfile;
}
