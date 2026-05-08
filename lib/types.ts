export type SpendCategory =
  | "online"
  | "offline"
  | "travel"
  | "fuel"
  | "dining"
  | "grocery"
  | "amazon";

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
  estimatedAnnualRewards: number;
  estimatedNetValue: number;
  matchedTags: string[];
  reasons: string[];
};
