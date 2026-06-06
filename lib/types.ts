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

export type Reward = {
  category: SpendCategory | string;
  displayCategory?: string;
  rate: number;
  displayRate?: string;
  capMonthly: number | null;
  capDaily?: number | null;
  capStatementQuarter?: number | null;
  postCapRate?: number | null;
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
  statementBalanceValue?: number;
  smartBuyFlightHotelValue?: number;
  smartBuyCatalogueValue?: number;
  travelEdgeValue?: number;
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
  rewards: Reward[];
  popularityScore: number;
  loungeDomestic: number | "unlimited";
  loungeInternational: number | "unlimited";
  combinedLoungeAccess?: number | "unlimited";
  combinedLoungeAccessLabel?: string;
  forexMarkup: number;
  tags: string[];
  exclusions: string[];
  exclusionCodes?: ExclusionCode[];
  specialSpendRules?: SpecialSpendRule[];
  milestoneBenefits?: string[];
  joiningBenefits?: string[];
  renewalBenefits?: string[];
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
