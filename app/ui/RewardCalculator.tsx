"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CreditCard, SpendCategory } from "@/lib/types";
import type { MilestoneRule } from "@/lib/recommend";
import {
  equitasPrivilegeTierForMonthlySpend,
  equitasPrivilegeTierNote,
  isEquitasPrivilegeCard
} from "@/lib/equitas-privilege";
import {
  CALCULATOR_CATEGORIES,
  CATEGORY_LABELS,
  calculateRewards,
  relevantCategoriesForCard
} from "@/lib/reward-calculator";

type Props = {
  card: CreditCard;
  milestones?: MilestoneRule[];
  isStandalone?: boolean;
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
  return `Rs ${Math.round(value).toLocaleString("en-IN")}`;
}

function formatINRCompact(value: number) {
  const v = Math.round(value);
  if (v >= 100000) {
    const lakhs = v / 100000;
    const formatted = lakhs % 1 === 0 ? `${lakhs}` : lakhs.toFixed(1);
    return `Rs ${formatted}L`;
  }
  return `Rs ${v.toLocaleString("en-IN")}`;
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

export default function RewardCalculator({ card, milestones = [], isStandalone = false }: Props) {
  const { primary, additional } = useMemo(() => {
    const { primary: p, additional: a } = relevantCategoriesForCard(card);
    if (isStandalone && !p.includes("international")) {
      const baseIndex = p.indexOf("base");
      const newPrimary = [...p];
      if (baseIndex !== -1) {
        newPrimary.splice(baseIndex, 0, "international");
      } else {
        newPrimary.push("international");
      }
      return {
        primary: newPrimary,
        additional: a.filter((c) => c !== "international")
      };
    }
    return { primary: p, additional: a };
  }, [card, isStandalone]);

  const [showAdditional, setShowAdditional] = useState(false);
  const [showAllRedeem, setShowAllRedeem] = useState(false);
  const [spend, setSpend] = useState<Record<SpendCategory, number>>(() => {
    const { primary: p } = relevantCategoriesForCard(card);
    const primarySet = new Set(p);
    if (isStandalone) {
      primarySet.add("international");
    }
    const initial = {} as Record<SpendCategory, number>;
    // Seed only the primary categories; additional (excluded) categories start at 0 and are
    // opt-in, so they don't inflate the default spend total.
    for (const category of CALCULATOR_CATEGORIES) {
      initial[category] = primarySet.has(category) ? DEFAULT_SPEND[category] ?? 2000 : 0;
    }
    return initial;
  });

  const visibleCategories = showAdditional ? [...primary, ...additional] : primary;

  const result = useMemo(() => calculateRewards(card, spend), [card, spend]);

  const totalMonthlySpend = CALCULATOR_CATEGORIES.reduce((sum, category) => sum + spend[category], 0);
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
  }, [annualUnits, cashback, redemption]);

  const airMilesPerPoint = !cashback && typeof redemption?.airMilesValue === "number" && redemption.airMilesValue > 0
    ? redemption.airMilesValue
    : null;

  const partnerValuations = useMemo(() => {
    return (redemption?.transferPartnerValuations ?? [])
      .map((partner) => {
        // valuePerCardUnit = Rs per card reward unit, correctly applying the transfer ratio.
        // e.g. Rs 2.2/Accor pt × 2 Accor pts/EDGE Mile = Rs 4.4/EDGE Mile
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
      rows.push({ key: `direct-${option.key}`, label: option.label, type: "direct", rate: `Rs ${option.perPoint} / ${unitLower}`, value: option.value });
    }
    for (const partner of partnerValuations) {
      rows.push({
        key: `transfer-${partner.partner}`,
        label: partner.partner,
        type: "transfer",
        rate: `Rs ${partner.valuePerCardUnit.toFixed(2)} / ${unitLower}`,
        value: partner.value
      });
    }
    for (const voucher of voucherValuations) {
      rows.push({
        key: `voucher-${voucher.partner}-${voucher.programme}`,
        label: `${voucher.partner} — ${voucher.programme}`,
        type: "voucher",
        rate: `Rs ${voucher.valuePerPoint} / ${unitLower}`,
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
    !(airMilesPerPoint && topRatePerUnit !== null && topRatePerUnit === airMilesPerPoint);

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

  function setCategory(category: SpendCategory, value: number) {
    setSpend((prev) => ({ ...prev, [category]: value }));
  }

  const earnRows = result.rows.filter((row) => row.monthlySpend > 0);
  const hasExcluded = earnRows.some((row) => row.excluded);

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
            {visibleCategories.map((category) => {
              const excluded = result.rows.find((row) => row.category === category)?.excluded ?? false;
              return (
                <div className="slider-row" key={category}>
                  <div className="slider-head">
                    <label htmlFor={`calc-${category}`}>
                      {CATEGORY_LABELS[category]}
                      {excluded && spend[category] > 0 ? (
                        <span className="calc-tag calc-tag-excluded">not rewarded</span>
                      ) : null}
                    </label>
                    <span className="slider-value">{formatINR(spend[category])}</span>
                  </div>
                  <input
                    className="slider"
                    id={`calc-${category}`}
                    max={SLIDER_MAX}
                    min={0}
                    step={SLIDER_STEP}
                    type="range"
                    value={spend[category]}
                    onChange={(event) => setCategory(category, Number(event.target.value))}
                  />
                </div>
              );
            })}
          </div>

          {additional.length > 0 ? (
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
            ) : airMilesPerPoint && annualUnits > 0 ? (
              <div className="calc-headline-aside">
                <span>{formatUnits(annualUnits * airMilesPerPoint)} air miles</span>
                <span className="muted">
                  best via transfer · {airMilesPerPoint} / {unitLabel.toLowerCase()}
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

                    {airMilesPerPoint ? (
                      <div className="calc-redeem-row" key="airmiles">
                        <div className="calc-redeem-main">
                          <span className="calc-redeem-type" data-type="transfer">
                            miles
                          </span>
                          <span className="calc-redeem-label">Transfer to air miles</span>
                        </div>
                        <div className="calc-redeem-val">
                          <strong>{formatUnits(annualUnits * airMilesPerPoint)} miles</strong>
                          <span className="muted">{airMilesPerPoint} / {unitLower}</span>
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
                              {CATEGORY_LABELS[row.category]}
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
