import type { RecommendationInput, SpendCategory, SpendProfile } from "./types";
import type { CardSegment, RedemptionBucket, UseCaseBucket } from "./card-index";

export type QueryIntent = {
  normalizedQuery: string;
  useCases: UseCaseBucket[];
  segments: CardSegment[];
  redemptionBuckets: RedemptionBucket[];
  issuers: string[];
  networks: string[];
  tags: string[];
  maxAnnualFee?: number;
  inferredSpend?: SpendProfile;
  wantsLounge: boolean;
  wantsLifetimeFree: boolean;
  needsLatestInfo: boolean;
};

const temporalKeywords = [
  "latest",
  "today",
  "recent",
  "currently",
  "current offer",
  "devaluation",
  "updated",
  "update",
  "changed",
  "news",
  "new launch",
  "launched",
  "still active",
  "discontinued",
  "now"
];

const issuerAliases: Array<{ issuer: string; aliases: string[] }> = [
  { issuer: "HDFC Bank", aliases: ["hdfc"] },
  { issuer: "SBI Card", aliases: ["sbi", "sbi card"] },
  { issuer: "Axis Bank", aliases: ["axis"] },
  { issuer: "ICICI Bank", aliases: ["icici"] },
  { issuer: "IDFC FIRST Bank", aliases: ["idfc", "idfc first"] },
  { issuer: "American Express", aliases: ["amex", "american express"] },
  { issuer: "HSBC", aliases: ["hsbc"] },
  { issuer: "Kotak Mahindra Bank", aliases: ["kotak"] },
  { issuer: "YES Bank", aliases: ["yes bank", "yes"] },
  { issuer: "RBL Bank", aliases: ["rbl"] },
  { issuer: "IndusInd Bank", aliases: ["indusind"] },
  { issuer: "Standard Chartered", aliases: ["standard chartered", "sc"] },
  { issuer: "Federal Bank", aliases: ["federal"] },
  { issuer: "Bank of Baroda", aliases: ["bank of baroda", "bob", "bobcard"] },
  { issuer: "OneCard Partner Banks", aliases: ["onecard", "one card"] }
];

const tagKeywords = [
  "cashback",
  "travel",
  "lounge",
  "fuel",
  "upi",
  "amazon",
  "marriott",
  "accor",
  "air india",
  "smartbuy",
  "dining",
  "grocery",
  "rent",
  "insurance",
  "education",
  "gold",
  "jewellery",
  "beginner",
  "premium",
  "ltf",
  "lifetime free",
  "secured",
  "forex"
];

const spendCategoryAliases: Array<{ category: SpendCategory; aliases: string[] }> = [
  { category: "travel", aliases: ["travel", "flights", "flight", "airline", "airlines", "hotel", "hotels"] },
  { category: "grocery", aliases: ["grocery", "groceries", "supermarket", "supermarkets"] },
  { category: "utilities", aliases: ["utilities", "utility", "bill payment", "bill payments", "bills"] },
  { category: "dining", aliases: ["dining", "restaurant", "restaurants", "food delivery", "swiggy", "zomato"] },
  { category: "fuel", aliases: ["fuel", "petrol", "diesel"] },
  { category: "online", aliases: ["online", "shopping", "ecommerce"] },
  { category: "base", aliases: ["offline", "retail", "base"] },
  { category: "amazon", aliases: ["amazon"] },
  { category: "upi", aliases: ["upi", "rupay upi"] },
  { category: "rent", aliases: ["rent", "rental", "rental payments", "rent payments"] },
  { category: "insurance", aliases: ["insurance", "insurance premium", "insurance premiums"] },
  { category: "education", aliases: ["education", "school fees", "school fee", "education payments", "tuition"] },
  { category: "gold", aliases: ["gold", "jewellery", "jewelry"] }
];

const spendCategories: SpendCategory[] = [
  "online",
  "base",
  "travel",
  "fuel",
  "dining",
  "grocery",
  "amazon",
  "upi",
  "utilities",
  "rent",
  "insurance",
  "education",
  "gold"
];

const defaultMonthlySpendTotal = 53000;

function normalizeQuery(query?: string) {
  return query?.toLowerCase().trim() ?? "";
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort();
}

function extractMaxAnnualFee(query: string, input: RecommendationInput) {
  if (input.maxAnnualFee !== undefined) return input.maxAnnualFee;

  const feePatterns = [
    /under\s+(?:rs\.?\s*)?([\d,]+)/i,
    /below\s+(?:rs\.?\s*)?([\d,]+)/i,
    /upto\s+(?:rs\.?\s*)?([\d,]+)/i,
    /up to\s+(?:rs\.?\s*)?([\d,]+)/i,
    /within\s+(?:rs\.?\s*)?([\d,]+)/i
  ];

  for (const pattern of feePatterns) {
    const match = query.match(pattern);
    if (!match) continue;

    const parsed = Number(match[1].replace(/,/g, ""));
    if (!Number.isNaN(parsed)) return parsed;
  }

  return undefined;
}

function matchSpendCategory(fragment: string) {
  const normalized = normalizeQuery(fragment);
  if (!normalized) return null;

  for (const entry of spendCategoryAliases) {
    if (entry.aliases.some((alias) => normalized.includes(alias))) return entry.category;
  }

  return null;
}

function emptySpendProfile() {
  return Object.fromEntries(spendCategories.map((category) => [category, 0])) as Record<SpendCategory, number>;
}

