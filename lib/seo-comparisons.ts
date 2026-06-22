import type { Metadata } from "next";
import { deriveBestFor, formatRupeesCompact } from "./card-detail";
import { getCardById, stripScoringAnnotations } from "./cards";
import { getTotalLoungeAccess } from "./lounge";
import { buildCanonicalUrl, buildPageMetadata } from "./seo";
import type { CreditCard } from "./types";

export type SeoComparisonConfig = {
  slug: string;
  cardAId: string;
  cardBId: string;
  canonicalSlug?: string;
};

export const SEO_COMPARISONS: SeoComparisonConfig[] = [
  { slug: "axis-atlas-vs-hdfc-regalia-gold", cardAId: "axis-atlas", cardBId: "hdfc-regalia-gold" },
  { slug: "sbi-cashback-vs-hdfc-millennia", cardAId: "sbi-cashback", cardBId: "hdfc-millennia" },
  { slug: "sbi-cashback-vs-hdfc-swiggy", cardAId: "sbi-cashback", cardBId: "hdfc-swiggy" },
  { slug: "hsbc-travelone-vs-axis-atlas", cardAId: "hsbc-travelone", cardBId: "axis-atlas", canonicalSlug: "axis-atlas-vs-hsbc-travelone" },
  {
    slug: "hdfc-infinia-metal-vs-hdfc-diners-club-black-metal",
    cardAId: "hdfc-infinia-metal",
    cardBId: "hdfc-diners-club-black-metal"
  },
  { slug: "hdfc-regalia-gold-vs-hsbc-travelone", cardAId: "hdfc-regalia-gold", cardBId: "hsbc-travelone" },
  { slug: "axis-atlas-vs-hsbc-travelone", cardAId: "axis-atlas", cardBId: "hsbc-travelone" },
  { slug: "icici-amazon-pay-vs-sbi-cashback", cardAId: "icici-amazon-pay", cardBId: "sbi-cashback" },
  { slug: "axis-magnus-burgundy-vs-hdfc-infinia-metal", cardAId: "axis-magnus-burgundy", cardBId: "hdfc-infinia-metal" },
  { slug: "amex-platinum-travel-vs-axis-atlas", cardAId: "amex-platinum-travel", cardBId: "axis-atlas" }
];

export const SEO_COMPARISON_SLUGS = SEO_COMPARISONS.map((comparison) => comparison.slug);
export const INDEXABLE_SEO_COMPARISONS = SEO_COMPARISONS.filter((comparison) => !comparison.canonicalSlug);
export const INDEXABLE_SEO_COMPARISON_SLUGS = INDEXABLE_SEO_COMPARISONS.map((comparison) => comparison.slug);

export const SAFE_FALLBACK = "Check issuer terms before applying.";
export const BOTH_MISSING_FALLBACK = "Not clearly available in our current data.";
const EFFECTIVE_FEE_TIE_THRESHOLD = 100;

export function getSeoComparison(slug: string) {
  return SEO_COMPARISONS.find((comparison) => comparison.slug === slug);
}

export function getSeoComparisonCards(config: SeoComparisonConfig) {
  const cardA = getCardById(config.cardAId);
  const cardB = getCardById(config.cardBId);
  if (!cardA || !cardB) return null;
  return { cardA, cardB };
}

export function comparisonDisplayName(card: CreditCard) {
  return card.name.replace(/\s+Credit Card$/i, "").trim();
}

export function buildSeoComparisonMetadata(slug: string): Metadata {
  const config = getSeoComparison(slug);
  const cards = config ? getSeoComparisonCards(config) : null;
  if (!config || !cards) {
    return buildPageMetadata({
      title: "Credit Card Comparison",
      description: "Compare Indian credit cards by fees, rewards, benefits, and exclusions.",
      path: `/compare/${slug}`
    });
  }

  const nameA = comparisonDisplayName(cards.cardA);
  const nameB = comparisonDisplayName(cards.cardB);
  const title = `${nameA} vs ${nameB}: Fees, Rewards & Benefits Compared | SimplifyCards`;
  const description = `Compare ${nameA} and ${nameB} by fees, rewards, lounge access, forex charges, exclusions and best use case in India.`;
  const canonicalSlug = canonicalComparisonSlug(config);
  const metadata = buildPageMetadata({
    title,
    description,
    path: `/compare/${canonicalSlug}`
  });

  return {
    ...metadata,
    title: {
      absolute: title
    }
  };
}

