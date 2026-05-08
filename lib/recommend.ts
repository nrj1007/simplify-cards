import { cards } from "./cards";
import type { CardScore, CreditCard, RecommendationInput, SpendCategory, SpendProfile } from "./types";

const defaultSpend: SpendProfile = {
  online: 15000,
  offline: 8000,
  travel: 5000,
  dining: 4000,
  grocery: 5000,
  fuel: 3000,
  amazon: 5000
};

function normalizeText(value = "") {
  return value.toLowerCase().trim();
}

function extractQueryTags(query?: string) {
  const text = normalizeText(query);
  const tags = new Set<string>();

  for (const tag of ["online", "cashback", "travel", "lounge", "forex", "amazon", "fuel", "lifetime free", "secured", "dining", "grocery"]) {
    if (text.includes(tag)) tags.add(tag);
  }

  if (text.includes("upi") || text.includes("rupay")) tags.add("upi");
  if (text.includes("free") || text.includes("zero fee")) tags.add("lifetime free");

  return tags;
}

function annualRewardForCard(card: CreditCard, spend: SpendProfile) {
  let monthlyReward = 0;

  for (const [category, amount] of Object.entries(spend) as Array<[SpendCategory, number]>) {
    const matchingReward =
      card.rewards.find((reward) => reward.category === category) ??
      card.rewards.find((reward) => reward.category === "offline");

    if (!matchingReward || !amount) continue;

    const rawReward = (amount * matchingReward.rate) / 100;
    monthlyReward += matchingReward.capMonthly ? Math.min(rawReward, matchingReward.capMonthly) : rawReward;
  }

  return Math.round(monthlyReward * 12);
}

function feeAfterWaiver(card: CreditCard, spend: SpendProfile) {
  const annualSpend = Object.values(spend).reduce((total, amount = 0) => total + amount, 0) * 12;
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

  return cards
    .filter((card) => (input.maxAnnualFee === undefined ? true : card.annualFee <= input.maxAnnualFee))
    .filter((card) => (input.wantsLifetimeFree ? card.annualFee === 0 : true))
    .filter((card) => (input.wantsLounge ? loungeScore(card) > 0 : true))
    .map((card) => {
      const matchedTags = card.tags.filter((tag) => queryTags.has(tag));
      const estimatedAnnualRewards = annualRewardForCard(card, spend);
      const estimatedNetValue = estimatedAnnualRewards - feeAfterWaiver(card, spend);
      const tagBoost = matchedTags.length * 500;
      const loungeBoost = input.wantsLounge ? loungeScore(card) * 100 : 0;

      const reasons = [
        ...matchedTags.map((tag) => `Matches ${tag} intent`),
        card.annualFee === 0 ? "No annual fee" : `Annual fee is Rs ${card.annualFee}`,
        loungeScore(card) > 0
          ? card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited"
            ? "Unlimited lounge access listed"
            : `${loungeScore(card)} yearly lounge visits listed`
          : "No lounge access listed"
      ];

      return {
        card,
        estimatedAnnualRewards,
        estimatedNetValue: estimatedNetValue + tagBoost + loungeBoost,
        matchedTags,
        reasons
      };
    })
    .sort((a, b) => b.estimatedNetValue - a.estimatedNetValue);
}

export function answerFromCards(input: RecommendationInput) {
  const topCards = scoreCards(input).slice(0, 3);

  return {
    summary:
      topCards.length === 0
        ? "No card matched the selected constraints. Try increasing the annual fee limit or removing lounge/lifetime-free filters."
        : `${topCards[0].card.name} looks strongest for this query based on the current sample dataset.`,
    cards: topCards
  };
}
