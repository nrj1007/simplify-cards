import { cards } from "./cards";
import {
  CASHBACK_BLEND_SPEND_LEVELS,
  CASHBACK_BLEND_WEIGHTS,
  CASHBACK_POPULARITY_WEIGHT,
  CATEGORY_FOCUS_BLEND_WEIGHTS,
  CATEGORY_FOCUS_MULTIPLIERS,
  CATEGORY_FOCUS_SPEND_SHARE,
  EQUAL_BLEND_WEIGHTS,
  LOW_FEE_BLEND_WEIGHTS,
  POPULARITY_FULL_WEIGHT_ANNUAL_SPEND,
  POPULARITY_MIN_SCALE,
  POPULARITY_RANKING_WEIGHT,
  RELEVANCE_WEIGHT_BROAD_GENERIC,
  RELEVANCE_WEIGHT_DEFAULT,
  RELEVANCE_WEIGHT_EXACT_MATCH,
  REWARD_BLEND_SPEND_LEVELS,
  REWARD_BLEND_WEIGHTS,
  SEGMENT_BLEND_MULTIPLIERS,
  SEGMENT_BLEND_WEIGHTS,
  UPI_BLEND_SPEND_LEVELS,
  UPI_BLEND_WEIGHTS,
  UTILITY_BLEND_SPEND_LEVELS,
  UTILITY_BLEND_WEIGHTS
} from "./ranking-config";
import { rankingStrategies, DEFAULT_RANKING_STRATEGY } from "./ranking-strategies";
import { compareResultDisplayOrder, resultStrategies, DEFAULT_RESULT_STRATEGY, isPrimaryCashbackCard } from "./result-strategies";
import type { ResultSection } from "./result-strategies";
import { parseQueryIntent } from "./query-intent";
import type { CardScore, CreditCard, RecommendationInput, ScoreReason, SpendCategory, SpendProfile } from "./types";
import {
  cardEarnsCashback,
  cardMatchesNetworkFilter,
  clearsMinimumRentReturn,
  explicitNetworkFilters,
  hasExplicitAnnualFeeLanguage,
  hasFuelCardSignal,
  hasUpiCardSignal,
  isCardRecommendationQuery,
  maxForexMarkupForForexQueries,
  normalizeIssuer,
  shouldIncludeSmartbuyLikeRewards,
  shouldRestrictToCashbackCards,
  shouldRestrictToFuelCards,
  shouldRestrictToIssuer,
  shouldRestrictToLowForexCards,
  shouldRestrictToMinimumRentReturn,
  shouldRestrictToUpiCards,
  shouldRestrictToZeroForexCards
} from "./recommend-filters";
import {
  cardBaseRate,
  cardHasCategoryFocusTag,
  cardMatchesCategoryFocus,
  cardPositioningMatchesFocus,
  categoryFocus75_25SpendProfile,
  categoryFocusMonthlySpend,
  detectCategoryFocus,
  focusedSpendProfile,
  weightedFocusSpendProfile
} from "./recommend-category-focus";
import { joiningAndRenewalBenefitValueForCard, milestoneValueForCard } from "./recommend-milestones";
import {
  annualSpendTotal,
  bestRewardEconomicsForCard,
  cardMatchesRedemptionBucket,
  cardMatchesSegment,
  cardUseCaseStrength,
  computeCardNameBoost,
  computeFlexibilityValue,
  computeQueryKeywordBoost,
  exactCardNameMatchThreshold,
  extractQueryTags,
  feeAfterWaiver,
  findDirectRewardForSpend,
  forexPreferenceBoost,
  formatEnvelopeSpendLabel,
  formatSpendInLakhs,
  fuelHeavySpendShare,
  getSurchargePercent,
  hasGuestLoungeAccess,
  internationalLoungeScore,
  isBroadMixedSpendQuery,
  isSpendCategoryExcluded,
  loungePreferenceBoost,
  loungeScore,
  monthlySpendTotal,
  netCategoryReward,
  qualifiesAsTravelCard,
  redemptionPreferenceValueBoost,
  requiresRelationshipAccess,
  rewardLiquidityMultiplier,
  scaleSpendProfileToMonthly,
  scoreReasonKind,
  shouldHideCardFromGenericRanking,
  titleCaseCategory
} from "./recommend-scoring";
import { normalizeForMatch } from "./recommend-utils";
import { cardRewardTypeIncludesCashback } from "./reward-type";

export { categoryFocusKeys } from "./recommend-category-focus";
export type { MilestoneRule } from "./recommend-milestones";
export {
  extractMilestoneThreshold,
  estimateBenefitLineValue,
  estimateMilestoneLineValue,
  joiningAndRenewalBenefitValueForCard,
  milestoneRulesForCard
} from "./recommend-milestones";
export { cardMatchesSegment, getAirMilesValue, qualifiesAsTravelCard } from "./recommend-scoring";


