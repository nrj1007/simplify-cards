"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CreditCard, SpendCategory } from "@/lib/types";
import {
  CALCULATOR_CATEGORIES,
  CATEGORY_LABELS,
  calculateRewards,
  relevantCategoriesForCard
} from "@/lib/reward-calculator";

type Props = {
  card: CreditCard;
};

const DEFAULT_SPEND: Partial<Record<SpendCategory, number>> = {
  online: 15000,
  dining: 4000,
  travel: 5000,
  fuel: 3000,
  grocery: 5000,
  utilities: 3000,
  upi: 5000,
  amazon: 5000,
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

function formatUnits(value: number) {
  return Math.round(value).toLocaleString("en-IN");
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function isCashbackRewardType(rewardType: string) {
  return /cashback/i.test(rewardType) && !/point|mile|coin|star|credit|neucoin/i.test(rewardType);
}

type RupeeOption = { key: string; label: string; perPoint: number; value: number; note?: string };

export default function RewardCalculator({ card }: Props) {
  const { primary, additional } = useMemo(() => relevantCategoriesForCard(card), [card]);
  const [showAdditional, setShowAdditional] = useState(false);
  const [spend, setSpend] = useState<Record<SpendCategory, number>>(() => {
    const primarySet = new Set(relevantCategoriesForCard(card).primary);
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
      push("ecosystem", redemption?.ecosystemLabel ?? "Brand ecosystem", redemption?.ecosystemValue);
      push("statement", "Statement credit", redemption?.statementBalanceValue);
      push("smartbuy-flight", "SmartBuy flights & hotels", redemption?.smartBuyFlightHotelValue);
      push("smartbuy-catalogue", "SmartBuy rewards catalogue", redemption?.smartBuyCatalogueValue);
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

  // Best rupee outcome across direct redemptions and valued transfer partners.
  const bestRupeeValue = Math.max(
    rupeeOptions[0]?.value ?? 0,
    partnerValuations[0]?.value ?? 0
  );
  const effectiveRate = annualSpend > 0 && bestRupeeValue > 0 ? (bestRupeeValue / annualSpend) * 100 : 0;
  const bestPartnerKey = partnerValuations.length > 0 && partnerValuations[0].value > (rupeeOptions[0]?.value ?? 0)
    ? partnerValuations[0].partner
    : null;
  const bestOptionKey = !bestPartnerKey && rupeeOptions.length > 0 ? rupeeOptions[0].key : null;

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
              <strong>{formatINR(totalMonthlySpend)}</strong>
              <span>per month</span>
            </div>
            <div>
              <strong>{formatINR(annualSpend)}</strong>
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
            {!cashback && bestRupeeValue > 0 ? (
              <div className="calc-headline-aside">
                <span>up to {formatINR(bestRupeeValue)}</span>
                <span className="muted">
                  best redemption · {effectiveRate.toFixed(1)}% effective
                </span>
              </div>
            ) : cashback ? (
              <div className="calc-headline-aside">
                <span>{formatINR(annualUnits)}</span>
                <span className="muted">cashback value · {effectiveRate.toFixed(1)}% effective</span>
              </div>
            ) : null}
          </div>

          {annualUnits <= 0 ? (
            <p className="muted calc-empty">Set your monthly spend on the left to see what this card earns.</p>
          ) : (
            <>
              {!cashback && (rupeeOptions.length > 0 || airMilesPerPoint) ? (
                <div className="calc-block">
                  <h3>Value by redemption type</h3>
                  <div className="calc-redemptions">
                    {rupeeOptions.map((option) => (
                      <div
                        className={`calc-redemption${option.key === bestOptionKey ? " is-best" : ""}`}
                        key={option.key}
                      >
                        <div className="calc-redemption-head">
                          <span>{option.label}</span>
                          {option.key === bestOptionKey ? <span className="calc-badge">Best</span> : null}
                        </div>
                        <strong>{formatINR(option.value)}</strong>
                        <span className="muted">Rs {option.perPoint} / {unitLabel.toLowerCase()}</span>
                      </div>
                    ))}

                    {airMilesPerPoint ? (
                      <div className="calc-redemption calc-redemption-miles">
                        <div className="calc-redemption-head">
                          <span>Transfer to air miles</span>
                        </div>
                        <strong>{formatUnits(annualUnits * airMilesPerPoint)} miles</strong>
                        <span className="muted">{airMilesPerPoint} air miles / {unitLabel.toLowerCase()}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {partnerValuations.length > 0 ? (
                <div className="calc-block">
                  <h3>Transfer partner value</h3>
                  <div className="calc-partners">
                    {partnerValuations.map((partner) => (
                      <div
                        className={`calc-partner${partner.partner === bestPartnerKey ? " is-best" : ""}`}
                        key={partner.partner}
                      >
                        <div className="calc-partner-head">
                          <span>{partner.partner}</span>
                          <span className={`calc-basis calc-basis-${partner.basis}`}>{partner.basis}</span>
                        </div>
                        <strong>
                          {partner.partner === bestPartnerKey ? (
                            <span className="calc-badge" style={{ marginRight: 6 }}>Best</span>
                          ) : null}
                          {formatINR(partner.value)}
                        </strong>
                        <span className="muted">
                          Rs {partner.partnerPointValue}/pt · ×{partner.transferRatio} ratio
                          {" "}= Rs {partner.valuePerCardUnit.toFixed(2)} / {unitLabel.toLowerCase()}
                        </span>
                      </div>
                    ))}
                  </div>
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