function clean(value: string | undefined | null) {
  const stripped = stripScoringAnnotations(value ?? "").trim();
  return stripped || SAFE_FALLBACK;
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return BOTH_MISSING_FALLBACK;
  return value === 0 ? "Rs 0" : formatRupeesCompact(value);
}

function loungeLabel(value: CreditCard["loungeDomestic"] | CreditCard["loungeInternational"]) {
  return value === "unlimited" ? "Unlimited" : `${value} per year`;
}

export function totalLoungeLabel(card: CreditCard) {
  const total = getTotalLoungeAccess(card);
  return total === "unlimited" ? "Unlimited" : `${total} per year`;
}

function loungeScore(card: CreditCard) {
  const total = getTotalLoungeAccess(card);
  return total === "unlimited" ? 999 : total;
}

function isEffectivelySameFee(cardA: CreditCard, cardB: CreditCard) {
  return Math.abs(cardA.annualFee - cardB.annualFee) <= EFFECTIVE_FEE_TIE_THRESHOLD;
}

function isSameForex(cardA: CreditCard, cardB: CreditCard) {
  return cardA.forexMarkup === cardB.forexMarkup;
}

function isSameLounge(cardA: CreditCard, cardB: CreditCard) {
  return loungeScore(cardA) === loungeScore(cardB);
}

function rewardCapLabel(card: CreditCard, reward: CreditCard["rewards"][number]) {
  const capParts: string[] = [];
  const isCashback = card.rewardType.toLowerCase().includes("cashback");
  const capValue = (value: number) => (isCashback ? `Rs ${value.toLocaleString("en-IN")}` : `${value.toLocaleString("en-IN")} ${card.rewardType}`);
  if (reward.capDaily) capParts.push(`capped at ${capValue(reward.capDaily)}/day`);
  if (reward.capMonthly) capParts.push(`capped at ${capValue(reward.capMonthly)}/month`);
  if (reward.capStatementQuarter) capParts.push(`capped at ${capValue(reward.capStatementQuarter)}/statement quarter`);
  if (reward.postCapRate !== null && reward.postCapRate !== undefined) {
    capParts.push(`then ${reward.postCapRate} ${card.rewardType} / Rs 100`);
  }

  return capParts.length ? ` (${capParts.join(", ")})` : "";
}

function topRewardLines(card: CreditCard, count = 4) {
  return card.rewards.slice(0, count).map((reward) => {
    const rate = reward.displayRate ?? `${reward.rate} ${card.rewardType} / Rs 100`;
    return `${reward.displayCategory ?? reward.category}: ${rate}${rewardCapLabel(card, reward)}`;
  });
}

export function rewardSummary(card: CreditCard) {
  const rewards = topRewardLines(card, 3);
  return rewards.length ? rewards.join("; ") : SAFE_FALLBACK;
}

export function redemptionSummary(card: CreditCard) {
  const redemption = card.redemption;
  if (!redemption) {
    const autoCreditDetail = card.additionalDetails?.find((detail) => /auto|automatic|credit|statement/i.test(detail));
    return autoCreditDetail ? clean(autoCreditDetail) : BOTH_MISSING_FALLBACK;
  }

  const parts: string[] = [];
  if (typeof redemption.statementBalanceValue === "number") parts.push(`Statement balance: up to Rs ${redemption.statementBalanceValue} per point`);
  if (typeof redemption.airMilesValue === "number") parts.push(`Air miles: up to Rs ${redemption.airMilesValue} per point`);
  if (typeof redemption.travelEdgeValue === "number") parts.push(`Travel EDGE: up to Rs ${redemption.travelEdgeValue} per point`);
  if (typeof redemption.smartBuyFlightHotelValue === "number") parts.push(`SmartBuy flight/hotel: up to Rs ${redemption.smartBuyFlightHotelValue} per point`);
  if (typeof redemption.ecosystemValue === "number" && redemption.ecosystemLabel) {
    parts.push(`${redemption.ecosystemLabel}: up to Rs ${redemption.ecosystemValue} per point`);
  }
  if (redemption.airlinePartners?.length) parts.push(`${redemption.airlinePartners.length} airline transfer partners listed`);
  if (redemption.hotelPartners?.length) parts.push(`${redemption.hotelPartners.length} hotel transfer partners listed`);
  const autoCreditDetail = card.additionalDetails?.find((detail) => /auto|automatic|credit|statement/i.test(detail));
  if (autoCreditDetail && card.rewardType.toLowerCase().includes("cashback")) parts.push(clean(autoCreditDetail));

  return parts.length ? parts.join("; ") : BOTH_MISSING_FALLBACK;
}

