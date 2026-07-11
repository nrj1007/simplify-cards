"use client";

import { type CSSProperties, type ReactNode, useMemo, useRef, useState } from "react";
import { ChevronDown, Gift, Trophy, TrendingUp } from "lucide-react";
import type { CreditCard, SpendCategory } from "@/lib/types";
import type { MilestoneRule } from "@/lib/recommend";
import {
  equitasPrivilegeTierForMonthlySpend,
  equitasPrivilegeTierNote,
  isEquitasPrivilegeCard
} from "@/lib/equitas-privilege";
import {
  CATEGORY_LABELS,
  calculatorBucketsForCard,
  moreCategoriesForCard,
  calculateRewardsByBucket
} from "@/lib/reward-calculator";

type Props = {
  card: CreditCard;
  milestones?: MilestoneRule[];
  picker?: ReactNode;
  variant?: "compact" | "calculator";
};

const DEFAULT_SPEND: Partial<Record<SpendCategory, number>> = {
  online: 15000,
  dining: 4000,
  travel: 5000,
  hotels: 4000,
  airlines: 5000,
  fuel: 3000,
  grocery: 5000,
  utilities: 3000,
  upi: 5000,
  amazon: 5000,
  international: 5000,
  base: 8000,
  rent: 5000,
  insurance: 2000,
  education: 3000,
  gold: 2000,
  government: 2000
};

const SLIDER_MAX = 200_000;
const SLIDER_STEP = 500;

function formatINR(value: number) {
  return `₹ ${Math.round(value).toLocaleString("en-IN")}`;
}

function formatINRCompact(value: number) {
  const v = Math.round(value);
  if (v >= 100000) {
    const lakhs = v / 100000;
    const formatted = lakhs % 1 === 0 ? `${lakhs}` : lakhs.toFixed(1);
    return `₹ ${formatted}L`;
  }
  return `₹ ${v.toLocaleString("en-IN")}`;
}

