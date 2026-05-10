export type SpendCategory =
  | "online"
  | "offline"
  | "travel"
  | "fuel"
  | "dining"
  | "grocery"
  | "amazon"
  | "upi"
  | "utilities";

export type Reward = {
  category: SpendCategory | string;
  rate: number;
  capMonthly: number | null;
};

export type Redemption = {
  statementBalanceValue?: number;
  smartBuyFlightHotelValue?: number;
  airMilesValue?: number;
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
  forexMarkup: number;
  tags: string[];
  exclusions: string[];
  milestoneBenefits?: string[];
  additionalBenefits?: string[];
  redemption?: Redemption;
  interestRateMonthly?: number;
  eligibility?: {
    salaried?: string[];
    selfEmployed?: string[];
  };
  sourceUrl: string;
  applyUrl: string;
  lastVerified: string;
  verificationStatus: "official-direct" | "official-indexed" | "official-catalogue" | "official-mixed" | "needs-review";
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
  estimatedAnnualRewards: number;
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
