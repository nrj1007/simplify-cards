import { SPEND_CATEGORY_EXCLUSION_CODE_MAP } from "./exclusion-constants";
import { parseQueryIntent } from "./query-intent";
import type { CardScore, CreditCard, RecommendationInput, ScoreReason, SpendCategory, SpendProfile, Reward } from "./types";
import { getInternationalLoungeAccess, getMeaningfulLoungeConditions } from "./lounge";
import {
  acceleratedShareForCategory,
  blendedSmartbuySpendCategories,
  containsNormalizedPhrase,
  normalizeCompact,
  normalizeForMatch,
  normalizeUtilityLikeQuery,
  specialOnlineSpendAliases,
  specialTravelSpendAliases,
  spendAliases
} from "./recommend-utils";

export const exactCardNameMatchThreshold = 50000;
const LOUNGE_QUERY_VALUE_WEIGHT = 30;
const GUEST_VISIT_WEIGHT = 2;

export function scaleSpendProfileToMonthly(baseSpend: SpendProfile, monthlyTarget: number): SpendProfile {
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

export function formatEnvelopeSpendLabel(monthlySpend: number) {
  if (monthlySpend >= 100000) {
    const lakhs = monthlySpend / 100000;
    const formattedLakhs = Number.isInteger(lakhs) ? `${lakhs}` : lakhs.toFixed(1);
    return `Rs ${formattedLakhs}L+/month`;
  }

  return `Rs ${monthlySpend.toLocaleString("en-IN")}/month`;
}

export function formatSpendInLakhs(amount: number): string {
  const lakhs = Math.round(amount / 10000) / 10;
  const formattedLakhs = Number.isInteger(lakhs) ? `${lakhs}` : lakhs.toFixed(1);
  return `${formattedLakhs}L`;
}

export function titleCaseCategory(category: string) {
  return category
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function scoreReasonKind(value: number): ScoreReason["kind"] {
  return value < 0 ? "penalty" : "boost";
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
  return normalizeUtilityLikeQuery(query)
    .split(" ")
    .filter((token) => token.length > 1 && !genericQueryWords.has(token));
}

function buildCardSearchText(card: CreditCard) {
  return normalizeForMatch(
    [card.issuer, card.name, card.id.replace(/-/g, " "), ...card.tags, ...card.bestFor, ...card.network].join(" ")
  );
}

export function computeQueryKeywordBoost(card: CreditCard, query?: string) {
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

export function computeCardNameBoost(card: CreditCard, query?: string, ignoredQueryTokens: Iterable<string> = []) {
  const normalizedQuery = normalizeForMatch(query);
  const compactQuery = normalizeCompact(query);
  if (!normalizedQuery) return 0;

  const ignoredTokens = new Set([...ignoredQueryTokens].map((token) => normalizeForMatch(token)).filter(Boolean));
  const meaningfulTokens = getMeaningfulQueryTokens(query).filter((token) => !ignoredTokens.has(token));
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

export function extractQueryTags(query?: string) {
  const text = normalizeUtilityLikeQuery(query);
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

export function requiresRelationshipAccess(card: CreditCard) {
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

export function shouldHideCardFromGenericRanking(card: CreditCard, input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  const cardNameBoost = computeCardNameBoost(card, input.query);
  const userExplicitlyAsked =
    cardNameBoost >= exactCardNameMatchThreshold ||
    (card.id === "axis-atlas" &&
      input.query !== undefined &&
      normalizeForMatch(input.query)
        .split(" ")
        .includes("atlas"));

  if (userExplicitlyAsked) return false;

  if (card.id === "axis-atlas") return true;

  const isDiscontinued = card.status === "discontinued";
  if (isDiscontinued) return true;

  const isDefenceCard = (card.tags ?? []).includes("defence") || (card.bestFor ?? []).includes("defence");
  if (isDefenceCard) {
    const q = (input.query ?? "").toLowerCase();
    const queryAsksForDefence = q.includes("defence") || q.includes("army") || q.includes("military") || q.includes("csd");
    if (!queryAsksForDefence) return true;
  }

  return false;
}

export function cardUseCaseStrength(card: CreditCard, useCase: string) {
  const haystack = normalizeForMatch([card.name, ...card.tags, ...card.bestFor, ...card.rewards.map((reward) => reward.category)].join(" "));

  if (useCase === "cashback") {
    let score = 0;
    if (haystack.includes("cashback") || card.rewardType.toLowerCase().includes("cashback")) score += 3;
    if (card.rewards.some((reward) => reward.rate >= 3)) score += 1;
    return score;
  }

  if (useCase === "travel") {
    let score = 0;
    if (card.rewards.some((reward) =>
      reward.category.split(",").map((c) => c.trim().toLowerCase()).some((c) =>
        ["travel", "airlines", "hotel", "hotels", "smartbuy flights", "smartbuy hotels"].includes(c)
      )
    )) {
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
  // Fee-based tiers (non-overlapping): beginner Rs 0–1,500, premium Rs 1,501–8,000,
  // super-premium Rs 8,001+. Super-premium also covers invite-only cards regardless of listed fee.
  if (segment === "super-premium") return containsNormalizedPhrase(haystack, "super premium") || containsNormalizedPhrase(haystack, "invite") || card.annualFee >= 8001;
  if (segment === "premium") return card.annualFee >= 1501 && card.annualFee <= 8000;
  if (segment === "beginner") {
    // Invite-only / relationship cards (e.g. an LTF Kotak Solitaire) are premium products, not
    // beginner cards, even when their fee is 0.
    if (requiresRelationshipAccess(card)) return false;
    return (
      containsNormalizedPhrase(haystack, "beginner") ||
      containsNormalizedPhrase(haystack, "starter") ||
      containsNormalizedPhrase(haystack, "secured") ||
      card.annualFee <= 1500
    );
  }

  return false;
}

export function cardMatchesRedemptionBucket(card: CreditCard, bucket: string) {
  const haystack = normalizeForMatch(
    [card.name, ...card.tags, ...(card.additionalBenefits ?? []), ...(card.additionalDetails ?? []), ...(card.internalNotes ?? [])].join(" ")
  );

  if (bucket === "accor") return Boolean(card.redemption?.accorValue);
  if (bucket === "air-india") return containsNormalizedPhrase(haystack, "air india");

  return false;
}

export function qualifiesAsTravelCard(card: CreditCard): boolean {
  const isTravelBrand = card.tags.includes("travel") || card.bestFor.includes("travel") || card.bestFor.includes("travel edge");
  const hasTravelRewardCategory = card.rewards.some((reward) =>
    reward.category.split(",").map((c) => c.trim().toLowerCase()).includes("travel")
  );
  const hasTransferPartners = (card.redemption?.airlinePartners?.length || card.redemption?.hotelPartners?.length) ? true : false;
  return isTravelBrand || hasTravelRewardCategory || hasTransferPartners || card.forexMarkup === 0;
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

export function redemptionPreferenceValueBoost(card: CreditCard, bucket: string) {
  if (bucket === "accor" && typeof card.redemption?.accorValue === "number") {
    return Math.round(card.redemption.accorValue * 10000);
  }

  const airMilesVal = getAirMilesValue(card);
  if (bucket === "air-india" && typeof airMilesVal === "number") {
    return Math.round(airMilesVal * 3000);
  }

  return 0;
}

export function monthlySpendTotal(spend: SpendProfile) {
  return Object.values(spend).reduce((total, amount = 0) => total + amount, 0);
}

export function annualSpendTotal(spend: SpendProfile) {
  return monthlySpendTotal(spend) * 12;
}

export function parseRupeeAmount(value: string) {
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


export function estimatePointUnitValue(card: CreditCard) {
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
export const fuelHeavySpendShare = 0.08;

// Fraction of nominal reward value realized in scoring. An explicit rewardLiquidityFactor wins;
// otherwise brand-locked currencies take the default haircut and everything else is full value.
export function rewardLiquidityMultiplier(card: CreditCard, fuelFocus = false) {
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

export function rewardUnitValue(card: CreditCard, fuelFocus = false) {
  return baseRewardUnitValue(card) * rewardLiquidityMultiplier(card, fuelFocus);
}

// Point value used for scoring at a given monthly spend. Cards with a bank spend-tier program
// (redemption.pointValueTiers, e.g. Equitas PowerMiles) are valued at the tier matching the spend
// — a low-spender gets the floor value, a high-spender the top value — so the envelope blend
// reflects "you need high spend to unlock the good redemption". Everything else uses the flat value.
// `faceValue` returns the full reward unit value with no liquidity haircut (for display); the default
// applies the liquidity multiplier (for ranking). `fuelFocus` lets a fuel-locked currency keep full
// value under a fuel-focused query.
export function effectivePointValue(card: CreditCard, monthlySpend: number, fuelFocus = false, faceValue = false): number {
  const tiers = card.redemption?.pointValueTiers;
  if (tiers && tiers.length) {
    const tier = [...tiers]
      .sort((a, b) => b.minMonthlySpend - a.minMonthlySpend)
      .find((t) => monthlySpend >= t.minMonthlySpend);
    if (tier) return tier.value;
  }
  return faceValue ? baseRewardUnitValue(card) : rewardUnitValue(card, fuelFocus);
}

export function baseRewardUnitValue(card: CreditCard) {
  const explicitValue = estimatePointUnitValue(card);
  if (explicitValue > 0) return explicitValue;

  const rewardType = normalizeForMatch(card.rewardType);

  if (rewardType.includes("cashback")) return 1;

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

export function estimateFallbackPointUnitValue(card: CreditCard) {
  const rewardType = normalizeForMatch(card.rewardType);
  if (rewardType.includes("edge miles")) return 1;
  if (rewardType.includes("mile")) return 1;
  if (rewardType.includes("marriott bonvoy")) return 0.6;
  if (rewardType.includes("membership rewards")) return 0.6;

  return 0;
}


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
  if (category === "grocery") return ["smartbuy", "swiggy zomato", ...specialOnlineSpendAliases];
  if (category === "dining") return ["swiggy zomato"];
  return [];
}

function exclusionTextForCard(card: CreditCard) {
  return normalizeForMatch(card.exclusions.join(" "));
}

function specialSpendRuleForCard(card: CreditCard, category: SpendCategory) {
  return card.specialSpendRules?.find((rule) => rule.category === category) ?? null;
}

export function getSurchargePercent(card: CreditCard, category: SpendCategory): number {
  const specialRule = specialSpendRuleForCard(card, category);
  if (specialRule && specialRule.surchargePercent !== undefined) {
    return specialRule.surchargePercent;
  }
  return category === "rent" ? 1.0 : 0.0;
}

export function computeFlexibilityValue(
  card: CreditCard,
  totalMonthlySpend: number,
  includeSmartbuyLikeRewards: boolean
): number {
  const categories: { category: SpendCategory; share: number }[] = [
    { category: "rent", share: 0.05 },
    { category: "insurance", share: 0.02 },
    { category: "education", share: 0.02 },
    { category: "gold", share: 0.02 }
  ];

  let monthlyFlexTotal = 0;
  for (const { category, share } of categories) {
    const allocatedAmount = totalMonthlySpend * share;
    const isExcluded = isSpendCategoryExcluded(card, category);
    let reward = 0;
    if (!isExcluded) {
      const allocations = rewardAllocationsForSpend(
        card,
        category,
        allocatedAmount,
        includeSmartbuyLikeRewards,
        totalMonthlySpend
      );
      reward = estimateMonthlyRewardForAllocations(card, allocations, totalMonthlySpend);
    }
    const surchargePercent = getSurchargePercent(card, category);
    const surcharge = (allocatedAmount * surchargePercent) / 100;
    const flexValue = Math.max(reward - surcharge, 0);
    monthlyFlexTotal += flexValue;
  }
  return monthlyFlexTotal * 12;
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

  // Merchant/brand categories like Amazon are never excluded as general spend categories.
  // Standard text-search for "amazon" yields false positives like "utility transactions outside Amazon platform".
  if (category === "amazon") {
    return false;
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
  const parts = category.split(",").map((c) => c.trim().toLowerCase());
  return parts.some((p) => p === "base" || p === "retail" || p === "offline");
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
    const isIndigoCard = card.tags.includes("indigo") || card.id.includes("indigo");
    if (isIndigoCard) {
      const flightsReward = card.rewards.find((reward) => reward.category.split(",").map(c => c.trim().toLowerCase()).includes("travel"));
      const hotelsReward = card.rewards.find((reward) => reward.category.split(",").map(c => c.trim().toLowerCase()).includes("hotels"));
      const baseReward = card.rewards.find((reward) => isBaseRewardCategory(reward.category));

      const allocations = [
        ...(flightsReward ? [{ amount: effectiveAmount * 0.25, reward: flightsReward }] : []),
        ...(hotelsReward ? [{ amount: effectiveAmount * 0.50, reward: hotelsReward }] : []),
        ...(baseReward ? [{ amount: effectiveAmount * 0.25, reward: baseReward }] : [])
      ];
      return routeToUpiWhenBetter(card, category, effectiveAmount, allocations, totalMonthlySpend);
    }

    if (card.acceleratedShare?.travel !== undefined) {
      const travelSpecialReward =
        findDirectRewardForSpend(card, "phonepe", false) ??
        findPartnerMerchantsReward(card) ??
        findDirectRewardForSpend(card, "online", false);
      if (travelSpecialReward) {
        const travelBaseReward = findBaseRewardForSpend(card, category);
        const share = acceleratedShareForCategory(card, category);
        const allocations = [
          ...(share > 0 ? [{ amount: effectiveAmount * share, reward: travelSpecialReward }] : []),
          ...(share < 1 && travelBaseReward ? [{ amount: effectiveAmount * (1 - share), reward: travelBaseReward }] : [])
        ];
        return routeToUpiWhenBetter(card, category, effectiveAmount, allocations, totalMonthlySpend);
      }
    }

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
  // online/grocery blend with their dedicated smartbuy/portal special row by default; absent one we
  // fall back to the card's general "online" row. For the "online" category that's a same-category
  // fallback (always fine). For "grocery" it's a CROSS-category route — and a `category: "online"`
  // row may actually be narrow (merchant/portal/app-locked, e.g. "Airtel Thanks app", "Amazon Pay
  // merchants", dynamic top-2), so we only blend grocery into it when the card explicitly opts in via
  // `acceleratedShare.grocery`. Any other category blends only when the card opts in, via its
  // "partner merchants" row.
  const blendedOnlineFallback =
    category === "grocery" && card.acceleratedShare?.grocery === undefined
      ? null
      : findDirectRewardForSpend(card, "online", false);
  const specialReward = card.acceleratedShare?.[category] !== undefined
    ? (findPartnerMerchantsReward(card) ?? findDirectRewardForSpend(card, "online", false))
    : blendedSmartbuySpendCategories.includes(category)
      ? (findSpecialRewardForSpend(card, category) ?? blendedOnlineFallback)
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

export function netCategoryReward(
  card: CreditCard,
  category: SpendCategory,
  monthlyCategorySpend: number,
  includeSmartbuyLikeRewards: boolean
): number {
  const surcharge = (monthlyCategorySpend * getSurchargePercent(card, category)) / 100;
  if (isSpendCategoryExcluded(card, category)) return -surcharge; // 0 reward − surcharge
  const allocations = rewardAllocationsForSpend(card, category, monthlyCategorySpend, includeSmartbuyLikeRewards, monthlyCategorySpend);
  const gross = estimateMonthlyRewardForAllocations(card, allocations, monthlyCategorySpend);
  return gross - surcharge;
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

export function findDirectRewardForSpend(card: CreditCard, category: string, includeSmartbuyLikeRewards: boolean) {
  const aliases = aliasesForSpendCategory(category as SpendCategory, includeSmartbuyLikeRewards);
  const targetCategoryLower = category.toLowerCase();
  return (
    card.rewards.find((reward) => {
      const rewardCategories = reward.category.split(",").map((c) => c.trim().toLowerCase());
      return (
        (aliases && aliases.some((alias) => rewardCategories.includes(alias.toLowerCase()))) ||
        rewardCategories.includes(targetCategoryLower)
      );
    }) ??
    null
  );
}

function getCardBaseRate(card: CreditCard): number {
  const baseRow = card.rewards.find((reward) => isBaseRewardCategory(reward.category));
  if (baseRow) return baseRow.rate;
  return card.rewards.length ? Math.min(...card.rewards.map((reward) => reward.rate)) : 0;
}

export function rewardBreakdownForCard(
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
    const surchargePercent = getSurchargePercent(card, item.category);
    const surcharge = (item.allocatedAmount * surchargePercent) / 100;
    const netMonthlyReward = faceValue ? monthlyReward : (monthlyReward - surcharge);
    return {
      spendCategory: item.category,
      monthlySpend: Math.round(item.allocatedAmount),
      rewardCategory: item.reward.category,
      monthlyReward: Math.round(netMonthlyReward),
      annualReward: Math.round(netMonthlyReward * 12)
    };
  };

  // Sum up base cashback first for any rows matching base category.
  let totalBaseCashback = 0;
  for (const alloc of allocations) {
    if (isBaseRewardCategory(alloc.reward.category)) {
      const raw = (alloc.allocatedAmount * alloc.reward.rate) / 100;
      const capped = alloc.reward.capMonthly ? Math.min(raw, alloc.reward.capMonthly) : raw;
      totalBaseCashback += capped;
    }
  }

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
        let rowCap = reward.capMonthly;
        if (reward.capMultiplierOfBaseEarn !== undefined && reward.capMultiplierOfBaseEarn !== null) {
          const dynamicCap = totalBaseCashback * reward.capMultiplierOfBaseEarn;
          rowCap = rowCap !== null ? Math.min(rowCap, dynamicCap) : dynamicCap;
        }
        const rowScale = typeof rowCap === "number" ? (rowCap === 0 ? 0 : (rawSum > rowCap ? rowCap / rawSum : 1)) : 1;
        for (const x of xs) {
          const capped = x.raw * rowScale;
          perItem.push({ item: x.item, capped });
          groupTotal += capped;
        }
      }
      const groupCap = card.capGroups?.[key]?.capMonthly ?? Math.max(0, ...items.map((i) => i.reward.capMonthly ?? 0));
      let groupScale = 1;
      let postCapRewardUnits = 0;
      if (groupCap !== null && groupCap !== undefined && groupTotal > groupCap) {
        groupScale = groupCap / groupTotal;
        const baseRate = getCardBaseRate(card);
        if (baseRate > 0) {
          const totalGroupSpend = items.reduce((sum, item) => sum + item.allocatedAmount, 0);
          const spendAtGroupCap = (groupCap * totalGroupSpend) / groupTotal;
          const excessSpend = Math.max(totalGroupSpend - spendAtGroupCap, 0);
          postCapRewardUnits = (excessSpend * baseRate) / 100;
        }
      }
      return perItem.map(({ item, capped }) => {
        const itemCapped = capped * groupScale;
        const totalGroupSpend = items.reduce((sum, i) => sum + i.allocatedAmount, 0);
        const itemSpendShare = totalGroupSpend > 0 ? item.allocatedAmount / totalGroupSpend : 0;
        const itemPostCap = postCapRewardUnits * itemSpendShare;
        return toRow(item, itemCapped + itemPostCap);
      });
    }

    // Single reward: existing per-reward cap with post-cap fallback rate.
    const reward = key;
    let totalCappedReward = totalRawReward;
    let cap = reward.capMonthly;
    if (reward.capMultiplierOfBaseEarn !== undefined && reward.capMultiplierOfBaseEarn !== null) {
      const dynamicCap = totalBaseCashback * reward.capMultiplierOfBaseEarn;
      cap = cap !== null ? Math.min(cap, dynamicCap) : dynamicCap;
    }

    if (cap !== null && cap !== undefined) {
      if (reward.postCapRate && reward.postCapRate > 0 && totalRawReward > cap && reward.postCapRate < reward.rate) {
        const totalSpend = items.reduce((sum, item) => sum + item.allocatedAmount, 0);
        const spendAtCap = (cap * 100) / reward.rate;
        const excessSpend = Math.max(totalSpend - spendAtCap, 0);
        const postCapRewardUnits = (excessSpend * reward.postCapRate) / 100;
        totalCappedReward = cap + postCapRewardUnits;
      } else {
        totalCappedReward = Math.min(totalRawReward, cap);
      }
    }
    return itemRaw.map(({ item, raw }) => toRow(item, totalRawReward > 0 ? (totalCappedReward * raw) / totalRawReward : 0));
  });
}

export function annualRewardForCard(card: CreditCard, spend: SpendProfile, includeSmartbuyLikeRewards: boolean) {
  return rewardBreakdownForCard(card, spend, includeSmartbuyLikeRewards).reduce((total, item) => total + item.annualReward, 0);
}

export type RewardEconomics = {
  scoringCard: CreditCard;
  optionLabel: string | null;
  optionAnnualCost: number;
  rewardBreakdown: ReturnType<typeof rewardBreakdownForCard>;
  estimatedAnnualRewards: number;
  estimatedAnnualFee: number;
  estimatedNetValue: number;
};

export function bestRewardEconomicsForCard(
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

export function isBroadMixedSpendQuery(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
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





export function feeAfterWaiver(card: CreditCard, spend: SpendProfile) {
  const annualSpend = annualSpendTotal(spend);
  if (card.feeWaiverSpend && annualSpend >= card.feeWaiverSpend) return 0;
  return card.annualFee;
}

export function loungeScore(card: CreditCard) {
  if (card.combinedLoungeAccess !== undefined) {
    return card.combinedLoungeAccess === "unlimited" ? 20 : Math.min(card.combinedLoungeAccess, 19);
  }
  const dom = card.loungeDomestic === "unlimited" ? 20 : Math.min(card.loungeDomestic, 19);
  const intl = card.loungeInternational === "unlimited" ? 20 : Math.min(card.loungeInternational, 19);
  return dom + intl;
}

export function internationalLoungeScore(card: CreditCard) {
  const access = getInternationalLoungeAccess(card);
  if (access === "unlimited") return 20;
  return Math.min(access, 19);
}

export function hasGuestLoungeAccess(card: CreditCard): boolean {
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

export function loungePreferenceBoost(
  card: CreditCard,
  wantsLounge: boolean,
  wantsInternationalLounge: boolean,
  intent: ReturnType<typeof parseQueryIntent>,
  isCategoryFocused: boolean = false,
  maxNetValue?: number,
  maxLoungeScore?: number
) {
  const score = loungeScore(card);

  const hasTravelOrLoungeIntent = intent.useCases.includes("travel") || wantsLounge || wantsInternationalLounge;

  if (!hasTravelOrLoungeIntent) {
    const maxLounge = Math.max(maxLoungeScore ?? 1, 1);
    const relativeScore = score / maxLounge;
    const maxLoungeBoost = (maxNetValue ?? 0) * 0.1;
    return Math.round(relativeScore * maxLoungeBoost);
  }

  // International-lounge query: rank by overseas lounge access specifically (unlimited -> 20); a
  // domestic-only card is not an international lounge card.
  if (wantsInternationalLounge) {
    const intlScore = internationalLoungeScore(card);

    const intlWeight = hasIntlSpendConditions(card) ? 360 : 720;

    const primaryIntlValue = intlScore * intlWeight;
    const separateIntlGuest = (card.loungeGuestInternational ?? 0) * intlWeight * GUEST_VISIT_WEIGHT;
    const poolUplift = card.loungeGuestSharedPool ? primaryIntlValue * 0.25 : 0;

    const travelIntlLoungeValue = primaryIntlValue + poolUplift + separateIntlGuest;
    const loungeValueWeight = isCategoryFocused ? 0.1 : LOUNGE_QUERY_VALUE_WEIGHT;

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
  const loungeValueWeight = isCategoryFocused ? 0.1 : (wantsLounge ? LOUNGE_QUERY_VALUE_WEIGHT : 0.5);
  boost += Math.round(travelLoungeValue * loungeValueWeight);

  if (intent.useCases.includes("travel") && !wantsLounge) {
    boost += Math.round(travelLoungeValue * 0.5);
    if (hasInternationalLounge) boost += 1500;
  }

  return boost;
}

export function forexPreferenceBoost(card: CreditCard, intent: ReturnType<typeof parseQueryIntent>) {
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