function formatUnits(value: number) {
  return Math.round(value).toLocaleString("en-IN");
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function isCashbackRewardType(rewardType: string) {
  return /cashback/i.test(rewardType) && !/point|mile|coin|star|credit|neucoin/i.test(rewardType);
}

function milestonePrimaryValue(rule: MilestoneRule) {
  if (rule.isVoucher) {
    const voucherEachMatch =
      rule.label.match(/vouchers?\s+worth\s+rs\s+([\d,]+(?:\.\d+)?)\s+each/i) ??
      rule.label.match(/rs\s+([\d,]+(?:\.\d+)?)\s+vouchers?/i) ??
      rule.label.match(/worth\s+rs\s+([\d,]+(?:\.\d+)?)/i);
    if (!voucherEachMatch) return null;

    const amount = Number(voucherEachMatch[1].replace(/,/g, ""));
    if (Number.isNaN(amount) || amount <= 0) return null;
    return `${formatINR(amount)} voucher`;
  }

  const match = rule.label.match(
    /([\d,]+)\s+(?:bonus\s+|additional\s+)?(membership rewards points|marriott bonvoy points|edge miles|reward points|points)\b/i
  );
  if (!match) return null;

  const amount = Number(match[1].replace(/,/g, ""));
  if (Number.isNaN(amount) || amount <= 0) return null;

  const unit = match[2].toLowerCase();
  if (unit === "membership rewards points") {
    return `${amount.toLocaleString("en-IN")} MR points`;
  }
  if (unit === "marriott bonvoy points") {
    return `${amount.toLocaleString("en-IN")} Marriott points`;
  }
  if (unit === "edge miles") {
    return `${amount.toLocaleString("en-IN")} EDGE Miles`;
  }
  if (unit === "reward points") {
    return `${amount.toLocaleString("en-IN")} Reward Points`;
  }
  return `${amount.toLocaleString("en-IN")} points`;
}

type RupeeOption = { key: string; label: string; perPoint: number; value: number; note?: string };

export default function RewardCalculator({ card, milestones = [], picker, variant = "compact" }: Props) {
  const buckets = useMemo(() => calculatorBucketsForCard(card), [card]);
  const moreCats = useMemo(() => moreCategoriesForCard(card), [card]);
  const redemptionScrollerRef = useRef<HTMLDivElement>(null);

  const [showAdditional, setShowAdditional] = useState(false);
  const [showAllRedeem, setShowAllRedeem] = useState(false);
  const [spend, setSpend] = useState<Record<string, number>>(() => {
    const initial = {} as Record<string, number>;
    const b = calculatorBucketsForCard(card);
    const m = moreCategoriesForCard(card);
    for (const bucket of b) {
      if (bucket.id === "base") {
        initial[bucket.id] = 8000;
      } else if (bucket.id in DEFAULT_SPEND) {
        initial[bucket.id] = DEFAULT_SPEND[bucket.id as SpendCategory] ?? 5000;
      } else {
        initial[bucket.id] = 5000;
      }
    }
    for (const cat of m) {
      initial[cat] = 0;
    }
    return initial;
  });

  const result = useMemo(() => calculateRewardsByBucket(card, spend), [card, spend]);

  const totalMonthlySpend = useMemo(() => {
    return Object.values(spend).reduce((sum, value) => sum + value, 0);
  }, [spend]);
  const annualSpend = totalMonthlySpend * 12;
  const equitasPrivilegeTier = isEquitasPrivilegeCard(card)
    ? equitasPrivilegeTierForMonthlySpend(totalMonthlySpend)
    : null;
  const { annualUnits } = result;

  const cashback = isCashbackRewardType(card.rewardType);
  const unitLabel = cashback ? "cashback" : titleCase(card.rewardType);
  const redemption = card.redemption;

  // Rupee-valued redemption avenues, sorted best-first.
  const rupeeOptions = useMemo<RupeeOption[]>(() => {
    const options: RupeeOption[] = [];
    const push = (key: string, label: string, perPoint: number | undefined | null, note?: string) => {
      if (typeof perPoint !== "number" || perPoint <= 0) return;
      options.push({ key, label, perPoint, value: annualUnits * perPoint, note });
    };

    if (cashback) {
      push("cashback", "Statement cashback", redemption?.statementBalanceValue ?? 1);
    } else {
      let flightHotelLabel = "Flight/hotel booking";
      let catalogueLabel = "Rewards catalogue";
      if (card.issuer === "HDFC Bank") {
        flightHotelLabel = "SmartBuy flights & hotels";
        catalogueLabel = "SmartBuy rewards catalogue";
      } else if (card.issuer === "ICICI Bank") {
        flightHotelLabel = "iShop flights & hotels";
        catalogueLabel = "iShop rewards catalogue";
      } else if (card.issuer === "SBI Card") {
        flightHotelLabel = "Travel portal booking";
        catalogueLabel = "Shop & Smile catalogue";
      }

      push("ecosystem", redemption?.ecosystemLabel ?? "Brand ecosystem", redemption?.ecosystemValue);
      push("statement", "Statement credit", redemption?.statementBalanceValue);
      push("smartbuy-flight", flightHotelLabel, redemption?.smartBuyFlightHotelValue);
      push("smartbuy-catalogue", catalogueLabel, redemption?.smartBuyCatalogueValue);
      push("travel-edge", "Travel EDGE flights & hotels", redemption?.travelEdgeValue);
      // Accor is surfaced via transferPartnerValuations (with its transfer ratio), not the
      // legacy flat accorValue, to avoid double-listing it in the calculator.
    }

    return options.sort((a, b) => b.value - a.value);
  }, [annualUnits, cashback, redemption, card.issuer]);

  // Rupee value of one point when transferred to air miles (airMilesValue is a ₹ value, e.g. 0.6).
  const airMilesRupeePerPoint = !cashback && typeof redemption?.airMilesValue === "number" && redemption.airMilesValue > 0
    ? redemption.airMilesValue
    : null;
  // Partner points/miles earned per card point — the transfer RATIO (not the rupee value). Best ratio
  // across BOTH airline transfers (airlinePartners "2:1" = 0.5/point) AND hotel/point-program
  // transfers (transferPartnerValuations, e.g. Marriott 1:1 = 1/point). Default 1:1 when none listed.
  const airMilesPerPoint = useMemo(() => {
    if (!airMilesRupeePerPoint) return null;
    const airlineRatios = (redemption?.airlinePartners ?? [])
      .map((partner) => {
        const match = /^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/.exec(partner.ratio ?? "");
        return match && Number(match[1]) > 0 ? Number(match[2]) / Number(match[1]) : null;
      })
      .filter((ratio): ratio is number => ratio != null && ratio > 0);
    const partnerRatios = (redemption?.transferPartnerValuations ?? [])
      .map((partner) => partner.transferRatio)
      .filter((ratio): ratio is number => typeof ratio === "number" && ratio > 0);
    const allRatios = [...airlineRatios, ...partnerRatios];
    return allRatios.length ? Math.max(...allRatios) : (redemption?.airMilesValue ?? 1);
  }, [airMilesRupeePerPoint, redemption]);

  const partnerValuations = useMemo(() => {
    return (redemption?.transferPartnerValuations ?? [])
      .map((partner) => {
        // valuePerCardUnit = ₹ per card reward unit, correctly applying the transfer ratio.
        // e.g. ₹2.2/Accor pt × 2 Accor pts/EDGE Mile = ₹4.4/EDGE Mile
        const valuePerCardUnit = partner.partnerPointValue * partner.transferRatio;
        return { ...partner, valuePerCardUnit, value: annualUnits * valuePerCardUnit };
      })
      .sort((a, b) => b.value - a.value);
  }, [annualUnits, redemption]);

  const voucherValuations = useMemo(() => {
    return (redemption?.voucherRedemptions ?? [])
      .map((voucher) => {
        return { ...voucher, value: annualUnits * voucher.valuePerPoint };
      })
      .sort((a, b) => b.value - a.value);
  }, [annualUnits, redemption]);

  // One unified, rupee-ranked view of every way to redeem (direct / transfer / voucher), so the
  // user sees a single best-to-worst comparison instead of three separate blocks.
  const unitLower = unitLabel.toLowerCase();
  const redeemRows = useMemo<Array<{ key: string; label: string; type: "direct" | "transfer" | "voucher"; rate: string; value: number }>>(() => {
    const rows: Array<{ key: string; label: string; type: "direct" | "transfer" | "voucher"; rate: string; value: number }> = [];
    for (const option of rupeeOptions) {
      rows.push({ key: `direct-${option.key}`, label: option.label, type: "direct", rate: `₹ ${option.perPoint} / ${unitLower}`, value: option.value });
    }
    for (const partner of partnerValuations) {
      rows.push({
        key: `transfer-${partner.partner}`,
        label: partner.partner,
        type: "transfer",
        rate: `₹ ${partner.valuePerCardUnit.toFixed(2)} / ${unitLower}`,
        value: partner.value
      });
    }
    for (const voucher of voucherValuations) {
      rows.push({
        key: `voucher-${voucher.partner}-${voucher.programme}`,
        label: `${voucher.partner} — ${voucher.programme}`,
        type: "voucher",
        rate: `₹ ${voucher.valuePerPoint} / ${unitLower}`,
        value: voucher.value
      });
    }
    return rows.sort((a, b) => b.value - a.value);
  }, [rupeeOptions, partnerValuations, voucherValuations, unitLower]);
  const visibleRedeemRows = showAllRedeem ? redeemRows : redeemRows.slice(0, 3);
  const topRatePerUnit = redeemRows.length > 0 && annualUnits > 0 ? redeemRows[0].value / annualUnits : null;
  const totalRedeemRows = redeemRows.length + (airMilesPerPoint ? 1 : 0);
  const hasClearBest =
    totalRedeemRows >= 2 &&
    redeemRows.length > 0 &&
    (redeemRows.length === 1 || redeemRows[0].value > redeemRows[1].value) &&
    !(airMilesRupeePerPoint && topRatePerUnit !== null && topRatePerUnit === airMilesRupeePerPoint);

  // Best rupee outcome across direct redemptions, valued transfer partners, and vouchers.
  const bestRupeeValue = Math.max(
    rupeeOptions[0]?.value ?? 0,
    partnerValuations[0]?.value ?? 0,
    voucherValuations[0]?.value ?? 0
  );

  // Milestone benefits unlocked at the current annual spend (thresholds are spend-independent,
  // computed server-side; here we just credit the ones this spend reaches).
  const earnedMilestones = useMemo(
    () => milestones.filter((rule) => annualSpend >= rule.threshold),
    [milestones, annualSpend]
  );
  const { earnedNonVoucherMilestoneValue, earnedVoucherValue } = useMemo(() => {
    let nonVoucher = 0;
    let voucher = 0;
    for (const rule of earnedMilestones) {
      if (rule.isVoucher) {
        voucher += rule.value;
      } else {
        nonVoucher += rule.value;
      }
    }
    return { earnedNonVoucherMilestoneValue: nonVoucher, earnedVoucherValue: voucher };
  }, [earnedMilestones]);

  const nextMilestone = useMemo(
    () => milestones.filter((rule) => rule.threshold > annualSpend).sort((a, b) => a.threshold - b.threshold)[0] ?? null,
    [milestones, annualSpend]
  );

  // The card's points/cashback are worth this much in rupees at the best redemption; milestones
  // add rupee value on top, so the headline shows the combined annual value.
  const pointsRupeeValue = cashback ? annualUnits : bestRupeeValue;
  const totalAnnualValue = pointsRupeeValue + earnedNonVoucherMilestoneValue;
  const totalReturnsPlusVoucher = totalAnnualValue + earnedVoucherValue;
  const effectiveRate = annualSpend > 0 && totalReturnsPlusVoucher > 0 ? (totalReturnsPlusVoucher / annualSpend) * 100 : 0;

  const earnRows = result.rows.filter((row) => row.monthlySpend > 0);
  const hasExcluded = earnRows.some((row) => row.excluded);
  const allCalculatorCategories = useMemo(
    () => [
      ...buckets.map((bucket) => ({ id: bucket.id, label: bucket.label, displayRate: bucket.displayRate }))
    ],
    [buckets]
  );

  const netAnnualValue = totalReturnsPlusVoucher - result.annualSurcharge;
  const calculatorNote = equitasPrivilegeTier ? equitasPrivilegeTierNote(equitasPrivilegeTier) : null;

  function setCategory(category: string, value: number) {
    const nextValue = Math.max(0, Math.min(SLIDER_MAX, Math.round(value / SLIDER_STEP) * SLIDER_STEP));
    setSpend((prev) => ({ ...prev, [category]: nextValue }));
  }

  function setCategoryFromText(category: string, value: string) {
    const numeric = Number(value.replace(/[^0-9]/g, ""));
    setCategory(category, Number.isFinite(numeric) ? numeric : 0);
  }

  function sliderStyle(value: number): CSSProperties {
    return { "--range-progress": `${Math.min(100, Math.max(0, (value / SLIDER_MAX) * 100))}%` } as CSSProperties;
  }

  function controlId(category: string, suffix = "") {
    return `calc-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}${suffix}`;
  }

  function scrollRedemptions(direction: "previous" | "next") {
    redemptionScrollerRef.current?.scrollBy({
      behavior: "smooth",
      left: direction === "previous" ? -320 : 320
    });
  }

  if (variant === "calculator") {
    const monthlyNextMilestone = nextMilestone ? Math.ceil(nextMilestone.threshold / 12) : null;
    const monthlyProgressTarget = monthlyNextMilestone && monthlyNextMilestone > 0 ? monthlyNextMilestone : totalMonthlySpend || 1;
    const milestoneProgress = Math.max(0, Math.min(100, (totalMonthlySpend / monthlyProgressTarget) * 100));
    const earnedMilestone = earnedMilestones[earnedMilestones.length - 1] ?? null;
    const currentMilestoneTitle = earnedMilestone ? (milestonePrimaryValue(earnedMilestone) ?? formatINR(earnedMilestone.value)) : "Milestone rewards";
    const nextMilestoneTitle = nextMilestone ? (milestonePrimaryValue(nextMilestone) ?? formatINR(nextMilestone.value)) : "All milestones unlocked";
    const forecastUnitLabel = cashback ? "cashback/year" : "reward points/year";
    const allRedemptionCards = [
      ...redeemRows.map((row, index) => ({ ...row, best: hasClearBest && index === 0 })),
      ...(airMilesPerPoint && airMilesRupeePerPoint
        ? [
            {
              best: false,
              key: "airmiles",
              label: "Transfer to airline miles / hotel points",
              rate: `${airMilesPerPoint} / ${unitLower} = ${formatINR(annualUnits * airMilesRupeePerPoint)}`,
              type: "miles" as const,
              value: annualUnits * airMilesPerPoint
            }
          ]
        : [])
    ];

    return (
      <div className="calc calculator-layout-shell">
        <div className="calc-grid calculator-recommend-layout">
          <div className="calc-inputs spend-profile recommend-controls">
            <div className="spend-profile-head recommend-controls-head card-picker-head">
              <h2>Pick card of your choice</h2>
            </div>
            {picker}

            <div className="spend-profile-head recommend-controls-head moved-before-total">
              <h2>Spend profile</h2>
            </div>
            <div className="calc-total recommend-total">
              <div>
                <strong>{formatINRCompact(totalMonthlySpend)}</strong>
                <span>per month</span>
              </div>
              <div>
                <strong>{formatINRCompact(annualSpend)}</strong>
                <span>per year</span>
              </div>
            </div>

            <div className="calc-sliders recommend-sliders">
              {allCalculatorCategories.map((category) => {
                const excluded = result.rows.find((row) => row.category === category.id)?.excluded ?? false;
                const value = spend[category.id] ?? 0;
                return (
                  <div className="slider-row spend-row" key={category.id}>
                    <div className="slider-main">
                      <div className="slider-head">
                        <label htmlFor={controlId(category.id)}>
                          <span className="slider-label-text">{category.label}</span>
                          {(category.displayRate || (excluded && value > 0)) && (
                            <span className="slider-tags">
                              {category.displayRate ? <span className="calc-tag">{category.displayRate}</span> : null}
                              {excluded && value > 0 ? <span className="calc-tag calc-tag-excluded">not rewarded</span> : null}
                            </span>
                          )}
                        </label>
                      </div>
                      <input
                        className="slider"
                        id={controlId(category.id)}
                        max={SLIDER_MAX}
                        min={0}
                        step={SLIDER_STEP}
                        style={sliderStyle(value)}
                        type="range"
                        value={value}
                        onChange={(event) => setCategory(category.id, Number(event.target.value))}
                      />
                    </div>
                    <label className="spend-amount-pill" htmlFor={controlId(category.id, "-amount")}>
                      <span>₹</span>
                      <input
                        aria-label={`${category.label} monthly spend`}
                        className="spend-amount-input"
                        id={controlId(category.id, "-amount")}
                        inputMode="numeric"
                        type="text"
                        value={Math.round(value).toLocaleString("en-IN")}
                        onChange={(event) => setCategoryFromText(category.id, event.target.value)}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <p className="spend-profile-note">
              Note: Categories not listed are treated as issuer-excluded and earn no rewards
            </p>
          </div>

          <div className="calc-output recommend-results-panel calculator-results-panel">
            <div className="section-head recommend-results-head calculator-results-head">
              <div>
                <h2>Reward forecast</h2>
              </div>
            </div>

            <div className="calc-headline reward-forecast-card">
              <div className="calc-headline-main forecast-main">
                <span className="calc-headline-label forecast-kicker">You earn</span>
                <div className="forecast-score-row">
                  <strong className="calc-headline-units forecast-score">
                    {formatUnits(annualUnits)} <span className="forecast-unit">{forecastUnitLabel}</span>
                  </strong>
                </div>
              </div>
              <div className="calc-headline-aside forecast-value-card">
                <span className="forecast-value-label">
                  {result.annualSurcharge > 0 ? "Net annual value" : "Best redemption value"}
                </span>
                <strong className="forecast-value">
                  <span className="forecast-currency-symbol">₹</span>
                  <span className="forecast-currency-amount">
                    {Math.round(result.annualSurcharge > 0 ? netAnnualValue : totalReturnsPlusVoucher).toLocaleString("en-IN")}
                  </span>
                </strong>
                <span className="forecast-value-subtitle">
                  {result.annualSurcharge > 0
                    ? `${formatINR(totalReturnsPlusVoucher)} gross minus ${formatINR(result.annualSurcharge)} fees`
                    : cashback
                      ? "Cashback value from your spends"
                      : "Max value from your points"}
                </span>
                <div className="forecast-mini-grid">
                  <span className="forecast-stat">
                    <Trophy className="forecast-stat-icon" size={16} aria-hidden="true" />
                    <b>{formatINR(earnedNonVoucherMilestoneValue + earnedVoucherValue)}</b>
                    milestone benefit
                  </span>
                  <i aria-hidden="true" className="forecast-stat-separator" />
                  <span className="forecast-stat">
                    <TrendingUp className="forecast-stat-icon" size={16} aria-hidden="true" />
                    <b>{effectiveRate.toFixed(1)}%</b>
                    effective return
                  </span>
                </div>
              </div>
            </div>

            {calculatorNote ? <p className="calc-tier-note calculator-critical-note">{calculatorNote}</p> : null}

            {annualUnits <= 0 ? (
              <p className="muted calc-empty">Set your monthly spend on the left to see what this card earns.</p>
            ) : (
              <>
                {milestones.length > 0 ? (
                  <>
                  <div className="section-head recommend-results-head calculator-results-head milestone-results-head">
                    <div>
                      <h2>Milestone rewards</h2>
                    </div>
                  </div>
                  <section
                    className="milestone-progress-section"
                    aria-labelledby="milestone-progress-title"
                    style={{ "--milestone-progress": `${milestoneProgress}%` } as CSSProperties}
                  >
                    <header className="milestone-progress-head">
                      <h3 id="milestone-progress-title">Milestone rewards</h3>
                      <p>Earn more when you spend more</p>
                    </header>
                    <div
                      className="milestone-journey"
                      aria-label={`Progress toward next milestone is ${Math.round(milestoneProgress)} percent.`}
                    >
                      <div className="milestone-node milestone-node-current">
                        <span className="milestone-you-are-here">You are here</span>
                        <span className="milestone-circle">1</span>
                        <span className="milestone-status milestone-status-unlocked">
                          {earnedMilestone ? "Unlocked" : "In progress"}
                        </span>
                        <strong className="milestone-node-title">Milestone 1</strong>
                        <small className="milestone-node-threshold">Spend {formatINR(totalMonthlySpend)}/month</small>
                      </div>

                      <div className="milestone-track" aria-hidden="true">
                        <span className="milestone-track-fill" />
                      </div>

                      <div className="milestone-node milestone-node-next">
                        <span className="milestone-circle">2</span>
                        <span className="milestone-status milestone-status-placeholder" aria-hidden="true">
                          Upcoming
                        </span>
                        <strong className="milestone-node-title">Milestone 2</strong>
                        <small className="milestone-node-threshold">
                          {monthlyNextMilestone ? `Spend ${formatINR(monthlyNextMilestone)}/month` : "Completed"}
                        </small>
                      </div>
                    </div>
                    <div className="milestone-reward-grid">
                        <article className="milestone-reward-card milestone-reward-unlocked">
                          <span className="milestone-card-badge is-unlocked">Unlocked</span>
                          <div className="milestone-reward-illustration milestone-gift" aria-hidden="true">
                            <Gift />
                          </div>
                          <div className="milestone-reward-copy">
                            <h4>{currentMilestoneTitle}</h4>
                            <p>
                              {earnedMilestone
                                ? `Unlocked! ${earnedMilestone.label}`
                                : "Increase spends to unlock the first milestone reward."}
                            </p>
                          </div>
                        </article>

                        <article className="milestone-reward-card milestone-reward-next">
                          <span className="milestone-card-badge is-next">Next milestone</span>
                          <div className="milestone-reward-illustration milestone-trophy" aria-hidden="true">
                            <Trophy />
                          </div>
                          <div className="milestone-reward-copy">
                            <h4>{nextMilestoneTitle}</h4>
                            <p>
                              {nextMilestone
                                ? `Unlock when your monthly spend reaches ${formatINR(monthlyNextMilestone ?? 0)}.`
                                : "You have reached the available milestone thresholds for this card."}
                            </p>
                          </div>
                        </article>
                    </div>
                    {nextMilestone ? (
                      <div className="milestone-next-step">
                        <span className="milestone-next-icon" aria-hidden="true">
                          <TrendingUp />
                        </span>
                        <div>
                          <h4>How to reach the next milestone</h4>
                          <p className="milestone-next-step-copy">
                            You need <strong>{formatINR(Math.max((monthlyNextMilestone ?? 0) - totalMonthlySpend, 0))}</strong> more in monthly spend to unlock the next milestone.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </section>
                    <div className="milestone-footnote-inline">
                      <span className="milestone-footnote-icon" aria-hidden="true">i</span>
                      <span>Milestone value is estimated and only counts once you reach each spend threshold</span>
                    </div>
                  </>
                ) : null}

                {!cashback && allRedemptionCards.length > 0 ? (
                  <>
                    <div className="calc-section-title points-worth-outside-title">
                      <div className="redemption-heading-copy">
                        <h3>Redemption value</h3>
                        <p className="muted calc-note">Compare what your points are worth across redemption options.</p>
                      </div>
                      <div className="redemption-carousel-controls" aria-label="Redemption carousel controls">
                        <button type="button" aria-label="Previous redemption options" onClick={() => scrollRedemptions("previous")}>
                          <ChevronDown aria-hidden="true" size={16} />
                        </button>
                        <button type="button" aria-label="Next redemption options" onClick={() => scrollRedemptions("next")}>
                          <ChevronDown aria-hidden="true" size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="calc-block points-worth-card redemption-showcase">
                      <div className="redemption-card-grid" ref={redemptionScrollerRef} role="list" aria-label="Redemption options">
                        {allRedemptionCards.map((row) => (
                          <article className={`redemption-option-card${row.best ? " is-best" : ""}`} key={row.key} role="listitem">
                            {row.best ? <span className="redemption-best-ribbon">Best</span> : null}
                            <span className={`redemption-type-pill type-${row.type}`}>{row.type}</span>
                            <h4>{row.label}</h4>
                            <strong className="redemption-main-value">
                              {row.type === "miles" ? `${formatUnits(row.value)} miles/pts` : formatINR(row.value)}
                            </strong>
                            <span className="redemption-rate">{row.rate}</span>
                          </article>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

                {earnRows.length > 0 ? (
                  <details className="calc-breakdown">
                    <summary>How you earn it</summary>
                    <div className="table-wrap">
                      <table className="compare-table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Monthly spend</th>
                            <th>{unitLabel}/yr</th>
                          </tr>
                        </thead>
                        <tbody>
                          {earnRows.map((row) => (
                            <tr key={row.category}>
                              <td>
                                {row.label ?? CATEGORY_LABELS[row.category as SpendCategory] ?? row.category}
                                {row.excluded ? (
                                  <span className="calc-tag calc-tag-excluded">excluded</span>
                                ) : row.earnsBaseRateOnly ? (
                                  <span className="calc-tag">base rate</span>
                                ) : null}
                              </td>
                              <td>{formatINR(row.monthlySpend)}</td>
                              <td>{row.excluded ? "—" : formatUnits(row.annualUnits)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {hasExcluded ? <p className="muted calc-note">Categories marked excluded earn no rewards on this card.</p> : null}
                  </details>
                ) : null}
              </>
            )}

            <p className="muted calc-disclaimer">
              Estimates only. Reward rates, caps, and redemption values follow each bank&apos;s current terms and can change.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="calc">
      <div className="calc-grid">
        <div className="calc-inputs">
          <div className="calc-total">
            <div>
              <strong>{formatINRCompact(totalMonthlySpend)}</strong>
              <span>per month</span>
            </div>
            <div>
              <strong>{formatINRCompact(annualSpend)}</strong>
              <span>per year</span>
            </div>
          </div>

          <div className="calc-sliders">
            {buckets.map((bucket) => {
              const excluded = result.rows.find((row) => row.category === bucket.id)?.excluded ?? false;
              const value = spend[bucket.id] ?? 0;
              return (
                <div className="slider-row" key={bucket.id}>
                  <div className="slider-head">
                    <label htmlFor={`calc-${bucket.id}`}>
                      <span className="slider-label-text">{bucket.label}</span>
                      {(bucket.displayRate || (excluded && value > 0)) && (
                        <span className="slider-tags">
                          {bucket.displayRate && (
                            <span className="calc-tag">{bucket.displayRate}</span>
                          )}
                          {excluded && value > 0 && (
                            <span className="calc-tag calc-tag-excluded">not rewarded</span>
                          )}
                        </span>
                      )}
                    </label>
                    <span className="slider-value">{formatINR(value)}</span>
                  </div>
                  <input
                    className="slider"
                    id={`calc-${bucket.id}`}
                    max={SLIDER_MAX}
                    min={0}
                    step={SLIDER_STEP}
                    type="range"
                    value={value}
                    onChange={(event) => setCategory(bucket.id, Number(event.target.value))}
                  />
                </div>
              );
            })}

            {showAdditional &&
              moreCats.map((cat) => {
                const excluded = result.rows.find((row) => row.category === cat)?.excluded ?? false;
                const value = spend[cat] ?? 0;
                return (
                  <div className="slider-row" key={cat}>
                    <div className="slider-head">
                      <label htmlFor={`calc-${cat}`}>
                        <span className="slider-label-text">{CATEGORY_LABELS[cat]}</span>
                        {excluded && value > 0 && (
                          <span className="slider-tags">
                            <span className="calc-tag calc-tag-excluded">not rewarded</span>
                          </span>
                        )}
                      </label>
                      <span className="slider-value">{formatINR(value)}</span>
                    </div>
                    <input
                      className="slider"
                      id={`calc-${cat}`}
                      max={SLIDER_MAX}
                      min={0}
                      step={SLIDER_STEP}
                      type="range"
                      value={value}
                      onChange={(event) => setCategory(cat, Number(event.target.value))}
                    />
                  </div>
                );
              })}
          </div>

          {moreCats.length > 0 ? (
            <button className="calc-more" type="button" onClick={() => setShowAdditional((value) => !value)}>
              <ChevronDown className={showAdditional ? "is-open" : ""} size={16} />
              {showAdditional ? "Fewer categories" : "More categories"}
            </button>
          ) : null}
        </div>

        <div className="calc-output">
          <div className="calc-headline">
            <div className="calc-headline-main">
              <span className="calc-headline-label">You earn about</span>
              <strong className="calc-headline-units">
                {formatUnits(annualUnits)} <span>{unitLabel}/yr</span>
              </strong>
            </div>
            {totalAnnualValue > 0 || earnedVoucherValue > 0 ? (
              <div className="calc-headline-aside">
                <span>
                  {cashback ? "" : "up to "}
                  {formatINR(totalAnnualValue)}
                  {earnedVoucherValue > 0 ? ` + ${formatINR(earnedVoucherValue)} vouchers` : ""}
                </span>
                <span className="muted">
                  {earnedNonVoucherMilestoneValue > 0 || earnedVoucherValue > 0
                    ? `incl. ${formatINR(earnedNonVoucherMilestoneValue + earnedVoucherValue)} milestones · ${effectiveRate.toFixed(1)}% effective`
                    : `${cashback ? "cashback value" : "best redemption"} · ${effectiveRate.toFixed(1)}% effective`}
                </span>
              </div>
            ) : airMilesPerPoint && airMilesRupeePerPoint && annualUnits > 0 ? (
              <div className="calc-headline-aside">
                <span>{formatUnits(annualUnits * airMilesPerPoint)} miles/points</span>
                <span className="muted">
                  best transfer · {airMilesPerPoint} / {unitLabel.toLowerCase()} · {formatINR(annualUnits * airMilesRupeePerPoint)}
                </span>
              </div>
            ) : null}
          </div>

          {equitasPrivilegeTier ? (
            <p className="calc-tier-note">
              {equitasPrivilegeTierNote(equitasPrivilegeTier)}
            </p>
          ) : null}

          {annualUnits <= 0 ? (
            <p className="muted calc-empty">Set your monthly spend on the left to see what this card earns.</p>
          ) : (
            <>
              {milestones.length > 0 ? (
                <div className="calc-block">
                  <h3>Milestone rewards</h3>
                  <div className="calc-redemptions">
                    {earnedMilestones.map((rule, index) => (
                      <div className="calc-redemption is-best" key={`ms-earned-${index}`}>
                        <div className="calc-redemption-head">
                          <span>{rule.threshold > 0 ? `At ${formatINRCompact(rule.threshold)}/yr` : "Ongoing milestone"}</span>
                          <span className="calc-badge">Unlocked</span>
                        </div>
                        <strong>{milestonePrimaryValue(rule) ?? formatINR(rule.value)}</strong>
                        <span className="muted">{rule.label}</span>
                      </div>
                    ))}
                    {nextMilestone ? (
                      <div className="calc-redemption" key="ms-next">
                        <div className="calc-redemption-head">
                          <span>Next milestone</span>
                          <span className="calc-tag">{formatINRCompact(nextMilestone.threshold - annualSpend)} more</span>
                        </div>
                        <strong>{milestonePrimaryValue(nextMilestone) ?? formatINR(nextMilestone.value)}</strong>
                        <span className="muted">{nextMilestone.label}</span>
                      </div>
                    ) : null}
                  </div>
                  <p className="muted calc-note">
                    Milestone value is estimated and only counts once you reach each spend threshold.
                  </p>
                </div>
              ) : null}

              {result.annualSurcharge > 0 ? (
                <div className="calc-block">
                  <h3>Surcharges & processing fees</h3>
                  <div className="calc-redemptions">
                    <div className="calc-redemption" style={{ background: "var(--danger-soft)", borderColor: "rgba(215, 168, 74, 0.3)" }}>
                      <div className="calc-redemption-head">
                        <span>Monthly surcharge</span>
                      </div>
                      <strong>{formatINR(result.monthlySurcharge)}</strong>
                      <span className="muted">Added processing fee on specific spends</span>
                    </div>
                    <div className="calc-redemption" style={{ background: "var(--danger-soft)", borderColor: "rgba(215, 168, 74, 0.3)" }}>
                      <div className="calc-redemption-head">
                        <span>Annual surcharge</span>
                      </div>
                      <strong>{formatINR(result.annualSurcharge)}</strong>
                      <span className="muted">Added processing fee on specific spends</span>
                    </div>
                  </div>
                  {totalReturnsPlusVoucher > 0 ? (
                    <div className="calc-net-total" style={{ marginTop: "12px", padding: "12px", borderRadius: "8px", background: "var(--danger-soft)", border: "1px solid var(--accent)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 500 }}>Net annual value (after surcharge)</span>
                        <strong style={{ fontSize: "1.1rem", color: "var(--accent)" }}>
                          {formatINR(totalReturnsPlusVoucher - result.annualSurcharge)}
                        </strong>
                      </div>
                      <p className="muted calc-note" style={{ margin: "4px 0 0" }}>
                        Calculated as {formatINR(totalReturnsPlusVoucher)} gross rewards minus {formatINR(result.annualSurcharge)} surcharge.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!cashback && (redeemRows.length > 0 || airMilesPerPoint) ? (
                <div className="calc-block">
                  <h3>What your points are worth</h3>
                  <p className="muted calc-note" style={{ margin: "0 0 10px" }}>
                    Same points, very different value depending on how you redeem.
                  </p>
                  <div className="calc-redeem-list">
                    {visibleRedeemRows.map((row, index) => (
                      <div className={`calc-redeem-row${hasClearBest && index === 0 ? " is-best" : ""}`} key={row.key}>
                        <div className="calc-redeem-main">
                          <span className="calc-redeem-type" data-type={row.type}>
                            {row.type}
                          </span>
                          <span className="calc-redeem-label">{row.label}</span>
                          {hasClearBest && index === 0 ? <span className="calc-badge">Best</span> : null}
                        </div>
                        <div className="calc-redeem-val">
                          <strong>{formatINR(row.value)}</strong>
                          <span className="muted">{row.rate}</span>
                        </div>
                      </div>
                    ))}

                    {airMilesPerPoint && airMilesRupeePerPoint ? (
                      <div className="calc-redeem-row" key="airmiles">
                        <div className="calc-redeem-main">
                          <span className="calc-redeem-type" data-type="transfer">
                            miles
                          </span>
                          <span className="calc-redeem-label">Transfer to airline miles / hotel points</span>
                        </div>
                        <div className="calc-redeem-val">
                          <strong>{formatUnits(annualUnits * airMilesPerPoint)} miles/pts</strong>
                          <span className="muted">{airMilesPerPoint} / {unitLower} · {formatINR(annualUnits * airMilesRupeePerPoint)}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {redeemRows.length > 3 ? (
                    <button className="calc-more" type="button" onClick={() => setShowAllRedeem((value) => !value)}>
                      <ChevronDown className={showAllRedeem ? "is-open" : ""} size={16} />
                      {showAllRedeem ? "Show fewer options" : `Show all ${redeemRows.length} redemption options`}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {earnRows.length > 0 ? (
                <details className="calc-breakdown">
                  <summary>How you earn it</summary>
                  <div className="table-wrap">
                    <table className="compare-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Monthly spend</th>
                          <th>{unitLabel}/yr</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earnRows.map((row) => (
                          <tr key={row.category}>
                            <td>
                              {row.label ?? CATEGORY_LABELS[row.category as SpendCategory] ?? row.category}
                              {row.excluded ? (
                                <span className="calc-tag calc-tag-excluded">excluded</span>
                              ) : row.earnsBaseRateOnly ? (
                                <span className="calc-tag">base rate</span>
                              ) : null}
                            </td>
                            <td>{formatINR(row.monthlySpend)}</td>
                            <td>{row.excluded ? "—" : formatUnits(row.annualUnits)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {hasExcluded ? (
                    <p className="muted calc-note">
                      Categories marked excluded earn no rewards on this card.
                    </p>
                  ) : null}
                </details>
              ) : null}
            </>
          )}

          <p className="muted calc-disclaimer">
            Estimates only. Reward rates, caps, and redemption values follow each bank&apos;s current terms and can change.
          </p>
        </div>
      </div>
    </div>
  );
}
