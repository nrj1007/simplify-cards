import { cards, getCardById } from "./cards";
import { stripScoringAnnotations } from "./card-index";
import { getMeaningfulLoungeConditions, getTotalLoungeAccess } from "./lounge";
import type { CreditCard } from "./types";

// ---------------------------------------------------------------------------
// Pure, server-safe derivations for the card detail page. These read only
// existing CreditCard fields (no schema changes) and return null/empty when
// there isn't enough signal so the page can hide the section.
// ---------------------------------------------------------------------------

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function capitalizeFirst(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function joinNatural(parts: string[]) {
  const list = parts.filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list.at(-1)}`;
}

export function formatRupeesCompact(value: number) {
  if (value >= 100000) {
    const lakh = value / 100000;
    const formatted = Number.isInteger(lakh) ? `${lakh}` : lakh.toFixed(1);
    return `Rs ${formatted} lakh`;
  }
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function isCashbackCard(card: CreditCard) {
  return /cashback/i.test(card.rewardType);
}

function hasLounge(card: CreditCard) {
  const total = getTotalLoungeAccess(card);
  return total === "unlimited" || total > 0;
}

function loungeCountLabel(card: CreditCard) {
  const total = getTotalLoungeAccess(card);
  return total === "unlimited" ? "Unlimited" : `${total}`;
}

function hasRewardCaps(card: CreditCard) {
  return card.rewards.some((reward) => typeof reward.capMonthly === "number" && reward.capMonthly > 0);
}

function baseRewardRate(card: CreditCard) {
  return card.rewards.find((reward) => reward.category === "base")?.rate ?? 0;
}

// Highest-rate non-base reward (the card's headline accelerated category), if any.
function topAcceleratedReward(card: CreditCard) {
  const base = baseRewardRate(card);
  return card.rewards
    .filter((reward) => reward.category !== "base" && reward.rate > base)
    .sort((a, b) => b.rate - a.rate)[0];
}

const NOTABLE_EXCLUSIONS: Array<{ match: string; label: string }> = [
  { match: "fuel", label: "fuel" },
  { match: "rent", label: "rent" },
  { match: "utilities", label: "utilities" },
  { match: "insurance", label: "insurance" },
  { match: "wallet", label: "wallet loads" },
  { match: "education", label: "education" },
  { match: "government", label: "government spends" }
];

function notableExclusions(card: CreditCard) {
  const lower = card.exclusions.map((entry) => entry.toLowerCase());
  return NOTABLE_EXCLUSIONS.filter((category) => lower.some((entry) => entry.includes(category.match))).map(
    (category) => category.label
  );
}

// ---------------------------------------------------------------------------
// myCards take
// ---------------------------------------------------------------------------
export type CardTake = {
  goodFitIf: string;
  whyItWorks: string;
  whereValueDrops: string;
};

export function deriveTake(card: CreditCard): CardTake | null {
  const focuses = card.bestFor.slice(0, 3).map((entry) => entry.toLowerCase());
  const tail = isCashbackCard(card) ? "want straightforward cashback" : "will use reward points well";
  const goodFitIf = focuses.length
    ? `you want ${joinNatural(focuses)} value and ${tail}`
    : `you ${tail}`;

  const positives: string[] = [];
  if (hasLounge(card)) positives.push("complimentary airport lounge access");
  if (card.forexMarkup <= 2) positives.push(`a low ${card.forexMarkup}% forex markup`);
  const accel = topAcceleratedReward(card);
  if (accel) positives.push(`accelerated rewards on ${(accel.displayCategory ?? accel.category).toLowerCase()}`);
  if (card.milestoneBenefits?.length) positives.push("milestone rewards");
  if (card.annualFee === 0 && card.joiningFee === 0) positives.push("no annual fee");
  const whyItWorks = positives.length ? `${card.name} combines ${joinNatural(positives.slice(0, 3))}.` : "";

  const cautions: string[] = [];
  if (card.feeWaiverSpend && card.feeWaiverSpend > 0) {
    cautions.push(`the renewal fee needs ${formatRupeesCompact(card.feeWaiverSpend)} of annual spend to waive`);
  }
  const excl = notableExclusions(card);
  if (excl.length) cautions.push(`${joinNatural(excl.slice(0, 3))} don't earn rewards`);
  if (hasRewardCaps(card)) cautions.push("monthly reward caps apply on top categories");
  if (card.forexMarkup >= 3) cautions.push(`the ${card.forexMarkup}% forex markup is high for overseas use`);
  const whereValueDrops = cautions.length ? `${capitalizeFirst(joinNatural(cautions.slice(0, 3)))}.` : "";

  if (!whyItWorks && !whereValueDrops) return null;
  return { goodFitIf, whyItWorks, whereValueDrops };
}

