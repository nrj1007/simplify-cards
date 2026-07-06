import type { CreditCard, Milestone } from "./types";
import { stripScoringAnnotations } from "./card-index";
import { normalizeForMatch } from "./recommend-utils";
import { estimateFallbackPointUnitValue, estimatePointUnitValue, parseRupeeAmount, rewardLiquidityMultiplier } from "./recommend-scoring";

export function extractMilestoneThreshold(text: string) {
  const normalized = text.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
  const lakhMatch =
    normalized.match(/annual spend(?:s|ing)?(?: of| above| greater than)? (?:rs|₹)\s*(\d+(?:\.\d+)?) lakh(?:s)?/) ??
    normalized.match(/spend(?:s)? of (?:rs|₹)\s*(\d+(?:\.\d+)?) lakh(?:s)?/) ??
    normalized.match(/spending (?:rs|₹)\s*(\d+(?:\.\d+)?) lakh(?:s)?/) ??
    normalized.match(/(?:rs|₹)\s*(\d+(?:\.\d+)?) lakh(?:s)? or more/) ??
    normalized.match(/(?:rs|₹)\s*(\d+(?:\.\d+)?) lakh(?:s)?\s+(?:annual\s+)?spend/);

  if (lakhMatch) {
    return Math.round(Number(lakhMatch[1]) * 100000);
  }

  const numMatch =
    normalized.match(/(?:spends|spending|spend|spendings)(?: of| above| greater than| at| on)?(?: rs|₹)?\s*(\d{4,9})/) ??
    normalized.match(/(?:rs|₹)?\s*(\d{4,9}) or more(?: annual| quarterly| statement)? spend/) ??
    normalized.match(/spend (?:rs|₹)?\s*(\d{4,9})/);

  if (numMatch) {
    return Number(numMatch[1]);
  }

  return null;
}


export function estimateBenefitLineValue(card: CreditCard, benefit: string) {
  const normalizedMatch = normalizeForMatch(benefit);

  if (normalizedMatch.includes("fee waived") || normalizedMatch.includes("fee waiver") || normalizedMatch.includes("fee reversal")) {
    return 0;
  }

  let value = 0;
  const isVoucherBenefit = /\bvoucher(s)?\b/i.test(benefit);
  const normalized = benefit.toLowerCase();

  const voucherDiscount = 0.5;

  // "(rs|₹) X worth" — discounted when the line describes vouchers, full value otherwise
  for (const match of benefit.matchAll(/(?:rs|₹)\s*([\d,.]+(?:\.\d+)?)\s+worth/gi)) {
    const parsed = parseRupeeAmount(match[1]);
    if (parsed) value += isVoucherBenefit ? Math.round(parsed * voucherDiscount) : parsed;
  }

  // "voucher(s) worth (rs|₹) X" — always discounted
  for (const match of benefit.matchAll(/vouchers?\s+worth\s+(?:rs|₹)\s*([\d,.]+(?:\.\d+)?)/gi)) {
    const parsed = parseRupeeAmount(match[1]);
    if (parsed) value += Math.round(parsed * voucherDiscount);
  }

  // "(rs|₹) X voucher(s)" — always discounted
  for (const match of benefit.matchAll(/(?:rs|₹)\s*([\d,.]+(?:\.\d+)?)\s+vouchers?/gi)) {
    const parsed = parseRupeeAmount(match[1]);
    if (parsed) value += Math.round(parsed * voucherDiscount);
  }

  // "cashback of (rs|₹) X" — always full value
  for (const match of benefit.matchAll(/cashback of (?:rs|₹)\s*([\d,.]+(?:\.\d+)?)/gi)) {
    const parsed = parseRupeeAmount(match[1]);
    if (parsed) value += parsed;
  }

  // "worth (rs|₹) X" not preceded by "voucher(s)" — discounted when the line is a voucher benefit, full value otherwise
  for (const match of benefit.matchAll(/(?<!vouchers? )worth (?:rs|₹)\s*([\d,.]+(?:\.\d+)?)/gi)) {
    const parsed = parseRupeeAmount(match[1]);
    if (parsed) value += isVoucherBenefit ? Math.round(parsed * voucherDiscount) : parsed;
  }

  const pointValue = estimatePointUnitValue(card) || estimateFallbackPointUnitValue(card);
  if (pointValue > 0) {
    const pointPattern =
      /([\d,]+)\s+(?:bonus\s+|additional\s+)?(?:marriott bonvoy points|edge miles|membership rewards points|reward points|points)\b/gi;
    const matches = benefit.matchAll(pointPattern);
    for (const match of matches) {
      const points = Number(match[1].replace(/,/g, ""));
      if (!Number.isNaN(points) && points > 0) {
        value += Math.round(points * pointValue);
      }
    }

    const freeNightMatch = normalized.match(/free night award(?: valued at| redeemable .*? up to)? (\d[\d,]*) marriott bonvoy points/);
    if (freeNightMatch) {
      const points = Number(freeNightMatch[1].replace(/,/g, ""));
      if (!Number.isNaN(points) && points > 0) {
        value = Math.max(value, Math.round(points * pointValue));
      }
    }
  }

  return value;
}

