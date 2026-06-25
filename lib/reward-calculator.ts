import { SPEND_CATEGORY_EXCLUSION_CODE_MAP } from "./exclusion-constants";
import type { CreditCard, Reward, SpendCategory, SpendProfile } from "./types";

// Spend-category → reward-category aliases. Kept in sync with lib/recommend.ts so the
// per-card calculator earns rewards the same way the recommendation engine scores them.
const SPEND_ALIASES: Record<SpendCategory, string[]> = {
  online: ["online", "departmental stores"],
  base: ["offline", "retail", "base"],
  travel: ["travel", "travel credits", "irctc", "cleartrip"],
  hotels: ["hotel", "hotels", "marriott", "travel with points hotels"],
  airlines: ["airlines", "airline", "flight", "flights", "travel with points flights"],
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

export const CALCULATOR_CATEGORIES: SpendCategory[] = [
  "online",
  "dining",
  "travel",
  "hotels",
  "airlines",
  "fuel",
  "grocery",
  "utilities",
  "upi",
  "amazon",
  "international",
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
  travel: "Travel (cab, train, etc.)",
  hotels: "Hotel bookings",
  airlines: "Flight bookings",
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
  government: "Tax / Government payments",
  international: "International spends"
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

    if (
      category === "base" &&
      /\b(fuel|rent|insurance|wallet|government|tax|utilities|bill|gaming|school|education|college|tuition)\b/.test(
        normalizedLine
      )
    ) {
      return false;
    }

    if (/\b(cap|capped|upto|up to|up-to|max|max\.?|below|under|less than|or below|or less)\b/.test(normalizedLine)) return false;

    return true;
  });
}

function isBaseRewardCategory(category: string): boolean {
  const lower = category.toLowerCase();
  return lower === "base" || lower === "retail" || lower === "offline";
}