function milestoneLines(card: CreditCard) {
  if (card.milestones?.length) return card.milestones.map((milestone) => clean(milestone.label));
  return (card.milestoneBenefits ?? []).map(clean);
}

export function milestoneSummary(card: CreditCard) {
  const lines = milestoneLines(card);
  return lines.length ? lines.slice(0, 4).join("; ") : BOTH_MISSING_FALLBACK;
}

export function exclusionsSummary(card: CreditCard) {
  return card.exclusions.length ? card.exclusions.slice(0, 5).map(clean).join("; ") : BOTH_MISSING_FALLBACK;
}

function firstBestFor(card: CreditCard) {
  const derived = deriveBestFor(card)[0];
  if (derived) return derived;
  if (card.bestFor.length) {
    return {
      title: card.bestFor.slice(0, 3).join(", "),
      desc: `${card.rewardType} card for ${card.bestFor.slice(0, 3).join(", ")}.`
    };
  }
  return null;
}

export function bestUseCase(card: CreditCard) {
  return firstBestFor(card)?.title ?? SAFE_FALLBACK;
}

export function keyBenefit(card: CreditCard) {
  return firstBestFor(card)?.desc ?? rewardSummary(card);
}

export function chooseReasons(card: CreditCard, other: CreditCard) {
  const reasons: string[] = [];
  if (!isEffectivelySameFee(card, other) && card.annualFee < other.annualFee) {
    reasons.push(`You prefer the lower listed annual fee (${formatCurrency(card.annualFee)}).`);
  }
  if (!isSameLounge(card, other) && loungeScore(card) > loungeScore(other)) {
    reasons.push(`You want more listed lounge access (${totalLoungeLabel(card)}).`);
  }
  if (!isSameForex(card, other) && card.forexMarkup < other.forexMarkup) {
    reasons.push(`You value the lower listed forex markup (${card.forexMarkup}%).`);
  }
  const useCase = firstBestFor(card);
  if (useCase) reasons.push(useCase.desc);
  if (reasons.length === 0 && card.bestFor.length) reasons.push(`Your priority matches ${card.bestFor.slice(0, 3).join(", ")}.`);
  if (reasons.length === 0) reasons.push(SAFE_FALLBACK);
  return reasons.slice(0, 4);
}

function sentenceToIfClause(reason: string) {
  const cleaned = reason.replace(/\.$/, "");
  return `${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`;
}

export function quickVerdict(cardA: CreditCard, cardB: CreditCard) {
  const reasonA = chooseReasons(cardA, cardB)[0];
  const reasonB = chooseReasons(cardB, cardA)[0];
  return `${comparisonDisplayName(cardA)} is easier to justify if ${sentenceToIfClause(reasonA)}. ${comparisonDisplayName(cardB)} is easier to justify if ${sentenceToIfClause(reasonB)}.`;
}

export function finalRecommendation(cardA: CreditCard, cardB: CreditCard) {
  const parts: string[] = [];
  const nameA = comparisonDisplayName(cardA);
  const nameB = comparisonDisplayName(cardB);
  const useCaseA = firstBestFor(cardA);
  const useCaseB = firstBestFor(cardB);

  if (useCaseA) parts.push(`Start with ${nameA} if ${sentenceToIfClause(useCaseA.desc)}.`);
  if (useCaseB) parts.push(`Choose ${nameB} if ${sentenceToIfClause(useCaseB.desc)}.`);

  if (isEffectivelySameFee(cardA, cardB)) {
    parts.push(`The listed annual fees are effectively tied (${formatCurrency(cardA.annualFee)} vs ${formatCurrency(cardB.annualFee)}), so fee alone should not decide this comparison.`);
  } else {
    const lowerFee = cardA.annualFee < cardB.annualFee ? cardA : cardB;
    parts.push(`${comparisonDisplayName(lowerFee)} has the lower listed annual fee.`);
  }

  if (isSameLounge(cardA, cardB)) {
    parts.push(loungeScore(cardA) === 0 ? "Neither card has a lounge-access advantage in the current data." : "Both cards show the same total lounge-access count in the current data.");
  } else {
    const strongerLounge = loungeScore(cardA) > loungeScore(cardB) ? cardA : cardB;
    parts.push(`${comparisonDisplayName(strongerLounge)} has more listed lounge access.`);
  }

  if (isSameForex(cardA, cardB)) {
    parts.push(`Both cards list the same ${cardA.forexMarkup}% forex markup.`);
  } else {
    const lowerForex = cardA.forexMarkup < cardB.forexMarkup ? cardA : cardB;
    parts.push(`${comparisonDisplayName(lowerForex)} has the lower listed forex markup.`);
  }

  parts.push("Verify issuer terms before applying.");
  return parts.join(" ");
}