export function estimateMilestoneLineValue(card: CreditCard, benefit: string) {
  return estimateBenefitLineValue(card, benefit);
}

export function milestoneValueForCard(card: CreditCard, annualSpend: number) {
  // Currency (non-voucher) milestones are paid in the card's reward currency, so a brand-locked
  // currency (e.g. IndiGo BluChips at 0.5) is worth proportionally less here too — apply the same
  // liquidity haircut as per-spend rewards. Vouchers are excluded: they're already net via the
  // voucher convention, and double-discounting them would understate their value.
  const liquidity = rewardLiquidityMultiplier(card);
  return milestoneRulesForCard(card).reduce((total, rule) => {
    if (annualSpend < rule.threshold) return total;
    return total + (rule.isVoucher ? rule.value : Math.round(rule.value * liquidity));
  }, 0);
}

export type MilestoneRule = {
  /** Annual spend (Rs) that unlocks this milestone; 0 means it always applies. */
  threshold: number;
  /** Estimated annual rupee value of the milestone, using the same logic as the recommender. */
  value: number;
  /** Human-readable benefit text. */
  label: string;
  /** Whether the benefit is a voucher. */
  isVoucher?: boolean;
  /** Period the milestone repeats over (display only; threshold/value are already annualized). */
  period?: Milestone["period"];
};

// Prefer reviewed structured milestones; fall back to parsing milestoneBenefits prose. Both paths
// yield annualized rules (annual spend gate + annual value) so every consumer reads one shape.
export function milestoneRulesForCard(card: CreditCard): MilestoneRule[] {
  const rules = card.milestones?.length
    ? structuredMilestoneRules(card.milestones)
    : textMilestoneRules(card);
  return rules.filter((rule) => rule.value > 0).sort((a, b) => a.threshold - b.threshold);
}

export function structuredMilestoneRules(milestones: Milestone[]): MilestoneRule[] {
  return milestones.map((milestone) => {
    // Annualize so a quarterly Rs 500 / Rs 50k milestone scores as 4 × per year, not once.
    const multiplier = milestone.period === "quarterly" ? 4 : milestone.period === "monthly" ? 12 : 1;
    return {
      threshold: milestone.threshold * multiplier,
      value: milestone.value * multiplier,
      label: milestone.label,
      isVoucher: milestone.kind === "voucher",
      period: milestone.period
    };
  });
}

export function textMilestoneRules(card: CreditCard): MilestoneRule[] {
  return (card.milestoneBenefits ?? []).map((benefit) => ({
    threshold: extractMilestoneThreshold(benefit) ?? 0,
    value: estimateMilestoneLineValue(card, benefit),
    label: stripScoringAnnotations(benefit),
    isVoucher: /\bvoucher(s)?\b/i.test(benefit)
  }));
}

export function joiningAndRenewalBenefitValueForCard(card: CreditCard) {
  // Prefer the structured valued fields; fall back to the text parse (+ additionalBenefits keyword
  // classification) for un-migrated cards. Each side is independent.
  let joiningValue: number;
  if (card.joiningBenefitsValued?.length) {
    joiningValue = card.joiningBenefitsValued.reduce((total, benefit) => total + benefit.value, 0);
  } else {
    const joiningLines = new Set<string>(card.joiningBenefits ?? []);
    for (const benefit of card.additionalBenefits ?? []) {
      const normalized = normalizeForMatch(benefit);
      // Renewal keywords take precedence (a renewal line is never counted as joining).
      if (
        !/\b(renewal|anniversary)\b/.test(normalized) &&
        /\b(joining|welcome|fee levy|fee realization|first year|within 90 days|card open date)\b/.test(normalized)
      ) {
        joiningLines.add(benefit);
      }
    }
    joiningValue = [...joiningLines].reduce((total, benefit) => total + estimateBenefitLineValue(card, benefit), 0);
  }

  let renewalValue: number;
  if (card.renewalBenefitsValued?.length) {
    renewalValue = card.renewalBenefitsValued.reduce((total, benefit) => total + benefit.value, 0);
  } else {
    const renewalLines = new Set<string>();
    for (const benefit of card.additionalBenefits ?? []) {
      if (/\b(renewal|anniversary)\b/.test(normalizeForMatch(benefit))) renewalLines.add(benefit);
    }
    renewalValue = [...renewalLines].reduce((total, benefit) => total + estimateBenefitLineValue(card, benefit), 0);
  }

  return { joiningValue, renewalValue };
}

// milestoneSpecialistBoost removed (redundant with estimatedNetValue/estimatedMilestoneValue)

