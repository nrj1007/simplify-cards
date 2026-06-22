import { cards } from "./cards";
import { SPEND_CATEGORY_EXCLUSION_CODE_MAP } from "./exclusion-constants";
import { parseQueryIntent } from "./query-intent";
import type { CardScore, CreditCard, Milestone, RecommendationInput, SpendCategory, SpendProfile, Reward } from "./types";
import { getTotalLoungeAccess, getInternationalLoungeAccess, getMeaningfulLoungeConditions } from "./lounge";
import { stripScoringAnnotations } from "./card-index";

export const defaultSpendProfile: SpendProfile = {
  online: 15000,
  base: 8000,
  travel: 5000,
  hotels: 0,
  airlines: 0,
  dining: 4000,
  grocery: 5000,
  fuel: 3000,
  amazon: 5000,
  upi: 5000,
  utilities: 3000,
  rent: 0,
  insurance: 0,
  education: 0,
  gold: 0,
  government: 0,
  international: 0
};

const spendAliases: Record<SpendCategory, string[]> = {
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

const specialOnlineSpendAliases = [
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

const specialTravelSpendAliases = ["smartbuy flights", "smartbuy hotels", "smartbuy train"];
// Categories whose accelerated (smartbuy/partner) earn is blended 50/50 with the base rate, since a
// real cardholder routes only part of this spend through the accelerated merchant/portal set.
const blendedSmartbuySpendCategories: SpendCategory[] = ["online", "grocery"];
// Default fraction of a blended category's spend that earns the accelerated (vs base) rate. Cards can
// override per category via `acceleratedShare` when their accelerator is narrower or broader.
const defaultAcceleratedShare = 0.5;

function acceleratedShareForCategory(card: CreditCard, category: SpendCategory) {
  const override = card.acceleratedShare?.[category];
  return typeof override === "number" && override >= 0 && override <= 1 ? override : defaultAcceleratedShare;
}
const defaultTopCardCount = 3;
const joiningBenefitAmortizationYears = 2;
const LOUNGE_QUERY_VALUE_WEIGHT = 30;
const GUEST_VISIT_WEIGHT = 2;

// Scoring stage weights: relevance (text/identity match) vs value (economic/preference fit)
const relevanceWeightExactMatch = 1.0;
const relevanceWeightBroadGeneric = 0.3;
const relevanceWeightDefault = 0.5;

// Popularity prior added to every card's score (popularityScore is ~50–100, so ~2,500–5,000).
const popularityRankingWeight = 50;

// Broad "best card" ranking blends each card's score across fixed light/mid/heavy/very-heavy
// annual-spend levels (instead of cherry-picking its single most-flattering tier, which let low-fee
// cards' yield blow up at trivial spend). A card must hold up across the range to rank high. The
// Rs 30L tier lets super-premium cards (e.g. Magnus Burgundy) that only pull ahead at very high
// spend show that strength instead of being capped at the Rs 20L tier.
const blendAnnualSpendLevels = [300000, 1000000, 2000000, 3000000]; // Rs 3L, 10L, 20L, 30L per year
// Weights for the envelope blend, aligned index-for-index with blendAnnualSpendLevels. Leaning the
// blend toward the higher-spend levels means cards whose value is gated behind heavy spend (bank
// tier programs that lift point value with spend, high fee-waiver thresholds, programme caps that
// only bind at low spend) are judged more on their heavy-spend strength than on trivial-spend yield.
const blendAnnualSpendLevelWeights = [1, 1.25, 1.5, 1.75];

// Representative monthly spend for each segment tier. A segment query implies a spend/income level,
// so instead of the envelope blend we score segment queries at the tier's typical spend (the default
// category mix scaled to this total). Higher tier -> higher spend.
const segmentRepresentativeMonthlySpend: Record<string, number> = {
  beginner: 25000,
  ltf: 25000,
  "mid-premium": 60000,
  premium: 120000,
  "super-premium": 250000
};
const exactCardNameMatchThreshold = 50000;

function isBroadNoSpendQuery(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  return (
    !input.spend &&
    !intent.inferredSpend &&
    intent.issuers.length === 0 &&
    intent.useCases.length === 0 &&
    intent.redemptionBuckets.length === 0 &&
    intent.networks.length === 0
  );
}

function isBroadGenericRankingQuery(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  if (!isBroadNoSpendQuery(input, intent)) return false;
  const normalizedQuery = normalizeForMatch(input.query);
  return /\b(top|best|recommend|recommended|suggest)\b/.test(normalizedQuery) &&
    /\bcards?\b/.test(normalizedQuery);
}

function shouldUseEnvelopeScoring(
  input: RecommendationInput,
  intent: ReturnType<typeof parseQueryIntent>,
  effectiveMaxAnnualFee: number | undefined,
  wantsLifetimeFree: boolean,
  wantsLounge: boolean
) {
  return (
    (isBroadGenericRankingQuery(input, intent) || wantsLifetimeFree || wantsLounge) &&
    effectiveMaxAnnualFee === undefined
  );
}

function scaleSpendProfileToMonthly(baseSpend: SpendProfile, monthlyTarget: number): SpendProfile {
  const currentMonthlyTotal = monthlySpendTotal(baseSpend);
  if (!currentMonthlyTotal) return baseSpend;

  const scale = monthlyTarget / currentMonthlyTotal;
  return Object.fromEntries(
    (Object.entries(baseSpend) as Array<[SpendCategory, number]>).map(([category, amount]) => [
      category,
      Math.round((amount ?? 0) * scale)
    ])
  ) as SpendProfile;
}

function formatEnvelopeSpendLabel(monthlySpend: number) {
  if (monthlySpend >= 100000) {
    const lakhs = monthlySpend / 100000;
    const formattedLakhs = Number.isInteger(lakhs) ? `${lakhs}` : lakhs.toFixed(1);
    return `Rs ${formattedLakhs}L+/month`;
  }

  return `Rs ${monthlySpend.toLocaleString("en-IN")}/month`;
}

function formatSpendInLakhs(amount: number): string {
  const lakhs = Math.round(amount / 10000) / 10;
  const formattedLakhs = Number.isInteger(lakhs) ? `${lakhs}` : lakhs.toFixed(1);
  return `${formattedLakhs}L`;
}

function normalizeText(value = "") {
  return value.toLowerCase().trim();
}

function normalizeForMatch(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeCompact(value = "") {
  return normalizeForMatch(value).replace(/\s+/g, "");
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsNormalizedPhrase(haystack: string, phrase: string) {
  const normalizedPhrase = normalizeForMatch(phrase);
  if (!normalizedPhrase) return false;

  const pattern = new RegExp(`(^|\\s)${escapeRegex(normalizedPhrase).replace(/ /g, "\\s+")}(?=\\s|$)`);
  return pattern.test(haystack);
}

const genericQueryWords = new Set([
  "best",
  "top",
  "card",
  "cards",
  "credit",
  "bank",
  "india",
  "indian",
  "for",
  "under",
  "with",
  "without",
  "vs",
  "compare",
  "good",
  "get",
  "give",
  "gives",
  "earn",
  "earning",
  "rewards",
  "reward",
  "points",
  "miles",
  "using",
  "use",
  "does",
  "do",
  "can",
  "will",
  "is",
  "are",
  "have",
  "has",
  "on",
  "for",
  "upi",
  "rupay",
  "cashback",
  "travel",
  "lounge"
]);

function getMeaningfulQueryTokens(query?: string) {
  return normalizeForMatch(query)
    .split(" ")
    .filter((token) => token.length > 1 && !genericQueryWords.has(token));
}

function buildCardSearchText(card: CreditCard) {
  return normalizeForMatch(
    [card.issuer, card.name, card.id.replace(/-/g, " "), ...card.tags, ...card.bestFor, ...card.network].join(" ")
  );
}

function computeQueryKeywordBoost(card: CreditCard, query?: string) {
  const meaningfulTokens = getMeaningfulQueryTokens(query);
  if (meaningfulTokens.length < 2) return 0;

  const searchableTokens = new Set(
    normalizeForMatch([card.issuer, card.name, card.id.replace(/-/g, " "), ...card.tags, ...card.bestFor].join(" "))
      .split(" ")
      .filter((token) => token.length > 2)
  );

  const matchedTokenCount = meaningfulTokens.filter((token) => searchableTokens.has(token)).length;
  if (matchedTokenCount === 0) return 0;

  return matchedTokenCount * 5000;
}

function computeCardNameBoost(card: CreditCard, query?: string) {
  const normalizedQuery = normalizeForMatch(query);
  const compactQuery = normalizeCompact(query);
  if (!normalizedQuery) return 0;

  const meaningfulTokens = getMeaningfulQueryTokens(query);
  if (meaningfulTokens.length === 0) return 0;

  const normalizedName = normalizeForMatch(card.name);
  const normalizedId = normalizeForMatch(card.id.replace(/-/g, " "));
  const compactName = normalizeCompact(card.name);
  const compactId = normalizeCompact(card.id.replace(/-/g, " "));
  const compactTags = card.tags.map((tag) => normalizeCompact(tag)).filter(Boolean);
  const searchText = buildCardSearchText(card);

  let boost = 0;

  if (normalizedName === normalizedQuery) return 120000;
  if (compactQuery && (compactName === compactQuery || compactId === compactQuery || compactTags.includes(compactQuery))) {
    return 115000;
  }
  if (searchText === normalizedQuery) return 110000;

  if (normalizedName.includes(normalizedQuery) && normalizedQuery.length >= 4) {
    boost += 80000;
  } else if (searchText.includes(normalizedQuery) && normalizedQuery.length >= 4) {
    boost += 60000;
  }

  const nameTokens = new Set(normalizedName.split(" "));
  const idTokens = new Set(normalizedId.split(" "));
  const matchedNameTokenCount = meaningfulTokens.filter(
    (token) => nameTokens.has(token) || idTokens.has(token)
  ).length;

  if (meaningfulTokens.length === 1) {
    if (matchedNameTokenCount === 1) {
      boost += 65000;
    }

    return boost;
  }

  if (matchedNameTokenCount === meaningfulTokens.length) {
    boost += 90000;
  } else if (matchedNameTokenCount >= 2) {
    boost += matchedNameTokenCount * 6000;
  }

  return boost;
}

function extractQueryTags(query?: string) {
  const text = normalizeText(query);
  const tags = new Set<string>();

  for (const tag of [
    "online",
    "cashback",
    "travel",
    "lounge",
    "forex",
    "amazon",
    "fuel",
    "lifetime free",
    "secured",
    "dining",
    "grocery",
    "utilities",
    "phonepe",
    "tata neu",
    "shoppers stop",
    "marriott",
    "irctc"
  ]) {
    if (text.includes(tag)) tags.add(tag);
  }

  if (text.includes("upi") || text.includes("rupay")) tags.add("upi");
  if (text.includes("free") || text.includes("zero fee")) tags.add("lifetime free");

  return tags;
}

function normalizeIssuer(issuer: string) {
  return normalizeForMatch(issuer).replace(/\s+(bank|card|cards|partner banks)$/i, "").trim();
}

function shouldIncludeSmartbuyLikeRewards(query?: string) {
  const normalizedQuery = normalizeForMatch(query);
  return ["smartbuy", "payzapp", "myntra", "flipkart", "cleartrip"].some((token) => normalizedQuery.includes(token));
}

function hasExplicitAnnualFeeLanguage(query?: string) {
  const normalizedQuery = normalizeForMatch(query);
  return normalizedQuery.includes("annual fee") || normalizedQuery.includes("renewal fee");
}

function shouldRestrictToIssuer(intent: ReturnType<typeof parseQueryIntent>, query?: string) {
  if (intent.issuers.length !== 1) return false;

  const normalizedQuery = normalizeForMatch(query);
  if (!normalizedQuery) return false;
  if (normalizedQuery.includes(" vs ") || normalizedQuery.includes(" compare ")) return false;

  return true;
}

function isCardRecommendationQuery(query?: string) {
  const normalizedQuery = normalizeForMatch(query);
  if (!normalizedQuery) return false;

  const asksForRecommendation = /\b(best|top|recommend|recommended|suggest|which)\b/.test(normalizedQuery);
  const mentionsCard = /\bcards?\b/.test(normalizedQuery);

  return asksForRecommendation && mentionsCard;
}

function hasUpiCardSignal(card: CreditCard) {
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

function shouldRestrictToUpiCards(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
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

function explicitNetworkFilters(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  if (!isCardRecommendationQuery(input.query)) return [];

  const normalizedQuery = normalizeForMatch(input.query);
  return intent.networks.filter((network) => {
    const normalizedNetwork = normalizeForMatch(network);
    if (normalizedNetwork === "american express") return /\b(amex|american express)\b/.test(normalizedQuery);
    if (normalizedNetwork === "diners club") return containsNormalizedPhrase(normalizedQuery, "diners");
    return containsNormalizedPhrase(normalizedQuery, normalizedNetwork);
  });
}

function cardMatchesNetworkFilter(card: CreditCard, network: string) {
  const normalizedNetwork = normalizeForMatch(network);
  return card.network.some((cardNetwork) => {
    const normalizedCardNetwork = normalizeForMatch(cardNetwork);
    return normalizedCardNetwork === normalizedNetwork || containsNormalizedPhrase(normalizedCardNetwork, normalizedNetwork);
  });
}

function hasFuelCardSignal(card: CreditCard) {
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

function shouldRestrictToFuelCards(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
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
function hasCashbackCardSignal(card: CreditCard) {
  return /cashback/i.test(card.rewardType);
}

// "Best cashback card" should rank actual cashback cards, not collapse to the generic premium-card
// envelope ranking (where points/miles super-premium cards win on raw value). Mirrors the fuel/UPI
// restriction: a cashback recommendation query restricts the pool to cashback cards.
function shouldRestrictToCashbackCards(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  const normalizedQuery = normalizeForMatch(input.query);
  const hasCashbackIntent = intent.useCases.includes("cashback") || normalizedQuery.includes("cashback");
  if (!hasCashbackIntent) return false;

  return isCardRecommendationQuery(input.query) || containsNormalizedPhrase(normalizedQuery, "cashback card");
}

function shouldRestrictToZeroForexCards(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  if (!intent.tags.includes("forex")) return false;

  const normalizedQuery = normalizeForMatch(input.query);
  return (
    containsNormalizedPhrase(normalizedQuery, "zero forex") ||
    containsNormalizedPhrase(normalizedQuery, "0 forex") ||
    containsNormalizedPhrase(normalizedQuery, "0 percent forex") ||
    containsNormalizedPhrase(normalizedQuery, "no forex markup")
  );
}

// Category-focused recommendation queries ("best dining/grocery/online/entertainment card") are
// ranked so cards that actually accelerate that category lead — instead of collapsing to the generic
// premium-card ranking. Each config drives: a query trigger, the reward rows that count, positioning
// signals, and (when the category is a real SpendCategory) a focused spend profile so the value score
// reflects the category too. Entertainment has no SpendCategory, so it gets filter+boost only.
type CategoryFocusConfig = {
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

const categoryFocusConfigs: CategoryFocusConfig[] = [
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
function detectCategoryFocus(
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
    if (!(isCardRecommendationQuery(input.query) || containsNormalizedPhrase(normalizedQuery, `${config.key} card`))) continue;
    // When the query already infers a spend profile, only earn-based focuses (rent/utilities) take it
    // over — so every phrasing of "rent"/"utility bills" ranks consistently. Other focuses defer to the
    // inferred spend (preserving e.g. "card for grocery spends" as a 100%-grocery profile).
    if (hasInferredSpend && !config.matchByEarning) return null;
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
function cardBaseRate(card: CreditCard): number {
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
function cardHasCategoryFocusTag(card: CreditCard, config: CategoryFocusConfig) {
  return (card.categoryFocusTags ?? []).includes(config.key);
}

// A card matches a category focus if it ACCELERATES that category (a matching reward row whose rate
// exceeds the card's base rate) OR is explicitly tagged for it. A row at the base rate with a
// category cap does not qualify on its own.
function cardPositioningMatchesFocus(card: CreditCard, config: CategoryFocusConfig) {
  const haystack = normalizeForMatch([card.name, ...card.bestFor, ...card.tags].join(" "));
  return config.positioning.some((token) => containsNormalizedPhrase(haystack, token));
}

// Whether the card earns any reward on a spend category (i.e. the category is not excluded). Used by
// matchByEarning focuses (rent/utilities) where rewarding the category at all is the relevant signal.
function cardEarnsOnSpendCategory(card: CreditCard, category: SpendCategory) {
  const breakdown = rewardBreakdownForCard(card, { [category]: 10000 } as SpendProfile, true);
  return breakdown.some((row) => row.spendCategory === category && row.monthlyReward > 0);
}

function cardMatchesCategoryFocus(card: CreditCard, config: CategoryFocusConfig) {
  if (cardHasCategoryFocusTag(card, config)) return true;
  // Earn-based focuses (rent/utilities): qualify if the card rewards the category at all.
  if (config.matchByEarning && config.spendCategory) return cardEarnsOnSpendCategory(card, config.spendCategory);
  const baseRate = cardBaseRate(card);
  if (card.rewards.some((reward) => config.rewardPattern.test(reward.category) && reward.rate > baseRate)) return true;
  // Brand/merchant focuses also qualify on positioning (the flagship co-brand carries the merchant in
  // its name/bestFor, not always in a reward-row category — e.g. HDFC Swiggy rewards under "dining").
  return Boolean(config.matchPositioning && cardPositioningMatchesFocus(card, config));
}

// Specialist score for a category-focused ranking: rewards a genuinely accelerated category reward
// row (above base) or an explicit category tag, plus category-forward positioning, so a
// category-specific card outranks one with only incidental earning there. Returns 0 for cards with
// no matching accelerator (they get the non-specialist penalty / are filtered out).
function categorySpecialistScore(card: CreditCard, config: CategoryFocusConfig) {
  const baseRate = cardBaseRate(card);
  const hasAcceleratedRow = card.rewards.some(
    (reward) => config.rewardPattern.test(reward.category) && reward.rate > baseRate
  );
  const hasPositioning = cardPositioningMatchesFocus(card, config);
  const earnsOnCategory = Boolean(
    config.matchByEarning && config.spendCategory && cardEarnsOnSpendCategory(card, config.spendCategory)
  );
  let score = 0;
  // A genuine accelerator, an explicit tag, merchant positioning, or — for earn-based focuses —
  // simply rewarding the category makes the card a specialist.
  if (hasAcceleratedRow || cardHasCategoryFocusTag(card, config) || (config.matchPositioning && hasPositioning) || earnsOnCategory) {
    score += 3;
  }
  if (hasPositioning) score += 2;
  return score;
}

function focusedSpendProfile(category: SpendCategory) {
  const monthlyTotal = Object.values(defaultSpendProfile).reduce((total, amount = 0) => total + amount, 0);
  return Object.fromEntries(
    Object.keys(defaultSpendProfile).map((key) => [key, key === category ? monthlyTotal : 0])
  ) as SpendProfile;
}

// Realistic monthly spend on a focused category, used when scoring a "best <category>/fuel card"
// query. Putting 100% of the default total on one category (~Rs 53k) made caps misfire — dedicated
// fuel cards hit their monthly caps while uncapped premium cards ran free. Since the category ranking
// uses only the focused category's reward, the rest of the profile is the default mix and doesn't
// affect order; only this amount (which drives caps) matters.
const categoryFocusMonthlySpend: Partial<Record<SpendCategory, number>> = {
  fuel: 7000,
  dining: 8000,
  grocery: 10000,
  online: 15000,
  amazon: 8000,
  utilities: 5000,
  rent: 50000,
  education: 15000,
  insurance: 5000,
  government: 5000
};
function categoryFocusSpendProfile(category: SpendCategory): SpendProfile {
  return { ...defaultSpendProfile, [category]: categoryFocusMonthlySpend[category] ?? 8000 };
}

// Spend profile for a category-focused recommendation that does NOT assume the card is used for
// nothing else: `share` of total monthly spend goes to the focused category, the rest keeps the
// default mix (re-normalised across the other categories). Reflects a realistic "I'd put most of my
// dining on this card and use other cards elsewhere" pattern instead of an unrealistic 100% focus.
function weightedFocusSpendProfile(category: SpendCategory, share: number): SpendProfile {
  const monthlyTotal = Object.values(defaultSpendProfile).reduce((total, amount = 0) => total + amount, 0);
  const focusAmount = monthlyTotal * share;
  const remaining = monthlyTotal - focusAmount;
  const entries = Object.entries(defaultSpendProfile) as Array<[SpendCategory, number]>;
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

function requiresRelationshipAccess(card: CreditCard) {
  const haystack = normalizeForMatch(
    [
      card.name,
      ...card.bestFor,
      ...card.tags,
      ...card.exclusions,
      ...(card.additionalBenefits ?? []),
      ...(card.additionalDetails ?? []),
      ...(card.internalNotes ?? []),
      ...(card.eligibility?.salaried ?? []),
      ...(card.eligibility?.selfEmployed ?? [])
    ].join(" ")
  );

  return [
    "invite only",
    "relationship",
    "pioneer",
    "burgundy",
    "solitaire",
    "priority banking",
    "private banking",
    "wealth management",
    "approval required"
  ].some((token) => haystack.includes(token));
}

function shouldHideCardFromGenericRanking(card: CreditCard, input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  const isAtlas = card.id === "axis-atlas";
  const isDiscontinued = card.status === "discontinued";

  if (!isAtlas && !isDiscontinued) return false;

  const cardNameBoost = computeCardNameBoost(card, input.query);
  const userExplicitlyAsked = cardNameBoost >= exactCardNameMatchThreshold;

  if (userExplicitlyAsked) return false;

  return isBroadGenericRankingQuery(input, intent);
}

function cardUseCaseStrength(card: CreditCard, useCase: string) {
  const haystack = normalizeForMatch([card.name, ...card.tags, ...card.bestFor, ...card.rewards.map((reward) => reward.category)].join(" "));

  if (useCase === "cashback") {
    let score = 0;
    if (haystack.includes("cashback") || card.rewardType.toLowerCase().includes("cashback")) score += 3;
    if (card.rewards.some((reward) => reward.rate >= 3)) score += 1;
    return score;
  }

  if (useCase === "travel") {
    let score = 0;
    if (card.rewards.some((reward) => ["travel", "airlines", "hotel", "hotels", "smartbuy flights", "smartbuy hotels"].includes(reward.category))) {
      score += 3;
    }
    if (["travel", "miles", "airline", "hotel", "hotels", "flights"].some((token) => containsNormalizedPhrase(haystack, token))) {
      score += 2;
    }
    if (card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited" || card.loungeDomestic + card.loungeInternational > 0) {
      score += 1;
    }
    return score;
  }

  return 0;
}

export function cardMatchesSegment(card: CreditCard, segment: string) {
  const haystack = normalizeForMatch([card.name, ...card.tags, ...card.bestFor].join(" "));

  if (segment === "ltf") return card.annualFee === 0 || containsNormalizedPhrase(haystack, "lifetime free") || containsNormalizedPhrase(haystack, "ltf");
  // Fee-based tiers (non-overlapping): mid-premium Rs 1,000–5,000, premium Rs 5,000–10,000,
  // super-premium Rs 10,000+. Super-premium also covers invite-only cards regardless of listed fee.
  if (segment === "super-premium") return containsNormalizedPhrase(haystack, "super premium") || containsNormalizedPhrase(haystack, "invite") || card.annualFee >= 10000;
  if (segment === "premium") return card.annualFee >= 5000 && card.annualFee < 10000;
  if (segment === "mid-premium") {
    // Invite-only/relationship cards are premium products, not mid-tier.
    if (requiresRelationshipAccess(card)) return false;
    return (
      containsNormalizedPhrase(haystack, "mid premium") ||
      containsNormalizedPhrase(haystack, "mid-tier") ||
      (card.annualFee > 1000 && card.annualFee < 5000)
    );
  }
  if (segment === "beginner") {
    // Invite-only / relationship cards (e.g. an LTF Kotak Solitaire) are premium products, not
    // beginner cards, even when their fee is 0.
    if (requiresRelationshipAccess(card)) return false;
    return (
      containsNormalizedPhrase(haystack, "beginner") ||
      containsNormalizedPhrase(haystack, "starter") ||
      containsNormalizedPhrase(haystack, "secured") ||
      card.annualFee <= 1000
    );
  }

  return false;
}

function cardMatchesRedemptionBucket(card: CreditCard, bucket: string) {
  const haystack = normalizeForMatch(
    [card.name, ...card.tags, ...(card.additionalBenefits ?? []), ...(card.additionalDetails ?? []), ...(card.internalNotes ?? [])].join(" ")
  );

  if (bucket === "accor") return Boolean(card.redemption?.accorValue);
  if (bucket === "air-india") return containsNormalizedPhrase(haystack, "air india");

  return false;
}

function qualifiesAsTravelCard(card: CreditCard): boolean {
  return (
    (card.redemption?.airlinePartners?.length || card.redemption?.hotelPartners?.length ? true : false) ||
    loungeScore(card) > 0 ||
    card.forexMarkup === 0
  );
}

export function getAirMilesValue(card: CreditCard): number | undefined {
  if (typeof card.redemption?.airMilesValue === "number") {
    return card.redemption.airMilesValue;
  }
  if (card.redemption?.airlinePartners && card.redemption.airlinePartners.length > 0) {
    let maxRatioValue = 0;
    for (const partner of card.redemption.airlinePartners) {
      if (partner.ratio) {
        const parts = partner.ratio.replace(/,/g, "").split(":");
        if (parts.length === 2) {
          const x = parseFloat(parts[0].trim());
          const y = parseFloat(parts[1].trim());
          if (x > 0 && y > 0) {
            const ratioVal = y / x;
            if (ratioVal > maxRatioValue) {
              maxRatioValue = ratioVal;
            }
          }
        }
      }
    }
    if (maxRatioValue > 0) {
      return maxRatioValue;
    }
  }
  return undefined;
}

function redemptionPreferenceValueBoost(card: CreditCard, bucket: string) {
  if (bucket === "accor" && typeof card.redemption?.accorValue === "number") {
    return Math.round(card.redemption.accorValue * 10000);
  }

  const airMilesVal = getAirMilesValue(card);
  if (bucket === "air-india" && typeof airMilesVal === "number") {
    return Math.round(airMilesVal * 3000);
  }

  return 0;
}

function monthlySpendTotal(spend: SpendProfile) {
  return Object.values(spend).reduce((total, amount = 0) => total + amount, 0);
}

function annualSpendTotal(spend: SpendProfile) {
  return monthlySpendTotal(spend) * 12;
}

function parseRupeeAmount(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;

  const lakhMatch = normalized.match(/(\d+(?:\.\d+)?)\s*lakh/i);
  if (lakhMatch) {
    return Math.round(Number(lakhMatch[1]) * 100000);
  }

  const plainMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!plainMatch) return null;

  return Math.round(Number(plainMatch[1]));
}

export function extractMilestoneThreshold(text: string) {
  const normalized = text.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
  const lakhMatch =
    normalized.match(/annual spend(?:s|ing)?(?: of| above| greater than)? rs (\d+(?:\.\d+)?) lakh(?:s)?/) ??
    normalized.match(/spend(?:s)? of rs (\d+(?:\.\d+)?) lakh(?:s)?/) ??
    normalized.match(/spending rs (\d+(?:\.\d+)?) lakh(?:s)?/) ??
    normalized.match(/rs (\d+(?:\.\d+)?) lakh(?:s)? or more/) ??
    normalized.match(/rs (\d+(?:\.\d+)?) lakh(?:s)?\s+(?:annual\s+)?spend/);

  if (lakhMatch) {
    return Math.round(Number(lakhMatch[1]) * 100000);
  }

  const numMatch =
    normalized.match(/(?:spends|spending|spend|spendings)(?: of| above| greater than| at| on)?(?: rs)?\s*(\d{4,9})/) ??
    normalized.match(/(?:rs)?\s*(\d{4,9}) or more(?: annual| quarterly| statement)? spend/) ??
    normalized.match(/spend (?:rs)?\s*(\d{4,9})/);

  if (numMatch) {
    return Number(numMatch[1]);
  }

  return null;
}

function estimatePointUnitValue(card: CreditCard) {
  // Transfer-partner value per card reward unit = partnerPointValue x transferRatio (same formula the
  // calculator uses). Without this the ranking ignored cards whose best redemption is a partner
  // transfer (e.g. Magnus Burgundy's EDGE points -> Club ITC at Rs 0.8), undervaluing them.
  const transferValues = (card.redemption?.transferPartnerValuations ?? [])
    .map((partner) => partner.partnerPointValue * partner.transferRatio)
    .filter((value) => typeof value === "number" && value > 0);

  const values = [
    card.redemption?.ecosystemValue,
    card.redemption?.smartBuyFlightHotelValue,
    card.redemption?.travelEdgeValue,
    card.redemption?.travelPortalValue,
    getAirMilesValue(card),
    card.redemption?.statementBalanceValue,
    card.redemption?.accorValue,
    ...transferValues
  ].filter((value): value is number => typeof value === "number" && value > 0);

  if (values.length === 0) return 0;
  return Math.max(...values);
}

// Brand-locked reward currencies (Adani, IRCTC, IndiGo BluChips, etc.) are worth less than their
// nominal rupee value because redemption is confined to one ecosystem with limited choice. Discount
// their reward value for ranking; near-cash rewards (statement credit, Flipkart/Amazon/Myntra/Swiggy/
// Tata Neu) keep full value. See the rewardLiquidity field in lib/types.ts.
const brandLockedRewardValueMultiplier = 0.75;

// Fuel spend at or above this share of the monthly profile counts as "fuel-heavy": the cardholder
// will redeem fuel-locked points for fuel, so those points keep full value in ranking (like an
// explicit fuel-card query). Note input.spend MERGES with the default profile, so an elevated fuel
// figure is diluted by the other default categories — the default broad profile sits at ~5.7% fuel
// and a fuel-emphasised profile (e.g. fuel 7k on top of defaults) lands near ~9%.
const fuelHeavySpendShare = 0.08;

// Fraction of nominal reward value realized in scoring. An explicit rewardLiquidityFactor wins;
// otherwise brand-locked currencies take the default haircut and everything else is full value.
function rewardLiquidityMultiplier(card: CreditCard, fuelFocus = false) {
  // Under a fuel-focused query the cardholder redeems these points for fuel (their native ecosystem),
  // so a fuel-locked currency (e.g. IndianOil Fuel Points) is realized at full value instead of the
  // brand-locked haircut it takes in broad comparisons.
  if (fuelFocus && /fuel/i.test(card.redemption?.ecosystemLabel ?? "")) {
    return 1;
  }
  if (typeof card.rewardLiquidityFactor === "number" && card.rewardLiquidityFactor > 0 && card.rewardLiquidityFactor <= 1) {
    return card.rewardLiquidityFactor;
  }
  return card.rewardLiquidity === "brand-locked" ? brandLockedRewardValueMultiplier : 1;
}

function rewardUnitValue(card: CreditCard, fuelFocus = false) {
  return baseRewardUnitValue(card) * rewardLiquidityMultiplier(card, fuelFocus);
}

// Point value used for scoring at a given monthly spend. Cards with a bank spend-tier program
// (redemption.pointValueTiers, e.g. Equitas PowerMiles) are valued at the tier matching the spend
// — a low-spender gets the floor value, a high-spender the top value — so the envelope blend
// reflects "you need high spend to unlock the good redemption". Everything else uses the flat value.
// `faceValue` returns the full reward unit value with no liquidity haircut (for display); the default
// applies the liquidity multiplier (for ranking). `fuelFocus` lets a fuel-locked currency keep full
// value under a fuel-focused query.
function effectivePointValue(card: CreditCard, monthlySpend: number, fuelFocus = false, faceValue = false): number {
  const tiers = card.redemption?.pointValueTiers;
  if (tiers && tiers.length) {
    const tier = [...tiers]
      .sort((a, b) => b.minMonthlySpend - a.minMonthlySpend)
      .find((t) => monthlySpend >= t.minMonthlySpend);
    if (tier) return tier.value;
  }
  return faceValue ? baseRewardUnitValue(card) : rewardUnitValue(card, fuelFocus);
}

function baseRewardUnitValue(card: CreditCard) {
  const rewardType = normalizeForMatch(card.rewardType);

  if (rewardType.includes("cashback")) return 1;

  const explicitValue = estimatePointUnitValue(card);
  if (explicitValue > 0) return explicitValue;

  if (
    rewardType.includes("point") ||
    rewardType.includes("mile") ||
    rewardType.includes("coin") ||
    rewardType.includes("credit")
  ) {
    const fallbackValue = estimateFallbackPointUnitValue(card);
    return fallbackValue > 0 ? fallbackValue : 1;
  }

  return 1;
}

function estimateFallbackPointUnitValue(card: CreditCard) {
  const rewardType = normalizeForMatch(card.rewardType);
  if (rewardType.includes("edge miles")) return 1;
  if (rewardType.includes("mile")) return 1;
  if (rewardType.includes("marriott bonvoy")) return 0.6;
  if (rewardType.includes("membership rewards")) return 0.6;

  return 0;
}

export function estimateBenefitLineValue(card: CreditCard, benefit: string) {
  const normalizedMatch = normalizeForMatch(benefit);

  if (normalizedMatch.includes("fee waived") || normalizedMatch.includes("fee waiver") || normalizedMatch.includes("fee reversal")) {
    return 0;
  }

  let value = 0;
  const isVoucherBenefit = /\bvoucher(s)?\b/i.test(benefit);
  const normalized = benefit.toLowerCase();

  const voucherDiscount = 0.5;

  // "rs X worth" — discounted when the line describes vouchers, full value otherwise
  for (const match of benefit.matchAll(/rs\s+([\d,.]+(?:\.\d+)?)\s+worth/gi)) {
    const parsed = parseRupeeAmount(match[1]);
    if (parsed) value += isVoucherBenefit ? Math.round(parsed * voucherDiscount) : parsed;
  }

  // "voucher(s) worth rs X" — always discounted
  for (const match of benefit.matchAll(/vouchers?\s+worth\s+rs\s+([\d,.]+(?:\.\d+)?)/gi)) {
    const parsed = parseRupeeAmount(match[1]);
    if (parsed) value += Math.round(parsed * voucherDiscount);
  }

  // "rs X voucher(s)" — always discounted
  for (const match of benefit.matchAll(/rs\s+([\d,.]+(?:\.\d+)?)\s+vouchers?/gi)) {
    const parsed = parseRupeeAmount(match[1]);
    if (parsed) value += Math.round(parsed * voucherDiscount);
  }

  // "cashback of rs X" — always full value
  for (const match of benefit.matchAll(/cashback of rs ([\d,.]+(?:\.\d+)?)/gi)) {
    const parsed = parseRupeeAmount(match[1]);
    if (parsed) value += parsed;
  }

  // "worth rs X" not preceded by "voucher(s)" — discounted when the line is a voucher benefit, full value otherwise
  for (const match of benefit.matchAll(/(?<!vouchers? )worth rs ([\d,.]+(?:\.\d+)?)/gi)) {
    const parsed = parseRupeeAmount(match[1]);
    if (parsed) value += isVoucherBenefit ? Math.round(parsed * voucherDiscount) : parsed;
  }

  const pointValue = estimatePointUnitValue(card) || estimateFallbackPointUnitValue(card);
  if (pointValue > 0) {
    const pointPattern =
      /([\d,]+)\s+(?:bonus\s+|additional\s+)?(?:marriott bonvoy points|edge miles|membership rewards points|reward points|points)\b/gi;
    const matches = benefit.matchAll(pointPattern);
    for (const match of matches) {
      const points = Number(match[1].replace(/,/g, ""));
      if (!Number.isNaN(points) && points > 0) {
        value += Math.round(points * pointValue);
      }
    }

    const freeNightMatch = normalized.match(/free night award(?: valued at| redeemable .*? up to)? (\d[\d,]*) marriott bonvoy points/);
    if (freeNightMatch) {
      const points = Number(freeNightMatch[1].replace(/,/g, ""));
      if (!Number.isNaN(points) && points > 0) {
        value = Math.max(value, Math.round(points * pointValue));
      }
    }
  }

  return value;
}

export function estimateMilestoneLineValue(card: CreditCard, benefit: string) {
  return estimateBenefitLineValue(card, benefit);
}

function milestoneValueForCard(card: CreditCard, annualSpend: number) {
  // Currency (non-voucher) milestones are paid in the card's reward currency, so a brand-locked
  // currency (e.g. IndiGo BluChips at 0.5) is worth proportionally less here too — apply the same
  // liquidity haircut as per-spend rewards. Vouchers are excluded: they're already net via the
  // voucher convention, and double-discounting them would understate their value.
  const liquidity = rewardLiquidityMultiplier(card);
  return milestoneRulesForCard(card).reduce((total, rule) => {
    if (annualSpend < rule.threshold) return total;
    return total + (rule.isVoucher ? rule.value : Math.round(rule.value * liquidity));
  }, 0);
}

export type MilestoneRule = {
  /** Annual spend (Rs) that unlocks this milestone; 0 means it always applies. */
  threshold: number;
  /** Estimated annual rupee value of the milestone, using the same logic as the recommender. */
  value: number;
  /** Human-readable benefit text. */
  label: string;
  /** Whether the benefit is a voucher. */
  isVoucher?: boolean;
  /** Period the milestone repeats over (display only; threshold/value are already annualized). */
  period?: Milestone["period"];
};

// Prefer reviewed structured milestones; fall back to parsing milestoneBenefits prose. Both paths
// yield annualized rules (annual spend gate + annual value) so every consumer reads one shape.
export function milestoneRulesForCard(card: CreditCard): MilestoneRule[] {
  const rules = card.milestones?.length
    ? structuredMilestoneRules(card.milestones)
    : textMilestoneRules(card);
  return rules.filter((rule) => rule.value > 0).sort((a, b) => a.threshold - b.threshold);
}

function structuredMilestoneRules(milestones: Milestone[]): MilestoneRule[] {
  return milestones.map((milestone) => {
    // Annualize so a quarterly Rs 500 / Rs 50k milestone scores as 4 × per year, not once.
    const multiplier = milestone.period === "quarterly" ? 4 : milestone.period === "monthly" ? 12 : 1;
    return {
      threshold: milestone.threshold * multiplier,
      value: milestone.value * multiplier,
      label: milestone.label,
      isVoucher: milestone.kind === "voucher",
      period: milestone.period
    };
  });
}

function textMilestoneRules(card: CreditCard): MilestoneRule[] {
  return (card.milestoneBenefits ?? []).map((benefit) => ({
    threshold: extractMilestoneThreshold(benefit) ?? 0,
    value: estimateMilestoneLineValue(card, benefit),
    label: stripScoringAnnotations(benefit),
    isVoucher: /\bvoucher(s)?\b/i.test(benefit)
  }));
}

export function joiningAndRenewalBenefitValueForCard(card: CreditCard) {
  // Prefer the structured valued fields; fall back to the text parse (+ additionalBenefits keyword
  // classification) for un-migrated cards. Each side is independent.
  let joiningValue: number;
  if (card.joiningBenefitsValued?.length) {
    joiningValue = card.joiningBenefitsValued.reduce((total, benefit) => total + benefit.value, 0);
  } else {
    const joiningLines = new Set<string>(card.joiningBenefits ?? []);
    for (const benefit of card.additionalBenefits ?? []) {
      const normalized = normalizeForMatch(benefit);
      // Renewal keywords take precedence (a renewal line is never counted as joining).
      if (
        !/\b(renewal|anniversary)\b/.test(normalized) &&
        /\b(joining|welcome|fee levy|fee realization|first year|within 90 days|card open date)\b/.test(normalized)
      ) {
        joiningLines.add(benefit);
      }
    }
    joiningValue = [...joiningLines].reduce((total, benefit) => total + estimateBenefitLineValue(card, benefit), 0);
  }

  let renewalValue: number;
  if (card.renewalBenefitsValued?.length) {
    renewalValue = card.renewalBenefitsValued.reduce((total, benefit) => total + benefit.value, 0);
  } else {
    const renewalLines = new Set<string>();
    for (const benefit of card.additionalBenefits ?? []) {
      if (/\b(renewal|anniversary)\b/.test(normalizeForMatch(benefit))) renewalLines.add(benefit);
    }
    renewalValue = [...renewalLines].reduce((total, benefit) => total + estimateBenefitLineValue(card, benefit), 0);
  }

  return { joiningValue, renewalValue };
}

// milestoneSpecialistBoost removed (redundant with estimatedNetValue/estimatedMilestoneValue)

function aliasesForSpendCategory(category: SpendCategory, includeSmartbuyLikeRewards: boolean) {
  if (category === "online") {
    return includeSmartbuyLikeRewards ? [...spendAliases.online, ...specialOnlineSpendAliases] : spendAliases.online;
  }

  if (category === "travel") {
    return includeSmartbuyLikeRewards ? [...spendAliases.travel, ...specialTravelSpendAliases] : spendAliases.travel;
  }

  if (category === "hotels") {
    return includeSmartbuyLikeRewards ? [...spendAliases.hotels, "travel with points hotels"] : spendAliases.hotels;
  }

  if (category === "airlines") {
    return includeSmartbuyLikeRewards ? [...spendAliases.airlines, "travel with points flights"] : spendAliases.airlines;
  }

  if (category === "grocery") {
    return includeSmartbuyLikeRewards ? [...spendAliases.grocery, ...specialOnlineSpendAliases] : spendAliases.grocery;
  }

  return spendAliases[category];
}

function specialAliasesForSpendCategory(category: SpendCategory) {
  if (category === "online") return specialOnlineSpendAliases;
  if (category === "travel") return ["smartbuy", ...specialTravelSpendAliases];
  if (category === "grocery") return ["smartbuy", ...specialOnlineSpendAliases];
  return [];
}

function exclusionTextForCard(card: CreditCard) {
  return normalizeForMatch(card.exclusions.join(" "));
}

function specialSpendRuleForCard(card: CreditCard, category: SpendCategory) {
  return card.specialSpendRules?.find((rule) => rule.category === category) ?? null;
}

function isSpendCategoryExcluded(card: CreditCard, category: SpendCategory) {
  const specialRule = specialSpendRuleForCard(card, category);
  if (specialRule) {
    return specialRule.treatment === "excluded";
  }

  const mappedCodes = SPEND_CATEGORY_EXCLUSION_CODE_MAP[category];
  if (mappedCodes && card.exclusionCodes?.some((code) => mappedCodes.includes(code))) {
    return true;
  }

  const exclusionText = exclusionTextForCard(card);
  return card.exclusions.some((line) => {
    const normalizedLine = normalizeForMatch(line);
    const categoryTerms = spendAliases[category].map((alias) => normalizeForMatch(alias));
    const matchesCategory = categoryTerms.some((term) => containsNormalizedPhrase(normalizedLine, term));
    if (!matchesCategory) return false;

    if (category === "online" && /\b(gaming|lottery|gambling|betting|education|school|college|tuition|insurance|rent|wallet|government|tax|utilities|bill)\b/.test(normalizedLine)) {
      return false;
    }

    if (category === "base" && /\b(fuel|rent|insurance|wallet|government|tax|utilities|bill|gaming|school|education|college|tuition)\b/.test(normalizedLine)) {
      return false;
    }

    if (/\b(cap|capped|upto|up to|up-to|max|max\.?|below|under|less than|or below|or less)\b/.test(normalizedLine)) {
      return false;
    }

    return true;
  });
}

function cappedSpendAmountForCategory(card: CreditCard, category: SpendCategory, amount: number) {
  const specialRule = specialSpendRuleForCard(card, category);
  if (!specialRule || specialRule.treatment !== "capped") return amount;

  let cappedAmount = amount;
  if (typeof specialRule.capMonthlySpend === "number" && specialRule.capMonthlySpend >= 0) {
    cappedAmount = Math.min(cappedAmount, specialRule.capMonthlySpend);
  }
  if (typeof specialRule.capAnnualSpend === "number" && specialRule.capAnnualSpend >= 0) {
    cappedAmount = Math.min(cappedAmount, Math.round(specialRule.capAnnualSpend / 12));
  }
  return cappedAmount;
}

function isBaseRewardCategory(category: string): boolean {
  const lower = category.toLowerCase();
  return lower === "base" || lower === "retail" || lower === "offline";
}

function findBaseRewardForSpend(card: CreditCard, category: SpendCategory) {
  const aliases = spendAliases[category];
  const targetCategoryLower = category.toLowerCase();
  return (
    card.rewards.find((reward) => {
      const rewardCategories = reward.category.split(",").map((c) => c.trim().toLowerCase());
      return (
        aliases.some((alias) => rewardCategories.includes(alias.toLowerCase())) ||
        rewardCategories.includes(targetCategoryLower)
      );
    }) ??
    card.rewards.find((reward) => isBaseRewardCategory(reward.category))
  );
}

// Finds the first reward whose (comma-split) category matches any of the given aliases, with no base
// fallback — returns null when the card has no such row. Used to detect distinct flights/hotels rows.
function findRewardByCategoryAliases(card: CreditCard, aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase());
  return (
    card.rewards.find((reward) => {
      const rewardCategories = reward.category.split(",").map((c) => c.trim().toLowerCase());
      return normalizedAliases.some((alias) => rewardCategories.includes(alias));
    }) ?? null
  );
}

function findSpecialRewardForSpend(card: CreditCard, category: SpendCategory) {
  const aliases = specialAliasesForSpendCategory(category);
  if (aliases.length === 0) return null;
  return (
    card.rewards.find((reward) => {
      const rewardCategories = reward.category.split(",").map((c) => c.trim().toLowerCase());
      return aliases.some((alias) => rewardCategories.includes(alias.toLowerCase()));
    }) ?? null
  );
}

// A "partner merchants" row is a narrow accelerator (a named co-brand/merchant set, not a whole
// category) that applies to only a share of any category's spend. Used to blend such a row against
// the base rate for categories beyond online/grocery — opt-in per card via `acceleratedShare`.
function findPartnerMerchantsReward(card: CreditCard) {
  return (
    card.rewards.find((reward) =>
      reward.category
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .includes("partner merchants")
    ) ?? null
  );
}

// Spend-tiered earning: when a category maps to multiple reward rows that each carry a structured
// monthly-spend tier (`tierLowerBound`/`tierUpperBound`), bucket the (monthly) spend across the tiers
// and return one allocation per tier — mirroring the calculator's allocateTieredRewardUnits so the two
// engines agree. Returns null unless 2+ matching rows exist and all of them are tiered.
function tieredAllocationsForCategory(card: CreditCard, category: SpendCategory, monthlyAmount: number) {
  const aliases = spendAliases[category];
  const targetCategoryLower = category.toLowerCase();
  const matching = card.rewards.filter((reward) => {
    // total-monthly-spend tiers are pooled across categories in rewardBreakdownForCard, not bucketed
    // per category here, so exclude them from per-category tiering.
    if (reward.tierScope === "total-monthly-spend") return false;
    const rewardCategories = reward.category.split(",").map((c) => c.trim().toLowerCase());
    return aliases.some((alias) => rewardCategories.includes(alias.toLowerCase())) || rewardCategories.includes(targetCategoryLower);
  });
  if (matching.length <= 1) return null;
  if (matching.some((reward) => reward.tierLowerBound === undefined)) return null;

  const sorted = [...matching].sort((a, b) => (a.tierLowerBound ?? 0) - (b.tierLowerBound ?? 0));
  const allocations: Array<{ amount: number; reward: Reward }> = [];
  for (const reward of sorted) {
    const lower = reward.tierLowerBound ?? 0;
    const upper = reward.tierUpperBound ?? monthlyAmount;
    const bucket = Math.max(Math.min(monthlyAmount, upper) - lower, 0);
    if (bucket > 0) allocations.push({ amount: bucket, reward });
  }
  return allocations.length ? allocations : null;
}

type RewardAllocation = { amount: number; reward: Reward };

const upiRoutableSpendCategories = new Set<SpendCategory>([
  "online",
  "base",
  "travel",
  "hotels",
  "airlines",
  "dining",
  "grocery",
  "amazon",
  "utilities"
]);

function rewardHasCategory(reward: Reward, category: string) {
  return reward.category.split(",").map((c) => c.trim().toLowerCase()).includes(category);
}

function findUpiRewardForRouting(card: CreditCard) {
  return card.rewards.find((reward) => rewardHasCategory(reward, "upi")) ?? null;
}

function estimateMonthlyRewardForAllocations(card: CreditCard, allocations: RewardAllocation[], totalMonthlySpend: number) {
  const cardUnitValue = effectivePointValue(card, totalMonthlySpend);
  const working = [...allocations];

  const totalScoped = card.rewards.filter((reward) => reward.tierScope === "total-monthly-spend");
  const lowerTier = totalScoped.find((reward) => reward.tierUpperBound != null);
  const upperTier = totalScoped.find((reward) => (reward.tierUpperBound ?? null) === null && (reward.tierLowerBound ?? 0) > 0);
  if (lowerTier && upperTier && lowerTier !== upperTier && lowerTier.tierUpperBound != null) {
    const threshold = lowerTier.tierUpperBound;
    const pool = working.filter((a) => a.reward === lowerTier).reduce((sum, a) => sum + a.amount, 0);
    if (pool > threshold) {
      const lowerShare = threshold / pool;
      const retiered: RewardAllocation[] = [];
      for (const allocation of working) {
        if (allocation.reward !== lowerTier) {
          retiered.push(allocation);
          continue;
        }
        retiered.push({ amount: allocation.amount * lowerShare, reward: lowerTier });
        retiered.push({ amount: allocation.amount * (1 - lowerShare), reward: upperTier });
      }
      working.length = 0;
      working.push(...retiered);
    }
  }

  const itemUnitValue = (reward: Reward) =>
    typeof reward.valuePerUnit === "number" && reward.valuePerUnit > 0 ? reward.valuePerUnit : cardUnitValue;
  const buckets = new Map<string | Reward, RewardAllocation[]>();
  for (const allocation of working) {
    const key = allocation.reward.capGroup ?? allocation.reward;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(allocation);
  }

  let total = 0;
  for (const [key, items] of buckets.entries()) {
    const itemRaw = items.map((item) => ({ item, raw: (item.amount * item.reward.rate) / 100 }));
    const totalRawReward = itemRaw.reduce((sum, x) => sum + x.raw, 0);
    let totalCappedReward = totalRawReward;

    if (typeof key === "string") {
      const cap = items[0].reward.capMonthly;
      totalCappedReward = typeof cap === "number" && cap > 0 ? Math.min(totalRawReward, cap) : totalRawReward;
    } else if (key.capMonthly) {
      if (key.postCapRate && key.postCapRate > 0 && totalRawReward > key.capMonthly && key.postCapRate < key.rate) {
        const totalSpend = items.reduce((sum, item) => sum + item.amount, 0);
        const spendAtCap = (key.capMonthly * 100) / key.rate;
        const excessSpend = Math.max(totalSpend - spendAtCap, 0);
        totalCappedReward = key.capMonthly + (excessSpend * key.postCapRate) / 100;
      } else {
        totalCappedReward = Math.min(totalRawReward, key.capMonthly);
      }
    }

    for (const { item, raw } of itemRaw) {
      const cappedUnits = totalRawReward > 0 ? (totalCappedReward * raw) / totalRawReward : 0;
      total += cappedUnits * itemUnitValue(item.reward);
    }
  }

  return total;
}

function routeToUpiWhenBetter(
  card: CreditCard,
  category: SpendCategory,
  amount: number,
  nativeAllocations: RewardAllocation[],
  totalMonthlySpend: number
) {
  if (category === "upi" || !upiRoutableSpendCategories.has(category)) return nativeAllocations;
  const upiReward = findUpiRewardForRouting(card);
  if (!upiReward || nativeAllocations.some((allocation) => allocation.reward === upiReward)) return nativeAllocations;

  const upiAllocations = [{ amount, reward: upiReward }];
  const nativeValue = estimateMonthlyRewardForAllocations(card, nativeAllocations, totalMonthlySpend);
  const upiValue = estimateMonthlyRewardForAllocations(card, upiAllocations, totalMonthlySpend);
  return upiValue > nativeValue ? upiAllocations : nativeAllocations;
}

function rewardAllocationsForSpend(
  card: CreditCard,
  category: SpendCategory,
  amount: number,
  includeSmartbuyLikeRewards: boolean,
  totalMonthlySpend: number
) {
  if (!amount || amount <= 0) return [] as RewardAllocation[];

  const effectiveAmount = cappedSpendAmountForCategory(card, category, amount);
  if (!effectiveAmount || effectiveAmount <= 0) return [] as RewardAllocation[];

  if (includeSmartbuyLikeRewards) {
    const matchingReward = findRewardForSpend(card, category, true);
    const allocations = matchingReward ? [{ amount: effectiveAmount, reward: matchingReward }] : [];
    return routeToUpiWhenBetter(card, category, effectiveAmount, allocations, totalMonthlySpend);
  }

  if (category === "travel") {
    // Issuer-portal flights/hotels tiers (e.g. SmartBuy or "travel with points") apply only to
    // bookings made through the portal. Matching is limited to those — generic "airlines"/"hotels"
    // co-brand rows represent direct airline/hotel spend, not general travel.
    const flightsReward = findRewardByCategoryAliases(card, ["smartbuy flights", "travel with points flights"]);
    const hotelsReward = findRewardByCategoryAliases(card, ["smartbuy hotels", "travel with points hotels"]);
    const hasPortalPair = Boolean(flightsReward && hotelsReward && flightsReward !== hotelsReward);
    // The card's everyday travel rate, if it has a dedicated flat "travel"/IRCTC row.
    const everydayTravelReward = findDirectRewardForSpend(card, category, false);

    if (hasPortalPair && everydayTravelReward) {
      // Card has both a portal (flights+hotels) and a flat everyday rate (e.g. HSBC TravelOne): a
      // share of travel is booked via the portal at the higher tier (split 50/50 flights/hotels,
      // each capped), the rest earns the everyday rate.
      const portalShare = acceleratedShareForCategory(card, "travel");
      if (portalShare <= 0) {
        return routeToUpiWhenBetter(card, category, effectiveAmount, [{ amount: effectiveAmount, reward: everydayTravelReward }], totalMonthlySpend);
      }
      if (portalShare >= 1) {
        return routeToUpiWhenBetter(card, category, effectiveAmount, [
          { amount: effectiveAmount * 0.5, reward: flightsReward! },
          { amount: effectiveAmount * 0.5, reward: hotelsReward! }
        ], totalMonthlySpend);
      }
      return routeToUpiWhenBetter(card, category, effectiveAmount, [
        { amount: effectiveAmount * portalShare * 0.5, reward: flightsReward! },
        { amount: effectiveAmount * portalShare * 0.5, reward: hotelsReward! },
        { amount: effectiveAmount * (1 - portalShare), reward: everydayTravelReward }
      ], totalMonthlySpend);
    }

    // Everyday rate only: portal tiers don't apply to general travel on these cards.
    if (everydayTravelReward) {
      return routeToUpiWhenBetter(card, category, effectiveAmount, [{ amount: effectiveAmount, reward: everydayTravelReward }], totalMonthlySpend);
    }

    // Portal only (no everyday rate, e.g. SmartBuy cards): split 50/50 flights/hotels rather than
    // routing all travel to the single higher-rate (hotels) tier.
    if (hasPortalPair) {
      return routeToUpiWhenBetter(card, category, effectiveAmount, [
        { amount: effectiveAmount * 0.5, reward: flightsReward! },
        { amount: effectiveAmount * 0.5, reward: hotelsReward! }
      ], totalMonthlySpend);
    }
    const travelReward = findRewardForSpend(card, category, true);
    const allocations = travelReward ? [{ amount: effectiveAmount, reward: travelReward }] : [];
    return routeToUpiWhenBetter(card, category, effectiveAmount, allocations, totalMonthlySpend);
  }

  const tieredAllocations = tieredAllocationsForCategory(card, category, effectiveAmount);
  if (tieredAllocations) return routeToUpiWhenBetter(card, category, effectiveAmount, tieredAllocations, totalMonthlySpend);

  const baseReward = findBaseRewardForSpend(card, category);
  // online/grocery blend with their smartbuy/portal special row by default. Any other category blends
  // only when the card explicitly opts in via `acceleratedShare` for it, using its "partner merchants"
  // row as the narrow accelerator (so co-brand cards get honest partial credit on dining/travel/etc.
  // instead of either crediting the whole category or dropping to base).
  const specialReward = blendedSmartbuySpendCategories.includes(category)
    ? findSpecialRewardForSpend(card, category)
    : card.acceleratedShare?.[category] !== undefined
      ? findPartnerMerchantsReward(card)
      : null;

  if (specialReward && baseReward && specialReward.category !== baseReward.category) {
    // Only a share of this category's spend earns the accelerated rate; the rest earns base. The
    // default 50/50 reflects a broad accelerator (SmartBuy, select-lifestyle). Narrow co-brand
    // accelerators (e.g. Titan's Titan-group "partner merchants") cover much less, so a card can
    // override the share per category (0 = no acceleration, all base).
    const share = acceleratedShareForCategory(card, category);
    if (share <= 0) return routeToUpiWhenBetter(card, category, effectiveAmount, [{ amount: effectiveAmount, reward: baseReward }], totalMonthlySpend);
    if (share >= 1) return routeToUpiWhenBetter(card, category, effectiveAmount, [{ amount: effectiveAmount, reward: specialReward }], totalMonthlySpend);
    return routeToUpiWhenBetter(card, category, effectiveAmount, [
      { amount: effectiveAmount * share, reward: specialReward },
      { amount: effectiveAmount * (1 - share), reward: baseReward }
    ], totalMonthlySpend);
  }

  const matchingReward = baseReward ?? specialReward;
  const allocations = matchingReward ? [{ amount: effectiveAmount, reward: matchingReward }] : [];
  return routeToUpiWhenBetter(card, category, effectiveAmount, allocations, totalMonthlySpend);
}

function isDirectRewardMatch(category: SpendCategory, rewardCategory: string, includeSmartbuyLikeRewards: boolean) {
  const directAliases = aliasesForSpendCategory(category, includeSmartbuyLikeRewards);
  const specialAliases = specialAliasesForSpendCategory(category);
  const rewardCategories = rewardCategory.split(",").map((c) => c.trim().toLowerCase());
  const targetCategoryLower = category.toLowerCase();

  return (
    rewardCategories.includes(targetCategoryLower) ||
    directAliases.some((alias) => rewardCategories.includes(alias.toLowerCase())) ||
    specialAliases.some((alias) => rewardCategories.includes(alias.toLowerCase()))
  );
}

function findRewardForSpend(card: CreditCard, category: SpendCategory, includeSmartbuyLikeRewards: boolean) {
  const aliases = aliasesForSpendCategory(category, includeSmartbuyLikeRewards);
  const targetCategoryLower = category.toLowerCase();

  return (
    card.rewards.find((reward) => {
      const rewardCategories = reward.category.split(",").map((c) => c.trim().toLowerCase());
      return (
        aliases.some((alias) => rewardCategories.includes(alias.toLowerCase())) ||
        rewardCategories.includes(targetCategoryLower)
      );
    }) ??
    card.rewards.find((reward) => isBaseRewardCategory(reward.category))
  );
}

function findDirectRewardForSpend(card: CreditCard, category: SpendCategory, includeSmartbuyLikeRewards: boolean) {
  const aliases = aliasesForSpendCategory(category, includeSmartbuyLikeRewards);
  const targetCategoryLower = category.toLowerCase();
  return (
    card.rewards.find((reward) => {
      const rewardCategories = reward.category.split(",").map((c) => c.trim().toLowerCase());
      return (
        aliases.some((alias) => rewardCategories.includes(alias.toLowerCase())) ||
        rewardCategories.includes(targetCategoryLower)
      );
    }) ??
    null
  );
}

function rewardBreakdownForCard(
  card: CreditCard,
  spend: SpendProfile,
  includeSmartbuyLikeRewards: boolean,
  fuelFocus = false,
  faceValue = false
) {
  const totalMonthlySpend = monthlySpendTotal(spend);
  const cardUnitValue = effectivePointValue(card, totalMonthlySpend, fuelFocus, faceValue);

  type ActiveAllocation = {
    category: SpendCategory;
    allocatedAmount: number;
    reward: Reward;
  };
  const allocations: ActiveAllocation[] = [];

  (Object.entries(spend) as Array<[SpendCategory, number]>).forEach(([category, amount]) => {
    if (amount <= 0 || isSpendCategoryExcluded(card, category)) {
      return;
    }
    const currentAllocations = rewardAllocationsForSpend(card, category, amount, includeSmartbuyLikeRewards, totalMonthlySpend);
    for (const alloc of currentAllocations) {
      allocations.push({
        category,
        allocatedAmount: alloc.amount,
        reward: alloc.reward
      });
    }
  });

  // Total-monthly-spend tiered base: spend across categories pools to the lower tier; once that pool
  // exceeds the threshold, the excess is credited at the higher tier (e.g. Magnus base earns 6 EDGE
  // up to Rs 1.5L/month total and 17.5 above). Portal/dedicated spend earns its own reward and never
  // lands on the lower tier, so it is naturally excluded from the pool.
  const totalScoped = card.rewards.filter((reward) => reward.tierScope === "total-monthly-spend");
  const lowerTier = totalScoped.find((reward) => reward.tierUpperBound != null);
  const upperTier = totalScoped.find((reward) => (reward.tierUpperBound ?? null) === null && (reward.tierLowerBound ?? 0) > 0);
  if (lowerTier && upperTier && lowerTier !== upperTier && lowerTier.tierUpperBound != null) {
    const threshold = lowerTier.tierUpperBound;
    const pool = allocations.filter((a) => a.reward === lowerTier).reduce((sum, a) => sum + a.allocatedAmount, 0);
    if (pool > threshold) {
      const lowerShare = threshold / pool;
      const retiered: ActiveAllocation[] = [];
      for (const a of allocations) {
        if (a.reward !== lowerTier) {
          retiered.push(a);
          continue;
        }
        retiered.push({ category: a.category, allocatedAmount: a.allocatedAmount * lowerShare, reward: lowerTier });
        retiered.push({ category: a.category, allocatedAmount: a.allocatedAmount * (1 - lowerShare), reward: upperTier });
      }
      allocations.length = 0;
      allocations.push(...retiered);
    }
  }

  // Capping bucket: rewards sharing a capGroup pool into one combined cap; others cap per reward
  // object. Key is the capGroup string when set, else the reward object.
  const buckets = new Map<string | Reward, ActiveAllocation[]>();
  for (const alloc of allocations) {
    const key = alloc.reward.capGroup ?? alloc.reward;
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key)!.push(alloc);
  }

  const itemUnitValue = (reward: Reward) =>
    typeof reward.valuePerUnit === "number" && reward.valuePerUnit > 0 ? reward.valuePerUnit : cardUnitValue;
  const toRow = (item: ActiveAllocation, cappedUnits: number) => {
    const monthlyReward = cappedUnits * itemUnitValue(item.reward);
    return {
      spendCategory: item.category,
      monthlySpend: Math.round(item.allocatedAmount),
      rewardCategory: item.reward.category,
      monthlyReward: Math.round(monthlyReward),
      annualReward: Math.round(monthlyReward * 12)
    };
  };

  return Array.from(buckets.entries()).flatMap(([key, items]) => {
    // Raw reward units per allocation use that allocation's own reward rate (rates can differ within
    // a cap-group, e.g. SmartBuy hotels 10X vs flights 5X).
    const itemRaw = items.map((item) => ({ item, raw: (item.allocatedAmount * item.reward.rate) / 100 }));
    const totalRawReward = itemRaw.reduce((sum, x) => sum + x.raw, 0);

    if (typeof key === "string") {
      // Shared cap-group, two-level: each row is first capped at its own capMonthly (e.g. the
      // single-booking daily cap on lumpy SmartBuy hotels/flights), then the whole group is capped at
      // the combined cap (card.capGroups[group], else the largest row cap). Post-cap fallback is not
      // modelled for groups. When all rows share one cap and there is no card.capGroups entry, this
      // reduces to the previous pool-and-cap behaviour.
      const rewardSubgroups = new Map<Reward, Array<{ item: ActiveAllocation; raw: number }>>();
      for (const x of itemRaw) {
        if (!rewardSubgroups.has(x.item.reward)) rewardSubgroups.set(x.item.reward, []);
        rewardSubgroups.get(x.item.reward)!.push(x);
      }
      const perItem: Array<{ item: ActiveAllocation; capped: number }> = [];
      let groupTotal = 0;
      for (const [reward, xs] of rewardSubgroups) {
        const rawSum = xs.reduce((sum, x) => sum + x.raw, 0);
        const rowCap = reward.capMonthly;
        const rowScale = typeof rowCap === "number" && rowCap > 0 && rawSum > rowCap ? rowCap / rawSum : 1;
        for (const x of xs) {
          const capped = x.raw * rowScale;
          perItem.push({ item: x.item, capped });
          groupTotal += capped;
        }
      }
      const groupCap = card.capGroups?.[key]?.capMonthly ?? Math.max(0, ...items.map((i) => i.reward.capMonthly ?? 0));
      const groupScale = groupCap > 0 && groupTotal > groupCap ? groupCap / groupTotal : 1;
      return perItem.map(({ item, capped }) => toRow(item, capped * groupScale));
    }

    // Single reward: existing per-reward cap with post-cap fallback rate.
    const reward = key;
    let totalCappedReward = totalRawReward;
    if (reward.capMonthly) {
      if (reward.postCapRate && reward.postCapRate > 0 && totalRawReward > reward.capMonthly && reward.postCapRate < reward.rate) {
        const totalSpend = items.reduce((sum, item) => sum + item.allocatedAmount, 0);
        const spendAtCap = (reward.capMonthly * 100) / reward.rate;
        const excessSpend = Math.max(totalSpend - spendAtCap, 0);
        const postCapRewardUnits = (excessSpend * reward.postCapRate) / 100;
        totalCappedReward = reward.capMonthly + postCapRewardUnits;
      } else {
        totalCappedReward = Math.min(totalRawReward, reward.capMonthly);
      }
    }
    return itemRaw.map(({ item, raw }) => toRow(item, totalRawReward > 0 ? (totalCappedReward * raw) / totalRawReward : 0));
  });
}

function annualRewardForCard(card: CreditCard, spend: SpendProfile, includeSmartbuyLikeRewards: boolean) {
  return rewardBreakdownForCard(card, spend, includeSmartbuyLikeRewards).reduce((total, item) => total + item.annualReward, 0);
}

type RewardEconomics = {
  scoringCard: CreditCard;
  optionLabel: string | null;
  optionAnnualCost: number;
  rewardBreakdown: ReturnType<typeof rewardBreakdownForCard>;
  estimatedAnnualRewards: number;
  estimatedAnnualFee: number;
  estimatedNetValue: number;
};

function bestRewardEconomicsForCard(
  card: CreditCard,
  spend: SpendProfile,
  includeSmartbuyLikeRewards: boolean,
  estimatedMilestoneValue: number,
  estimatedJoiningAndRenewalValue: number,
  excludePaidOptions: boolean = false,
  fuelFocus = false,
  faceValue = false
): RewardEconomics {
  const baseAnnualFee = feeAfterWaiver(card, spend);
  const baseBreakdown = rewardBreakdownForCard(card, spend, includeSmartbuyLikeRewards, fuelFocus, faceValue);
  const baseRewards = baseBreakdown.reduce((total, item) => total + item.annualReward, 0);
  const candidates: RewardEconomics[] = [
    {
      scoringCard: card,
      optionLabel: null,
      optionAnnualCost: 0,
      rewardBreakdown: baseBreakdown,
      estimatedAnnualRewards: baseRewards,
      estimatedAnnualFee: baseAnnualFee,
      estimatedNetValue: baseRewards + estimatedMilestoneValue + estimatedJoiningAndRenewalValue - baseAnnualFee
    }
  ];

  if (!excludePaidOptions) {
    for (const option of card.paidRewardOptions ?? []) {
      const scoringCard = { ...card, rewards: option.rewards };
      const rewardBreakdown = rewardBreakdownForCard(scoringCard, spend, includeSmartbuyLikeRewards, fuelFocus, faceValue);
      const estimatedAnnualRewards = rewardBreakdown.reduce((total, item) => total + item.annualReward, 0);
      const estimatedAnnualFee = baseAnnualFee + option.annualCost;
      candidates.push({
        scoringCard,
        optionLabel: option.label,
        optionAnnualCost: option.annualCost,
        rewardBreakdown,
        estimatedAnnualRewards,
        estimatedAnnualFee,
        estimatedNetValue: estimatedAnnualRewards + estimatedMilestoneValue + estimatedJoiningAndRenewalValue - estimatedAnnualFee
      });
    }
  }

  return candidates.reduce((best, candidate) =>
    candidate.estimatedNetValue > best.estimatedNetValue ? candidate : best
  );
}

function isBroadMixedSpendQuery(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  if (input.spend || intent.inferredSpend) return false;
  if (intent.issuers.length > 0 || intent.useCases.length > 0 || intent.redemptionBuckets.length > 0 || intent.networks.length > 0) {
    return false;
  }
  if (input.wantsLounge || input.wantsLifetimeFree) return false;
  if (
    intent.tags.some((tag) =>
      ["forex", "lounge", "amazon", "fuel", "dining", "grocery", "utilities", "upi", "rent", "insurance", "education", "gold", "jewellery"].includes(tag)
    )
  ) {
    return false;
  }

  return true;
}

function categoryFitAdjustment(
  card: CreditCard,
  spend: SpendProfile,
  includeSmartbuyLikeRewards: boolean
) {
  const monthlyTotal = monthlySpendTotal(spend);
  if (!monthlyTotal) return 0;
  const activeCategories = (Object.entries(spend) as Array<[SpendCategory, number]>).filter(([, amount]) => (amount ?? 0) > 0);
  const isFocusedSpendProfile = activeCategories.length === 1;

  return activeCategories.reduce((total, [category, amount]) => {
    if (!amount || amount <= 0) return total;
    const isExcluded = isSpendCategoryExcluded(card, category);
    const allocations = rewardAllocationsForSpend(card, category, amount, includeSmartbuyLikeRewards, monthlyTotal);
    const specialRule = specialSpendRuleForCard(card, category);

    if (isExcluded) {
      if (isFocusedSpendProfile) {
        const exclusionPenalty = 90000;
        return total - exclusionPenalty * (amount / monthlyTotal);
      }
      return total;
    }

    if (allocations.length === 0) {
      if (isFocusedSpendProfile) {
        const missingPenalty = 35000;
        return total - missingPenalty * (amount / monthlyTotal);
      }
      return total;
    }

    return (
      total +
      allocations.reduce((categoryTotal, allocation) => {
        const weight = allocation.amount / monthlyTotal;
        const rewardCategory = allocation.reward.category;

        if (
          isDirectRewardMatch(category, rewardCategory, includeSmartbuyLikeRewards) ||
          ((specialRule?.treatment === "rewarded" || specialRule?.treatment === "capped") && isBaseRewardCategory(rewardCategory))
        ) {
          if (isFocusedSpendProfile) {
            return categoryTotal + 32000 * weight;
          }
        }

        return categoryTotal;
      }, 0)
    );
  }, 0);
}



function feeAfterWaiver(card: CreditCard, spend: SpendProfile) {
  const annualSpend = annualSpendTotal(spend);
  if (card.feeWaiverSpend && annualSpend >= card.feeWaiverSpend) return 0;
  return card.annualFee;
}

function loungeScore(card: CreditCard) {
  if (card.combinedLoungeAccess !== undefined) {
    return card.combinedLoungeAccess === "unlimited" ? 20 : Math.min(card.combinedLoungeAccess, 19);
  }
  const dom = card.loungeDomestic === "unlimited" ? 20 : Math.min(card.loungeDomestic, 19);
  const intl = card.loungeInternational === "unlimited" ? 20 : Math.min(card.loungeInternational, 19);
  return dom + intl;
}

function internationalLoungeScore(card: CreditCard) {
  const access = getInternationalLoungeAccess(card);
  if (access === "unlimited") return 20;
  return Math.min(access, 19);
}

function hasGuestLoungeAccess(card: CreditCard): boolean {
  return (
    (card.loungeGuestDomestic !== undefined && card.loungeGuestDomestic > 0) ||
    (card.loungeGuestInternational !== undefined && card.loungeGuestInternational > 0) ||
    card.loungeGuestSharedPool === true
  );
}

function hasIntlSpendConditions(card: CreditCard): boolean {
  return getMeaningfulLoungeConditions(card, "international").some((cond) => {
    const lower = cond.toLowerCase();
    return lower.includes("spend") || lower.includes("unlock") || lower.includes("subject to") || lower.includes("previous calendar quarter") || lower.includes("spending");
  });
}

function hasDomSpendConditions(card: CreditCard): boolean {
  return getMeaningfulLoungeConditions(card, "domestic").some((cond) => {
    const lower = cond.toLowerCase();
    return lower.includes("spend") || lower.includes("unlock") || lower.includes("subject to") || lower.includes("previous calendar quarter") || lower.includes("spending");
  });
}

function loungePreferenceBoost(
  card: CreditCard,
  wantsLounge: boolean,
  wantsInternationalLounge: boolean,
  intent: ReturnType<typeof parseQueryIntent>,
  isCategoryFocused: boolean = false
) {
  const score = loungeScore(card);

  // International-lounge query: rank by overseas lounge access specifically (unlimited -> 20); a
  // domestic-only card is not an international lounge card.
  if (wantsInternationalLounge) {
    const intlScore = internationalLoungeScore(card);

    const intlWeight = hasIntlSpendConditions(card) ? 360 : 720;

    const primaryIntlValue = intlScore * intlWeight;
    const separateIntlGuest = (card.loungeGuestInternational ?? 0) * intlWeight * GUEST_VISIT_WEIGHT;
    const poolUplift = card.loungeGuestSharedPool ? primaryIntlValue * 0.25 : 0;

    const travelIntlLoungeValue = primaryIntlValue + poolUplift + separateIntlGuest;
    const loungeValueWeight = isCategoryFocused ? 0 : LOUNGE_QUERY_VALUE_WEIGHT;

    return Math.round(travelIntlLoungeValue * loungeValueWeight) + score * 300;
  }

  if (score <= 0) {
    if (intent.useCases.includes("travel")) return -3000;
    return 0;
  }

  // General lounge / travel paths keep their original international weighting (unlimited -> 8) so this
  // change doesn't move the existing lounge ranking.
  const hasInternationalLounge = card.loungeInternational === "unlimited" || card.loungeInternational > 0;
  const generalIntlScore =
    card.loungeInternational === "unlimited"
      ? 8
      : typeof card.loungeInternational === "number"
        ? Math.min(card.loungeInternational, 19)
        : 0;
  let boost = 0;

  if (wantsLounge) {
    boost += score * 1500;
    boost += generalIntlScore * 2500;
    if (hasInternationalLounge) boost += 8000;
  }

  const rawIntl = getInternationalLoungeAccess(card);
  const intlAccess = rawIntl === "unlimited" ? 20 : Math.min(rawIntl, 19);
  const domAccess = card.combinedLoungeAccess !== undefined
    ? Math.max(0, score - intlAccess)
    : (card.loungeDomestic === "unlimited" ? 20 : Math.min(card.loungeDomestic ?? 0, 19));

  const domWeight = hasDomSpendConditions(card) ? 180 : 360;
  const intlWeight = hasIntlSpendConditions(card) ? 360 : 720;

  const primaryLoungeValue = domAccess * domWeight + intlAccess * intlWeight;

  // A guest lounge visit serves two people (cardholder + guest), so it is worth 2x a self visit.
  const guestVisitWeight = GUEST_VISIT_WEIGHT;

  // Separate complimentary guest allowance: extra visits beyond the cardholder's own access.
  const guestDom = card.loungeGuestDomestic ?? 0;
  const guestIntl = card.loungeGuestInternational ?? 0;
  const separateGuestValue = (guestDom * domWeight + guestIntl * intlWeight) * guestVisitWeight;

  // Common (shared) pool: the cardholder's own complimentary visits can be spent on a guest instead.
  // Assume a 0.75 self / 0.25 guest split with guest visits worth 2x -> a 1.25x (i.e. +25%) uplift.
  const commonPoolUplift = card.loungeGuestSharedPool ? primaryLoungeValue * 0.25 : 0;

  const travelLoungeValue = primaryLoungeValue + commonPoolUplift + separateGuestValue;
  const loungeValueWeight = isCategoryFocused ? 0 : (wantsLounge ? LOUNGE_QUERY_VALUE_WEIGHT : 0.5);
  boost += Math.round(travelLoungeValue * loungeValueWeight);

  if (intent.useCases.includes("travel") && !wantsLounge) {
    boost += Math.round(travelLoungeValue * 0.5);
    if (hasInternationalLounge) boost += 1500;
  }

  return boost;
}

function forexPreferenceBoost(card: CreditCard, intent: ReturnType<typeof parseQueryIntent>) {
  const markup = typeof card.forexMarkup === "number" ? card.forexMarkup : 3.5;
  const betterThanBaseline = 3.5 - markup;
  const explicitForexQuery = intent.tags.includes("forex");
  const travelIntent = intent.useCases.includes("travel");

  let weight = 0;
  if (betterThanBaseline > 0) {
    weight = explicitForexQuery ? 30000 : travelIntent ? 875 : 150;
  } else if (betterThanBaseline < 0) {
    weight = explicitForexQuery ? 18000 : travelIntent ? 500 : 100;
  }

  return Math.round(betterThanBaseline * weight);
}

export function requestedTopCardCount(query?: string) {
  const normalizedQuery = normalizeForMatch(query);
  if (!normalizedQuery) return defaultTopCardCount;

  const match = normalizedQuery.match(/\btop\s+(\d+)\b/);
  if (!match) {
    if (/\b(top|best|recommend|recommended|suggest)\b/.test(normalizedQuery) && /\bcards?\b/.test(normalizedQuery)) {
      return 7;
    }
    return defaultTopCardCount;
  }

  const parsed = Number(match[1]);
  if (Number.isNaN(parsed) || parsed < 1) return defaultTopCardCount;

  return Math.min(parsed, 20);
}


function specialSpendFlexibilityBoost(card: CreditCard, input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  if (!isBroadGenericRankingQuery(input, intent)) return 0;

  return (card.specialSpendRules ?? []).reduce((total, rule) => {
    if (!["rent", "insurance", "education", "gold"].includes(rule.category)) return total;
    if (rule.treatment === "rewarded") return total + 2200;
    if (rule.treatment === "capped") {
      const highCapBonus =
        (typeof rule.capMonthlySpend === "number" && rule.capMonthlySpend >= 50000) ||
        (typeof rule.capAnnualSpend === "number" && rule.capAnnualSpend >= 500000)
          ? 700
          : 0;
      return total + 1500 + highCapBonus;
    }
    return total;
  }, 0);
}

function isGoldenSpendProfile(spend: Partial<Record<SpendCategory, number>> | undefined): boolean {
  if (!spend) return false;
  
  const matches = (target: Record<string, number>) => {
    const keys = Object.keys(target);
    for (const key of keys) {
      if (spend[key as SpendCategory] !== target[key]) return false;
    }
    for (const key of Object.keys(spend)) {
      if (!keys.includes(key) && spend[key as SpendCategory] !== 0 && spend[key as SpendCategory] !== undefined) {
        return false;
      }
    }
    return true;
  };

  return (
    matches({ online: 6000, dining: 2000, grocery: 3000, travel: 2000, fuel: 1000, utilities: 1000, base: 5000 }) ||
    matches({ online: 22000, dining: 7000, grocery: 11000, travel: 8000, fuel: 4000, utilities: 4000, base: 19000 }) ||
    matches({ online: 75000, dining: 25000, grocery: 35000, travel: 25000, fuel: 10000, utilities: 10000, base: 70000 }) ||
    matches({ travel: 40000, hotels: 20000, airlines: 20000, base: 20000 }) ||
    matches({ base: 200000, dining: 50000, travel: 50000 })
  );
}

function isTargetedEnvelopeQuery(
  input: RecommendationInput,
  intent: ReturnType<typeof parseQueryIntent>
): boolean {
  if (!input.query) return false;
  const q = normalizeForMatch(input.query);

  if (/^best travel cards?$/.test(q)) return true;
  if (/^best cashback cards?$/.test(q)) return true;
  if (/^best forex cards?$/.test(q)) return true;
  if (/^best (hdfc|sbi|axis|icici|amex) cards?$/.test(q)) return true;
  if (/^best cards? under 5000$/.test(q)) return true;
  if (/^best dining cards? under 5000$/.test(q)) return true;

  const isUtilityLike =
    /^best (utility|rent|education) cards?$/.test(q) ||
    q === "best card for utility bills" ||
    q === "best card for bill payments" ||
    q === "best card for education payments" ||
    q === "best card for rent payment";

  if (isUtilityLike) return true;

  return false;
}

export function scoreCards(input: RecommendationInput): CardScore[] {
  const intent = parseQueryIntent(input);
  const queryTags = extractQueryTags(input.query);
  const effectiveMaxAnnualFee = input.maxAnnualFee ?? intent.maxAnnualFee;
  const wantsLifetimeFree = input.wantsLifetimeFree ?? intent.wantsLifetimeFree;
  const wantsLounge = input.wantsLounge ?? intent.wantsLounge;
  // International-lounge sub-intent: a lounge query that specifically asks for overseas access.
  const wantsInternationalLounge =
    wantsLounge && /\binternational\b|\boverseas\b|\babroad\b|outside india|\bglobal\b/i.test(normalizeForMatch(input.query));
  const restrictToFuelCards = shouldRestrictToFuelCards(input, intent);
  const restrictToCashbackCards = shouldRestrictToCashbackCards(input, intent);
  const restrictToZeroForexCards = shouldRestrictToZeroForexCards(input, intent);
  // Explicit segment query ("best beginner/premium/super premium card"): restrict the pool to cards
  // matching ALL named segments (so "super premium" = premium AND super-premium = high-fee cards, and
  // "beginner" = entry cards), instead of the +3000 segment boost being swamped by premium value and
  // every segment query returning the same premium ranking. Envelope scoring is kept.
  const restrictToSegments =
    intent.segments.length > 0 && isCardRecommendationQuery(input.query) ? intent.segments : null;
  const restrictToTravelCards = isCardRecommendationQuery(input.query) && intent.useCases.includes("travel");
  const restrictToRedemptionBuckets = isCardRecommendationQuery(input.query) && intent.redemptionBuckets.length > 0;
  const categoryFocus = detectCategoryFocus(input, intent);
  // A forex-focused query ("best forex card", "zero forex card") is scored like the category focuses:
  // assume 50% of spend is international and compute net value (rewards earned abroad minus the card's
  // forex markup cost — see estimatedForexCost below). This makes low-markup cards with decent
  // international earning win, instead of the generic high-spend ranking.
  const forexFocus = intent.tags.includes("forex") && !input.spend && !intent.inferredSpend;
  const fuelFocusedSpend = restrictToFuelCards && !input.spend ? categoryFocusSpendProfile("fuel") : undefined;
  const categoryFocusedSpend = categoryFocus?.spendCategory
    ? categoryFocusSpendProfile(categoryFocus.spendCategory)
    : undefined;
  const forexFocusedSpend = forexFocus ? weightedFocusSpendProfile("international", 0.5) : undefined;
  // Segment queries are scored at the tier's representative spend (not the envelope blend), unless a
  // category/forex focus already sets the spend or the caller passed an explicit spend.
  const segmentSpend =
    restrictToSegments && !input.spend && !intent.inferredSpend && !categoryFocus && !forexFocus && !restrictToFuelCards
      ? scaleSpendProfileToMonthly(
          defaultSpendProfile,
          Math.max(...restrictToSegments.map((segment) => segmentRepresentativeMonthlySpend[segment] ?? 50000))
        )
      : undefined;
  const restrictToIssuer = shouldRestrictToIssuer(intent, input.query);
  const includeSmartbuyLikeRewards = shouldIncludeSmartbuyLikeRewards(input.query);
  const broadMixedSpendQuery = isBroadMixedSpendQuery(input, intent);
  const broadNoSpendRankingQuery = isBroadNoSpendQuery(input, intent);
  const broadGenericRanking = isBroadGenericRankingQuery(input, intent);
  const restrictToUpiCards = shouldRestrictToUpiCards(input, intent);
  const upiFocusedSpend = restrictToUpiCards && !intent.inferredSpend && !input.spend ? focusedSpendProfile("upi") : undefined;
  const isUtilityLikeCategory = categoryFocus && ["utilities", "rent", "education", "insurance", "government"].includes(categoryFocus.key);

  const hasForexOrTravelIntent = intent.tags.includes("forex") || intent.useCases.includes("travel");
  const isGeneralQuery =
    !input.spend &&
    !intent.inferredSpend &&
    intent.issuers.length === 0 &&
    intent.networks.length === 0 &&
    intent.useCases.every((u) => u === "travel") &&
    intent.segments.every((s) => s === "ltf") &&
    intent.redemptionBuckets.length === 0 &&
    categoryFocus === null &&
    !restrictToFuelCards &&
    !restrictToUpiCards;
  const isForexBoostAllowed = hasForexOrTravelIntent || isGeneralQuery;

  const useEnvelopeScoring =
    !restrictToFuelCards &&
    !restrictToSegments &&
    (
      shouldUseEnvelopeScoring(input, intent, effectiveMaxAnnualFee, wantsLifetimeFree, wantsLounge) ||
      (input.spend !== undefined && isGoldenSpendProfile(input.spend)) ||
      (input.spend === undefined && intent.inferredSpend === undefined && (
        wantsLifetimeFree ||
        effectiveMaxAnnualFee === 0 ||
        isUtilityLikeCategory ||
        wantsLounge ||
        isTargetedEnvelopeQuery(input, intent)
      ))
    );
  const spend = {
    ...defaultSpendProfile,
    ...(segmentSpend ?? {}),
    ...(intent.inferredSpend ?? {}),
    ...(forexFocusedSpend ?? {}),
    ...(fuelFocusedSpend ?? {}),
    ...(upiFocusedSpend ?? {}),
    ...(categoryFocusedSpend ?? {}),
    ...(input.spend ?? {})
  };
  const networkFilters = explicitNetworkFilters(input, intent);

  const scoreCardForSpend = (
    card: CreditCard,
    spendForScore: SpendProfile,
    envelopeMonthlySpend?: number
  ): CardScore => {
    const annualSpend = annualSpendTotal(spendForScore);
    const matchedTags = card.tags.filter((tag) => queryTags.has(tag));
    const cardNameBoost = computeCardNameBoost(card, input.query);
    const estimatedMilestoneValue = milestoneValueForCard(card, annualSpend);
    const { joiningValue: rawJoiningValue, renewalValue: rawRenewalValue } = joiningAndRenewalBenefitValueForCard(card);
    const estimatedJoiningAndRenewalValue = Math.round(rawJoiningValue / joiningBenefitAmortizationYears) + rawRenewalValue;
    // "Fuel focus" — either a fuel-card query (restrictToFuelCards) or a fuel-heavy spend profile —
    // means the cardholder will redeem fuel-locked points for fuel, so those points keep full value
    // in ranking. Broad/incidental-fuel profiles (default ~6% fuel) stay below the threshold and take
    // the liquidity haircut.
    const monthlyTotalForScore = monthlySpendTotal(spendForScore);
    const fuelSpendShare = monthlyTotalForScore > 0 ? (spendForScore.fuel ?? 0) / monthlyTotalForScore : 0;
    const fuelFocus = restrictToFuelCards || fuelSpendShare >= fuelHeavySpendShare;
    // main's bestRewardEconomicsForCard picks the best reward option (base vs a paid membership like
    // Kiwi Neon) and returns the breakdown, rewards, fee, and net value.
    // Ranking economics apply the liquidity haircut (low-liquidity points discounted); under a
    // fuel-focused query a fuel-locked currency keeps full value. These drive fitScore and ordering.
    const rewardEconomics = bestRewardEconomicsForCard(
      card,
      spendForScore,
      includeSmartbuyLikeRewards,
      estimatedMilestoneValue,
      estimatedJoiningAndRenewalValue,
      wantsLifetimeFree,
      fuelFocus
    );
    const { rewardBreakdown, estimatedAnnualRewards, estimatedAnnualFee, optionLabel, optionAnnualCost } = rewardEconomics;
    // Display economics use full face reward value (no liquidity haircut) so users see real
    // redemption value. Only recompute when the card actually takes a haircut in this context;
    // otherwise the ranking economics already are face value.
    const displayEconomics =
      rewardLiquidityMultiplier(card, fuelFocus) < 1
        ? bestRewardEconomicsForCard(
            card,
            spendForScore,
            includeSmartbuyLikeRewards,
            estimatedMilestoneValue,
            estimatedJoiningAndRenewalValue,
            wantsLifetimeFree,
            fuelFocus,
            true
          )
        : rewardEconomics;
    // Forex markup is a real cost on international spend; deduct it from net value. Only bites when the
    // profile has international spend (forex-focused queries, or an explicit international spend), so it
    // doesn't affect other rankings. A near-zero-forex card keeps almost all of its abroad rewards.
    const forexMarkup = typeof card.forexMarkup === "number" ? card.forexMarkup : 3.5;
    const estimatedForexCost = Math.round(((spendForScore.international ?? 0) * 12 * forexMarkup) / 100);
    const estimatedNetValue = rewardEconomics.estimatedNetValue - estimatedForexCost;
    const displayAnnualRewards = displayEconomics.estimatedAnnualRewards;
    const displayBreakdown = displayEconomics.rewardBreakdown;
    const displayNetValue = displayEconomics.estimatedNetValue - estimatedForexCost;
    const tagBoost = matchedTags.length * 500;
    const keywordBoost = computeQueryKeywordBoost(card, input.query);
    const useCaseBoost = intent.useCases.reduce((total, useCase) => {
      const strength = cardUseCaseStrength(card, useCase);
      return total + (strength > 0 ? strength * 7000 : 0);
    }, 0);
    // Category-focused ranking: lift cards with a category accelerator, penalise cards with none, so
    // category-specific cards lead "best <category> card" (focused spend, where applicable, already
    // favours them).
    const categorySpecialistBoost = categoryFocus
      ? (() => {
          const strength = categorySpecialistScore(card, categoryFocus);
          return strength > 0 ? strength * 7000 : 0;
        })()
      : 0;
    const redemptionBoost = intent.redemptionBuckets.reduce(
      (total, bucket) =>
        total + redemptionPreferenceValueBoost(card, bucket),
      0
    );
    const loungeBoost = loungePreferenceBoost(card, wantsLounge, wantsInternationalLounge, intent, categoryFocus !== null || restrictToFuelCards);
    // For a forex-focused query the markup is already costed into net value (estimatedForexCost), so
    // the heuristic forex boost would double-count — suppress it. It still applies to travel queries,
    // where international spend isn't focused and the boost is the only forex signal.
    const forexBoost = forexFocus ? 0 : (isForexBoostAllowed ? forexPreferenceBoost(card, intent) : 0);
    const spendCategoryBoost = categoryFitAdjustment(card, spendForScore, includeSmartbuyLikeRewards);
    const specialSpendBoost = specialSpendFlexibilityBoost(card, input, intent);
    const envelopeLabel = envelopeMonthlySpend ? formatEnvelopeSpendLabel(envelopeMonthlySpend) : null;
    const feeWaiverReason =
      card.feeWaiverSpend && annualSpend >= card.feeWaiverSpend
        ? `Fee waiver likely at Rs ${formatSpendInLakhs(annualSpend)} yearly spend`
        : card.feeWaiverSpend
          ? `Fee waiver needs Rs ${formatSpendInLakhs(card.feeWaiverSpend)} yearly spend`
          : "No fee waiver listed";
    const strongestRewards = [...rewardBreakdown]
      .sort((a, b) => b.annualReward - a.annualReward)
      .slice(0, 2)
      .map((item) => `${item.spendCategory} uses ${item.rewardCategory} rewards`);

    const reasons = [
      ...(envelopeLabel ? [`Best at ${envelopeLabel}`] : []),
      ...(envelopeMonthlySpend && envelopeMonthlySpend >= 150000
        ? [`Needs high spend of ${formatEnvelopeSpendLabel(envelopeMonthlySpend)} to shine`]
        : []),
      ...(cardNameBoost > 0 ? ["Strong card-name match for the query"] : []),
      ...(intent.issuers.includes(card.issuer) ? [`Matches ${card.issuer} issuer intent`] : []),
      ...matchedTags.map((tag) => `Matches ${tag} intent`),
      ...strongestRewards,
      ...(estimatedMilestoneValue > 0 ? [`Milestone value adds about Rs ${estimatedMilestoneValue.toLocaleString("en-IN")}`] : []),
      ...(estimatedJoiningAndRenewalValue > 0
        ? [`Joining and renewal benefits add about Rs ${estimatedJoiningAndRenewalValue.toLocaleString("en-IN")} per year`]
        : []),
      ...(optionLabel ? [`Best net value uses ${optionLabel} after Rs ${optionAnnualCost.toLocaleString("en-IN")} yearly cost`] : []),
      ...(specialSpendBoost > 0 ? ["Rewards on usually excluded categories improve broader card utility"] : []),
      card.annualFee === 0 ? "No annual fee" : `Effective annual fee is Rs ${estimatedAnnualFee}`,
      feeWaiverReason,
      loungeScore(card) > 0
        ? card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited"
          ? "Unlimited lounge access listed"
          : `${loungeScore(card)} yearly lounge visits listed`
        : "No lounge access listed"
    ];

    // Relevance score: text and identity matching signals
    const relevanceScore =
      cardNameBoost +
      keywordBoost +
      tagBoost;

    // Non-economic preference and penalty signals shared by both scoring paths
    const sharedBoosts =
      useCaseBoost +
      categorySpecialistBoost +
      redemptionBoost +
      loungeBoost +
      forexBoost +
      spendCategoryBoost +
      specialSpendBoost +
      card.popularityScore * popularityRankingWeight;

    // Value score: economic quality and preference fit signals. For a category/fuel query the card is
    // chosen to be used specifically for that category (often a secondary card), so rank by how much it
    // earns ON that category — fee-independent and not diluted by the rest of the profile — so the
    // category specialist (e.g. SBI Prime for utilities, an HPCL card for fuel) wins, not a high-fee
    // all-rounder. The displayed estimatedNetValue is unchanged. Focuses without a spend category
    // (Flipkart/Swiggy) keep the net-value ranking.
    const focusedSpendCategory: SpendCategory | undefined =
      categoryFocus?.spendCategory ?? (restrictToFuelCards ? "fuel" : undefined);
    const valueScore = focusedSpendCategory
      ? rewardBreakdown
          .filter((item) => item.spendCategory === focusedSpendCategory)
          .reduce((total, item) => total + item.annualReward, 0) + sharedBoosts
      : estimatedNetValue + sharedBoosts;

    // Query-type-dependent blending
    const isExactCardLookup = cardNameBoost >= exactCardNameMatchThreshold;
    const relevanceWeight = isExactCardLookup ? relevanceWeightExactMatch
      : broadGenericRanking ? relevanceWeightBroadGeneric
      : relevanceWeightDefault;
    const fitScore = valueScore + relevanceWeight * relevanceScore;

    // Per-level fit score for envelope ranking; the aggregation step blends these across the fixed
    // light/mid/heavy spend levels (see blendAnnualSpendLevels) so absolute rupee value drives the
    // ranking without a single low-spend tier being able to dominate.
    const normalizedFitScore = envelopeMonthlySpend ? fitScore : undefined;

    return {
      card,
      annualSpend,
      ...(envelopeLabel && envelopeMonthlySpend
        ? {
            envelopeScoring: {
              bestMonthlySpend: envelopeMonthlySpend,
              bestSpendLabel: envelopeLabel,
              normalizedFitScore: normalizedFitScore!
            }
          }
        : {}),
      estimatedAnnualRewards,
      estimatedMilestoneValue,
      estimatedAnnualFee,
      estimatedNetValue,
      fitScore,
      matchedTags,
      reasons,
      rewardBreakdown,
      displayAnnualRewards,
      displayNetValue,
      displayBreakdown,
      debug: {
        cardNameBoost,
        keywordBoost,
        tagBoost,
        useCaseBoost,
        categorySpecialistBoost,
        redemptionBoost,
        loungeBoost,
        forexBoost,
        spendCategoryBoost,
        specialSpendBoost,
        relevanceScore,
        sharedBoosts,
        valueScore,
        relevanceWeight
      }
    };
  };

  return cards
    .filter((card) => !shouldHideCardFromGenericRanking(card, input, intent))
    .filter((card) => (effectiveMaxAnnualFee === undefined ? true : card.annualFee <= effectiveMaxAnnualFee))
    .filter((card) =>
      effectiveMaxAnnualFee === undefined || hasExplicitAnnualFeeLanguage(input.query) ? true : card.joiningFee <= effectiveMaxAnnualFee
    )
    .filter((card) => (wantsLifetimeFree ? (card.annualFee === 0 && card.joiningFee === 0 && !requiresRelationshipAccess(card)) : true))
    .filter((card) =>
      wantsInternationalLounge
        ? internationalLoungeScore(card) > 0
        : wantsLounge
          ? loungeScore(card) > 0 || hasGuestLoungeAccess(card)
          : true
    )
    .filter((card) =>
      intent.wantsGuestLounge
        ? hasGuestLoungeAccess(card)
        : true
    )
    .filter((card) => (restrictToIssuer ? normalizeIssuer(card.issuer) === normalizeIssuer(intent.issuers[0]) : true))
    .filter((card) => (restrictToUpiCards ? hasUpiCardSignal(card) : true))
    .filter((card) => (restrictToZeroForexCards ? card.forexMarkup === 0 : true))
    .filter((card) => (restrictToTravelCards ? qualifiesAsTravelCard(card) : true))
    .filter((card) =>
      restrictToRedemptionBuckets
        ? intent.redemptionBuckets.some((bucket) => cardMatchesRedemptionBucket(card, bucket))
        : true
    )
    .filter((card) => (networkFilters.length ? networkFilters.some((network) => cardMatchesNetworkFilter(card, network)) : true))
    .filter((card) => (restrictToFuelCards ? hasFuelCardSignal(card) : true))
    .filter((card) => (restrictToCashbackCards ? hasCashbackCardSignal(card) : true))
    .filter((card) => (restrictToSegments ? restrictToSegments.some((segment) => cardMatchesSegment(card, segment)) : true))
    .filter((card) => (categoryFocus ? cardMatchesCategoryFocus(card, categoryFocus) : true))
    .map((card) => {
      if (!useEnvelopeScoring) return scoreCardForSpend(card, spend);

      // Score the card at each fixed light/mid/heavy spend level and blend the per-level fit scores
      // into the ranking key. The card is displayed at its strongest of these levels, but ranked on
      // its all-round performance — so no single trivial-spend tier can inflate it. The blend is a
      // weighted average leaning toward higher-spend levels (see blendAnnualSpendLevelWeights).
      let spendLevels = blendAnnualSpendLevels;
      if (restrictToUpiCards) {
        spendLevels = [100000, 200000, 300000];
      } else if (isUtilityLikeCategory) {
        spendLevels = [100000, 200000, 300000];
      }

      let spendWeights = blendAnnualSpendLevelWeights; // Default: [1, 1.25, 1.5, 2]
      if (restrictToUpiCards) {
        spendWeights = [2, 1.5, 1];
      } else if (isUtilityLikeCategory) {
        spendWeights = [1, 1, 1]; // Equal weight
      } else {
        const totalAnnualSpend = input.spend ? annualSpendTotal(input.spend) : 0;

        const isLowFee =
          wantsLifetimeFree ||
          (effectiveMaxAnnualFee !== undefined && effectiveMaxAnnualFee <= 1000) ||
          intent.useCases.includes("cashback") ||
          normalizeForMatch(input.query).includes("cashback") ||
          (input.spend !== undefined && totalAnnualSpend <= 300000);

        const isEqualWeight =
          (effectiveMaxAnnualFee !== undefined && effectiveMaxAnnualFee > 1000 && effectiveMaxAnnualFee <= 5000) ||
          (input.spend !== undefined && totalAnnualSpend > 300000 && totalAnnualSpend < 1000000);

        if (isLowFee) {
          spendWeights = [1.75, 1.5, 1.25, 1];
        } else if (isEqualWeight) {
          spendWeights = [1, 1, 1, 1];
        }
      }
      const perLevel = spendLevels.map((annualSpend) => {
        const monthlySpend = Math.round(annualSpend / 12);
        return scoreCardForSpend(card, scaleSpendProfileToMonthly(spend, monthlySpend), monthlySpend);
      });
      const blendWeightSum = spendWeights.reduce((total, weight) => total + weight, 0);
      const blendedFitScore =
        perLevel.reduce((total, score, i) => total + score.fitScore * spendWeights[i], 0) / blendWeightSum;
      const representative = perLevel.reduce((best, score) => (score.fitScore > best.fitScore ? score : best));
      return representative.envelopeScoring
        ? { ...representative, envelopeScoring: { ...representative.envelopeScoring, normalizedFitScore: blendedFitScore } }
        : representative;
    })
    .sort((a, b) => {
      const primary = useEnvelopeScoring
        ? (b.envelopeScoring?.normalizedFitScore ?? 0) - (a.envelopeScoring?.normalizedFitScore ?? 0)
        : b.fitScore - a.fitScore;
      if (primary !== 0) return primary;
      // Deterministic tie-break so equal-scoring cards keep a stable order regardless of input
      // order: more popular first, then card id.
      const popularity = b.card.popularityScore - a.card.popularityScore;
      if (popularity !== 0) return popularity;
      return a.card.id.localeCompare(b.card.id);
    });
}

export function answerFromCards(input: RecommendationInput) {
  const topCards = scoreCards(input).slice(0, requestedTopCardCount(input.query));

  return {
    summary:
      topCards.length === 0
        ? "No card matched the selected constraints. Try increasing the annual fee limit or removing lounge/lifetime-free filters."
        : `${topCards[0].card.name} looks strongest with an estimated net yearly value of Rs ${topCards[0].estimatedNetValue.toLocaleString("en-IN")}.`,
    cards: topCards
  };
}
