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
  const parts = category.split(",").map((c) => c.trim().toLowerCase());
  return parts.some((p) => p === "base" || p === "retail" || p === "offline");
}

function titleCase(str: string): string {
  if (!str) return "";
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export type CalculatorBucket = {
  id: string;           // canonical id ("online","base"…) when canonical; else normalized merchant ("phonepe","flipkart")
  label: string;        // card's own text ("PhonePe","Flipkart"); base → "Other spends"
  displayRate?: string; // representative row's displayRate (top tier for tiered buckets)
  isBase: boolean;
  rewards: Reward[];    // one row, or N tier rows collapsed
};

export function calculatorBucketsForCard(card: CreditCard): CalculatorBucket[] {
  const baseRewards = card.rewards.filter((r) => !r.hidden && isBaseRewardCategory(r.category));
  const nonBaseRewards = card.rewards.filter((r) => !r.hidden && !isBaseRewardCategory(r.category));

  const nonBaseGroups = new Map<string, Reward[]>();
  const orderedKeys: string[] = [];

  for (const r of nonBaseRewards) {
    const key = normalizeForMatch(r.category);
    if (!nonBaseGroups.has(key)) {
      nonBaseGroups.set(key, []);
      orderedKeys.push(key);
    }
    nonBaseGroups.get(key)!.push(r);
  }

  const buckets: CalculatorBucket[] = [];

  for (const key of orderedKeys) {
    const rewards = nonBaseGroups.get(key)!;
    
    // Find canonical id
    const canonicalMatch = CALCULATOR_CATEGORIES.find(
      (cat) => cat !== "base" && normalizeForMatch(cat) === key
    );
    const id = canonicalMatch || key;

    // Label
    let label = "";
    if (rewards.length > 1) {
      label = titleCase(rewards[0].category);
    } else {
      label = rewards[0].displayCategory ?? titleCase(rewards[0].category);
    }

    // Sort rewards if tiered
    const sortedRewards = [...rewards].sort(
      (a, b) => (a.tierLowerBound ?? 0) - (b.tierLowerBound ?? 0)
    );
    const representativeReward = sortedRewards[sortedRewards.length - 1];
    const displayRate = representativeReward?.displayRate;

    buckets.push({
      id,
      label,
      displayRate,
      isBase: false,
      rewards: sortedRewards
    });
  }

  // Add trailing base bucket
  if (baseRewards.length > 0) {
    const sortedBaseRewards = [...baseRewards].sort(
      (a, b) => (a.tierLowerBound ?? 0) - (b.tierLowerBound ?? 0)
    );
    const repBaseReward = sortedBaseRewards[sortedBaseRewards.length - 1];

    buckets.push({
      id: "base",
      label: "Other spends",
      displayRate: repBaseReward?.displayRate,
      isBase: true,
      rewards: sortedBaseRewards
    });
  }

  return buckets;
}

export const MORE_CATEGORIES: SpendCategory[] = ["rent", "insurance", "education", "gold", "government"];

function isCategoryCoveredByBuckets(cat: SpendCategory, buckets: CalculatorBucket[]): boolean {
  return buckets.some((b) =>
    b.rewards.some((r) => {
      const rewardCategories = r.category.split(",").map((c) => c.trim().toLowerCase());
      const aliases = SPEND_ALIASES[cat] || [];
      const targetCategoryLower = cat.toLowerCase();
      return (
        aliases.some((alias) => rewardCategories.includes(alias.toLowerCase())) ||
        rewardCategories.includes(targetCategoryLower)
      );
    })
  );
}

export function moreCategoriesForCard(card: CreditCard): SpendCategory[] {
  const buckets = calculatorBucketsForCard(card);
  return MORE_CATEGORIES.filter(
    (cat) => !isCategoryCoveredByBuckets(cat, buckets) && !isCategoryExcluded(card, cat)
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

function rewardEarnRatePerRs100(_card: CreditCard, reward: Reward) {
  return { basePerRs100: reward.rate, postCapPerRs100: reward.postCapRate ?? null };
}

type RewardTier = {
  lowerBound: number;
  upperBound: number | null;
};

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

function cappedMonthlyUnits(card: CreditCard, monthlySpend: number, reward: Reward, totalBaseCashback?: number) {
  const earnRate = rewardEarnRatePerRs100(card, reward);
  const rawUnits = (monthlySpend * earnRate.basePerRs100) / 100;

  let cap = reward.capMonthly;
  if (totalBaseCashback !== undefined && reward.capMultiplierOfBaseEarn !== undefined && reward.capMultiplierOfBaseEarn !== null) {
    const dynamicCap = totalBaseCashback * reward.capMultiplierOfBaseEarn;
    cap = cap !== null ? Math.min(cap, dynamicCap) : dynamicCap;
  }
  if (reward.capDaily !== undefined && reward.capDaily !== null) {
    // Since lumpy spends (like flights/hotels) are typically done in a single transaction/day,
    // the daily cap acts effectively as a cap on the row's total monthly earn.
    cap = cap !== null ? Math.min(cap, reward.capDaily) : reward.capDaily;
  }

  if (cap === null || cap === undefined) return rawUnits;

  if (
    earnRate.postCapPerRs100 &&
    earnRate.postCapPerRs100 > 0 &&
    rawUnits > cap &&
    earnRate.postCapPerRs100 < earnRate.basePerRs100
  ) {
    const spendAtCap = (cap * 100) / earnRate.basePerRs100;
    const excessSpend = Math.max(monthlySpend - spendAtCap, 0);
    const postCapUnits = (excessSpend * earnRate.postCapPerRs100) / 100;
    return cap + postCapUnits;
  }

  return Math.min(rawUnits, cap);
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
  category: SpendCategory | string;
  label?: string;
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

export type ActiveRow = {
  key: string;
  label?: string;
  monthlySpend: number;
  rewards: Reward[];
  reward: Reward;
};

export function assembleRewardRows(card: CreditCard, activeRows: ActiveRow[]): RewardCalcRow[] {
  const rows: RewardCalcRow[] = [];

  // Sum up base cashback first for any rows matching base category.
  let totalBaseCashback = 0;
  for (const active of activeRows) {
    if (isBaseRewardCategory(active.reward.category)) {
      const earnRate = rewardEarnRatePerRs100(card, active.reward);
      const rawUnits = (active.monthlySpend * earnRate.basePerRs100) / 100;
      let rowCap = active.reward.capMonthly;
      if (active.reward.capDaily !== undefined && active.reward.capDaily !== null) {
        // Since lumpy spends (like flights/hotels) are typically done in a single transaction/day,
        // the daily cap acts effectively as a cap on the row's total monthly earn.
        rowCap = rowCap !== null ? Math.min(rowCap, active.reward.capDaily) : active.reward.capDaily;
      }
      const capped = rowCap ? Math.min(rawUnits, rowCap) : rawUnits;
      totalBaseCashback += capped;
    }
  }

  const groups = new Map<string | Reward, ActiveRow[]>();
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
        let rawUnits = tieredAllocation
          ? tieredAllocation.monthlyUnits
          : (item.monthlySpend * rewardEarnRatePerRs100(card, item.reward).basePerRs100) / 100;
        let rowCap = item.reward.capMonthly;
        if (item.reward.capDaily !== undefined && item.reward.capDaily !== null) {
          // Since lumpy spends (like flights/hotels) are typically done in a single transaction/day,
          // the daily cap acts effectively as a cap on the row's total monthly earn.
          rowCap = rowCap !== null ? Math.min(rowCap, item.reward.capDaily) : item.reward.capDaily;
        }
        if (rowCap !== null && rowCap !== undefined && rawUnits > rowCap) {
          rawUnits = rowCap;
        }
        return { item, rawUnits, tieredAllocation };
      });

      const totalRawUnits = itemRawUnits.reduce((sum, entry) => sum + entry.rawUnits, 0);
      let cap = card.capGroups?.[key]?.capMonthly ?? items[0].reward.capMonthly;
      if (items[0].reward.capMultiplierOfBaseEarn !== undefined && items[0].reward.capMultiplierOfBaseEarn !== null) {
        const dynamicCap = totalBaseCashback * items[0].reward.capMultiplierOfBaseEarn;
        cap = cap !== null ? Math.min(cap, dynamicCap) : dynamicCap;
      }
      const totalCappedUnits = typeof cap === "number" ? Math.min(totalRawUnits, cap) : totalRawUnits;

      for (const { item, rawUnits, tieredAllocation } of itemRawUnits) {
        const monthlyUnits = totalRawUnits > 0 ? (totalCappedUnits * rawUnits) / totalRawUnits : 0;
        rows.push({
          category: item.key,
          label: item.label,
          monthlySpend: item.monthlySpend,
          matchedRewardCategory: tieredAllocation?.matchedRewardCategory ?? item.reward.category,
          monthlyUnits,
          annualUnits: monthlyUnits * 12,
          excluded: false,
          earnsBaseRateOnly: isBaseRewardCategory(item.reward.category) && item.key !== "base"
        });
      }
    } else {
      const reward = key;
      const isTiered = items.length > 0 && allocateTieredRewardUnits(card, items[0].monthlySpend, items[0].rewards) !== null;

      if (isTiered) {
        for (const item of items) {
          const tieredAllocation = allocateTieredRewardUnits(card, item.monthlySpend, item.rewards);
          const monthlyUnits = tieredAllocation?.monthlyUnits ?? cappedMonthlyUnits(card, item.monthlySpend, reward, totalBaseCashback);
          rows.push({
            category: item.key,
            label: item.label,
            monthlySpend: item.monthlySpend,
            matchedRewardCategory: tieredAllocation?.matchedRewardCategory ?? reward.category,
            monthlyUnits,
            annualUnits: monthlyUnits * 12,
            excluded: false,
            earnsBaseRateOnly: isBaseRewardCategory(reward.category) && item.key !== "base"
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
        let cap = reward.capMonthly;
        if (reward.capMultiplierOfBaseEarn !== undefined && reward.capMultiplierOfBaseEarn !== null) {
          const dynamicCap = totalBaseCashback * reward.capMultiplierOfBaseEarn;
          cap = cap !== null ? Math.min(cap, dynamicCap) : dynamicCap;
        }
        if (reward.capDaily !== undefined && reward.capDaily !== null) {
          // Since lumpy spends (like flights/hotels) are typically done in a single transaction/day,
          // the daily cap acts effectively as a cap on the row's total monthly earn.
          cap = cap !== null ? Math.min(cap, reward.capDaily) : reward.capDaily;
        }

        if (cap !== null && cap !== undefined) {
          const earnRate = rewardEarnRatePerRs100(card, reward);
          if (
            earnRate.postCapPerRs100 &&
            earnRate.postCapPerRs100 > 0 &&
            totalRawUnits > cap &&
            earnRate.postCapPerRs100 < earnRate.basePerRs100
          ) {
            const totalSpend = items.reduce((sum, item) => sum + item.monthlySpend, 0);
            const spendAtCap = (cap * 100) / earnRate.basePerRs100;
            const excessSpend = Math.max(totalSpend - spendAtCap, 0);
            const postCapUnits = (excessSpend * earnRate.postCapPerRs100) / 100;
            totalCappedUnits = cap + postCapUnits;
          } else {
            totalCappedUnits = Math.min(totalRawUnits, cap);
          }
        }

        for (const { item, rawUnits } of itemRawUnits) {
          const monthlyUnits = totalRawUnits > 0 ? (totalCappedUnits * rawUnits) / totalRawUnits : 0;
          rows.push({
            category: item.key,
            label: item.label,
            monthlySpend: item.monthlySpend,
            matchedRewardCategory: reward.category,
            monthlyUnits,
            annualUnits: monthlyUnits * 12,
            excluded: false,
            earnsBaseRateOnly: isBaseRewardCategory(reward.category) && item.key !== "base"
          });
        }
      }
    }
  }

  return rows;
}

export function calculateRewards(card: CreditCard, spend: SpendProfile): RewardCalcResult {
  const rows: RewardCalcRow[] = [];
  const activeRows: ActiveRow[] = [];

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
      key: category,
      monthlySpend,
      rewards,
      reward
    });
  }

  const calculatedActiveRows = assembleRewardRows(card, activeRows);
  rows.push(...calculatedActiveRows);

  const categoryOrder = new Map(CALCULATOR_CATEGORIES.map((cat, idx) => [cat, idx]));
  rows.sort((a, b) => (categoryOrder.get(a.category as SpendCategory) ?? 0) - (categoryOrder.get(b.category as SpendCategory) ?? 0));

  const monthlyUnits = rows.reduce((total, row) => total + row.monthlyUnits, 0);

  let monthlySurcharge = 0;
  for (const row of rows) {
    const specialRule = specialSpendRuleForCard(card, row.category as SpendCategory);
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

export function calculateRewardsByBucket(
  card: CreditCard,
  bucketSpend: Record<string, number>
): RewardCalcResult {
  const rows: RewardCalcRow[] = [];
  const activeRows: ActiveRow[] = [];

  const buckets = calculatorBucketsForCard(card);

  // 1. Process buckets
  for (const bucket of buckets) {
    const spend = bucketSpend[bucket.id] ?? 0;
    if (spend <= 0) continue;

    const reward = bucket.rewards[0] ?? null;
    if (!reward) {
      rows.push({
        category: bucket.id,
        label: bucket.label,
        monthlySpend: spend,
        matchedRewardCategory: null,
        monthlyUnits: 0,
        annualUnits: 0,
        excluded: false,
        earnsBaseRateOnly: false
      });
      continue;
    }

    activeRows.push({
      key: bucket.id,
      label: bucket.label,
      monthlySpend: spend,
      rewards: bucket.rewards,
      reward
    });
  }

  // 2. Process MORE_CATEGORIES
  for (const cat of MORE_CATEGORIES) {
    const spend = bucketSpend[cat] ?? 0;
    if (spend <= 0) continue;

    // Check if this category is already handled by a bucket (avoids duplicating)
    if (isCategoryCoveredByBuckets(cat, buckets)) {
      continue;
    }

    if (isCategoryExcluded(card, cat)) {
      rows.push({
        category: cat,
        label: CATEGORY_LABELS[cat],
        monthlySpend: spend,
        matchedRewardCategory: null,
        monthlyUnits: 0,
        annualUnits: 0,
        excluded: true,
        earnsBaseRateOnly: false
      });
      continue;
    }

    const rewards = findRewardsForCategory(card, cat);
    const reward = rewards[0] ?? null;
    if (!reward) {
      rows.push({
        category: cat,
        label: CATEGORY_LABELS[cat],
        monthlySpend: spend,
        matchedRewardCategory: null,
        monthlyUnits: 0,
        annualUnits: 0,
        excluded: false,
        earnsBaseRateOnly: false
      });
      continue;
    }

    activeRows.push({
      key: cat,
      label: CATEGORY_LABELS[cat],
      monthlySpend: spend,
      rewards,
      reward
    });
  }

  // 3. Assemble active rows
  const calculatedActive = assembleRewardRows(card, activeRows);
  rows.push(...calculatedActive);

  // 4. Sort rows
  const rowOrder = new Map<string, number>();
  let idx = 0;
  for (const b of buckets) {
    rowOrder.set(b.id, idx++);
  }
  for (const cat of MORE_CATEGORIES) {
    if (!rowOrder.has(cat)) {
      rowOrder.set(cat, idx++);
    }
  }

  rows.sort((a, b) => (rowOrder.get(a.category) ?? 99) - (rowOrder.get(b.category) ?? 99));

  // 5. Calculate monthly/annual units and surcharges
  const monthlyUnits = rows.reduce((total, row) => total + row.monthlyUnits, 0);

  let monthlySurcharge = 0;
  for (const row of rows) {
    const cat = row.category as SpendCategory;
    const isSpendCategory = CALCULATOR_CATEGORIES.includes(cat);
    const specialRule = isSpendCategory ? specialSpendRuleForCard(card, cat) : null;
    const surchargePercent = specialRule?.surchargePercent !== undefined
      ? specialRule.surchargePercent
      : (cat === "rent" ? 1.0 : 0.0);
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
