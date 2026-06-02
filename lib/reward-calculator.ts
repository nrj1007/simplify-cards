import { SPEND_CATEGORY_EXCLUSION_CODE_MAP } from "./exclusion-constants";
import type { CreditCard, Reward, SpendCategory, SpendProfile } from "./types";

// Spend-category → reward-category aliases. Kept in sync with lib/recommend.ts so the
// per-card calculator earns rewards the same way the recommendation engine scores them.
const SPEND_ALIASES: Record<SpendCategory, string[]> = {
  online: ["online"],
  base: ["offline", "retail", "base"],
  travel: ["travel", "travel credits", "irctc", "airlines", "hotel", "hotels", "marriott", "cleartrip"],
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
  government: ["government", "tax", "taxes", "government payments", "tax payments"]
};

export const CALCULATOR_CATEGORIES: SpendCategory[] = [
  "online",
  "dining",
  "travel",
  "fuel",
  "grocery",
  "utilities",
  "upi",
  "amazon",
  "base",
  "rent",
  "insurance",
  "education",
  "gold",
  "government"
];

export const CATEGORY_LABELS: Record<SpendCategory, string> = {
  online: "Online shopping",
  base: "Other spends",
  travel: "Travel (flights, hotels)",
  fuel: "Fuel",
  dining: "Dining & food delivery",
  grocery: "Groceries",
  amazon: "Amazon",
  upi: "UPI payments",
  utilities: "Utility bills",
  rent: "Rent",
  insurance: "Insurance",
  education: "Education",
  gold: "Gold / jewellery",
  government: "Tax / Government payments"
};

