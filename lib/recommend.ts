import { cards } from "./cards";
import type { CardScore, CreditCard, RecommendationInput, SpendCategory, SpendProfile } from "./types";

const defaultSpend: SpendProfile = {
  online: 15000,
  offline: 8000,
  travel: 5000,
  dining: 4000,
  grocery: 5000,
  fuel: 3000,
  amazon: 5000,
  upi: 5000,
  utilities: 3000
};

const spendAliases: Record<SpendCategory, string[]> = {
  online: [
    "online",
    "smartbuy",
    "selected packs",
    "select merchants",
    "select lifestyle brands",
    "payzapp",
    "flipkart",
    "myntra",
    "partner merchants",
    "departmental stores"
  ],
  offline: ["offline", "retail"],
  travel: ["travel", "smartbuy flights", "smartbuy hotels", "smartbuy train", "irctc", "airlines", "hotel", "hotels", "marriott", "cleartrip"],
  fuel: ["fuel"],
  dining: ["dining", "swiggy zomato", "dining movies grocery", "grocery dining movies", "pharmacy dining movies"],
  grocery: ["grocery", "groceries", "bigbasket", "dining movies grocery", "grocery dining movies"],
  amazon: ["amazon"],
  upi: ["upi"],
  utilities: ["utilities", "phonepe", "utility bills"]
};

function normalizeText(value = "") {
  return value.toLowerCase().trim();
}

function extractQueryTags(query?: string) {
  const text = normalizeText(query);
  const tags = new Set<string>();

  for (const tag of [
    "online",
    "cashback",
    "travel",
    "lounge",
    "forex",
    "amazon",
    "fuel",
    "lifetime free",
    "secured",
    "dining",
    "grocery",
    "utilities",
    "phonepe",
    "tata neu",
    "shoppers stop",
    "marriott",
    "irctc"
  ]) {
    if (text.includes(tag)) tags.add(tag);
  }

  if (text.includes("upi") || text.includes("rupay")) tags.add("upi");
  if (text.includes("free") || text.includes("zero fee")) tags.add("lifetime free");

  return tags;
}

function monthlySpendTotal(spend: SpendProfile) {
  return Object.values(spend).reduce((total, amount = 0) => total + amount, 0);
}

function annualSpendTotal(spend: SpendProfile) {
  return monthlySpendTotal(spend) * 12;
}

function findRewardForSpend(card: CreditCard, category: SpendCategory) {
  const aliases = spendAliases[category];

  return (
    card.rewards.find((reward) => aliases.includes(reward.category)) ??
    card.rewards.find((reward) => reward.category === category) ??
    card.rewards.find((reward) => reward.category === "offline")
  );
}

function rewardBreakdownForCard(card: CreditCard, spend: SpendProfile) {
  return (Object.entries(spend) as Array<[SpendCategory, number]>).flatMap(([category, amount]) => {
    const matchingReward = findRewardForSpend(card, category);
    if (!matchingReward || !amount || amount <= 0) return [];

    const rawReward = (amount * matchingReward.rate) / 100;
    const monthlyReward = matchingReward.capMonthly ? Math.min(rawReward, matchingReward.capMonthly) : rawReward;

    return [
      {
        spendCategory: category,
        monthlySpend: amount,
        rewardCategory: matchingReward.category,
        monthlyReward: Math.round(monthlyReward),
        annualReward: Math.round(monthlyReward * 12)
      }
    ];
  });
}

function annualRewardForCard(card: CreditCard, spend: SpendProfile) {
  return rewardBreakdownForCard(card, spend).reduce((total, item) => total + item.annualReward, 0);
}

function feeAfterWaiver(card: CreditCard, spend: SpendProfile) {
  const annualSpend = annualSpendTotal(spend);
  if (card.feeWaiverSpend && annualSpend >= card.feeWaiverSpend) return 0;
  return card.annualFee;
}

function loungeScore(card: CreditCard) {
  if (card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited") return 20;
  return card.loungeDomestic + card.loungeInternational;
}

export function scoreCards(input: RecommendationInput): CardScore[] {
  const queryTags = extractQueryTags(input.query);
  const spend = { ...defaultSpend, ...input.spend };
  const annualSpend = annualSpendTotal(spend);

  return cards
    .filter((card) => (input.maxAnnualFee === undefined ? true : card.annualFee <= input.maxAnnualFee))
    .filter((card) => (input.wantsLifetimeFree ? card.annualFee === 0 : true))
    .filter((card) => (input.wantsLounge ? loungeScore(card) > 0 : true))
    .map((card) => {
      const matchedTags = card.tags.filter((tag) => queryTags.has(tag));
      const rewardBreakdown = rewardBreakdownForCard(card, spend);
      const estimatedAnnualRewards = annualRewardForCard(card, spend);
      const estimatedAnnualFee = feeAfterWaiver(card, spend);
      const estimatedNetValue = estimatedAnnualRewards - estimatedAnnualFee;
      const tagBoost = matchedTags.length * 500;
      const loungeBoost = input.wantsLounge ? loungeScore(card) * 100 : 0;
      const feeWaiverReason =
        card.feeWaiverSpend && annualSpend >= card.feeWaiverSpend
          ? `Fee waiver likely at Rs ${annualSpend.toLocaleString("en-IN")} yearly spend`
          : card.feeWaiverSpend
            ? `Fee waiver needs Rs ${card.feeWaiverSpend.toLocaleString("en-IN")} yearly spend`
            : "No fee waiver listed";
      const strongestRewards = [...rewardBreakdown]
        .sort((a, b) => b.annualReward - a.annualReward)
        .slice(0, 2)
        .map((item) => `${item.spendCategory} uses ${item.rewardCategory} rewards`);

      const reasons = [
        ...matchedTags.map((tag) => `Matches ${tag} intent`),
        ...strongestRewards,
        card.annualFee === 0 ? "No annual fee" : `Effective annual fee is Rs ${estimatedAnnualFee}`,
        feeWaiverReason,
        loungeScore(card) > 0
          ? card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited"
            ? "Unlimited lounge access listed"
            : `${loungeScore(card)} yearly lounge visits listed`
          : "No lounge access listed"
      ];

      return {
        card,
        annualSpend,
        estimatedAnnualRewards,
        estimatedAnnualFee,
        estimatedNetValue,
        fitScore: estimatedNetValue + tagBoost + loungeBoost,
        matchedTags,
        reasons,
        rewardBreakdown
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore);
}

export function answerFromCards(input: RecommendationInput) {
  const topCards = scoreCards(input).slice(0, 3);

  return {
    summary:
      topCards.length === 0
        ? "No card matched the selected constraints. Try increasing the annual fee limit or removing lounge/lifetime-free filters."
        : `${topCards[0].card.name} looks strongest with an estimated net yearly value of Rs ${topCards[0].estimatedNetValue.toLocaleString("en-IN")}.`,
    cards: topCards
  };
}