export function loungeComparisonSummary(cardA: CreditCard, cardB: CreditCard) {
  const scoreA = loungeScore(cardA);
  const scoreB = loungeScore(cardB);
  const nameA = comparisonDisplayName(cardA);
  const nameB = comparisonDisplayName(cardB);
  const tieredNotes = [cardA, cardB]
    .map((card) => {
      const notes = card.lounge?.combined ?? card.lounge?.domestic ?? card.lounge?.international;
      return notes?.length ? `${comparisonDisplayName(card)}: ${notes.join(" ")}` : null;
    })
    .filter((note): note is string => Boolean(note));

  const summary =
    scoreA === 0 && scoreB === 0
      ? `Both ${nameA} and ${nameB} do not offer complimentary lounge visits in the current card data.`
      : scoreA === scoreB
        ? `Both cards show the same total lounge-access count in the current data: ${totalLoungeLabel(cardA)}.`
        : `${scoreA > scoreB ? nameA : nameB} shows more listed lounge access in the current card data.`;

  return tieredNotes.length ? `${summary} ${tieredNotes.join(" ")}` : summary;
}

export function forexComparisonSummary(cardA: CreditCard, cardB: CreditCard) {
  const nameA = comparisonDisplayName(cardA);
  const nameB = comparisonDisplayName(cardB);

  if (isSameForex(cardA, cardB)) {
    return `Both ${nameA} and ${nameB} list a ${cardA.forexMarkup}% forex markup. Forex charges are tied in the current card data.`;
  }

  const lowerForex = cardA.forexMarkup < cardB.forexMarkup ? cardA : cardB;
  return `${nameA} lists a ${cardA.forexMarkup}% forex markup. ${nameB} lists a ${cardB.forexMarkup}% forex markup. ${comparisonDisplayName(lowerForex)} has the lower listed forex markup.`;
}

export function rewardsComparisonSummary(card: CreditCard) {
  const rewardText = keyBenefit(card);
  const redemption = redemptionSummary(card);
  const currencyNote = card.rewardType.toLowerCase().includes("cashback")
    ? "Cashback value is easier to compare because it is near-cash in the current data."
    : "Reward value depends on the redemption path and transfer or portal assumptions in the current data.";

  return `${rewardText} ${currencyNote} Redemption: ${redemption}`;
}

export function canonicalComparisonSlug(config: SeoComparisonConfig) {
  return config.canonicalSlug ?? config.slug;
}

export function isIndexableComparison(config: SeoComparisonConfig) {
  return canonicalComparisonSlug(config) === config.slug;
}

export function canonicalSeoComparison(config: SeoComparisonConfig) {
  return getSeoComparison(canonicalComparisonSlug(config)) ?? config;
}

export function comparisonRows(cardA: CreditCard, cardB: CreditCard) {
  const rows = [
    ["Issuer", cardA.issuer, cardB.issuer],
    ["Network", cardA.network.join(", ") || BOTH_MISSING_FALLBACK, cardB.network.join(", ") || BOTH_MISSING_FALLBACK],
    ["Joining fee", formatCurrency(cardA.joiningFee), formatCurrency(cardB.joiningFee)],
    ["Annual fee", formatCurrency(cardA.annualFee), formatCurrency(cardB.annualFee)],
    [
      "Fee waiver spend",
      cardA.feeWaiverSpend ? formatCurrency(cardA.feeWaiverSpend) : BOTH_MISSING_FALLBACK,
      cardB.feeWaiverSpend ? formatCurrency(cardB.feeWaiverSpend) : BOTH_MISSING_FALLBACK
    ],
    ["Best use case", bestUseCase(cardA), bestUseCase(cardB)],
    ["Reward type", cardA.rewardType || BOTH_MISSING_FALLBACK, cardB.rewardType || BOTH_MISSING_FALLBACK],
    ["Top rewards", rewardSummary(cardA), rewardSummary(cardB)],
    ["Domestic lounge", loungeLabel(cardA.loungeDomestic), loungeLabel(cardB.loungeDomestic)],
    ["International lounge", loungeLabel(cardA.loungeInternational), loungeLabel(cardB.loungeInternational)],
    ["Forex markup", `${cardA.forexMarkup}%`, `${cardB.forexMarkup}%`],
    ["Milestone benefits", milestoneSummary(cardA), milestoneSummary(cardB)],
    ["Redemption", redemptionSummary(cardA), redemptionSummary(cardB)],
    ["Key exclusions", exclusionsSummary(cardA), exclusionsSummary(cardB)]
  ];

  return rows.map(([label, valueA, valueB]) => ({ label, valueA, valueB }));
}

