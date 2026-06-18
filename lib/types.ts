import type { ExclusionCode } from "./exclusion-constants";

export type SpendCategory =
  | "online"
  | "base"
  | "travel"
  | "hotels"
  | "airlines"
  | "fuel"
  | "dining"
  | "grocery"
  | "amazon"
  | "upi"
  | "utilities"
  | "rent"
  | "insurance"
  | "education"
  | "gold"
  | "government"
  | "international";

export type SpecialSpendRule = {
  category: SpendCategory;
  treatment: "rewarded" | "capped" | "excluded";
  capMonthlySpend?: number | null;
  capAnnualSpend?: number | null;
  notes?: string;
};

// Structured, reviewed milestone. When present on a card it is the source of truth for that
// card's milestone numbers and display, replacing the runtime regex-parsing of milestoneBenefits
// prose in lib/recommend.ts. Optional, migrated per card (verified-only).
export type Milestone = {
  /** Spend that unlocks the reward, in the given period (Rs). 0 means it always applies. */
  threshold: number;
  /** Period the threshold/value repeat over. "annual" reproduces today's flat-threshold behavior. */
  period: "annual" | "quarterly" | "monthly";
  /** Rupee value unlocked per occurrence of the period. */
  value: number;
  kind: "voucher" | "points" | "cashback" | "other";
  /** User-facing text. No embedded "(worth Rs …)" scoring annotation. */
  label: string;
};

// Structured, reviewed joining/renewal benefit with an explicit rupee value. When present on a card
// it replaces the runtime regex-parsing of benefit prose in lib/recommend.ts. Not spend-gated, so no
// threshold/period. Optional, migrated per card (verified-only).
export type ValuedBenefit = {
  /** Rupee value of this benefit (>= 0); store the net value (vouchers already discounted). */
  value: number;
  kind: "voucher" | "points" | "cashback" | "other";
  /** User-facing text. No embedded "(worth Rs …)" scoring annotation. */
  label: string;
};

export type Reward = {
  category: SpendCategory | string;
  displayCategory?: string;
  rate: number;
  displayRate?: string;
  // Rupee value of one unit (point) earned by THIS reward, overriding the card-level reward-unit
  // value in scoring. Needed for mixed-currency cards (rewardType "cashback and reward points"),
  // where cashback rows are worth Rs 1/unit but co-existing point rows are worth less — e.g. Titan's
  // base "6 Reward Points / Rs 100" at Rs 0.25/point, or Samsung's EDGE points at Rs 0.2.
  valuePerUnit?: number;
  capMonthly: number | null;
  capDaily?: number | null;
  capStatementQuarter?: number | null;
  postCapRate?: number | null;
  // Shared-cap group: reward rows on the same card with the same capGroup pool their earnings into a
  // single combined capMonthly (instead of each row capping independently). Use when an issuer caps a
  // whole programme together regardless of sub-rate — e.g. HDFC SmartBuy hotels (10X) and flights/
  // other (5X) share one monthly cap. All rows in a group should carry the same capMonthly.
  capGroup?: string;
  // Spend-tiered earning: when a spend category maps to several reward rows that each apply to a
  // different monthly-spend band (e.g. base earn up to Rs 1.5L/mo vs above), set these per row. The
  // scoring engine and calculator bucket monthly spend across the tiers. `tierLowerBound` is the
  // inclusive lower bound (Rs/month); `tierUpperBound` is the exclusive upper bound, or null for the
  // open-ended top tier. A row is "tiered" when `tierLowerBound` is defined.
  tierLowerBound?: number;
  tierUpperBound?: number | null;
  // Scope of the tier bounds. "category" (default) tiers the spend within this reward's own category.
  // "total-monthly-spend" tiers against the card's pooled monthly spend across all categories that
  // fall to this reward — e.g. Axis Magnus' base earns 6 EDGE/Rs 100 up to Rs 1.5L total/month and
  // 17.5 above, regardless of which categories make up that spend.
  tierScope?: "category" | "total-monthly-spend";
};