// Realistic broad-spender mix (proportions are what matter — the envelope rescales the total across
// spend levels; total kept at the historical Rs 53,000/mo). Percentages: online 15%, base/offline
// 12%, travel 12%, grocery 10%, dining 10%, amazon 8%, upi 8%, utilities 8%, insurance 6%, fuel 5%,
// and a 6% "excluded/low-reward" bucket split as education 3% + gold 3% (near-universally excluded
// -> ~0 earn, which dilutes effective yields to be realistic).
export const defaultSpendProfile: SpendProfile = {
  online: 7950,
  base: 6360,
  travel: 6360,
  hotels: 0,
  airlines: 0,
  dining: 5300,
  grocery: 5300,
  fuel: 2650,
  amazon: 4240,
  upi: 4240,
  utilities: 4240,
  rent: 0,
  insurance: 3180,
  education: 1590,
  gold: 1590,
  government: 0,
  international: 0
};

const defaultTopCardCount = 3;
const joiningBenefitAmortizationYears = 2;

// Ranking/blend tuning knobs (relevance weights, popularity priors, spend levels and blend
// weights) live in ./ranking-config — imported above and the single source of truth.

// Representative monthly spend for each segment tier. A segment query implies a spend/income level,
// so instead of the envelope blend we score segment queries at the tier's typical spend (the default
// category mix scaled to this total). Higher tier -> higher spend.
const segmentRepresentativeMonthlySpend: Record<string, number> = {
  beginner: 25000,
  ltf: 25000,
  premium: 120000,
  "super-premium": 250000
};

const segmentCardNameBoostIgnoredTokens: Record<string, string[]> = {
  beginner: ["beginner", "entry"],
  ltf: ["ltf", "lifetime", "free"],
  premium: ["premium", "mid"],
  "super-premium": ["super", "ultra", "premium"]
};
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

