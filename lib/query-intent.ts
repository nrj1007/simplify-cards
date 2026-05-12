import type { RecommendationInput } from "./types";
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
  "beginner",
  "premium",
  "ltf",
  "lifetime free",
  "secured",
  "forex"
];

function normalizeQuery(query?: string) {
  return query?.toLowerCase().trim() ?? "";
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort();
}

function extractMaxAnnualFee(query: string, input: RecommendationInput) {
  if (input.maxAnnualFee !== undefined) return input.maxAnnualFee;

  const feePatterns = [
    /under\s+rs\.?\s*([\d,]+)/i,
    /below\s+rs\.?\s*([\d,]+)/i,
    /upto\s+rs\.?\s*([\d,]+)/i,
    /up to\s+rs\.?\s*([\d,]+)/i,
    /within\s+rs\.?\s*([\d,]+)/i
  ];

  for (const pattern of feePatterns) {
    const match = query.match(pattern);
    if (!match) continue;

    const parsed = Number(match[1].replace(/,/g, ""));
    if (!Number.isNaN(parsed)) return parsed;
  }

  return undefined;
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
    wantsLounge: input.wantsLounge ?? normalizedQuery.includes("lounge"),
    wantsLifetimeFree:
      input.wantsLifetimeFree ?? (normalizedQuery.includes("lifetime free") || normalizedQuery.includes("ltf")),
    needsLatestInfo: temporalKeywords.some((keyword) => normalizedQuery.includes(keyword))
  };
}