// ---------------------------------------------------------------------------
// Best for / Avoid if
// ---------------------------------------------------------------------------
export type DecisionCard = { icon: string; title: string; desc: string };

function dedupeByTitle(items: DecisionCard[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });
}

export function deriveBestFor(card: CreditCard): DecisionCard[] {
  const out: DecisionCard[] = [];

  if (isCashbackCard(card)) {
    const top = card.rewards.find((reward) => reward.displayRate) ?? card.rewards[0];
    out.push({
      icon: "₹",
      title: "Best for simple cashback",
      desc: top?.displayRate
        ? `${top.displayRate} on ${(top.displayCategory ?? top.category).toLowerCase()}, auto-credited with no points to manage.`
        : "Direct cashback with no reward points to track or redeem."
    });
  } else {
    const top = topAcceleratedReward(card);
    if (top) {
      out.push({
        icon: "✦",
        title: `Best for ${titleCase(top.displayCategory ?? top.category)}`,
        desc: top.displayRate ?? `${top.rate} ${card.rewardType} per Rs 100 spent.`
      });
    }
  }

  if (hasLounge(card)) {
    out.push({
      icon: "✈",
      title: "Best for airport lounge access",
      desc: `${loungeCountLabel(card)} complimentary lounge visits a year across domestic and international.`
    });
  }

  if (card.forexMarkup <= 2) {
    out.push({
      icon: "↗",
      title: "Best for international spends",
      desc: `A low ${card.forexMarkup}% forex markup keeps overseas and forex transactions cheaper.`
    });
  }

  const focus = new Set([...card.bestFor, ...card.tags].map((entry) => entry.toLowerCase()));
  if (focus.has("travel")) {
    out.push({
      icon: "✦",
      title: "Best for travel and redemptions",
      desc: `Earns ${card.rewardType} you can put toward flights, hotels, or transfer partners.`
    });
  }

  if (card.annualFee === 0 && card.joiningFee === 0) {
    out.push({
      icon: "0",
      title: "Best as a no-fee everyday card",
      desc: "Lifetime-free, so there's no annual fee to recover before it adds value."
    });
  }

  return dedupeByTitle(out).slice(0, 4);
}

export function deriveAvoidIf(card: CreditCard): DecisionCard[] {
  const out: DecisionCard[] = [];

  if (card.forexMarkup >= 3.5) {
    out.push({
      icon: "↗",
      title: "Avoid for heavy international use",
      desc: `A ${card.forexMarkup}% forex markup is on the higher side for overseas spends.`
    });
  }

  if (card.annualFee >= 2000 && card.feeWaiverSpend && card.feeWaiverSpend > 0) {
    out.push({
      icon: "↓",
      title: "Avoid if your spend is low",
      desc: `The ${formatRupeesCompact(card.annualFee)} fee waives only at ${formatRupeesCompact(
        card.feeWaiverSpend
      )}/year, and some benefits can be spend-gated.`
    });
  }

  const excl = notableExclusions(card);
  if (excl.length >= 2) {
    out.push({
      icon: "⊘",
      title: `Avoid if you spend big on ${joinNatural(excl.slice(0, 3))}`,
      desc: "These categories are excluded and won't earn rewards."
    });
  }

  if (hasRewardCaps(card) && !isCashbackCard(card)) {
    out.push({
      icon: "≤",
      title: "Avoid if you expect uncapped rewards",
      desc: "Top reward categories are capped each month, so very high spends don't scale linearly."
    });
  }

  // Only surface the points-vs-cashback caveat when there isn't already strong signal,
  // so it stays a genuine decision point rather than filler.
  if (!isCashbackCard(card) && out.length < 2) {
    out.push({
      icon: "?",
      title: "Avoid if you want pure cashback",
      desc: "Simpler cashback cards exist if you'd rather not manage reward points."
    });
  }

  return dedupeByTitle(out).slice(0, 4);
}

// ---------------------------------------------------------------------------
// Lounge & milestone rules
// ---------------------------------------------------------------------------
export type CardRule = { label: string; text: string; conditions?: string[] };

function loungeValueLabel(value: number | "unlimited") {
  return value === "unlimited" ? "Unlimited" : `${value}`;
}