export function comparisonFaqs(cardA: CreditCard, cardB: CreditCard) {
  const nameA = comparisonDisplayName(cardA);
  const nameB = comparisonDisplayName(cardB);
  return [
    {
      q: `Which card has the lower annual fee: ${nameA} or ${nameB}?`,
      a:
        cardA.annualFee === cardB.annualFee
          ? `Both cards list the same annual fee in our current data: ${formatCurrency(cardA.annualFee)}.`
          : `${cardA.annualFee < cardB.annualFee ? nameA : nameB} lists the lower annual fee in our current data.`
    },
    {
      q: `Which card is better for lounge access?`,
      a:
        loungeScore(cardA) === loungeScore(cardB)
          ? `Both cards show similar total lounge access in our current data. Check domestic, international, guest, and spend-condition details before deciding.`
          : `${loungeScore(cardA) > loungeScore(cardB) ? nameA : nameB} lists more total lounge access in our current data.`
    },
    {
      q: `Which card has lower forex markup?`,
      a:
        cardA.forexMarkup === cardB.forexMarkup
          ? `Both cards list a ${cardA.forexMarkup}% forex markup in our current data.`
          : `${cardA.forexMarkup < cardB.forexMarkup ? nameA : nameB} lists the lower forex markup in our current data.`
    },
    {
      q: "Do affiliate links affect this comparison?",
      a: "No. The comparison uses existing card data. Apply links may be affiliate links, but they do not change the displayed fees, rewards, or limitations."
    },
    {
      q: "What should I verify before applying?",
      a: "Check issuer terms for latest fees, eligibility, reward caps, lounge rules, exclusions, and redemption options before applying."
    }
  ];
}

export function relatedComparisons(slug: string, limit = 5) {
  const current = getSeoComparison(slug);
  if (!current) return INDEXABLE_SEO_COMPARISONS.filter((item) => item.slug !== slug).slice(0, limit);

  const related = INDEXABLE_SEO_COMPARISONS.filter((item) => item.slug !== canonicalComparisonSlug(current)).sort((a, b) => {
    const scoreA = Number(a.cardAId === current.cardAId || a.cardBId === current.cardAId || a.cardAId === current.cardBId || a.cardBId === current.cardBId);
    const scoreB = Number(b.cardAId === current.cardAId || b.cardBId === current.cardAId || b.cardAId === current.cardBId || b.cardBId === current.cardBId);
    return scoreB - scoreA;
  });

  return related.slice(0, limit);
}

export function comparisonsForCard(cardId: string, limit = 4) {
  return INDEXABLE_SEO_COMPARISONS.filter((comparison) => comparison.cardAId === cardId || comparison.cardBId === cardId).slice(0, limit);
}

export function comparisonTitle(config: SeoComparisonConfig) {
  const cards = getSeoComparisonCards(config);
  if (!cards) return config.slug;
  return `${comparisonDisplayName(cards.cardA)} vs ${comparisonDisplayName(cards.cardB)}`;
}

export function comparisonUrl(slug: string) {
  return buildCanonicalUrl(`/compare/${slug}`);
}

export function comparisonLastUpdated(cardA: CreditCard, cardB: CreditCard) {
  return comparisonLastModifiedDate(cardA, cardB).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function comparisonLastModifiedDate(cardA: CreditCard, cardB: CreditCard) {
  const dates = [cardA.lastVerified, cardB.lastVerified]
    .map((value) => (value ? new Date(value) : null))
    .filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  return dates[0] ?? new Date();
}