function normalizeForMatch(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
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

function specialSpendRuleForCard(card: CreditCard, category: SpendCategory) {
  return card.specialSpendRules?.find((rule) => rule.category === category) ?? null;
}

// Mirrors lib/recommend.ts isSpendCategoryExcluded so the calculator never credits rewards
// on categories the card silently drops.
export function isCategoryExcluded(card: CreditCard, category: SpendCategory): boolean {
  const specialRule = specialSpendRuleForCard(card, category);
  if (specialRule) return specialRule.treatment === "excluded";

  const mappedCodes = SPEND_CATEGORY_EXCLUSION_CODE_MAP[category];
  if (mappedCodes && card.exclusionCodes?.some((code) => mappedCodes.includes(code))) {
    return true;
  }

  return card.exclusions.some((line) => {
    const normalizedLine = normalizeForMatch(line);
    const categoryTerms = SPEND_ALIASES[category].map((alias) => normalizeForMatch(alias));
    const matchesCategory = categoryTerms.some((term) => containsNormalizedPhrase(normalizedLine, term));
    if (!matchesCategory) return false;

    if (
      category === "online" &&
      /\b(gaming|lottery|gambling|betting|education|school|college|tuition|insurance|rent|wallet|government|tax|utilities|bill)\b/.test(
        normalizedLine
      )
    ) {
      return false;
    }

    if (/\b(cap|capped|upto|up to|up-to|max|max\.?)\b/.test(normalizedLine)) return false;

    return true;
  });
}

// A spend category earns at a dedicated (non-base) rate on this card.
function hasDirectReward(card: CreditCard, category: SpendCategory): boolean {
  const aliases = SPEND_ALIASES[category];
  const targetCategoryLower = category.toLowerCase();
  return card.rewards.some((reward) => {
    if (reward.category === "base") return false;
    const rewardCategories = reward.category.split(",").map((c) => c.trim().toLowerCase());
    return (
      aliases.some((alias) => rewardCategories.includes(alias.toLowerCase())) ||
      rewardCategories.includes(targetCategoryLower)
    );
  });
}

// Excluded categories worth surfacing so users see what the card silently drops.
const NOTABLE_EXCLUSION_CATEGORIES: SpendCategory[] = [
  "fuel",
  "insurance",
  "rent",
  "utilities",
  "gold",
  "education",
  "government"
];

// The categories worth showing for a given card: the ones it rewards at a dedicated rate,
// an "Other spends" catch-all, and a few notable exclusions — instead of every category.
export function relevantCategoriesForCard(card: CreditCard): SpendCategory[] {
  const rewarded = CALCULATOR_CATEGORIES.filter(
    (category) => category !== "base" && hasDirectReward(card, category)
  );
  const excluded = NOTABLE_EXCLUSION_CATEGORIES.filter(
    (category) => !rewarded.includes(category) && isCategoryExcluded(card, category)
  ).slice(0, 4);

  return [...rewarded, "base", ...excluded];
}

function findRewardForCategory(card: CreditCard, category: SpendCategory): Reward | null {
  const aliases = SPEND_ALIASES[category];
  const targetCategoryLower = category.toLowerCase();

  return (
    card.rewards.find((reward) => {
      const rewardCategories = reward.category.split(",").map((c) => c.trim().toLowerCase());
      return (
        aliases.some((alias) => rewardCategories.includes(alias.toLowerCase())) ||
        rewardCategories.includes(targetCategoryLower)
      );
    }) ??
    card.rewards.find((reward) => reward.category === "base") ??
    null
  );
}

// Applies the monthly reward cap and any reduced post-cap rate, mirroring lib/recommend.ts.
function cappedMonthlyUnits(monthlySpend: number, reward: Reward) {
  const rawUnits = (monthlySpend * reward.rate) / 100;
  if (!reward.capMonthly) return rawUnits;

  if (reward.postCapRate && reward.postCapRate > 0 && rawUnits > reward.capMonthly && reward.postCapRate < reward.rate) {
    const spendAtCap = (reward.capMonthly * 100) / reward.rate;
    const excessSpend = Math.max(monthlySpend - spendAtCap, 0);
    const postCapUnits = (excessSpend * reward.postCapRate) / 100;
    return reward.capMonthly + postCapUnits;
  }

  return Math.min(rawUnits, reward.capMonthly);
}

export type RewardCalcRow = {
  category: SpendCategory;
  monthlySpend: number;
  matchedRewardCategory: string | null;
  monthlyUnits: number;
  annualUnits: number;
  excluded: boolean;
  earnsBaseRateOnly: boolean;
};

export type RewardCalcResult = {
  monthlyUnits: number;
  annualUnits: number;
  rows: RewardCalcRow[];
};

export function calculateRewards(card: CreditCard, spend: SpendProfile): RewardCalcResult {
  const rows: RewardCalcRow[] = [];

  for (const category of CALCULATOR_CATEGORIES) {
    const monthlySpend = spend[category] ?? 0;
    if (monthlySpend <= 0) continue;

    if (isCategoryExcluded(card, category)) {
      rows.push({
        category,
        monthlySpend,
        matchedRewardCategory: null,
        monthlyUnits: 0,
        annualUnits: 0,
        excluded: true,
        earnsBaseRateOnly: false
      });
      continue;
    }

    const reward = findRewardForCategory(card, category);
    if (!reward) {
      rows.push({
        category,
        monthlySpend,
        matchedRewardCategory: null,
        monthlyUnits: 0,
        annualUnits: 0,
        excluded: false,
        earnsBaseRateOnly: false
      });
      continue;
    }

    const monthlyUnits = cappedMonthlyUnits(monthlySpend, reward);
    rows.push({
      category,
      monthlySpend,
      matchedRewardCategory: reward.category,
      monthlyUnits,
      annualUnits: monthlyUnits * 12,
      excluded: false,
      earnsBaseRateOnly: reward.category === "base" && category !== "base"
    });
  }

  const monthlyUnits = rows.reduce((total, row) => total + row.monthlyUnits, 0);

  return {
    monthlyUnits,
    annualUnits: monthlyUnits * 12,
    rows
  };
}
