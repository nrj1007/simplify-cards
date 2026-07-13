import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cards, getCardById } from "@/lib/cards";
import { getCardContent } from "@/lib/card-content";
import { getTotalLoungeAccess } from "@/lib/lounge";
import AskFeedback from "@/app/ui/AskFeedback";
import RewardCalculator from "@/app/ui/RewardCalculator";
import CardImageFallback from "@/app/ui/CardImageFallback";
import { TrackedExternalLink } from "@/app/ui/TrackedLink";
import {
  EQUITAS_PRIVILEGE_BENEFITS,
  EQUITAS_PRIVILEGE_TIERS,
  EQUITAS_PRIVILEGE_URL,
  isEquitasPrivilegeCard
} from "@/lib/equitas-privilege";
import { milestoneRulesForCard } from "@/lib/recommend";
import { comparisonsForCard, comparisonTitle } from "@/lib/seo-comparisons";
import { landingsForCard } from "@/lib/seo-landing";
import {
  alternativeIntent,
  buildCardJsonLd,
  deriveAvoidIf,
  deriveBestFor,
  deriveLoungeMilestoneRules,
  deriveTake,
  findAlternativeCards,
  formatRupeesCompact
} from "@/lib/card-detail";
import { buildPageMetadata } from "@/lib/seo";
import { cardCtaHref, cardCtaLabel, cardCtaRel } from "@/lib/card-links";
import type { CreditCard, Redemption } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

function buildCardSeoTitle(name: string) {
  return `${name} Review: Fees, Rewards & Benefits`;
}