export type Redemption = {
  airlinePartners?: Array<{
    airline: string;
    programme: string;
    ratio: string;
    tatDays?: number;
    group?: string;
    annualCap?: number;
  }>;
  hotelPartners?: Array<{
    hotelGroup: string;
    programme: string;
    ratio: string;
    tatDays?: number;
    group?: string;
    annualCap?: number;
  }>;
  voucherRedemptions?: Array<{
    partner: string;
    programme: string;
    ratio: string;
    valuePerPoint: number;
    tatDays?: number;
    note?: string;
  }>;
  ecosystemLabel?: string;
  ecosystemValue?: number;
  // Spend-tiered redemption value for bank "tier" programs (e.g. Equitas PowerMiles: Rs 0.50 Blue ->
  // Rs 0.75 Platinum -> Rs 1.00 Diamond by monthly spend). When present, the ranking engine values
  // points at the tier matching the cardholder's monthly spend instead of the flat point value.
  // Display fields (ecosystemValue etc.) are unaffected. See effectivePointValue in lib/recommend.ts.
  pointValueTiers?: Array<{ minMonthlySpend: number; value: number }>;
  statementBalanceValue?: number;
  smartBuyFlightHotelValue?: number;
  smartBuyCatalogueValue?: number;
  travelEdgeValue?: number;
  travelPortalValue?: number;
  airMilesValue?: number;
  accorValue?: number;
  // Valuations for specific transfer partners. partnerPointValue is Rs per partner programme
  // point (e.g. Rs 2.2 per Accor ALL point). transferRatio is how many partner points you get
  // per 1 card reward unit (e.g. 2 for a 1:2 ratio). The calculator multiplies both to get
  // the rupee value per card reward unit.
  transferPartnerValuations?: Array<{
    partner: string;
    partnerPointValue: number;
    transferRatio: number;
    basis: "fixed" | "dynamic";
    note?: string;
  }>;
  minimumPointsForStatementCredit?: number;
  cashbackRedemptionCapMonthly?: number;
  pointsExpiryYears?: number;
  redemptionFee?: number;
};

