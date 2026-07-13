"use client";

import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState, Fragment } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard as CreditCardIcon,
  Star,
  Trophy,
  TrendingUp
} from "lucide-react";
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
  variant?: "compact" | "calculator" | "card-detail";
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

function RedemptionIcon({ type }: { type: "direct" | "transfer" | "voucher" | "miles" }) {
  const isHotel = type === "transfer";
  const isVoucher = type === "voucher";
  const isMiles = type === "miles";
  const isDirect = type === "direct";

  const extraClass = isVoucher ? " unified-voucher-icon" : isMiles ? " refined-flight-icon" : "";

  return (
    <span className={`redemption-icon-shell redemption-icon-${type} premium-medallion${extraClass}`} aria-hidden="true">
      {isHotel && (
        <svg viewBox="0 0 96 96" role="img">
          <defs>
            <linearGradient id="marriottBuilding" x1="18" y1="18" x2="78" y2="82" gradientUnits="userSpaceOnUse">
              <stop stopColor="#D8B66A"></stop>
              <stop offset="1" stopColor="#8F6B22"></stop>
            </linearGradient>
            <linearGradient id="marriottGlass" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#FFF8E7"></stop>
              <stop offset="1" stopColor="#E9D7A8"></stop>
            </linearGradient>
            <filter id="marriottShadow" x="-30%" y="-30%" width="160%" height="170%">
              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#7B5718" floodOpacity=".20"></feDropShadow>
            </filter>
          </defs>
          <circle cx="48" cy="48" r="34" fill="#FBF4E2"></circle>
          <g filter="url(#marriottShadow)">
            <path d="M27 72V31a6 6 0 0 1 6-6h30a6 6 0 0 1 6 6v41" fill="url(#marriottBuilding)"></path>
            <path d="M33 25h30l-4-8H37l-4 8Z" fill="#B8975A"></path>
            <rect x="43" y="14" width="10" height="11" rx="2" fill="#FFF4D0"></rect>
            <path d="M45.5 22v-5l2.5 3 2.5-3v5" fill="none" stroke="#8F6B22" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"></path>
            <g fill="url(#marriottGlass)">
              <rect x="34" y="34" width="7" height="8" rx="1.5"></rect>
              <rect x="45" y="34" width="7" height="8" rx="1.5"></rect>
              <rect x="56" y="34" width="7" height="8" rx="1.5"></rect>
              <rect x="34" y="47" width="7" height="8" rx="1.5"></rect>
              <rect x="56" y="47" width="7" height="8" rx="1.5"></rect>
            </g>
            <path d="M43 72V58a5 5 0 0 1 10 0v14" fill="#FFF4D0"></path>
            <path d="M22 73h52" stroke="#7B5718" strokeWidth="4" strokeLinecap="round"></path>
          </g>
          <path d="m72 18 2 4 4.5.7-3.2 3.1.8 4.4-4.1-2.1-4.1 2.1.8-4.4-3.2-3.1 4.5-.7 2-4Z" fill="#D8B66A"></path>
        </svg>
      )}
      {isVoucher && (
        <svg viewBox="0 0 96 96" role="img">
          <defs>
            <linearGradient id="unifiedVoucherBody" x1="18" y1="24" x2="78" y2="74" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7A42E1"></stop>
              <stop offset="1" stopColor="#581C87"></stop>
            </linearGradient>
            <linearGradient id="unifiedVoucherGold" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#F4DFA8"></stop>
              <stop offset=".55" stopColor="#D8B66A"></stop>
              <stop offset="1" stopColor="#A77B29"></stop>
            </linearGradient>
            <filter id="unifiedVoucherShadow" x="-30%" y="-30%" width="160%" height="170%">
              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#581C87" floodOpacity=".20"></feDropShadow>
            </filter>
          </defs>
          <circle cx="48" cy="48" r="34" fill="#F3ECFB"></circle>
          <g filter="url(#unifiedVoucherShadow)">
            <path d="M22 31h52a5 5 0 0 1 5 5v8a7 7 0 0 0 0 14v8a5 5 0 0 1-5 5H22a5 5 0 0 1-5-5v-8a7 7 0 0 0 0-14v-8a5 5 0 0 1 5-5Z" fill="url(#unifiedVoucherBody)"></path>
            <path d="M48 31v40" stroke="url(#unifiedVoucherGold)" strokeWidth="3" strokeDasharray="4 4"></path>
            <circle cx="61" cy="48" r="13" fill="#FFF7E4" stroke="url(#unifiedVoucherGold)" strokeWidth="3"></circle>
            <path d="m61 39 2.3 4.8 5.3.8-3.8 3.7.9 5.2-4.7-2.5-4.7 2.5.9-5.2-3.8-3.7 5.3-.8L61 39Z" fill="#B8975A"></path>
            <path d="M28 40h11M28 48h8M28 56h11" stroke="#F4E8FF" strokeWidth="3" strokeLinecap="round"></path>
          </g>
        </svg>
      )}
      {isMiles && (
        <svg viewBox="0 0 96 96" role="img">
          <defs>
            <linearGradient id="refinedFlightBody" x1="18" y1="24" x2="78" y2="72" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8A54D6"></stop>
              <stop offset="1" stopColor="#581C87"></stop>
            </linearGradient>
            <linearGradient id="refinedFlightAccent" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#C5ACF4"></stop>
              <stop offset="1" stopColor="#7A42E1"></stop>
            </linearGradient>
            <filter id="refinedFlightShadow" x="-30%" y="-30%" width="160%" height="170%">
              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#581C87" floodOpacity=".18"></feDropShadow>
            </filter>
          </defs>
          <circle cx="48" cy="48" r="34" fill="#F2ECFB"></circle>
          <path d="M19 67c12 8 28 9 45 4" fill="none" stroke="#B8975A" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 6"></path>
          <g filter="url(#refinedFlightShadow)">
            <path d="M19 52c0-2 2-4 5-4h28l18-13c3-2 7-2 9 1 2 2 1 5-2 7L60 55H24c-3 0-5-1-5-3Z" fill="url(#refinedFlightBody)"></path>
            <path d="M35 48 25 32h7l15 16Z" fill="url(#refinedFlightAccent)"></path>
            <path d="m42 55-9 13h7l13-13Z" fill="#9B7BE5"></path>
            <path d="m24 48-8-9h6l11 9Zm1 7-8 8h6l10-8Z" fill="#8159CE"></path>
            <path d="M61 48h14c3 0 5 1 6 4-1 2-3 3-6 3H61Z" fill="#6E35AF"></path>
            <g fill="#F7F2FF">
              <circle cx="34" cy="51" r="1.6"></circle>
              <circle cx="40" cy="51" r="1.6"></circle>
              <circle cx="46" cy="51" r="1.6"></circle>
              <circle cx="52" cy="51" r="1.6"></circle>
            </g>
          </g>
        </svg>
      )}
      {isDirect && <CreditCardIcon />}
    </span>
  );
}