export function deriveLoungeMilestoneRules(card: CreditCard): CardRule[] {
  const rules: CardRule[] = [];

  if (card.combinedLoungeAccess !== undefined) {
    rules.push({
      label: card.combinedLoungeAccessLabel ?? "Lounge access",
      text: `${loungeValueLabel(card.combinedLoungeAccess)} visits per year.`,
      conditions: getMeaningfulLoungeConditions(card)
    });
  } else {
    if (card.loungeDomestic === "unlimited" || card.loungeDomestic > 0) {
      rules.push({
        label: "Domestic lounge",
        text: `${loungeValueLabel(card.loungeDomestic)} visits per year.`,
        conditions: getMeaningfulLoungeConditions(card, "domestic")
      });
    }
    if (card.loungeInternational === "unlimited" || card.loungeInternational > 0) {
      rules.push({
        label: "International lounge",
        text: `${loungeValueLabel(card.loungeInternational)} visits per year.`,
        conditions: getMeaningfulLoungeConditions(card, "international")
      });
    }
  }

  for (const benefit of card.milestoneBenefits ?? []) {
    if (/renewal fee|fee waiv|annual fee waiv/i.test(benefit)) continue;
    const text = stripScoringAnnotations(benefit);
    if (text) rules.push({ label: "Milestone", text });
  }

  if (card.feeWaiverSpend && card.feeWaiverSpend > 0) {
    rules.push({
      label: "Fee waiver",
      text: `Renewal fee waived on annual spends of ${formatRupeesCompact(card.feeWaiverSpend)}.`
    });
  }

  return rules;
}

// ---------------------------------------------------------------------------
// Exclusions & caps
// ---------------------------------------------------------------------------
export type ExclusionRow = { type: string; details: string; why: string };

export function deriveExclusionsAndCaps(card: CreditCard): ExclusionRow[] {
  const rows: ExclusionRow[] = [];

  if (card.exclusions.length) {
    rows.push({
      type: "Excluded spends",
      details: card.exclusions.join(", "),
      why: "These typically earn no rewards and may not count toward value."
    });
  }

  const cappedRules = (card.specialSpendRules ?? []).filter((rule) => rule.treatment === "capped");
  if (cappedRules.length) {
    rows.push({
      type: "Category caps",
      details: cappedRules.map((rule) => titleCase(rule.category)).join(", "),
      why: "Rewards on these categories are capped each month, so they don't scale with spend."
    });
  }

  if (hasRewardCaps(card)) {
    const caps = [
      ...new Set(
        card.rewards
          .filter((reward) => typeof reward.capMonthly === "number" && reward.capMonthly! > 0)
          .map((reward) => reward.capMonthly as number)
      )
    ].sort((a, b) => a - b);
    if (caps.length) {
      rows.push({
        type: "Reward caps",
        details: `Up to ${caps[caps.length - 1].toLocaleString("en-IN")} ${card.rewardType} per month on top categories`,
        why: "High spenders should account for monthly reward ceilings."
      });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Alternatives
// ---------------------------------------------------------------------------
function feeTier(fee: number) {
  if (fee === 0) return 0;
  if (fee <= 1000) return 1;
  if (fee <= 5000) return 2;
  if (fee <= 10000) return 3;
  return 4;
}

function rewardFamily(card: CreditCard) {
  return isCashbackCard(card) ? "cashback" : "points";
}

function overlapCount(left: string[], right: string[]) {
  const set = new Set(right.map((value) => value.toLowerCase()));
  return left.filter((value) => set.has(value.toLowerCase())).length;
}

export function findAlternativeCards(card: CreditCard): CreditCard[] {
  const curated = (card.alternativeCardIds ?? [])
    .map((id) => getCardById(id))
    .filter((candidate): candidate is CreditCard => Boolean(candidate) && candidate!.id !== card.id);
  if (curated.length) return curated.slice(0, 3);

  return cards
    .filter((candidate) => candidate.id !== card.id)
    .map((candidate) => {
      let score = 0;
      score += overlapCount(card.tags, candidate.tags) * 3;
      score += overlapCount(card.bestFor, candidate.bestFor) * 3;
      if (candidate.issuer === card.issuer) score += 2;
      if (feeTier(candidate.annualFee) === feeTier(card.annualFee)) score += 2;
      if (rewardFamily(candidate) === rewardFamily(card)) score += 1;
      return { card: candidate, score };
    })
    .filter((entry) => entry.score >= 4)
    .sort((a, b) => b.score - a.score || b.card.popularityScore - a.card.popularityScore)
    .slice(0, 3)
    .map((entry) => entry.card);
}

export function alternativeIntent(alt: CreditCard): string {
  if (isCashbackCard(alt)) return "For simple cashback";
  const focus = new Set([...alt.bestFor, ...alt.tags].map((entry) => entry.toLowerCase()));
  if (focus.has("travel")) return "For stronger travel value";
  if (hasLounge(alt)) return "For lounge access";
  if (alt.annualFee === 0 && alt.joiningFee === 0) return "For a no-fee option";
  return "Similar option";
}
