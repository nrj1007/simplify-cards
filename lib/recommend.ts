import { cards } from "./cards";
import { SPEND_CATEGORY_EXCLUSION_CODE_MAP } from "./exclusion-constants";
import { parseQueryIntent } from "./query-intent";
import type { CardScore, CreditCard, RecommendationInput, SpendCategory, SpendProfile, Reward } from "./types";
import { getTotalLoungeAccess } from "./lounge";
import { stripScoringAnnotations } from "./card-index";

export const defaultSpendProfile: SpendProfile = {
  online: 15000,
  base: 8000,
  travel: 5000,
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
    "airlines",
    "hotel",
    "hotels",
    "marriott",
    "cleartrip"
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
const blendedSmartbuySpendCategories: SpendCategory[] = ["online"];
const broadComparisonUpsideWeight = 0.4;
const defaultTopCardCount = 3;
const joiningBenefitAmortizationYears = 3;
const envelopeBaselineMonthlyTiers = [50000, 100000, 250000];

// Scoring stage weights: relevance (text/identity match) vs value (economic/preference fit)
const relevanceWeightExactMatch = 1.0;
const relevanceWeightBroadGeneric = 0.3;
const relevanceWeightDefault = 0.5;
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
    isBroadGenericRankingQuery(input, intent) &&
    effectiveMaxAnnualFee === undefined &&
    !wantsLifetimeFree &&
    !wantsLounge
  );
}

function extractHighSpendIncrementalThreshold(card: CreditCard): number | null {
  const match = [...(card.additionalBenefits ?? []), ...(card.additionalDetails ?? []), ...(card.internalNotes ?? [])]
    .map((benefit) => benefit.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim())
    .map((benefit) =>
      benefit.match(/(\d+(?:\.\d+)?)\s+edge\s+reward\s+points?\s+per\s+rs\s+200.*above\s+rs\s+(\d+(?:\.\d+)?)\s+lakh/)
    )
    .find((result): result is RegExpMatchArray => Boolean(result));
  if (!match) return null;
  return Math.round(Number(match[2]) * 100000);
}