export default function RewardCalculator({ card, milestones = [], picker, variant = "compact" }: Props) {
  const buckets = useMemo(() => calculatorBucketsForCard(card), [card]);
  const moreCats = useMemo(() => moreCategoriesForCard(card), [card]);
  const redemptionScrollerRef = useRef<HTMLDivElement>(null);

  const [showAdditional, setShowAdditional] = useState(false);
  const [showAllRedeem, setShowAllRedeem] = useState(false);
  const [redemptionScrollState, setRedemptionScrollState] = useState({ previous: false, next: true });
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
      rows.push({ key: `direct-${option.key}`, label: option.label, type: "direct", rate: `₹${option.perPoint} / ${unitLower}`, value: option.value });
    }
    for (const partner of partnerValuations) {
      rows.push({
        key: `transfer-${partner.partner}`,
        label: partner.partner,
        type: "transfer",
        rate: `₹${partner.valuePerCardUnit.toFixed(2)} / ${unitLower}`,
        value: partner.value
      });
    }
    for (const voucher of voucherValuations) {
      rows.push({
        key: `voucher-${voucher.partner}-${voucher.programme}`,
        label: `${voucher.partner} — ${voucher.programme}`,
        type: "voucher",
        rate: `₹${voucher.valuePerPoint} / ${unitLower}`,
        value: voucher.value
      });
    }
    return rows.sort((a, b) => b.value - a.value);
  }, [rupeeOptions, partnerValuations, voucherValuations, unitLower]);
  const visibleRedeemRows = showAllRedeem ? redeemRows : redeemRows.slice(0, 3);
  const totalRedeemRows = redeemRows.length + (airMilesPerPoint ? 1 : 0);
  const hasClearBest =
    totalRedeemRows >= 2 &&
    redeemRows.length > 0 &&
    (redeemRows.length === 1 || redeemRows[0].value > redeemRows[1].value);

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
    const scroller = redemptionScrollerRef.current;
    const cardWidth = scroller?.querySelector<HTMLElement>(".redemption-option-card")?.offsetWidth ?? 208;
    const gap = scroller ? Number.parseFloat(getComputedStyle(scroller).columnGap || getComputedStyle(scroller).gap) || 12 : 12;
    redemptionScrollerRef.current?.scrollBy({
      behavior: "smooth",
      left: direction === "previous" ? -(cardWidth + gap) : cardWidth + gap
    });
  }

  function updateRedemptionScrollState() {
    const scroller = redemptionScrollerRef.current;
    if (!scroller) return;
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    setRedemptionScrollState({
      previous: scroller.scrollLeft > 2,
      next: scroller.scrollLeft < maxScroll - 2
    });
  }

  useEffect(() => {
    const scroller = redemptionScrollerRef.current;
    if (!scroller) return;
    updateRedemptionScrollState();
    const observer = new ResizeObserver(updateRedemptionScrollState);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [annualUnits]);

  if (variant === "card-detail") {
    const netAfterAnnualFee = totalReturnsPlusVoucher - result.annualSurcharge - card.annualFee;
    const controls = [
      ...buckets.map((bucket) => ({ id: bucket.id, label: bucket.label, displayRate: bucket.displayRate })),
      ...(showAdditional
        ? moreCats.map((category) => ({ id: category, label: CATEGORY_LABELS[category], displayRate: undefined }))
        : [])
    ];

    return (
      <div className="card-detail-calculator">
        <div className="card-detail-calculator-controls">
          {controls.map((control) => {
            const value = spend[control.id] ?? 0;
            const excluded = result.rows.find((row) => row.category === control.id)?.excluded ?? false;
            return (
              <div className="card-detail-range-row" key={control.id}>
                <label htmlFor={controlId(control.id, "-detail")}>
                  {control.label}
                  {control.displayRate ? <small>{control.displayRate}</small> : null}
                  {excluded && value > 0 ? <small>Not rewarded</small> : null}
                </label>
                <input
                  id={controlId(control.id, "-detail")}
                  max={SLIDER_MAX}
                  min={0}
                  step={SLIDER_STEP}
                  style={sliderStyle(value)}
                  type="range"
                  value={value}
                  onChange={(event) => setCategory(control.id, Number(event.target.value))}
                />
                <output htmlFor={controlId(control.id, "-detail")}>{formatINR(value)}</output>
              </div>
            );
          })}
          {moreCats.length > 0 ? (
            <button className="card-detail-calculator-more" type="button" onClick={() => setShowAdditional((value) => !value)}>
              <ChevronDown className={showAdditional ? "is-open" : ""} size={16} />
              {showAdditional ? "Fewer categories" : "More categories"}
            </button>
          ) : null}
        </div>

        <aside className="card-detail-calculator-output" aria-live="polite">
          <div>
            <span>Estimated annual {cashback ? "cashback" : "reward value"}</span>
            <strong>{formatINR(totalReturnsPlusVoucher)}</strong>
          </div>
          <dl>
            <div><dt>Annual spend</dt><dd>{formatINR(annualSpend)}</dd></div>
            <div><dt>Effective return</dt><dd>{effectiveRate.toFixed(1)}%</dd></div>
            {result.annualSurcharge > 0 ? <div><dt>Annual surcharge</dt><dd>{formatINR(result.annualSurcharge)}</dd></div> : null}
            <div><dt>Net after annual fee</dt><dd>{formatINR(netAfterAnnualFee)}</dd></div>
          </dl>
          {calculatorNote ? <p>{calculatorNote}</p> : null}
        </aside>
      </div>
    );
  }

  if (variant === "calculator") {
    const earnedMilestone = earnedMilestones[earnedMilestones.length - 1] ?? null;
    const currentMilestoneIndex = earnedMilestones.length;
    const currentMonthlyThreshold = earnedMilestone ? Math.ceil(earnedMilestone.threshold / 12) : 0;
    
    const monthlyNextMilestone = nextMilestone ? Math.ceil(nextMilestone.threshold / 12) : null;
    const nextMilestoneIndex = currentMilestoneIndex + 1;
    
    let milestoneProgress = 100;
    if (monthlyNextMilestone) {
      const spendInBracket = Math.max(0, totalMonthlySpend - currentMonthlyThreshold);
      const bracketSize = monthlyNextMilestone - currentMonthlyThreshold;
      milestoneProgress = bracketSize > 0 ? Math.max(0, Math.min(100, (spendInBracket / bracketSize) * 100)) : 100;
    }
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
              Categories not listed are treated as issuer-excluded and earn no rewards
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
                {!cashback && allRedemptionCards.length > 0 ? (
                  <>
                    <div className="calc-section-title points-worth-outside-title">
                      <div className="redemption-heading-copy">
                        <h3>Redemption value</h3>
                        <p className="muted calc-note">Compare what your points are worth across redemption options</p>
                      </div>
                      <div className="redemption-carousel-controls" aria-label="Redemption carousel controls">
                        <button
                          className="redemption-carousel-arrow redemption-carousel-prev"
                          type="button"
                          aria-label="Previous redemption options"
                          disabled={!redemptionScrollState.previous}
                          onClick={() => scrollRedemptions("previous")}
                        >
                          <ChevronLeft aria-hidden="true" />
                        </button>
                        <button
                          className="redemption-carousel-arrow redemption-carousel-next"
                          type="button"
                          aria-label="Next redemption options"
                          disabled={!redemptionScrollState.next}
                          onClick={() => scrollRedemptions("next")}
                        >
                          <ChevronRight aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div className="calc-block points-worth-card redemption-showcase">
                      <div
                        className="redemption-card-grid"
                        ref={redemptionScrollerRef}
                        role="list"
                        aria-label="Redemption options"
                        onScroll={updateRedemptionScrollState}
                      >
                        {allRedemptionCards.map((row) => (
                          <article className={`redemption-option-card${row.best ? " is-best" : ""}`} key={row.key} role="listitem">
                            {row.best ? (
                              <span className="redemption-best-ribbon">
                                <Star aria-hidden="true" />
                                Best
                              </span>
                            ) : null}
                            <RedemptionIcon type={row.type} />
                            <span className={`redemption-type-pill type-${row.type}`}>{row.type}</span>
                            <h4>{row.label}</h4>
                            <strong className={`redemption-main-value${row.type === "miles" ? " miles-value" : ""}`}>
                              {row.type === "miles" ? `${formatUnits(row.value)} miles/pts` : formatINR(row.value)}
                            </strong>
                            <span className="redemption-rate">{row.rate}</span>
                          </article>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

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
                      {(() => {
                        const allNodes = [
                          { title: "Get started", threshold: 0, index: 0, circle: "-" },
                          ...(milestones || []).map((m, i) => ({
                            title: `Milestone ${i + 1}`,
                            threshold: Math.ceil(m.threshold / 12),
                            index: i + 1,
                            circle: (i + 1).toString()
                          }))
                        ];

                        return allNodes.map((node, idx) => {
                          const isCurrentNode = idx === currentMilestoneIndex;
                          let statusText = "Next milestone";
                          let isVisibleBadge = false;

                          if (idx <= currentMilestoneIndex) {
                            statusText = "Unlocked";
                            isVisibleBadge = idx > 0;
                          } else if (idx === currentMilestoneIndex + 1) {
                            statusText = "In progress";
                            isVisibleBadge = true;
                          }
                          
                          let trackFill = 0;
                          if (idx < allNodes.length - 1) {
                            const nextNode = allNodes[idx + 1];
                            const spendInBracket = Math.max(0, totalMonthlySpend - node.threshold);
                            const bracketSize = nextNode.threshold - node.threshold;
                            trackFill = bracketSize > 0 ? Math.max(0, Math.min(100, (spendInBracket / bracketSize) * 100)) : 100;
                          }

                          return (
                            <Fragment key={idx}>
                              <div className={`milestone-node ${idx <= currentMilestoneIndex ? 'milestone-node-current' : 'milestone-node-next'}`}>
                                {isCurrentNode && <span className="milestone-you-are-here">You are here</span>}
                                <span className="milestone-circle">{node.circle}</span>
                                <span className={`milestone-status ${isVisibleBadge ? 'milestone-status-unlocked' : 'milestone-status-placeholder'}`}>
                                  {statusText}
                                </span>
                                <strong className="milestone-node-title">{node.title}</strong>
                                <small className="milestone-node-threshold">Spend {formatINR(node.threshold)}/month</small>
                              </div>
                              {idx < allNodes.length - 1 && (
                                <div className="milestone-track" aria-hidden="true">
                                  <span className="milestone-track-fill" style={{ "--milestone-progress": `${trackFill}%` } as CSSProperties} />
                                </div>
                              )}
                            </Fragment>
                          );
                        });
                      })()}
                    </div>
                    <div className="milestone-reward-grid">
                        <article className="milestone-reward-card milestone-reward-unlocked">
                          <span className={`milestone-card-badge ${earnedMilestone ? 'is-unlocked' : 'is-next'}`}>
                            {earnedMilestone ? "Unlocked" : "Locked"}
                          </span>
                          <div className="milestone-reward-illustration milestone-gift" aria-hidden="true">
                            <svg viewBox="0 0 120 120" role="img">
                              <defs>
                                <linearGradient id="giftBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#8f54dd" />
                                  <stop offset="100%" stopColor="#581c87" />
                                </linearGradient>
                                <linearGradient id="giftLidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#b78cff" />
                                  <stop offset="100%" stopColor="#7d46d7" />
                                </linearGradient>
                              </defs>
                              <ellipse cx="60" cy="100" rx="34" ry="8" fill="rgba(88,28,135,0.12)" />
                              <rect x="24" y="42" width="72" height="46" rx="10" fill="url(#giftBodyGrad)" />
                              <rect x="18" y="32" width="84" height="18" rx="8" fill="url(#giftLidGrad)" />
                              <rect x="55" y="32" width="10" height="56" rx="5" fill="#eadcff" />
                              <path d="M60 34c-14-1-24-7-24-17 0-6 5-10 11-10 8 0 13 10 13 27Z" fill="none" stroke="#581c87" strokeWidth="6" strokeLinecap="round" />
                              <path d="M60 34c14-1 24-7 24-17 0-6-5-10-11-10-8 0-13 10-13 27Z" fill="none" stroke="#581c87" strokeWidth="6" strokeLinecap="round" />
                              <circle cx="78" cy="76" r="17" fill="#ffffff" stroke="#7d46d7" strokeWidth="4" />
                              <path d="m70 76 5 5 11-12" fill="none" stroke="#581c87" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                              <circle cx="18" cy="54" r="3" fill="#f4c63d" />
                              <circle cx="101" cy="45" r="3" fill="#f4c63d" />
                              <circle cx="103" cy="73" r="2.5" fill="#64a8ff" />
                              <circle cx="18" cy="79" r="2.5" fill="#64a8ff" />
                              <path d="M11 84c4 0 4 6 8 6" fill="none" stroke="#35a7ff" strokeWidth="3" strokeLinecap="round" />
                              <path d="M95 25c4 0 4-6 8-6" fill="none" stroke="#ff7b6c" strokeWidth="3" strokeLinecap="round" />
                            </svg>
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
                          <span className="milestone-card-badge is-next">
                            {monthlyNextMilestone ? "Next milestone" : "Completed"}
                          </span>
                          <div className="milestone-reward-illustration milestone-trophy" aria-hidden="true">
                            <svg viewBox="0 0 120 120" role="img">
                              <defs>
                                <linearGradient id="trophyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#d8c49a" />
                                  <stop offset="100%" stopColor="#a98b52" />
                                </linearGradient>
                              </defs>
                              <path d="M39 24h42v28c0 18-10 30-21 30S39 70 39 52V24Z" fill="url(#trophyGrad)" stroke="#947948" strokeWidth="3" />
                              <path d="M39 31H23v12c0 11 9 20 20 20M81 31h16v12c0 11-9 20-20 20" fill="none" stroke="#947948" strokeWidth="5" strokeLinecap="round" />
                              <path d="M60 82v12M44 100h32" fill="none" stroke="#947948" strokeWidth="6" strokeLinecap="round" />
                              <rect x="45" y="92" width="30" height="8" rx="4" fill="#b89a62" />
                              <path d="m60 34 5 10 11 2-8 7 2 12-10-6-10 6 2-12-8-7 11-2 5-10Z" fill="#fff7dc" />
                              <circle cx="25" cy="28" r="2.5" fill="#d8c49a" />
                              <circle cx="20" cy="58" r="2.5" fill="#c6b28b" />
                              <circle cx="99" cy="34" r="2.5" fill="#d8c49a" />
                              <circle cx="96" cy="65" r="2.5" fill="#c6b28b" />
                              <path d="M93 21h4M95 19v4M18 18h4M20 16v4" stroke="#d8c49a" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </div>
                          <div className="milestone-reward-copy">
                            <h4>{nextMilestoneTitle}</h4>
                            <p>
                              {nextMilestone
                                ? `Unlock when your ${nextMilestone.period} spend reaches ${formatINR(nextMilestone.threshold)}.`
                                : "You have reached the available milestone thresholds for this card."}
                            </p>
                          </div>
                        </article>
                    </div>
                    {nextMilestone ? (
                      <div className="milestone-next-step">
                        <span className="milestone-next-icon" aria-hidden="true">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up">
                            <path d="M4 19V9M9 19v-5M14 19V7M19 19V4" />
                            <path d="m4 10 5-4 5 2 6-6" />
                          </svg>
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
                          {earnedMilestones.map((milestone, idx) => (
                            <tr key={`milestone-${idx}`} className="calc-breakdown-milestone-row">
                              <td>
                                Milestone bonus
                                <span className="calc-tag">{milestone.period}</span>
                              </td>
                              <td>—</td>
                              <td>{milestone.label}</td>
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
                        {earnedMilestones.map((milestone, idx) => (
                          <tr key={`milestone-${idx}`} className="calc-breakdown-milestone-row">
                            <td>
                              Milestone bonus
                              <span className="calc-tag">{milestone.period}</span>
                            </td>
                            <td>—</td>
                            <td>{milestone.label}</td>
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