function extractSpendMix(query: string) {
  const allocations = new Map<SpendCategory, number>();
  const patterns = [
    /(\d{1,3})\s*%\s*([a-z][a-z\s&-]*?)(?=,| and |$)/g,
    /([a-z][a-z\s&-]*?)\s*(\d{1,3})\s*%/g
  ];

  for (const pattern of patterns) {
    for (const match of query.matchAll(pattern)) {
      const percentValue = Number(pattern === patterns[0] ? match[1] : match[2]);
      const subject = pattern === patterns[0] ? match[2] : match[1];
      const category = matchSpendCategory(subject);

      if (!category || Number.isNaN(percentValue) || percentValue <= 0) continue;
      allocations.set(category, Math.min(percentValue, 100));
    }
  }

  const totalPercentage = [...allocations.values()].reduce((sum, value) => sum + value, 0);
  if (allocations.size === 0 || totalPercentage <= 0) return undefined;

  const spend = emptySpendProfile();
  for (const [category, percentage] of allocations) {
    spend[category] = Math.round((defaultMonthlySpendTotal * percentage) / 100);
  }

  return spend satisfies SpendProfile;
}

function extractFocusedSpend(query: string) {
  const focusedCategory = spendCategoryAliases.find((entry) =>
    entry.aliases.some((alias) => query.includes(`${alias} spend`) || query.includes(`${alias} spends`) || query.includes(`for ${alias}`))
  )?.category;

  if (!focusedCategory) return undefined;

  const spend = emptySpendProfile();
  spend[focusedCategory] = defaultMonthlySpendTotal;
  return spend satisfies SpendProfile;
}

function inferSpendProfile(query: string) {
  return extractSpendMix(query) ?? extractFocusedSpend(query);
}

export function parseQueryIntent(input: RecommendationInput): QueryIntent {
  const normalizedQuery = normalizeQuery(input.query);
  const useCases = new Set<UseCaseBucket>();
  const segments = new Set<CardSegment>();
  const redemptionBuckets = new Set<RedemptionBucket>();
  const issuers = new Set<string>();
  const networks = new Set<string>();
  const tags = new Set<string>();

  if (normalizedQuery.includes("cashback")) useCases.add("cashback");
  if (
    normalizedQuery.includes("travel") ||
    normalizedQuery.includes("miles") ||
    normalizedQuery.includes("hotel") ||
    normalizedQuery.includes("flight")
  ) {
    useCases.add("travel");
  }

  if (normalizedQuery.includes("accor")) redemptionBuckets.add("accor");
  if (normalizedQuery.includes("air india")) redemptionBuckets.add("air-india");

  if (
    normalizedQuery.includes("super premium") ||
    normalizedQuery.includes("ultra premium") ||
    normalizedQuery.includes("invite only")
  ) {
    segments.add("super-premium");
  }
  if (normalizedQuery.includes("premium")) segments.add("premium");
  if (
    normalizedQuery.includes("beginner") ||
    normalizedQuery.includes("starter") ||
    normalizedQuery.includes("first card") ||
    normalizedQuery.includes("credit builder") ||
    normalizedQuery.includes("secured")
  ) {
    segments.add("beginner");
  }
  if (
    input.wantsLifetimeFree ||
    normalizedQuery.includes("lifetime free") ||
    normalizedQuery.includes("life time free") ||
    normalizedQuery.includes("ltf") ||
    normalizedQuery.includes("no annual fee")
  ) {
    segments.add("ltf");
  }

  if (input.wantsLounge || normalizedQuery.includes("lounge")) {
    tags.add("lounge");
  }
  if (normalizedQuery.includes("upi") || normalizedQuery.includes("rupay")) {
    tags.add("upi");
    networks.add("RuPay");
  }
  if (normalizedQuery.includes("visa")) networks.add("Visa");
  if (normalizedQuery.includes("mastercard")) networks.add("Mastercard");
  if (normalizedQuery.includes("amex") || normalizedQuery.includes("american express")) {
    networks.add("American Express");
  }
  if (normalizedQuery.includes("diners")) networks.add("Diners Club");

  for (const keyword of tagKeywords) {
    if (normalizedQuery.includes(keyword)) tags.add(keyword);
  }

  for (const entry of issuerAliases) {
    if (entry.aliases.some((alias) => normalizedQuery.includes(alias))) issuers.add(entry.issuer);
  }

  return {
    normalizedQuery,
    useCases: uniqueSorted([...useCases]) as UseCaseBucket[],
    segments: uniqueSorted([...segments]) as CardSegment[],
    redemptionBuckets: uniqueSorted([...redemptionBuckets]) as RedemptionBucket[],
    issuers: uniqueSorted([...issuers]),
    networks: uniqueSorted([...networks]),
    tags: uniqueSorted([...tags]),
    maxAnnualFee: extractMaxAnnualFee(normalizedQuery, input),
    inferredSpend: input.spend ?? inferSpendProfile(normalizedQuery),
    wantsLounge: input.wantsLounge ?? normalizedQuery.includes("lounge"),
    wantsLifetimeFree:
      input.wantsLifetimeFree ??
      (normalizedQuery.includes("lifetime free") ||
        normalizedQuery.includes("life time free") ||
        normalizedQuery.includes("ltf")),
    needsLatestInfo: temporalKeywords.some((keyword) => normalizedQuery.includes(keyword))
  };
}