function envelopeTiersForCard(card: CreditCard): number[] {
  const tiers = new Set(envelopeBaselineMonthlyTiers);

  // Add fee waiver threshold (annual → monthly)
  if (card.feeWaiverSpend && card.feeWaiverSpend > 0) {
    tiers.add(Math.round(card.feeWaiverSpend / 12));
  }

  // Add milestone thresholds (annual → monthly)
  for (const benefit of card.milestoneBenefits ?? []) {
    const threshold = extractMilestoneThreshold(benefit);
    if (threshold && threshold > 0) tiers.add(Math.round(threshold / 12));
  }

  // Add high-spend incremental reward threshold (already monthly)
  const highSpendThreshold = extractHighSpendIncrementalThreshold(card);
  if (highSpendThreshold && highSpendThreshold > 0) tiers.add(highSpendThreshold);

  return [...tiers].sort((a, b) => a - b);
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
  "for"
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

  const matchedNameTokenCount = meaningfulTokens.filter(
    (token) => normalizedName.includes(token) || normalizedId.includes(token)
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
  return normalizeForMatch(issuer);
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

function genericRelationshipPenalty(card: CreditCard, input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  return 0;
}

function shouldHideCardFromGenericRanking(card: CreditCard, input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  if (card.id !== "axis-atlas") return false;

  const normalizedQuery = normalizeForMatch(input.query);
  const userExplicitlyAskedForAtlas =
    containsNormalizedPhrase(normalizedQuery, "atlas") ||
    containsNormalizedPhrase(normalizedQuery, "axis atlas");

  if (userExplicitlyAskedForAtlas) return false;

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

function cardMatchesSegment(card: CreditCard, segment: string) {
  const haystack = normalizeForMatch([card.name, ...card.tags, ...card.bestFor].join(" "));

  if (segment === "ltf") return card.annualFee === 0 || containsNormalizedPhrase(haystack, "lifetime free") || containsNormalizedPhrase(haystack, "ltf");
  if (segment === "super-premium") return containsNormalizedPhrase(haystack, "super premium") || containsNormalizedPhrase(haystack, "invite") || card.annualFee >= 10000;
  if (segment === "premium") return containsNormalizedPhrase(haystack, "premium") || card.annualFee >= 3000;
  if (segment === "beginner") return containsNormalizedPhrase(haystack, "beginner") || containsNormalizedPhrase(haystack, "starter") || containsNormalizedPhrase(haystack, "secured") || card.annualFee <= 1000;

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

function redemptionPreferenceValueBoost(card: CreditCard, bucket: string) {
  if (bucket === "accor" && typeof card.redemption?.accorValue === "number") {
    return Math.round(card.redemption.accorValue * 10000);
  }

  if (bucket === "air-india" && typeof card.redemption?.airMilesValue === "number") {
    return Math.round(card.redemption.airMilesValue * 3000);
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

function extractMilestoneThreshold(text: string) {
  const normalized = text.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
  const thresholdMatch =
    normalized.match(/annual spend(?:s|ing)?(?: of| above| greater than)? rs (\d+(?:\.\d+)?) lakh/) ??
    normalized.match(/spends of rs (\d+(?:\.\d+)?) lakh/) ??
    normalized.match(/spending rs (\d+(?:\.\d+)?) lakh/) ??
    normalized.match(/rs (\d+(?:\.\d+)?) lakh or more/);

  if (!thresholdMatch) return null;
  return Math.round(Number(thresholdMatch[1]) * 100000);
}

function estimatePointUnitValue(card: CreditCard) {
  const values = [
    card.redemption?.ecosystemValue,
    card.redemption?.smartBuyFlightHotelValue,
    card.redemption?.travelEdgeValue,
    card.redemption?.airMilesValue,
    card.redemption?.statementBalanceValue,
    card.redemption?.accorValue
  ].filter((value): value is number => typeof value === "number" && value > 0);

  if (values.length === 0) return 0;
  return Math.max(...values);
}

function rewardUnitValue(card: CreditCard) {
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

function partnerTransferUnitValue(card: CreditCard) {
  const haystack = normalizeForMatch([...(card.additionalBenefits ?? []), ...(card.additionalDetails ?? []), ...(card.internalNotes ?? [])].join(" "));
  const conversionMatch = haystack.match(/(\d+(?:\.\d+)?)\s+edge\s+reward\s+points?\s+convert\s+to\s+(\d+(?:\.\d+)?)\s+partner\s+miles?/);
  if (!conversionMatch) return 0;

  const rewardPoints = Number(conversionMatch[1]);
  const partnerMiles = Number(conversionMatch[2]);
  if (!rewardPoints || Number.isNaN(rewardPoints) || Number.isNaN(partnerMiles)) return 0;

  return partnerMiles / rewardPoints;
}

function highSpendIncrementalRewardValue(card: CreditCard, spend: SpendProfile, enabled: boolean) {
  if (!enabled) return 0;

  const match = [...(card.additionalBenefits ?? []), ...(card.additionalDetails ?? []), ...(card.internalNotes ?? [])]
    .map((benefit) => benefit.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim())
    .map((benefit) =>
      benefit.match(/(\d+(?:\.\d+)?)\s+edge\s+reward\s+points?\s+per\s+rs\s+200.*above\s+rs\s+(\d+(?:\.\d+)?)\s+lakh/)
    )
    .find((result): result is RegExpMatchArray => Boolean(result));
  if (!match) return 0;

  const monthlyTotal = monthlySpendTotal(spend);
  const threshold = Math.round(Number(match[2]) * 100000);
  if (!monthlyTotal || monthlyTotal <= threshold) return 0;

  const pointsPerRs100 = Number(match[1]) / 2;
  const unitValue = partnerTransferUnitValue(card) || rewardUnitValue(card);
  if (!pointsPerRs100 || !unitValue) return 0;

  const incrementalMonthlySpend = monthlyTotal - threshold;
  return Math.round((incrementalMonthlySpend * pointsPerRs100 * unitValue * 12) / 100);
}

function estimateFallbackPointUnitValue(card: CreditCard) {
  const rewardType = normalizeForMatch(card.rewardType);
  const haystack = normalizeForMatch(
    [...(card.tags ?? []), ...(card.bestFor ?? []), ...(card.additionalBenefits ?? []), ...(card.additionalDetails ?? []), ...(card.internalNotes ?? [])].join(" ")
  );

  if (rewardType.includes("edge miles")) return 1;
  if (rewardType.includes("mile")) return 1;
  if (rewardType.includes("marriott bonvoy")) return 0.5;
  if (haystack.includes("convert to air miles at 1 1") || haystack.includes("convert to air miles at 1:1")) return 1;
  if (rewardType.includes("membership rewards")) return 0.6;

  return 0;
}

function estimateBenefitLineValue(card: CreditCard, benefit: string) {
  const normalized = normalizeForMatch(benefit);

  if (normalized.includes("fee waived") || normalized.includes("fee waiver") || normalized.includes("fee reversal")) {
    return 0;
  }

  let value = 0;

  // Voucher benefits are discounted to 50% of face value — not all vouchers are useful in practice.
  const voucherDiscount = 0.5;
  const isVoucherBenefit = /\bvoucher(s)?\b/i.test(benefit);

  // "rs X worth ..." — discounted when the line describes vouchers, full value otherwise
  for (const match of benefit.matchAll(/rs ([\d,.]+(?:\.\d+)?) worth/gi)) {
    const parsed = parseRupeeAmount(match[1]);
    if (parsed) value += isVoucherBenefit ? Math.round(parsed * voucherDiscount) : parsed;
  }

  // "voucher(s) worth rs X" — always discounted
  for (const match of benefit.matchAll(/vouchers? worth rs ([\d,.]+(?:\.\d+)?)/gi)) {
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

function estimateMilestoneLineValue(card: CreditCard, benefit: string) {
  return estimateBenefitLineValue(card, benefit);
}

function milestoneValueForCard(card: CreditCard, annualSpend: number) {
  if (!card.milestoneBenefits?.length) return 0;

  return card.milestoneBenefits.reduce((total, benefit) => {
    const threshold = extractMilestoneThreshold(benefit);
    if (threshold !== null && annualSpend < threshold) return total;

    return total + estimateMilestoneLineValue(card, benefit);
  }, 0);
}

export type MilestoneRule = {
  /** Annual spend (Rs) that unlocks this milestone; 0 means it always applies. */
  threshold: number;
  /** Estimated rupee value of the milestone, using the same logic as the recommender. */
  value: number;
  /** Human-readable benefit text. */
  label: string;
  /** Whether the benefit is a voucher. */
  isVoucher?: boolean;
};

export function milestoneRulesForCard(card: CreditCard): MilestoneRule[] {
  return (card.milestoneBenefits ?? [])
    .map((benefit) => ({
      threshold: extractMilestoneThreshold(benefit) ?? 0,
      value: estimateMilestoneLineValue(card, benefit),
      label: stripScoringAnnotations(benefit),
      isVoucher: /\bvoucher(s)?\b/i.test(benefit)
    }))
    .filter((rule) => rule.value > 0)
    .sort((a, b) => a.threshold - b.threshold);
}

function joiningAndRenewalBenefitValueForCard(card: CreditCard) {
  const joiningLines = new Set<string>();
  const renewalLines = new Set<string>();

  for (const benefit of card.joiningBenefits ?? []) {
    joiningLines.add(benefit);
  }

  for (const benefit of card.additionalBenefits ?? []) {
    const normalized = normalizeForMatch(benefit);
    if (/\b(renewal|anniversary)\b/.test(normalized)) {
      renewalLines.add(benefit);
    } else if (
      /\b(joining|welcome|fee levy|fee realization|first year|within 90 days|card open date)\b/.test(normalized)
    ) {
      joiningLines.add(benefit);
    }
  }

  const joiningValue = [...joiningLines].reduce((total, benefit) => total + estimateBenefitLineValue(card, benefit), 0);
  const renewalValue = [...renewalLines].reduce((total, benefit) => total + estimateBenefitLineValue(card, benefit), 0);

  return { joiningValue, renewalValue };
}

function milestoneThresholdsForCard(card: CreditCard) {
  const thresholds = new Set<number>();

  if (card.feeWaiverSpend && card.feeWaiverSpend > 0) {
    thresholds.add(card.feeWaiverSpend);
  }

  for (const benefit of card.milestoneBenefits ?? []) {
    const threshold = extractMilestoneThreshold(benefit);
    if (threshold && threshold > 0) thresholds.add(threshold);
  }

  return [...thresholds].sort((a, b) => a - b);
}

function comparisonMilestoneAndWaiverValue(card: CreditCard) {
  const thresholds = milestoneThresholdsForCard(card);
  if (thresholds.length === 0) return 0;

  let maxValue = 0;
  for (const annualSpend of thresholds) {
    const milestoneValue = milestoneValueForCard(card, annualSpend);
    const feeWaiverValue = card.feeWaiverSpend && annualSpend >= card.feeWaiverSpend ? card.annualFee : 0;
    maxValue = Math.max(maxValue, milestoneValue + feeWaiverValue);
  }

  return maxValue;
}

function milestoneSpecialistBoost(card: CreditCard, broadNoSpendRankingQuery: boolean) {
  if (!broadNoSpendRankingQuery || !card.milestoneBenefits?.length) return 0;

  const searchableText = normalizeForMatch([card.name, ...card.tags, ...card.bestFor].join(" "));
  const milestoneIdentity =
    containsNormalizedPhrase(searchableText, "milestones") ||
    containsNormalizedPhrase(searchableText, "milestone") ||
    containsNormalizedPhrase(searchableText, "platinum travel");

  if (!milestoneIdentity) return 0;

  let boost = 0;
  let hasSevenLakhStyleMilestone = false;
  let hasHighValueMilestone = false;
  let hasTajMilestone = false;

  for (const benefit of card.milestoneBenefits) {
    const threshold = extractMilestoneThreshold(benefit);
    const lineValue = estimateMilestoneLineValue(card, benefit);
    const normalized = normalizeForMatch(benefit);

    if (threshold !== null && threshold >= 650000 && threshold <= 750000) {
      hasSevenLakhStyleMilestone = true;
      if (lineValue >= 15000) hasHighValueMilestone = true;
      if (containsNormalizedPhrase(normalized, "taj")) hasTajMilestone = true;
    }
  }

  if (hasSevenLakhStyleMilestone && hasHighValueMilestone) boost += 6000;
  if (hasTajMilestone) boost += 2500;

  return boost;
}

function aliasesForSpendCategory(category: SpendCategory, includeSmartbuyLikeRewards: boolean) {
  if (category === "online") {
    return includeSmartbuyLikeRewards ? [...spendAliases.online, ...specialOnlineSpendAliases] : spendAliases.online;
  }

  if (category === "travel") {
    return includeSmartbuyLikeRewards ? [...spendAliases.travel, ...specialTravelSpendAliases] : spendAliases.travel;
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

    if (/\b(cap|capped|upto|up to|up-to|max|max\.?)\b/.test(normalizedLine)) {
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

function rewardAllocationsForSpend(
  card: CreditCard,
  category: SpendCategory,
  amount: number,
  includeSmartbuyLikeRewards: boolean
) {
  if (!amount || amount <= 0) return [] as Array<{ amount: number; reward: CreditCard["rewards"][number] }>;

  const effectiveAmount = cappedSpendAmountForCategory(card, category, amount);
  if (!effectiveAmount || effectiveAmount <= 0) return [] as Array<{ amount: number; reward: CreditCard["rewards"][number] }>;

  if (includeSmartbuyLikeRewards) {
    const matchingReward = findRewardForSpend(card, category, true);
    return matchingReward ? [{ amount: effectiveAmount, reward: matchingReward }] : [];
  }

  if (category === "travel") {
    const travelReward = findRewardForSpend(card, category, true);
    return travelReward ? [{ amount: effectiveAmount, reward: travelReward }] : [];
  }

  if (category === "grocery") {
    const groceryReward = findRewardForSpend(card, category, true);
    return groceryReward ? [{ amount: effectiveAmount, reward: groceryReward }] : [];
  }

  const baseReward = findBaseRewardForSpend(card, category);
  const specialReward = blendedSmartbuySpendCategories.includes(category) ? findSpecialRewardForSpend(card, category) : null;

  if (specialReward && baseReward && specialReward.category !== baseReward.category) {
    return [
      { amount: effectiveAmount * 0.5, reward: specialReward },
      { amount: effectiveAmount * 0.5, reward: baseReward }
    ];
  }

  const matchingReward = baseReward ?? specialReward;
  return matchingReward ? [{ amount: effectiveAmount, reward: matchingReward }] : [];
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

function rewardBreakdownForCard(card: CreditCard, spend: SpendProfile, includeSmartbuyLikeRewards: boolean) {
  const unitValue = rewardUnitValue(card);

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
    const currentAllocations = rewardAllocationsForSpend(card, category, amount, includeSmartbuyLikeRewards);
    for (const alloc of currentAllocations) {
      allocations.push({
        category,
        allocatedAmount: alloc.amount,
        reward: alloc.reward
      });
    }
  });

  const groups = new Map<Reward, ActiveAllocation[]>();
  for (const alloc of allocations) {
    if (!groups.has(alloc.reward)) {
      groups.set(alloc.reward, []);
    }
    groups.get(alloc.reward)!.push(alloc);
  }

  return Array.from(groups.entries()).flatMap(([reward, items]) => {
    const totalRawReward = items.reduce((sum, item) => sum + (item.allocatedAmount * reward.rate) / 100, 0);
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

    return items.map((item) => {
      const rawReward = (item.allocatedAmount * reward.rate) / 100;
      const cappedRewardUnits = totalRawReward > 0 ? (totalCappedReward * rawReward) / totalRawReward : 0;
      const monthlyReward = cappedRewardUnits * unitValue;

      return {
        spendCategory: item.category,
        monthlySpend: Math.round(item.allocatedAmount),
        rewardCategory: reward.category,
        monthlyReward: Math.round(monthlyReward),
        annualReward: Math.round(monthlyReward * 12)
      };
    });
  });
}

function annualRewardForCard(card: CreditCard, spend: SpendProfile, includeSmartbuyLikeRewards: boolean) {
  return rewardBreakdownForCard(card, spend, includeSmartbuyLikeRewards).reduce((total, item) => total + item.annualReward, 0);
}

function isPremiumTravelCard(card: CreditCard) {
  const haystack = normalizeForMatch(
    [
      card.name,
      ...card.tags,
      ...card.bestFor,
      ...card.rewards.map((reward) => reward.category)
    ].join(" ")
  );

  const hasTravelSignals =
    ["travel", "miles", "airline", "airlines", "hotel", "hotels", "lounge"].some((token) => containsNormalizedPhrase(haystack, token)) ||
    card.rewards.some((reward) => ["travel", "hotels", "airlines", "smartbuy flights", "smartbuy hotels"].includes(reward.category));
  const hasPremiumSignals =
    card.annualFee >= 3000 ||
    ["premium", "super premium", "metal", "signature", "world", "infinite", "mastercard"].some((token) => haystack.includes(token)) ||
    card.loungeDomestic === "unlimited" ||
    card.loungeInternational === "unlimited" ||
    loungeScore(card) >= 8;

  return hasTravelSignals && hasPremiumSignals;
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
  includeSmartbuyLikeRewards: boolean,
  options?: { broadMixedSpendQuery?: boolean }
) {
  const monthlyTotal = monthlySpendTotal(spend);
  if (!monthlyTotal) return 0;
  const activeCategories = (Object.entries(spend) as Array<[SpendCategory, number]>).filter(([, amount]) => (amount ?? 0) > 0);
  const isFocusedSpendProfile = activeCategories.length === 1;
  const softenPremiumTravelPenalty = Boolean(options?.broadMixedSpendQuery) && !isFocusedSpendProfile && isPremiumTravelCard(card);

  return activeCategories.reduce((total, [category, amount]) => {
    if (!amount || amount <= 0) return total;
    const isExcluded = isSpendCategoryExcluded(card, category);
    const allocations = rewardAllocationsForSpend(card, category, amount, includeSmartbuyLikeRewards);
    const specialRule = specialSpendRuleForCard(card, category);

    if (isExcluded) {
      const exclusionPenalty =
        softenPremiumTravelPenalty && category !== "travel" && category !== "base"
          ? (category === "fuel" ? 45000 : 25000)
          : 90000;
      return total - exclusionPenalty * (amount / monthlyTotal);
    }
    if (allocations.length === 0) {
      const missingPenalty = softenPremiumTravelPenalty ? (isFocusedSpendProfile ? 35000 : 5000) : isFocusedSpendProfile ? 35000 : 12000;
      return total - missingPenalty * (amount / monthlyTotal);
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
          return categoryTotal + (isFocusedSpendProfile ? 32000 : 14000) * weight;
        }

        if (isBaseRewardCategory(rewardCategory) && category !== "base") {
          const fallbackPenalty = softenPremiumTravelPenalty ? (isFocusedSpendProfile ? 28000 : 1500) : isFocusedSpendProfile ? 28000 : 10000;
          return categoryTotal - fallbackPenalty * weight;
        }

        return categoryTotal;
      }, 0)
    );
  }, 0);
}

function genericLtfAdjustment(card: CreditCard, intent: ReturnType<typeof parseQueryIntent>) {
  if (!(intent.segments.length === 1 && intent.segments[0] === "ltf")) return 0;
  if (intent.useCases.length > 0 || intent.issuers.length > 0 || intent.redemptionBuckets.length > 0) return 0;

  const haystack = normalizeForMatch([card.name, ...card.tags, ...card.bestFor, ...card.exclusions].join(" "));
  let adjustment = 0;

  if (containsNormalizedPhrase(haystack, "entry level") || containsNormalizedPhrase(haystack, "beginner") || containsNormalizedPhrase(haystack, "starter")) adjustment += 10000;
  if (containsNormalizedPhrase(haystack, "invite only") || containsNormalizedPhrase(haystack, "luxury")) adjustment -= 18000;

  return adjustment;
}

function feeAfterWaiver(card: CreditCard, spend: SpendProfile) {
  const annualSpend = annualSpendTotal(spend);
  if (card.feeWaiverSpend && annualSpend >= card.feeWaiverSpend) return 0;
  return card.annualFee;
}

function loungeScore(card: CreditCard) {
  const totalLoungeAccess = getTotalLoungeAccess(card);
  if (totalLoungeAccess === "unlimited") return 20;
  return totalLoungeAccess;
}

function loungePreferenceBoost(card: CreditCard, wantsLounge: boolean, intent: ReturnType<typeof parseQueryIntent>) {
  const score = loungeScore(card);
  if (score <= 0) {
    if (wantsLounge) return -12000;
    if (intent.useCases.includes("travel")) return -3000;
    return 0;
  }

  const hasInternationalLounge = card.loungeInternational === "unlimited" || card.loungeInternational > 0;
  const internationalLoungeScore =
    card.loungeInternational === "unlimited" ? 8 : typeof card.loungeInternational === "number" ? card.loungeInternational : 0;
  let boost = 0;

  if (wantsLounge) {
    boost += score * 1500;
    boost += internationalLoungeScore * 2500;
    if (hasInternationalLounge) boost += 8000;
  }

  if (intent.useCases.includes("travel")) {
    boost += score * 180;
    if (hasInternationalLounge) boost += 1500;
  }

  return boost;
}

function forexPreferenceBoost(card: CreditCard, intent: ReturnType<typeof parseQueryIntent>) {
  const hasForexIntent = intent.tags.includes("forex") || intent.useCases.includes("travel");
  if (!hasForexIntent) return 0;

  const markup = typeof card.forexMarkup === "number" ? card.forexMarkup : 3.5;
  const betterThanBaseline = 3.5 - markup;
  const explicitForexQuery = intent.tags.includes("forex");

  if (betterThanBaseline > 0) {
    return Math.round(betterThanBaseline * (explicitForexQuery ? 30000 : 3500));
  }

  if (betterThanBaseline < 0) {
    return Math.round(betterThanBaseline * (explicitForexQuery ? 18000 : 2000));
  }

  return 0;
}

export function requestedTopCardCount(query?: string) {
  const normalizedQuery = normalizeForMatch(query);
  if (!normalizedQuery) return defaultTopCardCount;

  const match = normalizedQuery.match(/\btop\s+(\d+)\b/);
  if (!match) return defaultTopCardCount;

  const parsed = Number(match[1]);
  if (Number.isNaN(parsed) || parsed < 1) return defaultTopCardCount;

  return Math.min(parsed, 20);
}

function brandUtilityPenalty(card: CreditCard, input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
  if (!isBroadGenericRankingQuery(input, intent)) return 0;

  const normalizedQuery = normalizeForMatch(input.query);

  const searchableText = normalizeForMatch([card.name, ...card.tags, ...card.bestFor].join(" "));

  if (containsNormalizedPhrase(normalizedQuery, "reliance") || containsNormalizedPhrase(normalizedQuery, "apollo") || containsNormalizedPhrase(normalizedQuery, "titan")) {
    return 0;
  }

  if (containsNormalizedPhrase(searchableText, "reliance")) return -5000;
  if (containsNormalizedPhrase(searchableText, "apollo")) return -6000;
  if (containsNormalizedPhrase(searchableText, "titan")) return -5000;

  return 0;
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

export function scoreCards(input: RecommendationInput): CardScore[] {
  const intent = parseQueryIntent(input);
  const queryTags = extractQueryTags(input.query);
  const effectiveMaxAnnualFee = input.maxAnnualFee ?? intent.maxAnnualFee;
  const wantsLifetimeFree = input.wantsLifetimeFree ?? intent.wantsLifetimeFree;
  const wantsLounge = input.wantsLounge ?? intent.wantsLounge;
  const spend = { ...defaultSpendProfile, ...(intent.inferredSpend ?? {}), ...(input.spend ?? {}) };
  const restrictToIssuer = shouldRestrictToIssuer(intent, input.query);
  const includeSmartbuyLikeRewards = shouldIncludeSmartbuyLikeRewards(input.query);
  const broadMixedSpendQuery = isBroadMixedSpendQuery(input, intent);
  const broadNoSpendRankingQuery = isBroadNoSpendQuery(input, intent);
  const broadGenericRanking = isBroadGenericRankingQuery(input, intent);
  const useEnvelopeScoring = shouldUseEnvelopeScoring(input, intent, effectiveMaxAnnualFee, wantsLifetimeFree, wantsLounge);

  const scoreCardForSpend = (
    card: CreditCard,
    spendForScore: SpendProfile,
    envelopeMonthlySpend?: number
  ): CardScore => {
    const annualSpend = annualSpendTotal(spendForScore);
    const matchedTags = card.tags.filter((tag) => queryTags.has(tag));
    const cardNameBoost = computeCardNameBoost(card, input.query);
    const issuerBoost = intent.issuers.includes(card.issuer) ? 20000 : 0;
    const rewardBreakdown = rewardBreakdownForCard(card, spendForScore, includeSmartbuyLikeRewards);
    const highSpendIncrementalValue = highSpendIncrementalRewardValue(card, spendForScore, useEnvelopeScoring);
    const estimatedAnnualRewards = annualRewardForCard(card, spendForScore, includeSmartbuyLikeRewards) + highSpendIncrementalValue;
    const estimatedMilestoneValue = milestoneValueForCard(card, annualSpend);
    const { joiningValue: rawJoiningValue, renewalValue: rawRenewalValue } = joiningAndRenewalBenefitValueForCard(card);
    const estimatedJoiningAndRenewalValue = Math.round(rawJoiningValue / joiningBenefitAmortizationYears) + rawRenewalValue;
    const estimatedAnnualFee = feeAfterWaiver(card, spendForScore);
    const estimatedNetValue = estimatedAnnualRewards + estimatedMilestoneValue + estimatedJoiningAndRenewalValue - estimatedAnnualFee;
    const currentMilestoneAndWaiverValue = estimatedMilestoneValue + (card.annualFee - estimatedAnnualFee);
    const maxComparisonMilestoneAndWaiverValue = comparisonMilestoneAndWaiverValue(card);
    const comparisonMilestoneAndWaiverDelta = broadNoSpendRankingQuery && !useEnvelopeScoring
      ? Math.round(Math.max(maxComparisonMilestoneAndWaiverValue - currentMilestoneAndWaiverValue, 0) * broadComparisonUpsideWeight)
      : 0;
    const tagBoost = matchedTags.length * 500;
    const keywordBoost = computeQueryKeywordBoost(card, input.query);
    const useCaseBoost = intent.useCases.reduce((total, useCase) => {
      const strength = cardUseCaseStrength(card, useCase);
      return total + (strength > 0 ? strength * 7000 : -12000);
    }, 0);
    const segmentBoost = intent.segments.reduce((total, segment) => total + (cardMatchesSegment(card, segment) ? 3000 : 0), 0);
    const redemptionBoost = intent.redemptionBuckets.reduce(
      (total, bucket) =>
        total + (cardMatchesRedemptionBucket(card, bucket) ? 3500 : 0) + redemptionPreferenceValueBoost(card, bucket),
      0
    );
    const networkBoost = intent.networks.some((network) => card.network.includes(network)) ? 3000 : 0;
    const loungeBoost = loungePreferenceBoost(card, wantsLounge, intent);
    const forexBoost = forexPreferenceBoost(card, intent);
    const spendCategoryBoost = categoryFitAdjustment(card, spendForScore, includeSmartbuyLikeRewards, {
      broadMixedSpendQuery
    });
    const ltfQueryBoost = genericLtfAdjustment(card, intent);
    const relationshipPenalty = genericRelationshipPenalty(card, input, intent);
    const brandPenalty = brandUtilityPenalty(card, input, intent);
    const specialSpendBoost = specialSpendFlexibilityBoost(card, input, intent);
    const milestoneBoost = milestoneSpecialistBoost(card, broadNoSpendRankingQuery);
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
      ...(issuerBoost > 0 ? [`Matches ${card.issuer} issuer intent`] : []),
      ...matchedTags.map((tag) => `Matches ${tag} intent`),
      ...strongestRewards,
      ...(highSpendIncrementalValue > 0
        ? [`High-spend incremental earn adds about Rs ${highSpendIncrementalValue.toLocaleString("en-IN")}`]
        : []),
      ...(estimatedMilestoneValue > 0 ? [`Milestone value adds about Rs ${estimatedMilestoneValue.toLocaleString("en-IN")}`] : []),
      ...(estimatedJoiningAndRenewalValue > 0
        ? [`Joining and renewal benefits add about Rs ${estimatedJoiningAndRenewalValue.toLocaleString("en-IN")} per year`]
        : []),
      ...(comparisonMilestoneAndWaiverDelta > 0
        ? [`Higher milestone and fee-waiver upside can add about Rs ${comparisonMilestoneAndWaiverDelta.toLocaleString("en-IN")} in broader comparisons`]
        : []),
      ...(milestoneBoost > 0 ? ["Strong milestone-led value closer to Rs 7 lakh yearly spend"] : []),
      ...(specialSpendBoost > 0 ? ["Rewards on usually excluded categories improve broader card utility"] : []),
      ...(brandPenalty < 0 ? ["Broader ranking reduced for a narrower co-brand ecosystem fit"] : []),
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
      tagBoost +
      issuerBoost +
      networkBoost;

    // Non-economic preference and penalty signals shared by both scoring paths
    const sharedBoosts =
      useCaseBoost +
      segmentBoost +
      redemptionBoost +
      loungeBoost +
      forexBoost +
      spendCategoryBoost +
      comparisonMilestoneAndWaiverDelta +
      ltfQueryBoost +
      relationshipPenalty +
      brandPenalty +
      specialSpendBoost +
      milestoneBoost +
      // TODO: Review popularity score weight (currently popularityScore * 50)
      card.popularityScore * 50;

    // Value score: economic quality and preference fit signals
    const valueScore = estimatedNetValue + sharedBoosts;

    // Query-type-dependent blending
    const isExactCardLookup = cardNameBoost >= exactCardNameMatchThreshold;
    const relevanceWeight = isExactCardLookup ? relevanceWeightExactMatch
      : broadGenericRanking ? relevanceWeightBroadGeneric
      : relevanceWeightDefault;
    const fitScore = valueScore + relevanceWeight * relevanceScore;

    // Envelope-only: normalize economic value to net yield so cards scored at different
    // spend tiers are comparable. Yield (e.g. 0.03 for 3%) is scaled by 1,000,000 to
    // match the magnitude of the sharedBoosts components (~500–40,000 range).
    // Guard: skip normalization for very low spend to avoid yield blow-up.
    const normalizedFitScore = envelopeMonthlySpend
      ? (() => {
          const netYield = annualSpend >= 10000 ? estimatedNetValue / annualSpend : 0;
          const economicScore = netYield * 1000000;
          return economicScore + sharedBoosts + relevanceWeight * relevanceScore;
        })()
      : undefined;

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
      rewardBreakdown
    };
  };

  return cards
    .filter((card) => !shouldHideCardFromGenericRanking(card, input, intent))
    .filter((card) => (effectiveMaxAnnualFee === undefined ? true : card.annualFee <= effectiveMaxAnnualFee))
    .filter((card) =>
      effectiveMaxAnnualFee === undefined || hasExplicitAnnualFeeLanguage(input.query) ? true : card.joiningFee <= effectiveMaxAnnualFee
    )
    .filter((card) => (wantsLifetimeFree ? (card.annualFee === 0 && card.joiningFee === 0) : true))
    .filter((card) => (wantsLounge ? loungeScore(card) > 0 : true))
    .filter((card) => (restrictToIssuer ? normalizeIssuer(card.issuer) === normalizeIssuer(intent.issuers[0]) : true))
    .map((card) => {
      if (!useEnvelopeScoring) return scoreCardForSpend(card, spend);

      const tiers = envelopeTiersForCard(card);
      return tiers
        .map((monthlySpend) => scoreCardForSpend(card, scaleSpendProfileToMonthly(defaultSpendProfile, monthlySpend), monthlySpend))
        .sort((a, b) => (b.envelopeScoring?.normalizedFitScore ?? 0) - (a.envelopeScoring?.normalizedFitScore ?? 0))[0];
    })
    .sort((a, b) =>
      useEnvelopeScoring
        ? (b.envelopeScoring?.normalizedFitScore ?? 0) - (a.envelopeScoring?.normalizedFitScore ?? 0)
        : b.fitScore - a.fitScore
    );
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