export type CreditCard = {
  id: string;
  issuer: string;
  name: string;
  network: string[];
  joiningFee: number;
  annualFee: number;
  feeWaiverSpend: number | null;
  bestFor: string[];
  rewardType: string;
  // Liquidity of the reward currency for ranking. "brand-locked" cards (rewards redeemable only
  // inside one narrow brand ecosystem — e.g. Adani, IRCTC, IndiGo BluChips, MakeMyTrip myCash,
  // Reliance) have their reward value discounted in scoring (see brandLockedRewardValueMultiplier in
  // lib/recommend.ts). Omit (or "cash") for near-cash rewards: statement credit, points with a cash
  // path, and famous liquid brands (Flipkart, Amazon, Myntra, Swiggy/Zomato, Tata Neu).
  // Combined monthly cap for a reward.capGroup, keyed by group id. When set, the group's pooled
  // earnings are capped at this value AFTER each row's own capMonthly is applied — a two-level cap
  // (e.g. HDFC SmartBuy: hotels/flights each capped at the Rs 2,000/day single-booking limit, then
  // the whole group capped at Rs 4,000/month). If a group id is absent here, the group cap falls
  // back to the largest capMonthly among its rows. See rewardBreakdownForCard in lib/recommend.ts.
  capGroups?: Record<string, { capMonthly: number }>;
  // Additive override for the category-focused rankings ("best dining/grocery/online/entertainment
  // card"). A card normally qualifies for a category by ACCELERATING it in its reward rows (rate
  // above base). List a category key here only when the card's category value is real but lives
  // outside the reward rows — e.g. movie BOGO / free-ticket benefits for "entertainment", which
  // aren't a reward row. Allowed values are the category focus keys (dining, grocery, online,
  // entertainment). Does not replace the reward-row derivation; it only adds the card in.
  categoryFocusTags?: string[];
  rewardLiquidity?: "cash" | "brand-locked";
  // Optional fine-grained override (0–1) for the fraction of nominal reward value realized in
  // scoring. When set it takes precedence over the rewardLiquidity default (brand-locked = 0.75).
  // Use for currencies that are even less liquid than a typical brand voucher — e.g. IndiGo BluChips
  // (airline currency with blackout dates / dynamic pricing) at 0.5.
  rewardLiquidityFactor?: number;
  // Per-category override (0–1) for the fraction of spend that earns the accelerated rate (vs base)
  // on blended categories (online, grocery). Defaults to 0.5. Use a smaller share when the
  // accelerated merchant set is narrow (e.g. Titan's "partner merchants" only covers Titan-group
  // brands: online 0.25, grocery 0), or a larger one when it's broad.
  acceleratedShare?: Partial<Record<SpendCategory, number>>;
  rewards: Reward[];
  popularityScore: number;
  loungeDomestic: number | "unlimited";
  loungeInternational: number | "unlimited";
  combinedLoungeAccess?: number | "unlimited";
  combinedLoungeAccessLabel?: string;
  // Reviewed, structured lounge-condition bullets. When present for a bucket they replace the
  // heuristic text-mining in lib/lounge.ts (getLoungeConditions). Optional, migrated per card.
  lounge?: {
    domestic?: string[];
    international?: string[];
    combined?: string[];
  };
  forexMarkup: number;
  tags: string[];
  exclusions: string[];
  exclusionCodes?: ExclusionCode[];
  specialSpendRules?: SpecialSpendRule[];
  milestoneBenefits?: string[];
  // Structured milestones. When present, preferred over milestoneBenefits for scoring/calculator/
  // display (see milestoneRulesForCard in lib/recommend.ts). Optional, migrated per card.
  milestones?: Milestone[];
  joiningBenefits?: string[];
  renewalBenefits?: string[];
  // Structured, valued joining/renewal benefits. When present, preferred over the string[] fields
  // (and joining/renewal-keyword additionalBenefits) for scoring and display. Optional, per card.
  joiningBenefitsValued?: ValuedBenefit[];
  renewalBenefitsValued?: ValuedBenefit[];
  additionalBenefits?: string[];
  additionalDetails?: string[];
  internalNotes?: string[];
  alternativeCardIds?: string[];
  redemption?: Redemption;
  interestRateMonthly?: number;
  supportingSourceUrls?: string[];
  eligibility?: {
    salaried?: string[];
    selfEmployed?: string[];
  };
  sourceUrl: string;
  applyUrl: string;
  lastVerified: string;
  verificationStatus: "official-direct" | "official-indexed" | "official-catalogue" | "official-mixed" | "needs-review";
  imageUrl?: string;
  status?: "active" | "discontinued";
};

export type SpendProfile = Partial<Record<SpendCategory, number>>;

export type RecommendationInput = {
  query?: string;
  maxAnnualFee?: number;
  wantsLounge?: boolean;
  wantsLifetimeFree?: boolean;
  spend?: SpendProfile;
};

export type CardScore = {
  card: CreditCard;
  annualSpend: number;
  envelopeScoring?: {
    bestMonthlySpend: number;
    bestSpendLabel: string;
    normalizedFitScore: number;
  };
  estimatedAnnualRewards: number;
  estimatedMilestoneValue: number;
  estimatedAnnualFee: number;
  estimatedNetValue: number;
  fitScore: number;
  matchedTags: string[];
  reasons: string[];
  rewardBreakdown: Array<{
    spendCategory: SpendCategory;
    monthlySpend: number;
    rewardCategory: string;
    monthlyReward: number;
    annualReward: number;
  }>;
};

// Trimmed, display-only card result sent to the browser by /api/recommend.
// Deliberately omits the full card record so the curated dataset stays server-side.
export type RecommendResult = {
  id: string;
  name: string;
  issuer: string;
  applyUrl: string;
  tags: string[];
  usp: string;
  estimatedAnnualRewards: number;
  estimatedMilestoneValue: number;
  estimatedAnnualFee: number;
  estimatedNetValue: number;
  annualFee: number;
  annualSpend: number;
  feeWaiverSpend: number | null;
  feeWaiverHit: boolean;
  nextFeeWaiverGap: number | null;
  nextMilestoneThreshold: number | null;
  nextMilestoneGap: number | null;
  nextMilestoneLabel: string | null;
  breakdown: Array<{
    spendCategory: SpendCategory;
    monthlySpend: number;
    annualReward: number;
  }>;
};