// A spend category earns at a dedicated (non-base) rate on this card.
function hasDirectReward(card: CreditCard, category: SpendCategory): boolean {
  const aliases = SPEND_ALIASES[category];
  const targetCategoryLower = category.toLowerCase();
  return card.rewards.some((reward) => {
    if (isBaseRewardCategory(reward.category)) return false;
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

// The categories worth showing for a given card, split into:
// - `primary`: dedicated-rate categories plus an "Other spends" catch-all, shown by default.
// - `additional`: a few notable excluded categories, revealed only on request so users can
//   confirm what the card drops without cluttering the default view.
export function relevantCategoriesForCard(card: CreditCard): {
  primary: SpendCategory[];
  additional: SpendCategory[];
} {
  const rewarded = CALCULATOR_CATEGORIES.filter(
    (category) => category !== "base" && hasDirectReward(card, category)
  );
  const additional = NOTABLE_EXCLUSION_CATEGORIES.filter(
    (category) => !rewarded.includes(category) && isCategoryExcluded(card, category)
  ).slice(0, 4);

  return { primary: [...rewarded, "base"], additional };
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
    card.rewards.find((reward) => isBaseRewardCategory(reward.category)) ??
    null
  );
}

function findRewardsForCategory(card: CreditCard, category: SpendCategory): Reward[] {
  const aliases = SPEND_ALIASES[category];
  const targetCategoryLower = category.toLowerCase();

  const directMatches = card.rewards.filter((reward) => {
    const rewardCategories = reward.category.split(",").map((c) => c.trim().toLowerCase());
    return (
      aliases.some((alias) => rewardCategories.includes(alias.toLowerCase())) ||
      rewardCategories.includes(targetCategoryLower)
    );
  });

  if (directMatches.length > 0) return directMatches;

  return card.rewards.filter((reward) => isBaseRewardCategory(reward.category));
}

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

function findDirectUpiRewards(card: CreditCard): Reward[] {
  return card.rewards.filter((reward) => rewardHasCategory(reward, "upi"));
}

// Both the base earn rate (`rate`) and the reduced post-cap rate (`postCapRate`) are read from the
// structured fields, which the card validator keeps numerically consistent with `displayRate`. This
// matches how lib/recommend.ts scores rewards, so the calculator and the recommender agree on a card's
// post-cap earning. (For cashback cards a unit is a rupee, so `rate`/`postCapRate` are already the %.)
function rewardEarnRatePerRs100(_card: CreditCard, reward: Reward) {
  return { basePerRs100: reward.rate, postCapPerRs100: reward.postCapRate ?? null };
}

type RewardTier = {
  lowerBound: number;
  upperBound: number | null;
};

// Spend tiers come from the structured `tierLowerBound`/`tierUpperBound` fields on each reward row
// (kept in sync with the human `displayCategory` text). A row is tiered when `tierLowerBound` is set.
export function tierForReward(reward: Reward): RewardTier | null {
  if (reward.tierLowerBound === undefined) return null;
  return { lowerBound: reward.tierLowerBound, upperBound: reward.tierUpperBound ?? null };
}

function allocateTieredRewardUnits(card: CreditCard, monthlySpend: number, rewards: Reward[]) {
  if (rewards.length <= 1) return null;

  const tieredRewards = rewards
    .map((reward) => ({ reward, tier: tierForReward(reward) }))
    .filter((entry): entry is { reward: Reward; tier: RewardTier } => Boolean(entry.tier));

  if (tieredRewards.length !== rewards.length) return null;

  tieredRewards.sort((a, b) => a.tier.lowerBound - b.tier.lowerBound);

  let totalUnits = 0;
  let matchedCategories: string[] = [];
  for (const { reward, tier } of tieredRewards) {
    const lower = tier.lowerBound;
    const upper = tier.upperBound ?? monthlySpend;
    const bucketSpend = Math.max(Math.min(monthlySpend, upper) - lower, 0);
    if (bucketSpend <= 0) continue;
    totalUnits += cappedMonthlyUnits(card, bucketSpend, reward);
    matchedCategories.push(reward.displayCategory ?? reward.category);
  }

  return {
    monthlyUnits: totalUnits,
    matchedRewardCategory: matchedCategories.join(" + ")
  };
}

// Applies the monthly reward cap and any reduced post-cap rate, mirroring lib/recommend.ts.
function cappedMonthlyUnits(card: CreditCard, monthlySpend: number, reward: Reward) {
  const earnRate = rewardEarnRatePerRs100(card, reward);
  const rawUnits = (monthlySpend * earnRate.basePerRs100) / 100;
  if (!reward.capMonthly) return rawUnits;

  if (
    earnRate.postCapPerRs100 &&
    earnRate.postCapPerRs100 > 0 &&
    rawUnits > reward.capMonthly &&
    earnRate.postCapPerRs100 < earnRate.basePerRs100
  ) {
    const spendAtCap = (reward.capMonthly * 100) / earnRate.basePerRs100;
    const excessSpend = Math.max(monthlySpend - spendAtCap, 0);
    const postCapUnits = (excessSpend * earnRate.postCapPerRs100) / 100;
    return reward.capMonthly + postCapUnits;
  }

  return Math.min(rawUnits, reward.capMonthly);
}

function estimateMonthlyUnits(card: CreditCard, monthlySpend: number, rewards: Reward[]) {
  const tiered = allocateTieredRewardUnits(card, monthlySpend, rewards);
  if (tiered) return tiered.monthlyUnits;
  return rewards[0] ? cappedMonthlyUnits(card, monthlySpend, rewards[0]) : 0;
}

function chooseRewardsForCategory(card: CreditCard, category: SpendCategory, monthlySpend: number) {
  const rewards = findRewardsForCategory(card, category);
  if (category === "upi" || !upiRoutableSpendCategories.has(category)) return rewards;

  const upiRewards = findDirectUpiRewards(card);
  if (upiRewards.length === 0) return rewards;

  const nativeUnits = estimateMonthlyUnits(card, monthlySpend, rewards);
  const upiUnits = estimateMonthlyUnits(card, monthlySpend, upiRewards);
  return upiUnits > nativeUnits ? upiRewards : rewards;
}

export type RewardCalcRow = {
  category: SpendCategory;
  monthlySpend: number;
  matchedRewardCategory: string | null;
  monthlyUnits: number;
  annualUnits: number;
  excluded: boolean;
  earnsBaseRateOnly: boolean;
  monthlySurcharge?: number;
  annualSurcharge?: number;
};

export type RewardCalcResult = {
  monthlyUnits: number;
  annualUnits: number;
  monthlySurcharge: number;
  annualSurcharge: number;
  rows: RewardCalcRow[];
};

export function calculateRewards(card: CreditCard, spend: SpendProfile): RewardCalcResult {
  const rows: RewardCalcRow[] = [];

  type ActiveCategoryRow = {
    category: SpendCategory;
    monthlySpend: number;
    rewards: Reward[];
    reward: Reward;
  };
  const activeRows: ActiveCategoryRow[] = [];

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

    const rewards = chooseRewardsForCategory(card, category, monthlySpend);
    const reward = rewards[0] ?? null;
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

    activeRows.push({
      category,
      monthlySpend,
      rewards,
      reward
    });
  }

  const groups = new Map<string | Reward, ActiveCategoryRow[]>();
  for (const active of activeRows) {
    const key = active.reward.capGroup ?? active.reward;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(active);
  }

  for (const [key, items] of groups.entries()) {
    if (typeof key === "string") {
      const itemRawUnits = items.map((item) => {
        const tieredAllocation = allocateTieredRewardUnits(card, item.monthlySpend, item.rewards);
        const rawUnits = tieredAllocation
          ? tieredAllocation.monthlyUnits
          : (item.monthlySpend * rewardEarnRatePerRs100(card, item.reward).basePerRs100) / 100;
        return { item, rawUnits, tieredAllocation };
      });

      const totalRawUnits = itemRawUnits.reduce((sum, entry) => sum + entry.rawUnits, 0);
      const cap = card.capGroups?.[key]?.capMonthly ?? items[0].reward.capMonthly;
      const totalCappedUnits = typeof cap === "number" && cap > 0 ? Math.min(totalRawUnits, cap) : totalRawUnits;

      for (const { item, rawUnits, tieredAllocation } of itemRawUnits) {
        const monthlyUnits = totalRawUnits > 0 ? (totalCappedUnits * rawUnits) / totalRawUnits : 0;
        rows.push({
          category: item.category,
          monthlySpend: item.monthlySpend,
          matchedRewardCategory: tieredAllocation?.matchedRewardCategory ?? item.reward.category,
          monthlyUnits,
          annualUnits: monthlyUnits * 12,
          excluded: false,
          earnsBaseRateOnly: isBaseRewardCategory(item.reward.category) && item.category !== "base"
        });
      }
    } else {
      const reward = key;
      const isTiered = items.length > 0 && allocateTieredRewardUnits(card, items[0].monthlySpend, items[0].rewards) !== null;

      if (isTiered) {
        for (const item of items) {
          const tieredAllocation = allocateTieredRewardUnits(card, item.monthlySpend, item.rewards);
          const monthlyUnits = tieredAllocation?.monthlyUnits ?? cappedMonthlyUnits(card, item.monthlySpend, reward);
          rows.push({
            category: item.category,
            monthlySpend: item.monthlySpend,
            matchedRewardCategory: tieredAllocation?.matchedRewardCategory ?? reward.category,
            monthlyUnits,
            annualUnits: monthlyUnits * 12,
            excluded: false,
            earnsBaseRateOnly: isBaseRewardCategory(reward.category) && item.category !== "base"
          });
        }
      } else {
        const itemRawUnits = items.map((item) => {
          const earnRate = rewardEarnRatePerRs100(card, reward);
          const rawUnits = (item.monthlySpend * earnRate.basePerRs100) / 100;
          return { item, rawUnits };
        });

        const totalRawUnits = itemRawUnits.reduce((sum, entry) => sum + entry.rawUnits, 0);

        let totalCappedUnits = totalRawUnits;
        if (reward.capMonthly) {
          const earnRate = rewardEarnRatePerRs100(card, reward);
          if (
            earnRate.postCapPerRs100 &&
            earnRate.postCapPerRs100 > 0 &&
            totalRawUnits > reward.capMonthly &&
            earnRate.postCapPerRs100 < earnRate.basePerRs100
          ) {
            const totalSpend = items.reduce((sum, item) => sum + item.monthlySpend, 0);
            const spendAtCap = (reward.capMonthly * 100) / earnRate.basePerRs100;
            const excessSpend = Math.max(totalSpend - spendAtCap, 0);
            const postCapUnits = (excessSpend * earnRate.postCapPerRs100) / 100;
            totalCappedUnits = reward.capMonthly + postCapUnits;
          } else {
            totalCappedUnits = Math.min(totalRawUnits, reward.capMonthly);
          }
        }

        for (const { item, rawUnits } of itemRawUnits) {
          const monthlyUnits = totalRawUnits > 0 ? (totalCappedUnits * rawUnits) / totalRawUnits : 0;
          rows.push({
            category: item.category,
            monthlySpend: item.monthlySpend,
            matchedRewardCategory: reward.category,
            monthlyUnits,
            annualUnits: monthlyUnits * 12,
            excluded: false,
            earnsBaseRateOnly: isBaseRewardCategory(reward.category) && item.category !== "base"
          });
        }
      }
    }
  }

  const categoryOrder = new Map(CALCULATOR_CATEGORIES.map((cat, idx) => [cat, idx]));
  rows.sort((a, b) => (categoryOrder.get(a.category) ?? 0) - (categoryOrder.get(b.category) ?? 0));

  const monthlyUnits = rows.reduce((total, row) => total + row.monthlyUnits, 0);

  let monthlySurcharge = 0;
  for (const row of rows) {
    const specialRule = specialSpendRuleForCard(card, row.category);
    const surchargePercent = specialRule?.surchargePercent !== undefined
      ? specialRule.surchargePercent
      : (row.category === "rent" ? 1.0 : 0.0);
    const mSurcharge = (row.monthlySpend * surchargePercent) / 100;
    row.monthlySurcharge = mSurcharge;
    row.annualSurcharge = mSurcharge * 12;
    monthlySurcharge += mSurcharge;
  }

  return {
    monthlyUnits,
    annualUnits: monthlyUnits * 12,
    monthlySurcharge,
    annualSurcharge: monthlySurcharge * 12,
    rows
  };
}