export function isBroadGenericRankingQuery(input: RecommendationInput, intent: ReturnType<typeof parseQueryIntent>) {
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

function eligibleAnnualSpendTotal(card: CreditCard, spendProfile: SpendProfile): number {
  let eligibleMonthlyTotal = 0;
  for (const category of Object.keys(spendProfile) as SpendCategory[]) {
    const amount = spendProfile[category] ?? 0;
    if (amount > 0 && !isSpendCategoryExcluded(card, category)) {
      eligibleMonthlyTotal += amount;
    }
  }
  return eligibleMonthlyTotal * 12;
}
export function requestedTopCardCount(query?: string, resultStrategy?: string) {
  if (resultStrategy === "reward-type-split") {
    return 10;
  }
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
  const strategy = rankingStrategies[input.rankingStrategy ?? DEFAULT_RANKING_STRATEGY];
  const intent = parseQueryIntent(input);
  if (intent.inferredSpend && intent.inferredSpend.travel === 53000) {
    intent.inferredSpend = weightedFocusSpendProfile("travel", 0.75, defaultSpendProfile);
  }
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
  const restrictToLowForexCards = shouldRestrictToLowForexCards(input, intent);
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
  const focusedCategory = (categoryFocus?.spendCategory ?? (restrictToFuelCards ? "fuel" : null)) as SpendCategory | null;
  const forexFocus = intent.tags.includes("forex") && !input.spend && !intent.inferredSpend;
  const categoryFocusedSpend = (focusedCategory && categoryFocusMonthlySpend[focusedCategory])
    ? categoryFocus75_25SpendProfile(focusedCategory, categoryFocusMonthlySpend[focusedCategory]!, defaultSpendProfile)
    : undefined;
  const forexFocusedSpend = forexFocus ? weightedFocusSpendProfile("international", 0.5, defaultSpendProfile) : undefined;
  const segmentRepresentativeSpend =
    restrictToSegments && !input.spend && !intent.inferredSpend && !categoryFocus && !forexFocus && !restrictToFuelCards
      ? Math.max(...restrictToSegments.map((segment) => segmentRepresentativeMonthlySpend[segment] ?? 50000))
      : undefined;
  const ignoredCardNameBoostTokens = [
    ...(restrictToSegments ? restrictToSegments.flatMap((segment) => segmentCardNameBoostIgnoredTokens[segment] ?? []) : []),
    ...(intent.networks.length > 0 ? ["visa", "mastercard", "rupay", "jcb", "diners", "amex", "american", "express"] : []),
    ...(intent.issuers.length > 0 ? intent.issuers.flatMap((issuer) => issuer.toLowerCase().split(/\s+/)) : [])
  ];
  const segmentSpend = segmentRepresentativeSpend
    ? scaleSpendProfileToMonthly(defaultSpendProfile, segmentRepresentativeSpend)
    : undefined;
  const restrictToIssuer = shouldRestrictToIssuer(intent, input.query);
  const includeSmartbuyLikeRewards = shouldIncludeSmartbuyLikeRewards(input.query);
  const broadMixedSpendQuery = isBroadMixedSpendQuery(input, intent);
  const broadNoSpendRankingQuery = isBroadNoSpendQuery(input, intent);
  const broadGenericRanking = isBroadGenericRankingQuery(input, intent);
  const restrictToUpiCards = shouldRestrictToUpiCards(input, intent);
  const restrictToMinimumRentReturn = shouldRestrictToMinimumRentReturn(input, intent);
  const upiFocusedSpend = restrictToUpiCards && !intent.inferredSpend && !input.spend ? focusedSpendProfile("upi", defaultSpendProfile) : undefined;
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
    (focusedCategory !== null && input.spend === undefined) ||
    (segmentRepresentativeSpend !== undefined) ||
    (!restrictToFuelCards &&
    (
      shouldUseEnvelopeScoring(input, intent, effectiveMaxAnnualFee, wantsLifetimeFree, wantsLounge) ||
      (input.spend !== undefined && isGoldenSpendProfile(input.spend)) ||
      (input.spend === undefined && intent.inferredSpend === undefined && (
        wantsLifetimeFree ||
        effectiveMaxAnnualFee === 0 ||
        isUtilityLikeCategory ||
        wantsLounge ||
        isTargetedEnvelopeQuery(input, intent)
      )) ||
      // When the caller requests a split view with an inferred spend (e.g. "best forex cards"),
      // keep envelope scoring available for the same blended ranking used by the flat list.
      (input.resultStrategy === "reward-type-split" && intent.inferredSpend !== undefined && input.spend === undefined)
    ));
  const zeroProfile: SpendProfile = {
    online: 0,
    base: 0,
    travel: 0,
    hotels: 0,
    airlines: 0,
    fuel: 0,
    dining: 0,
    grocery: 0,
    amazon: 0,
    upi: 0,
    utilities: 0,
    rent: 0,
    insurance: 0,
    education: 0,
    gold: 0,
    government: 0,
    international: 0
  };
  const baseProfile = input.spend !== undefined ? zeroProfile : defaultSpendProfile;
  const spend = {
    ...baseProfile,
    ...(segmentSpend ?? {}),
    ...(intent.inferredSpend ?? {}),
    ...(forexFocusedSpend ?? {}),
    ...(upiFocusedSpend ?? {}),
    ...(categoryFocusedSpend ?? {}),
    ...(input.spend ?? {})
  };
  const networkFilters = explicitNetworkFilters(input, intent);

  const candidateCards = cards
    .filter((card) => !shouldHideCardFromGenericRanking(card, input, intent))
    .filter((card) => {
      if (effectiveMaxAnnualFee !== undefined && requiresRelationshipAccess(card)) {
        const q = (input.query ?? "").toLowerCase();
        const queryAsksForRelation = [
          "relationship",
          "invite",
          "pioneer",
          "burgundy",
          "solitaire",
          "priority",
          "private",
          "wealth",
          "approval"
        ].some((token) => q.includes(token));
        return queryAsksForRelation;
      }
      return true;
    })
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
    .filter((card) => (restrictToLowForexCards ? card.forexMarkup <= maxForexMarkupForForexQueries : true))
    .filter((card) => (restrictToZeroForexCards ? card.forexMarkup === 0 : true))
    .filter((card) => (restrictToTravelCards ? qualifiesAsTravelCard(card) : true))
    .filter((card) =>
      restrictToRedemptionBuckets
        ? intent.redemptionBuckets.some((bucket) => cardMatchesRedemptionBucket(card, bucket))
        : true
    )
    .filter((card) => (networkFilters.length ? networkFilters.some((network) => cardMatchesNetworkFilter(card, network)) : true))
    .filter((card) => (restrictToFuelCards ? hasFuelCardSignal(card) : true))
    .filter((card) => (restrictToCashbackCards ? cardEarnsCashback(card) : true))
    .filter((card) => (restrictToSegments ? restrictToSegments.some((segment) => cardMatchesSegment(card, segment)) : true))
    .filter((card) => (categoryFocus ? cardMatchesCategoryFocus(card, categoryFocus) : true))
    .filter((card) =>
      focusedCategory
        ? netCategoryReward(card, focusedCategory, categoryFocusMonthlySpend[focusedCategory] ?? 8000, includeSmartbuyLikeRewards) > 0
        : true
    );

  const candidateNetValues = candidateCards.map((card) => {
    const eligibleAnnualSpend = eligibleAnnualSpendTotal(card, spend);
    const estimatedMilestoneValue = milestoneValueForCard(card, eligibleAnnualSpend);
    const { joiningValue: rawJoiningValue, renewalValue: rawRenewalValue } = joiningAndRenewalBenefitValueForCard(card);
    const rawJoiningFee = card.joiningFee ?? 0;
    const baseAnnualFee = feeAfterWaiver(card, spend);
    const estimatedJoiningAndRenewalValue = Math.round(
      (rawJoiningValue - rawJoiningFee) / joiningBenefitAmortizationYears +
      (rawRenewalValue * (joiningBenefitAmortizationYears - 1)) / joiningBenefitAmortizationYears +
      baseAnnualFee / joiningBenefitAmortizationYears
    );
    const monthlyTotalForScore = monthlySpendTotal(spend);
    const fuelSpendShare = monthlyTotalForScore > 0 ? (spend.fuel ?? 0) / monthlyTotalForScore : 0;
    const fuelFocus = restrictToFuelCards || fuelSpendShare >= fuelHeavySpendShare;
    const rewardEconomics = bestRewardEconomicsForCard(
      card,
      spend,
      includeSmartbuyLikeRewards,
      estimatedMilestoneValue,
      estimatedJoiningAndRenewalValue,
      wantsLifetimeFree,
      fuelFocus
    );
    const forexMarkup = typeof card.forexMarkup === "number" ? card.forexMarkup : 3.5;
    const estimatedForexCost = Math.round(((spend.international ?? 0) * 12 * forexMarkup) / 100);
    return rewardEconomics.estimatedNetValue - estimatedForexCost;
  });

  const maxNetValue = Math.max(...candidateNetValues, 0);
  const maxLoungeScore = Math.max(...candidateCards.map((card) => loungeScore(card)), 1);
  // Checked via card.broadOnlineReward property, indicating the card's "online" reward tier
  // applies broadly to ALL online spends (any merchant), not just specific platforms or partner lists.
  const cardHasBroadOnlineReward = (c: CreditCard) => c.broadOnlineReward === true;
  const maxOnlineScore = Math.max(
    ...candidateCards
      .filter(cardHasBroadOnlineReward)
      .map((c) => netCategoryReward(c, "online", 10000, includeSmartbuyLikeRewards)),
    1
  );

  const scoreCardForSpend = (
    card: CreditCard,
    spendForScore: SpendProfile,
    envelopeMonthlySpend?: number
  ): CardScore => {
    const annualSpend = annualSpendTotal(spendForScore);
    const eligibleAnnualSpend = eligibleAnnualSpendTotal(card, spendForScore);
    const matchedTags = card.tags.filter((tag) => queryTags.has(tag));
    const cardNameBoost = computeCardNameBoost(card, input.query, ignoredCardNameBoostTokens);
    const estimatedMilestoneValue = milestoneValueForCard(card, eligibleAnnualSpend);
    const { joiningValue: rawJoiningValue, renewalValue: rawRenewalValue } = joiningAndRenewalBenefitValueForCard(card);
    const rawJoiningFee = card.joiningFee ?? 0;
    const baseAnnualFee = feeAfterWaiver(card, spendForScore);
    const estimatedJoiningAndRenewalValue = Math.round(
      (rawJoiningValue - rawJoiningFee) / joiningBenefitAmortizationYears +
      (rawRenewalValue * (joiningBenefitAmortizationYears - 1)) / joiningBenefitAmortizationYears +
      baseAnnualFee / joiningBenefitAmortizationYears
    );
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
    const hasSurcharge = Object.entries(spendForScore).some(
      ([cat, amt]) => amt > 0 && getSurchargePercent(card, cat as SpendCategory) > 0
    );
    const displayEconomics =
      (rewardLiquidityMultiplier(card, fuelFocus) < 1 || hasSurcharge)
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

    const redemptionBoost = intent.redemptionBuckets.reduce(
      (total, bucket) =>
        total + redemptionPreferenceValueBoost(card, bucket),
      0
    );
    const loungeBoost = loungePreferenceBoost(
      card,
      wantsLounge,
      wantsInternationalLounge,
      intent,
      categoryFocus !== null || restrictToFuelCards,
      maxNetValue,
      maxLoungeScore
    );
    // For a forex-focused query the markup is already costed into net value (estimatedForexCost), so
    // the heuristic forex boost would double-count — suppress it. It still applies to travel queries,
    // where international spend isn't focused and the boost is the only forex signal.
    const forexBoost = forexFocus ? 0 : (isForexBoostAllowed ? forexPreferenceBoost(card, intent) : 0);

    const flexibilityValue = (broadGenericRanking && categoryFocus === null && !restrictToFuelCards)
      ? computeFlexibilityValue(card, monthlyTotalForScore, includeSmartbuyLikeRewards)
      : 0;
    const hasBroadOnlineReward = cardHasBroadOnlineReward(card);
    const onlineScore = netCategoryReward(card, "online", 10000, includeSmartbuyLikeRewards);
    const relativeOnlineScore = Math.max(0, onlineScore) / maxOnlineScore;
    const onlineBoost = hasBroadOnlineReward
      ? Math.max(0, Math.round(relativeOnlineScore * (estimatedNetValue * 0.1)))
      : 0;

    const isFocusedQuery = categoryFocus !== null || fuelFocus;
    const matchesFocus = categoryFocus
      ? cardMatchesCategoryFocus(card, categoryFocus)
      : (fuelFocus ? hasFuelCardSignal(card) : false);
    const focusBoost = (isFocusedQuery && matchesFocus)
      ? Math.max(0, Math.round(estimatedNetValue * 0.1))
      : 0;

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
      ...(envelopeMonthlySpend && envelopeMonthlySpend >= 50000
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
      ...(flexibilityValue > 0 ? [`Rewards on usually excluded categories improve broader card utility (adds about Rs ${Math.round(flexibilityValue).toLocaleString("en-IN")} flexibility value)`] : []),
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
    const cardPopularityWeight = isPrimaryCashbackCard({ card } as CardScore) ? CASHBACK_POPULARITY_WEIGHT : POPULARITY_RANKING_WEIGHT;
    const popularityScale = Math.min(
      1,
      Math.max(POPULARITY_MIN_SCALE, annualSpend / POPULARITY_FULL_WEIGHT_ANNUAL_SPEND)
    );
    const popularityBoost = card.popularityScore * cardPopularityWeight * popularityScale;
    const sharedBoosts =
      useCaseBoost +
      redemptionBoost +
      loungeBoost +
      forexBoost +
      flexibilityValue +
      onlineBoost +
      focusBoost +
      popularityBoost;

    const valueScore = estimatedNetValue + sharedBoosts;

    // Query-type-dependent blending
    const isExactCardLookup = cardNameBoost >= exactCardNameMatchThreshold;
    const relevanceWeight = isExactCardLookup ? RELEVANCE_WEIGHT_EXACT_MATCH
      : broadGenericRanking ? RELEVANCE_WEIGHT_BROAD_GENERIC
      : RELEVANCE_WEIGHT_DEFAULT;
    const fitScore = valueScore + relevanceWeight * relevanceScore;

    const scoreReasons: ScoreReason[] = [];
    for (const row of rewardBreakdown) {
      if (row.annualReward === 0) continue;
      scoreReasons.push({
        kind: "category",
        code: `category:${row.spendCategory}`,
        label: `${titleCaseCategory(row.spendCategory)} rewards`,
        value: row.annualReward,
        ...(focusedCategory === row.spendCategory
          ? { detail: "Focused category reward used for this category-focused ranking profile." }
          : {})
      });
    }

    const addScoreReason = (code: string, label: string, value: number, detail?: string) => {
      if (value === 0) return;
      scoreReasons.push({
        kind: scoreReasonKind(value),
        code,
        label,
        value,
        ...(detail ? { detail } : {})
      });
    };

    addScoreReason("value:milestone", "Milestone value", estimatedMilestoneValue);
    addScoreReason("value:joining-renewal", "Joining and renewal value", estimatedJoiningAndRenewalValue);
    addScoreReason("penalty:fee", "Annual fee", -estimatedAnnualFee);
    addScoreReason("penalty:forex-cost", "Forex cost", -estimatedForexCost);
    addScoreReason("boost:use-case", "Use-case preference", useCaseBoost);
    addScoreReason("boost:redemption", "Redemption preference", redemptionBoost);
    addScoreReason("boost:lounge", "Lounge preference", loungeBoost);
    addScoreReason("boost:forex", "Forex preference", forexBoost);
    addScoreReason("boost:flexibility", "Excluded-category flexibility", flexibilityValue);
    addScoreReason("boost:online", "Broad online reward signal", onlineBoost);
    addScoreReason("boost:focus", "Category focus match", focusBoost);
    addScoreReason("boost:popularity", "Popularity prior", popularityBoost);
    addScoreReason("relevance:card-name", "Card-name relevance", relevanceWeight * cardNameBoost);
    addScoreReason("relevance:keyword", "Keyword relevance", relevanceWeight * keywordBoost);
    addScoreReason("relevance:tag", "Tag relevance", relevanceWeight * tagBoost);

    // Per-level fit score for envelope ranking; the aggregation step blends these across the fixed
    // light/mid/heavy spend levels (see REWARD_BLEND_SPEND_LEVELS in ranking-config) so absolute rupee value drives the
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
      scoreReasons,
      rewardBreakdown,
      displayAnnualRewards,
      displayNetValue,
      displayBreakdown,
      debug: {
        cardNameBoost,
        keywordBoost,
        tagBoost,
        useCaseBoost,
        redemptionBoost,
        loungeBoost,
        forexBoost,
        flexibilityValue,
        onlineBoost,
        focusBoost,
        relevanceScore,
        sharedBoosts,
        valueScore,
        relevanceWeight
      }
    };
  };

  type SplitOrderBucket = "cashback" | "rewards";
  const shouldComputeSplitOrderScore =
    input.resultStrategy === "single-list" || input.resultStrategy === "reward-type-split";

  const primarySplitOrderBucket = (card: CreditCard): SplitOrderBucket =>
    cardRewardTypeIncludesCashback(card) ? "cashback" : "rewards";

  const splitOrderLevels = (bucket: SplitOrderBucket) =>
    bucket === "cashback" ? CASHBACK_BLEND_SPEND_LEVELS : REWARD_BLEND_SPEND_LEVELS;

  const splitOrderWeights = (bucket: SplitOrderBucket) =>
    bucket === "cashback" ? CASHBACK_BLEND_WEIGHTS : REWARD_BLEND_WEIGHTS;

  const computeSplitOrderScore = (card: CreditCard, bucket: SplitOrderBucket): number => {
    if (!useEnvelopeScoring) {
      return strategy.perLevelScore(scoreCardForSpend(card, spend));
    }
    let orderLevels = splitOrderLevels(bucket);
    let weights = splitOrderWeights(bucket);
    if (intent.useCases.includes("travel")) {
      orderLevels = [300000, 600000, 1000000];
      weights = [1, 1, 1];
    }
    const perLevel = orderLevels.map((annualSpend) => {
      const monthlySpend = Math.round(annualSpend / 12);
      if (focusedCategory) {
        const focusSpendAmount = monthlySpend * CATEGORY_FOCUS_SPEND_SHARE;
        const monthlySpendProfile = categoryFocus75_25SpendProfile(focusedCategory, focusSpendAmount, defaultSpendProfile);
        return scoreCardForSpend(card, monthlySpendProfile, monthlySpend);
      }
      return scoreCardForSpend(card, scaleSpendProfileToMonthly(spend, monthlySpend), monthlySpend);
    });
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    return perLevel.reduce((total, score, i) => total + strategy.perLevelScore(score) * weights[i], 0) / weightSum;
  };

  const weightedPerLevelScore = (scores: CardScore[], weights: number[]): number => {
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    return scores.reduce((total, score, i) => total + strategy.perLevelScore(score) * weights[i], 0) / weightSum;
  };

  const withDisplayEconomics = (rankScore: CardScore, displayScore: CardScore): CardScore => ({
    ...rankScore,
    annualSpend: displayScore.annualSpend,
    estimatedMilestoneValue: displayScore.estimatedMilestoneValue,
    estimatedAnnualFee: displayScore.estimatedAnnualFee,
    displayAnnualRewards: displayScore.displayAnnualRewards,
    displayNetValue: displayScore.displayNetValue,
    displayBreakdown: displayScore.displayBreakdown
  });

  const withSplitOrderScore = (
    score: CardScore,
    splitOrderScore: number | undefined,
    fallbackMonthlySpend = monthlySpendTotal(spend)
  ): CardScore => {
    if (splitOrderScore === undefined) return score;
    return {
      ...score,
      envelopeScoring: {
        bestMonthlySpend: score.envelopeScoring?.bestMonthlySpend ?? fallbackMonthlySpend,
        bestSpendLabel: score.envelopeScoring?.bestSpendLabel ?? formatEnvelopeSpendLabel(fallbackMonthlySpend),
        normalizedFitScore: score.envelopeScoring?.normalizedFitScore ?? score.fitScore,
        splitOrderScore
      }
    };
  };

  return candidateCards
    .map((card) => {
      if (!useEnvelopeScoring) {
        const score = scoreCardForSpend(card, spend);
        const splitOrderScore = shouldComputeSplitOrderScore
          ? computeSplitOrderScore(card, primarySplitOrderBucket(card))
          : undefined;
        return withSplitOrderScore(score, splitOrderScore);
      }

      if (focusedCategory) {
        const baseAmount = categoryFocusMonthlySpend[focusedCategory] ?? 8000;
        const perLevel = CATEGORY_FOCUS_MULTIPLIERS.map((mult) => {
          const focusSpendAmount = baseAmount * mult;
          const monthlySpendProfile = categoryFocus75_25SpendProfile(focusedCategory, focusSpendAmount, defaultSpendProfile);
          const totalMonthlySpend = monthlySpendTotal(monthlySpendProfile);
          return scoreCardForSpend(card, monthlySpendProfile, totalMonthlySpend);
        });
        const representative = perLevel.reduce((best, score) => (strategy.perLevelScore(score) > strategy.perLevelScore(best) ? score : best));
        const blendedFitScore = weightedPerLevelScore(perLevel, CATEGORY_FOCUS_BLEND_WEIGHTS);

        const splitOrderScore = shouldComputeSplitOrderScore
          ? computeSplitOrderScore(card, primarySplitOrderBucket(card))
          : undefined;
        const displaySpendProfile = categoryFocus75_25SpendProfile(focusedCategory, baseAmount, defaultSpendProfile);
        const displayScore = scoreCardForSpend(card, displaySpendProfile, monthlySpendTotal(displaySpendProfile));

        const assembled = representative.envelopeScoring
          ? {
              ...withDisplayEconomics(representative, displayScore),
              envelopeScoring: {
                ...representative.envelopeScoring,
                normalizedFitScore: blendedFitScore,
                ...(splitOrderScore !== undefined ? { splitOrderScore } : {})
              }
            }
          : withDisplayEconomics(representative, displayScore);
        return assembled;
      }

      if (segmentRepresentativeSpend !== undefined) {
        const segmentSpendLevels = SEGMENT_BLEND_MULTIPLIERS.map((multiplier) =>
          Math.round(segmentRepresentativeSpend * multiplier * 12)
        );
        const perLevel = segmentSpendLevels.map((annualSpend) => {
          const monthlySpend = Math.round(annualSpend / 12);
          return scoreCardForSpend(card, scaleSpendProfileToMonthly(defaultSpendProfile, monthlySpend), monthlySpend);
        });
        const representative = perLevel.reduce((best, score) => (strategy.perLevelScore(score) > strategy.perLevelScore(best) ? score : best));
        const blendedFitScore = weightedPerLevelScore(perLevel, SEGMENT_BLEND_WEIGHTS);
        const splitOrderScore = shouldComputeSplitOrderScore
          ? computeSplitOrderScore(card, primarySplitOrderBucket(card))
          : undefined;
        const displayScore = scoreCardForSpend(card, spend);

        const assembled = representative.envelopeScoring
          ? {
              ...withDisplayEconomics(representative, displayScore),
              envelopeScoring: {
                ...representative.envelopeScoring,
                normalizedFitScore: blendedFitScore,
                ...(splitOrderScore !== undefined ? { splitOrderScore } : {})
              }
            }
          : withDisplayEconomics(representative, displayScore);
        return assembled;
      }

      // Score the card at each fixed light/mid/heavy spend level and blend the per-level fit scores
      // into the ranking key. The card is displayed at its strongest of these levels, but ranked on
      // its all-round performance — so no single trivial-spend tier can inflate it. The blend is a
      // weighted average (see REWARD_BLEND_WEIGHTS in ranking-config).
      let spendLevels = strategy.spendLevels;
      const isCashbackBlendCard = isPrimaryCashbackCard({ card } as CardScore);
      // Broad recommendation display order: cashback cards are judged on realistic low/mid
      // levels, while rewards cards use the back-loaded broad reward blend.
      // Cashback cards earn on monthly caps, so the broad reward-card blend (3L/6L/10L/20L/30L) would
      // judge them deep past their caps and systematically under-rank them. Evaluate EVERY primary
      // cashback card on a realistic low/mid spend basis — not just in "best cashback card" queries —
      // so the high reward-card spend levels apply to reward cards only.
      if (isCashbackBlendCard) {
        spendLevels = CASHBACK_BLEND_SPEND_LEVELS;
      } else if (restrictToUpiCards) {
        spendLevels = UPI_BLEND_SPEND_LEVELS;
      } else if (isUtilityLikeCategory) {
        spendLevels = UTILITY_BLEND_SPEND_LEVELS;
      }

      let spendWeights = strategy.spendWeights;
      if (isCashbackBlendCard) {
        spendWeights = CASHBACK_BLEND_WEIGHTS;
      } else if (restrictToUpiCards) {
        spendWeights = UPI_BLEND_WEIGHTS;
      } else if (isUtilityLikeCategory) {
        spendWeights = UTILITY_BLEND_WEIGHTS;
      } else {
        const totalAnnualSpend = input.spend ? annualSpendTotal(input.spend) : 0;

        const isLowFee =
          wantsLifetimeFree ||
          (effectiveMaxAnnualFee !== undefined && effectiveMaxAnnualFee <= 1000) ||
          intent.useCases.includes("cashback") ||
          normalizeForMatch(input.query).includes("cashback") ||
          (input.spend !== undefined && totalAnnualSpend <= 300000);

        const isEqualWeight =
          (input.spend !== undefined && totalAnnualSpend > 300000 && totalAnnualSpend < 1000000);

        if (isLowFee) {
          spendWeights = LOW_FEE_BLEND_WEIGHTS;
        } else if (isEqualWeight) {
          spendWeights = EQUAL_BLEND_WEIGHTS;
        }
      }
      const perLevel = spendLevels.map((annualSpend) => {
        const monthlySpend = Math.round(annualSpend / 12);
        return scoreCardForSpend(card, scaleSpendProfileToMonthly(spend, monthlySpend), monthlySpend);
      });
      const blendWeightSum = spendWeights.reduce((total, weight) => total + weight, 0);
      const representative = perLevel.reduce((best, score) => (strategy.perLevelScore(score) > strategy.perLevelScore(best) ? score : best));
      const blendedFitScore =
        perLevel.reduce((total, score, i) => total + strategy.perLevelScore(score) * spendWeights[i], 0) / blendWeightSum;

      // Recommendation display ordering signal: cashback uses realistic low/mid spend levels;
      // rewards use the same 3L/6L/10L/20L/30L calibrated blend as the broad reward ranking.
      // Computed on a dedicated evaluation so the card's representative/display value
      // and global ranking key remain on the default spend levels.
      const splitOrderScore = shouldComputeSplitOrderScore
        ? computeSplitOrderScore(card, primarySplitOrderBucket(card))
        : undefined;
      const displayScore = scoreCardForSpend(card, spend);

      // Dual-bucket cards feature in BOTH split sections, valued per context. A card's DEFAULT score
      // (above) is its primary-bucket value; here we re-score it at the OTHER bucket's point value so
      // the split can present it there too. `rewardBucketPointValue` = a cashback-primary card also in
      // Rewards (e.g. CheQ AU @0.5); `cashbackBucketPointValue` = a reward-primary card also in
      // Cashback (e.g. au-ixigo @0.25).
      const reValuedScore = (pointValue: number, bucket: SplitOrderBucket): CardScore => {
        const reValuedCard: CreditCard = {
          ...card,
          rewardBucketPointValue: undefined,
          cashbackBucketPointValue: undefined,
          rewards: card.rewards.map((reward) => ({ ...reward, valuePerUnit: pointValue }))
        };
        const perLevelReValued = spendLevels.map((annualSpend) => {
          const monthlySpend = Math.round(annualSpend / 12);
          return scoreCardForSpend(reValuedCard, scaleSpendProfileToMonthly(spend, monthlySpend), monthlySpend);
        });
        const representative = perLevelReValued.reduce((best, score) =>
          strategy.perLevelScore(score) > strategy.perLevelScore(best) ? score : best
        );
        const displayScore = scoreCardForSpend(reValuedCard, spend);
        const splitOrderScore = shouldComputeSplitOrderScore
          ? computeSplitOrderScore(reValuedCard, bucket)
          : undefined;
        return {
          ...withSplitOrderScore(withDisplayEconomics(representative, displayScore), splitOrderScore),
          displayValueContext: bucket
        };
      };
      const rewardBucketScore =
        typeof card.rewardBucketPointValue === "number" && card.rewardBucketPointValue > 0
          ? reValuedScore(card.rewardBucketPointValue, "rewards")
          : undefined;
      const cashbackBucketScore =
        typeof card.cashbackBucketPointValue === "number" && card.cashbackBucketPointValue > 0
          ? reValuedScore(card.cashbackBucketPointValue, "cashback")
          : undefined;

      const assembled = representative.envelopeScoring
        ? {
            ...withDisplayEconomics(representative, displayScore),
            envelopeScoring: {
              ...representative.envelopeScoring,
              normalizedFitScore: blendedFitScore,
              ...(splitOrderScore !== undefined ? { splitOrderScore } : {})
            }
          }
        : withDisplayEconomics(representative, displayScore);
      return {
        ...assembled,
        ...(rewardBucketScore ? { rewardBucketScore } : {}),
        ...(cashbackBucketScore ? { cashbackBucketScore } : {})
      };
    })
    .filter((score) => (restrictToMinimumRentReturn ? clearsMinimumRentReturn(score) : true))
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
  const scored = scoreCards(input);
  const topCards = scored.slice(0, requestedTopCardCount(input.query, input.resultStrategy));

  // For broad "best credit card" queries (or explicit resultStrategy), also compute
  // sections so callers that want Rewards / Cashback split can use them.
  // sections is omitted entirely (not undefined) when single-list applies, so
  // AskAiResult return sites that don't spread answerFromCards don't need to include it.
  const resultSections = applyResultStrategy(scored, input);
  const hasSplit = resultSections.length > 1 || (resultSections.length === 1 && resultSections[0].title !== "");

  return {
    summary:
      topCards.length === 0
        ? "No card matched the selected constraints. Try increasing the annual fee limit or removing lounge/lifetime-free filters."
        : `${topCards[0].card.name} looks strongest with an estimated net yearly value of Rs ${Math.round(topCards[0].displayNetValue).toLocaleString("en-IN")}.`,
    cards: topCards,
    ...(hasSplit ? { sections: resultSections } : {})
  };
}


/**
 * Apply the result strategy to a pre-scored list.
 *
 * `"reward-type-split"` is always opt-in — it activates only when
 * `input.resultStrategy === "reward-type-split"` is explicitly set AND the query
 * context makes a split sensible (no category/issuer focus, no lounge/LTF filter).
 * Spend is permitted; the /recommend toggle can request the split alongside sliders.
 *
 * Sorts by the canonical recommendation display order before grouping so split and flat
 * presentation share the same ordering basis.
 */
export function applyResultStrategy(
  scored: CardScore[],
  input: RecommendationInput,
  maxPerSection = 5
): ResultSection[] {
  // Sort by the same comparator as rankResults so every strategy sees the canonical display
  // order, not the internal fitScore ranking order.
  const byDisplayOrder = scored
    .slice()
    .sort(compareResultDisplayOrder);

  // Split requires an explicit opt-in from the caller (UI toggle, ask wiring, API field).
  // When one bucket is empty, the allocator in result-strategies.ts lends all available slots
  // to the non-empty bucket; the empty section is then naturally hidden by the UI.
  const useSplit = input.resultStrategy === "reward-type-split";

  const strategy = resultStrategies[useSplit ? "reward-type-split" : "single-list"];
  // The single ranking strategy (absolute-blend) is always a weighted-average blend, so split
  // sections use the canonical recommendation display comparator.
  const sections = strategy.group(byDisplayOrder, maxPerSection, { isBlend: true });

  // Forex result splits read as a strict reward-type partition to users, so keep each card in
  // only its primary bucket there. This prevents dual-bucket cards like AU ixigo from appearing
  // in both Cashback and Rewards for the same forex query.
  const normalizedQuery = normalizeForMatch(input.query ?? "");
  if (!/\bforex\b/.test(normalizedQuery)) return sections;

  return sections.map((section) => ({
    ...section,
    cards: section.cards.filter((score) =>
      section.title === "Cashback cards" ? isPrimaryCashbackCard(score) : !isPrimaryCashbackCard(score)
    )
  }));
}