export function generateStaticParams() {
  return cards.map((card) => ({ id: card.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const card = getCardById(id);
  if (!card) {
    return buildPageMetadata({
      title: "Card not found",
      description: "The requested credit card page could not be found on SimplifyCards.",
      path: "/cards"
    });
  }

  const fee = card.annualFee === 0 ? "lifetime free" : `₹ ${card.annualFee.toLocaleString("en-IN")} annual fee`;
  const totalLoungeAccess = getTotalLoungeAccess(card);
  const lounge = totalLoungeAccess === "unlimited"
    ? "unlimited lounge access"
    : totalLoungeAccess > 0
      ? `${totalLoungeAccess} lounge visits`
      : null;
  const descParts = [card.issuer, fee, lounge].filter(Boolean).join(" · ");
  const description = `${card.name} by ${card.issuer}. ${descParts}. Verified rewards, fees, benefits, exclusions, and redemption details.`;

  return buildPageMetadata({
    title: buildCardSeoTitle(card.name),
    description: `Check ${card.name} fees, rewards, lounge access, forex charges, eligibility, exclusions and whether this credit card is worth it in India.`,
    path: `/cards/${card.id}`,
    type: "article",
    imageUrl: card.imageUrl
  });
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not listed";
  return `₹ ${value.toLocaleString("en-IN")}`;
}

function hasFeeWaiverSpend(value: number | null | undefined) {
  return typeof value === "number" && value > 0;
}

function formatRewardCap(value: number | null | undefined, rewardType: string) {
  if (!value) return "-";
  return `${value.toLocaleString("en-IN")} ${rewardType}`;
}

function formatStatementQuarterCap(value: number | null | undefined) {
  if (!value) return "-";
  return `₹ ${value.toLocaleString("en-IN")}`;
}

function formatRewardRate(card: CreditCard, reward: CreditCard["rewards"][number]) {
  if (reward.displayRate) return reward.displayRate;

  const rewardTypeLower = card.rewardType.toLowerCase();

  if (rewardTypeLower.includes("mile") || rewardTypeLower.includes("point")) {
    return `${reward.rate} ${card.rewardType} / ₹100`;
  }

  return `${reward.rate}%`;
}

function redemptionRows(issuer: string, redemption?: Redemption) {
  if (!redemption) return [];

  let flightHotelLabel = "Flight/hotel booking";
  let catalogueLabel = "Rewards catalogue";
  if (issuer === "HDFC Bank") {
    flightHotelLabel = "SmartBuy flight/hotel";
    catalogueLabel = "SmartBuy rewards catalogue";
  } else if (issuer === "ICICI Bank") {
    flightHotelLabel = "iShop flight/hotel";
    catalogueLabel = "iShop rewards catalogue";
  } else if (issuer === "SBI Card") {
    flightHotelLabel = "Travel portal booking";
    catalogueLabel = "Shop & Smile catalogue";
  }

  // "Airmile transfer" shows the best transfer RATIO (partner miles/points per card point), not the
  // rupee value. Take the max across airline transfers (airlinePartners "2:1" = 0.5/point) AND
  // hotel/point-program transfers (transferPartnerValuations, e.g. Marriott 1:1 = 1/point). Default
  // 1:1 when a transfer exists but no explicit ratio is listed.
  const hasAirmileTransfer =
    (typeof redemption.airMilesValue === "number" && redemption.airMilesValue > 0) ||
    (Array.isArray(redemption.airlinePartners) && redemption.airlinePartners.length > 0);
  const airlineRatios = (redemption.airlinePartners ?? [])
    .map((partner) => {
      const [cardUnits, partnerUnits] = (partner.ratio ?? "").split(":").map((value) => Number(value.trim()));
      return Number.isFinite(cardUnits) && Number.isFinite(partnerUnits) && cardUnits > 0 ? partnerUnits / cardUnits : null;
    })
    .filter((value): value is number => typeof value === "number" && value > 0);
  const partnerRatios = (redemption.transferPartnerValuations ?? [])
    .map((partner) => partner.transferRatio)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const transferRatios = [...airlineRatios, ...partnerRatios];
  const derivedAirMilesValue = hasAirmileTransfer ? (transferRatios.length ? Math.max(...transferRatios) : (redemption.airMilesValue ?? 1)) : undefined;

  const rows: Array<[string | undefined, number | undefined]> = [
    [redemption.ecosystemLabel, redemption.ecosystemValue],
    ["Statement balance", redemption.statementBalanceValue],
    [flightHotelLabel, redemption.smartBuyFlightHotelValue],
    [catalogueLabel, redemption.smartBuyCatalogueValue],
    ["Travel EDGE flight/hotel", redemption.travelEdgeValue],
    ["Airmile transfer", derivedAirMilesValue]
  ];

  if (redemption.voucherRedemptions && redemption.voucherRedemptions.length > 0) {
    const maxVal = Math.max(...redemption.voucherRedemptions.map(v => v.valuePerPoint));
    const hasGoldCollection = redemption.voucherRedemptions.some(v => v.programme.includes("Gold Collection"));
    const hasPlatTravelCollection = redemption.voucherRedemptions.some(v => v.programme.includes("Platinum Travel"));
    const label = hasGoldCollection 
      ? "18K/24K Gold Collection" 
      : hasPlatTravelCollection 
        ? "Platinum Travel Collection" 
        : "Vouchers";
    rows.push([label, maxVal]);
  }

  return rows.filter((row): row is [string, number] => typeof row[0] === "string" && typeof row[1] === "number");
}

function singularRewardUnit(rewardType: string) {
  const trimmed = rewardType.trim();
  if (!trimmed) return "point";
  if (trimmed.endsWith("s")) return trimmed.slice(0, -1);
  return trimmed;
}

function valueLabel(label: string, value: number, rewardType: string) {
  if (label === "Airmile transfer") {
    return `upto ${value} airmile per point`;
  }
  if (
    label === "Statement balance" ||
    label.endsWith("flight/hotel") ||
    label.endsWith("rewards catalogue") ||
    label === "Travel portal booking" ||
    label === "Shop & Smile catalogue" ||
    label === "18K/24K Gold Collection" ||
    label === "Platinum Travel Collection" ||
    label === "Vouchers"
  ) {
    return `upto ₹ ${value} per point`;
  }
  return `upto ₹ ${value} per ${singularRewardUnit(rewardType)}`;
}

function formatTatDays(value: number | undefined) {
  if (typeof value !== "number") return "-";
  return `${value} day${value === 1 ? "" : "s"}`;
}

function formatAnnualCap(group: string | undefined, annualCap: number | undefined, rewardType: string) {
  if (typeof annualCap === "number") return formatRewardCap(annualCap, rewardType);
  if (group === "Group A") return "30,000 EDGE Miles";
  if (group === "Group B") return "120,000 EDGE Miles";
  return "-";
}

function DetailList({ items, className }: { items?: string[]; className?: string }) {
  if (!items || items.length === 0) return <p className="muted">Not listed.</p>;

  return (
    <ul className={className ? `detail-list ${className}` : "detail-list"}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function formatUpdateDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function updateSummaryPoints(summary: string) {
  return summary
    .split(/(?<=\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function titleCaseWord(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

// Compact lounge label like "12 + 6" / "Unlimited" / null when the card has no lounge access.
function loungeShortValue(card: CreditCard): string | null {
  if (card.combinedLoungeAccess !== undefined) {
    return card.combinedLoungeAccess === "unlimited" ? "Unlimited" : `${card.combinedLoungeAccess}`;
  }
  const hasDomestic = card.loungeDomestic === "unlimited" || card.loungeDomestic > 0;
  const hasInternational = card.loungeInternational === "unlimited" || card.loungeInternational > 0;
  if (!hasDomestic && !hasInternational) return null;
  if (card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited") return "Unlimited";
  return `${card.loungeDomestic} + ${card.loungeInternational}`;
}

export default async function CardPage({ params }: Props) {
  const { id } = await params;
  const card = getCardById(id);
  if (!card) notFound();

  const cardContent = getCardContent(card.id);
  const ctaLabel = cardCtaLabel(card);
  const jsonLd = buildCardJsonLd(card);

  // Redemption / rewards table data (issuer-aware labels + voucher rows).
  const redemptions = redemptionRows(card.issuer, card.redemption);
  const airlinePartners = card.redemption?.airlinePartners ?? [];
  const hotelPartners = card.redemption?.hotelPartners ?? [];
  const voucherPartners = (card.redemption?.voucherRedemptions ?? []).map((v) => ({
    type: "Voucher",
    name: v.partner,
    programme: v.programme,
    ratio: v.ratio,
    tatDays: v.tatDays
  }));
  const rewardRows = [
    ...card.rewards.filter((reward) => !reward.hidden).map((reward) => ({ reward, optionLabel: null as string | null, optionAnnualCost: 0 })),
    ...(card.paidRewardOptions ?? []).flatMap((option) =>
      option.rewards.filter((reward) => !reward.hidden).map((reward) => ({
        reward,
        optionLabel: option.label,
        optionAnnualCost: option.annualCost
      }))
    )
  ];
  const hasRedemptionSection = Boolean(
    redemptions.length || airlinePartners.length || hotelPartners.length || voucherPartners.length
  );
  const showAirlineTat = airlinePartners.some((partner) => typeof partner.tatDays === "number");
  const showHotelTat = hotelPartners.some((partner) => typeof partner.tatDays === "number");
  const showAirlineGroup = airlinePartners.some((partner) => typeof partner.group === "string");
  const showHotelGroup = hotelPartners.some((partner) => typeof partner.group === "string");
  const showVoucherTat = voucherPartners.some((partner) => typeof partner.tatDays === "number");
  const hasDailyCap = rewardRows.some(({ reward }) => typeof reward.capDaily === "number" && reward.capDaily > 0);
  const hasMonthlyCap = rewardRows.some(
    ({ reward }) =>
      (typeof reward.capMonthly === "number" && reward.capMonthly > 0) ||
      typeof reward.capMultiplierOfBaseEarn === "number"
  );
  const hasStatementQuarterCap = rewardRows.some(
    ({ reward }) => typeof reward.capStatementQuarter === "number" && reward.capStatementQuarter > 0
  );

  // Prefer the structured valued labels when present, else the free-text string arrays.
  const joiningBenefitLines = card.joiningBenefitsValued?.length
    ? card.joiningBenefitsValued.map((benefit) => benefit.label)
    : card.joiningBenefits;
  const renewalBenefitLines = card.renewalBenefitsValued?.length
    ? card.renewalBenefitsValued.map((benefit) => benefit.label)
    : card.renewalBenefits;
  const hasJoiningBenefits = Boolean(joiningBenefitLines?.length);
  const hasRenewalBenefits = Boolean(renewalBenefitLines?.length);
  const hasAdditionalBenefits = Boolean(card.additionalBenefits?.length);
  const hasAdditionalDetails = Boolean(card.additionalDetails?.length);
  const hasFinePrint = hasJoiningBenefits || hasRenewalBenefits || hasAdditionalBenefits || hasAdditionalDetails;
  const hasEligibility = Boolean(card.eligibility?.salaried?.length || card.eligibility?.selfEmployed?.length);

  // Derived, schema-safe sections (each empty/null result is hidden).
  const take = deriveTake(card);
  const bestFor = deriveBestFor(card);
  const avoidIf = deriveAvoidIf(card);
  const loungeMilestoneRules = deriveLoungeMilestoneRules(card);
  const alternatives = findAlternativeCards(card);
  const comparisonGuides = comparisonsForCard(card.id);
  const landingGuides = landingsForCard(card.id);
  const firstAlternative = alternatives[0];
  const showEquitasPrivilegeProgram = isEquitasPrivilegeCard(card);
  const equitasPrivilegeProgramSection = showEquitasPrivilegeProgram ? (
    <section className="panel card-reference-detail-card card-reference-detail-wide" id="privilege-program">
      <div className="panel-body">
        <div className="section-head">
          <div>
            <h2 className="section-title">Equitas Privilege Program</h2>
            <p className="section-sub">Shared spend-based tiers for Tiga, Selfe, and PowerMiles.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Required monthly spend</th>
                <th>Equivalent quarterly spend</th>
                {card.redemption?.pointValueTiers ? <th>1 Point value</th> : null}
              </tr>
            </thead>
            <tbody>
              {EQUITAS_PRIVILEGE_TIERS.map((tier) => (
                <tr key={tier.tier}>
                  <td>
                    <strong>{tier.tier}</strong>
                  </td>
                  <td>{tier.monthlySpend === 0 ? "Base tier" : formatCurrency(tier.monthlySpend)}</td>
                  <td>{tier.quarterlySpend === 0 ? "-" : formatCurrency(tier.quarterlySpend)}</td>
                  {card.redemption?.pointValueTiers ? (
                    <td>
                      {(() => {
                        const tiers = card.redemption.pointValueTiers;
                        const matched = [...tiers]
                          .sort((a, b) => b.minMonthlySpend - a.minMonthlySpend)
                          .find((t) => tier.monthlySpend >= t.minMonthlySpend);
                        return matched ? `₹ ${matched.value.toFixed(2)}` : "-";
                      })()}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="detail-section">
          <h3>How tier qualification works</h3>
          <DetailList
            items={[
              "Meet the monthly threshold in all 3 months of the calendar quarter.",
              "Tier status is reviewed quarterly and may be upgraded or downgraded.",
              "Calendar quarters are Apr-Jun, Jul-Sep, Oct-Dec, and Jan-Mar."
            ]}
          />
        </div>

        <div className="detail-section">
          <h3>Benefits available across tiers</h3>
          <DetailList items={[...EQUITAS_PRIVILEGE_BENEFITS]} className="detail-list-columns" />
          <p className="muted">
            Benefit availability varies by tier. The reward calculator&apos;s tier estimate assumes your
            spend is maintained evenly each month.
          </p>
          <a className="button secondary" href={EQUITAS_PRIVILEGE_URL} rel="nofollow" target="_blank">
            Official program terms <ExternalLink size={15} />
          </a>
        </div>
      </div>
    </section>
  ) : null;

  const loungeValue = loungeShortValue(card);
  const compareHref = (
    firstAlternative ? `/compare?a=${card.id}&b=${firstAlternative.id}` : `/compare?a=${card.id}`
  ) as Route;
  const headlineReward = [...rewardRows]
    .sort((a, b) => b.reward.rate - a.reward.rate)[0]?.reward;
  const heroMetrics: Array<{ value: string; label: string }> = [
    { value: card.annualFee === 0 ? "Lifetime free" : formatCurrency(card.annualFee), label: "Annual fee" },
    hasFeeWaiverSpend(card.feeWaiverSpend)
      ? { value: formatRupeesCompact(card.feeWaiverSpend as number), label: "Annual spend for fee waiver" }
      : { value: formatCurrency(card.joiningFee), label: "Joining fee" },
    headlineReward
      ? { value: formatRewardRate(card, headlineReward), label: `${headlineReward.displayCategory ?? headlineReward.category} ${card.rewardType.toLowerCase()} rate` }
      : { value: card.network.join(" / "), label: "Network" },
    { value: `${card.forexMarkup}%`, label: "Forex markup" },
    { value: loungeValue ?? "None", label: "Lounge visits" }
  ];

  const cardImageStyle = card.id === "hdfc-regalia-gold" ? { objectPosition: "center 25%" as const } : undefined;

  return (
    <div className="page-shell card-detail-page">
      {jsonLd.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <main>
        <section className="card-reference-hero">
          <div className="container card-reference-hero-grid">
            <div className="card-reference-identity">
              <p>{card.issuer}</p>
              <h1>{card.name}</h1>
            </div>
            <div className="card-reference-product">
              <div className="card-reference-image-stage">
              {card.imageUrl ? (
                <img src={card.imageUrl} alt={`${card.name} credit card`} style={cardImageStyle} />
              ) : (
                <CardImageFallback issuer={card.issuer} name={card.name} />
              )}
              </div>
              <div className="card-reference-product-actions">
                <TrackedExternalLink
                  analyticsEvent={{ event_name: "apply_clicked", page: "cards/[id]", source: "details", card_id: card.id }}
                  className="card-reference-btn primary"
                  href={cardCtaHref(card)}
                  rel={cardCtaRel(card)}
                  target="_blank"
                >
                  {ctaLabel}
                </TrackedExternalLink>
                <Link className="card-reference-btn" href={compareHref}>Compare</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="card-reference-section card-reference-metrics-section">
          <div className="container card-reference-metrics">
            {heroMetrics.map((metric) => (
              <article key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </article>
            ))}
          </div>
        </section>

        <div className="container card-reference-stack">
            {take ? (
              <section className="card-reference-decision-section" id="take">
                <p className="card-reference-take">
                  <span>SimplifyCards take:</span>
                  <strong>{take.goodFitIf ? `A good fit if ${take.goodFitIf}.` : take.whyItWorks}</strong>
                </p>
                <div className="card-reference-decisions">
                  <article className="good">
                    <div className="card-reference-decision-topline"><span>✓</span><h3>Best for</h3></div>
                    <strong>{bestFor[0]?.title ?? titleCaseWord(card.bestFor[0] ?? card.rewardType)}</strong>
                    <p>{bestFor[0]?.desc || take.whyItWorks}</p>
                  </article>
                  <article className="warn">
                    <div className="card-reference-decision-topline"><span>!</span><h3>Watch out</h3></div>
                    <strong>{avoidIf[0]?.title ?? "Check the conditions"}</strong>
                    <p>{avoidIf[0]?.desc || take.whereValueDrops}</p>
                  </article>
                  <article className="verdict">
                    <div className="card-reference-decision-topline"><span>✦</span><h3>Bottom line</h3></div>
                    <strong>{take.goodFitIf ? `Good fit if ${take.goodFitIf}.` : card.name}</strong>
                    <p>{take.whyItWorks || take.whereValueDrops}</p>
                  </article>
                </div>
              </section>
            ) : null}

            <section className="card-reference-section" id="calculator">
              <div className="card-reference-section-title">
                <h2>Estimate your {card.rewardType.toLowerCase()}</h2>
                <p>Adjust your monthly spend to see the card&apos;s estimated annual value.</p>
              </div>
              <RewardCalculator card={card} milestones={milestoneRulesForCard(card)} variant="card-detail" />
            </section>

            <section className="card-reference-details-section">
              <div className="card-reference-section-title">
                <h2>How the card works</h2>
              </div>
              <div className="card-reference-details-grid">
            <section className="panel card-reference-detail-card">
              <div className="panel-body">
                <div className="section-head">
                  <div>
                    <h2 className="section-title">{card.rewardType} rates</h2>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="compare-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Rate</th>
                        {hasDailyCap && <th className="cap-column">Daily cap</th>}
                        {hasMonthlyCap && <th className="cap-column">Monthly cap</th>}
                        {hasStatementQuarterCap && <th className="cap-column">Statement quarter cap</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rewardRows.map(({ reward, optionLabel, optionAnnualCost }) => (
                        <tr key={`${optionLabel ?? "base"}-${reward.category}-${reward.displayCategory ?? ""}`}>
                          <td>
                            {optionLabel ? (
                              <span className="muted" style={{ display: "block", marginBottom: 4 }}>
                                {optionLabel} {optionAnnualCost > 0 ? `(₹ ${optionAnnualCost.toLocaleString("en-IN")}/yr)` : ""}
                              </span>
                            ) : null}
                            {reward.displayCategory ?? reward.category}
                          </td>
                          <td>{formatRewardRate(card, reward)}</td>
                          {hasDailyCap && <td className="cap-column">{formatRewardCap(reward.capDaily, card.rewardType)}</td>}
                          {hasMonthlyCap && (
                            <td className="cap-column">
                              {typeof reward.capMultiplierOfBaseEarn === "number"
                                ? `${reward.capMultiplierOfBaseEarn}\u00D7 base cashback`
                                : formatRewardCap(reward.capMonthly, card.rewardType)}
                            </td>
                          )}
                          {hasStatementQuarterCap && (
                            <td className="cap-column">{formatStatementQuarterCap(reward.capStatementQuarter)}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {hasRedemptionSection ? (
                  <div className="detail-section">
                    <h3>Redemption</h3>
                    {redemptions.length > 0 ? (
                      <div className="info-grid">
                        {redemptions.map(([label, value]) => (
                          <div className="info-row" key={label}>
                            <span>{label}</span>
                            <strong>{valueLabel(label, value, card.rewardType)}</strong>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {card.redemption?.airlinePartners?.length ? (
                      <div className="table-wrap">
                        <table className="compare-table compare-table-compact">
                          <thead>
                            <tr>
                              <th>Airline</th>
                              <th>Programme</th>
                              <th>Ratio</th>
                              {showAirlineGroup && <th>Group</th>}
                              {showAirlineGroup && <th>Annual cap</th>}
                              {showAirlineTat && <th>TAT</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {card.redemption.airlinePartners.map((partner) => (
                              <tr key={`${partner.airline}-${partner.programme}`}>
                                <td>{partner.airline}</td>
                                <td>{partner.programme}</td>
                                <td>{partner.ratio}</td>
                                {showAirlineGroup && <td>{partner.group || "-"}</td>}
                                {showAirlineGroup && <td>{formatAnnualCap(partner.group, partner.annualCap, card.rewardType)}</td>}
                                {showAirlineTat && <td>{formatTatDays(partner.tatDays)}</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}

                    {card.redemption?.hotelPartners?.length ? (
                      <div className="table-wrap">
                        <table className="compare-table compare-table-compact">
                          <thead>
                            <tr>
                              <th>Hotel group</th>
                              <th>Programme</th>
                              <th>Ratio</th>
                              {showHotelGroup && <th>Group</th>}
                              {showHotelGroup && <th>Annual cap</th>}
                              {showHotelTat && <th>TAT</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {card.redemption.hotelPartners.map((partner) => (
                              <tr key={`${partner.hotelGroup}-${partner.programme}`}>
                                <td>{partner.hotelGroup}</td>
                                <td>{partner.programme}</td>
                                <td>{partner.ratio}</td>
                                {showHotelGroup && <td>{partner.group || "-"}</td>}
                                {showHotelGroup && <td>{formatAnnualCap(partner.group, partner.annualCap, card.rewardType)}</td>}
                                {showHotelTat && <td>{formatTatDays(partner.tatDays)}</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}

                    {voucherPartners.length ? (
                      <div className="table-wrap">
                        <table className="compare-table compare-table-compact">
                          <thead>
                            <tr>
                              <th>Voucher partner</th>
                              <th>Programme / collection</th>
                              <th>Ratio</th>
                              {showVoucherTat && <th>TAT</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {voucherPartners.map((partner, index) => (
                              <tr key={`${partner.name}-${partner.programme}-${index}`}>
                                <td>{partner.name}</td>
                                <td>{partner.programme}</td>
                                <td>{partner.ratio}</td>
                                {showVoucherTat && <td>{formatTatDays(partner.tatDays)}</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                    {card.id === "axis-atlas" && (
                      <p className="muted calc-note" style={{ marginTop: 12 }}>
                        Annual caps of 30,000 EDGE Miles for Group A and 120,000 EDGE Miles for Group B apply.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </section>

            {equitasPrivilegeProgramSection}

            {loungeMilestoneRules.length ? (
              <section className="panel card-reference-detail-card">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Important conditions</h2>
                    </div>
                  </div>
                  <div className="rules">
                    {loungeMilestoneRules.map((rule, index) => (
                      <div className="rule" key={`${rule.label}-${index}`}>
                        <div className="rule-num">{index + 1}</div>
                        <div>
                          <b>{rule.label}</b>
                          <span>{rule.text}</span>
                          {rule.conditions && rule.conditions.length ? (
                            <ul className="rule-conditions">
                              {rule.conditions.map((condition) => (
                                <li key={condition}>{condition}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {card.exclusions.length ? (
              <section className="panel card-reference-detail-card">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Spending that does not earn {card.rewardType.toLowerCase()}</h2>
                    </div>
                  </div>
                  <DetailList className="detail-list-columns" items={card.exclusions} />
                </div>
              </section>
            ) : null}

            {hasFinePrint ? (
              <section className="panel card-reference-detail-card">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Benefits and fine print</h2>
                      <p className="section-sub">Welcome, renewal, and other listed benefits.</p>
                    </div>
                  </div>
                  {hasJoiningBenefits ? (
                    <div className="detail-section">
                      <h3>Joining benefits</h3>
                      <DetailList items={joiningBenefitLines} />
                    </div>
                  ) : null}
                  {hasRenewalBenefits ? (
                    <div className="detail-section">
                      <h3>Renewal benefits</h3>
                      <DetailList items={renewalBenefitLines} />
                    </div>
                  ) : null}
                  {hasAdditionalBenefits ? (
                    <div className="detail-section">
                      <h3>Additional benefits</h3>
                      <DetailList items={card.additionalBenefits} />
                    </div>
                  ) : null}
                  {hasAdditionalDetails ? (
                    <div className="detail-section">
                      <h3>Additional details</h3>
                      <DetailList items={card.additionalDetails} />
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {cardContent?.updates.length ? (
              <section className="panel card-reference-detail-card">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Latest updates</h2>
                      <p className="section-sub">Recent changes to this card.</p>
                    </div>
                  </div>
                  <div className="content-list content-list-updates">
                    {cardContent.updates.map((update) => (
                      <article className="content-item content-item-update" key={`${update.publishedAt}-${update.title}`}>
                        <div className="content-update-bullet" aria-hidden="true" />
                        <div className="content-update-body">
                          <div className="content-item-head">
                            <strong>{update.title}</strong>
                            <span className="badge">{formatUpdateDate(update.publishedAt)}</span>
                          </div>
                          <ul className="detail-list content-update-points">
                            {updateSummaryPoints(update.summary).map((point) => (
                              <li key={point}>{point}</li>
                            ))}
                          </ul>
                        </div>
                        {update.sourceUrl ? (
                          <a className="button secondary" href={update.sourceUrl} rel="nofollow" target="_blank">
                            Open update <ExternalLink size={15} />
                          </a>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {hasEligibility ? (
              <section className="panel card-reference-detail-card">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Eligibility</h2>
                      <p className="section-sub">Check this before you apply.</p>
                    </div>
                  </div>
                  <div className="benefit-grid">
                    {card.eligibility?.salaried?.length ? (
                      <article className="benefit">
                        <div className="benefit-icon">S</div>
                        <div>
                          <h3>Salaried</h3>
                          <DetailList items={card.eligibility.salaried} />
                        </div>
                      </article>
                    ) : null}
                    {card.eligibility?.selfEmployed?.length ? (
                      <article className="benefit">
                        <div className="benefit-icon">B</div>
                        <div>
                          <h3>Self-employed</h3>
                          <DetailList items={card.eligibility.selfEmployed} />
                        </div>
                      </article>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}
              </div>
            </section>

            {landingGuides.length ? (
              <section className="panel">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Featured in our guides</h2>
                      <p className="section-sub">Category shortlists where this card appears in the top picks.</p>
                    </div>
                  </div>
                  <div className="alt-grid">
                    {landingGuides.map((landing) => (
                      <article className="alt-card" key={landing.slug}>
                        <small>{landing.eyebrow}</small>
                        <h3>{landing.h1}</h3>
                        <p>{landing.intro}</p>
                        <div className="alt-actions">
                          <Link className="alt-btn primary" href={`/${landing.slug}` as Route}>
                            Open guide
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {comparisonGuides.length ? (
              <section className="panel">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Popular comparison guides</h2>
                      <p className="section-sub">Crawlable side-by-side guides that include this card.</p>
                    </div>
                  </div>
                  <div className="alt-grid">
                    {comparisonGuides.map((comparison) => (
                      <article className="alt-card" key={comparison.slug}>
                        <small>Comparison guide</small>
                        <h3>{comparisonTitle(comparison)}</h3>
                        <p>Compare fees, rewards, lounge access, forex markup, milestones, and exclusions.</p>
                        <div className="alt-actions">
                          <Link className="alt-btn primary" href={`/compare/${comparison.slug}` as Route}>
                            Open guide
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {alternatives.length ? (
              <section className="panel">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Compare before you decide</h2>
                      <p className="section-sub">Alternatives based on what you might want instead.</p>
                    </div>
                  </div>
                  <div className="alt-grid">
                    {alternatives.map((alt) => (
                      <article className="alt-card" key={alt.id}>
                        <small>{alternativeIntent(alt)}</small>
                        <h3>{alt.name}</h3>
                        <p>
                          {alt.bestFor.length ? `Best for ${alt.bestFor.slice(0, 3).join(", ")}.` : `${alt.rewardType} card.`}
                        </p>
                        <div className="alt-actions">
                          <Link className="alt-btn primary" href={`/compare?a=${card.id}&b=${alt.id}`}>
                            Compare
                          </Link>
                          <Link className="alt-btn" href={`/cards/${alt.id}`}>
                            Details
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {cardContent?.tips.length ? (
              <section className="panel">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Tips</h2>
                      <p className="section-sub">Practical notes from verified sources.</p>
                    </div>
                  </div>
                  <div className="content-list">
                    {cardContent.tips.map((tip, index) => (
                      <article className="content-item" key={`${tip.sourceLabel}-${index}`}>
                        <p className="muted">{tip.text}</p>
                        {tip.sourceUrl ? (
                          <a className="button secondary" href={tip.sourceUrl} rel="nofollow" target="_blank">
                            Open source <ExternalLink size={15} />
                          </a>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            <section className="panel">
              <div className="panel-body">
                <div id="page-feedback">
                  <AskFeedback
                    cardIds={[card.id]}
                    input={{ query: card.name }}
                    label="Was this page helpful?"
                    query={card.name}
                    returnAnchor="page-feedback"
                    returnTo={`/cards/${card.id}`}
                    readStatusFromUrl
                    source="details"
                    summary={`Card details page for ${card.name}`}
                  />
                </div>
              </div>
            </section>
        </div>
      </main>
    </div>
  );
}
